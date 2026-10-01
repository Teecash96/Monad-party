import { Block, JsonRpcProvider } from "ethers";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/pool";
import { epochIdAt } from "../domain/epoch";
import { gameEvents, parseMilestoneLog, partyRules } from "../domain/party";

const CONFIRMATIONS = Number(process.env.INDEXER_CONFIRMATIONS || 20);
const BLOCK_BATCH = Number(process.env.INDEXER_BLOCK_BATCH || 100);
const REORG_REWIND_BLOCKS = 128;
const milestoneTopic = gameEvents.getEvent("MilestoneCompleted")!.topicHash;

export interface IndexedPartyStamp {
  id: string;
  partyId: string;
  walletAddress: string;
  epochId: bigint;
  blockNumber: number;
  blockHash: string;
  txHash: string;
  logIndex: number;
  milestone: bigint;
  completedAt: number;
}

export class MonadIndexer {
  private readonly provider: JsonRpcProvider;
  private readonly chainId: number;

  constructor(
    rpcUrl = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
    chainId = Number(process.env.MONAD_CHAIN_ID || 10143),
  ) {
    this.provider = new JsonRpcProvider(rpcUrl, chainId);
    this.chainId = chainId;
  }

  async processRange(fromBlock: number, toBlock: number): Promise<{ firstBlock: Block; lastBlock: Block; stamps: IndexedPartyStamp[] }> {
    const rules = partyRules();
    if (!rules) throw new Error("Party game is not configured");
    const logs = await this.provider.getLogs({
      address: rules.gameAddress,
      topics: [milestoneTopic],
      fromBlock,
      toBlock,
    });
    const requiredBlocks = [...new Set([fromBlock, toBlock, ...logs.map((log) => log.blockNumber)])];
    const blocks = await Promise.all(requiredBlocks.map(async (number) => {
      const block = await this.provider.getBlock(number);
      if (!block) throw new Error(`Block ${number} was not found`);
      return block;
    }));
    const byNumber = new Map(blocks.map((block) => [block.number, block]));
    const stamps = logs.flatMap((log) => {
      const milestone = parseMilestoneLog(log, rules);
      const block = byNumber.get(log.blockNumber);
      if (!milestone || !block) return [];
      return [{
        id: `${log.transactionHash}:${log.index}`,
        partyId: rules.id,
        walletAddress: milestone.player,
        epochId: epochIdAt(block.timestamp),
        blockNumber: log.blockNumber,
        blockHash: log.blockHash,
        txHash: log.transactionHash,
        logIndex: log.index,
        milestone: milestone.milestone,
        completedAt: block.timestamp,
      }];
    });
    return { firstBlock: byNumber.get(fromBlock)!, lastBlock: byNumber.get(toBlock)!, stamps };
  }

  async saveRange(firstBlock: Block, lastBlock: Block, stamps: IndexedPartyStamp[]): Promise<void> {
    const rules = partyRules();
    if (!rules) throw new Error("Party game is not configured");
    await prisma.$transaction(async (tx) => {
      for (const stamp of stamps) {
        await tx.partyStamp.upsert({
          where: { id: stamp.id },
          update: {},
          create: { ...stamp, milestone: new Prisma.Decimal(stamp.milestone.toString()) },
        });
      }
      await tx.indexerCursor.upsert({
        where: { chainId: this.chainId },
        update: {
          partyRuleId: rules.id,
          lastBlockNumber: lastBlock.number,
          lastBlockHash: lastBlock.hash || "",
          lastBlockTimestamp: lastBlock.timestamp,
        },
        create: {
          chainId: this.chainId,
          partyRuleId: rules.id,
          firstBlockNumber: firstBlock.number,
          firstBlockTimestamp: firstBlock.timestamp,
          lastBlockNumber: lastBlock.number,
          lastBlockHash: lastBlock.hash || "",
          lastBlockTimestamp: lastBlock.timestamp,
        },
      });
    });
  }

  async repairReorg(): Promise<void> {
    const cursor = await prisma.indexerCursor.findUnique({ where: { chainId: this.chainId } });
    if (!cursor) return;
    const canonical = await this.provider.getBlock(cursor.lastBlockNumber);
    if (canonical?.hash === cursor.lastBlockHash) return;

    const rewind = Math.max(0, cursor.lastBlockNumber - REORG_REWIND_BLOCKS);
    await prisma.$transaction(async (tx) => {
      await tx.partyStamp.deleteMany({ where: { blockNumber: { gte: rewind } } });
      if (rewind === 0) {
        await tx.indexerCursor.delete({ where: { chainId: this.chainId } });
      } else {
        const prior = await this.provider.getBlock(rewind - 1);
        if (!prior?.hash) throw new Error("Cannot resolve reorg rewind block");
        await tx.indexerCursor.update({
          where: { chainId: this.chainId },
          data: {
            lastBlockNumber: rewind - 1,
            lastBlockHash: prior.hash,
            lastBlockTimestamp: prior.timestamp,
          },
        });
      }
    });
  }

  async run(): Promise<void> {
    const rules = partyRules();
    if (!rules) throw new Error("PARTY_GAME_ADDRESS and PARTY_GAME_URL are required before indexing party activity");
    if (!Number.isSafeInteger(BLOCK_BATCH) || BLOCK_BATCH < 1 || BLOCK_BATCH > 100) {
      throw new Error("INDEXER_BLOCK_BATCH must be an integer from 1 through 100");
    }
    const existingCursor = await prisma.indexerCursor.findUnique({ where: { chainId: this.chainId } });
    if (existingCursor && existingCursor.partyRuleId !== rules.id) {
      throw new Error("Party rules changed. Start with a fresh database and reindex from the epoch start");
    }
    await this.repairReorg();
    const latest = await this.provider.getBlockNumber();
    const target = latest - CONFIRMATIONS;
    const cursor = await prisma.indexerCursor.findUnique({ where: { chainId: this.chainId } });
    const configuredStartRaw = process.env.INDEXER_START_BLOCK;
    if (!cursor && !configuredStartRaw) {
      throw new Error("INDEXER_START_BLOCK is required before the first indexer run");
    }
    const configuredStart = Number(configuredStartRaw);
    if (!cursor && (!Number.isSafeInteger(configuredStart) || configuredStart < 0)) {
      throw new Error("INDEXER_START_BLOCK must be a nonnegative integer");
    }
    let start = cursor ? cursor.lastBlockNumber + 1 : Math.max(0, configuredStart);
    while (start <= target) {
      const end = Math.min(target, start + BLOCK_BATCH - 1);
      const { firstBlock, lastBlock, stamps } = await this.processRange(start, end);
      await this.saveRange(firstBlock, lastBlock, stamps);
      start = end + 1;
    }
  }
}

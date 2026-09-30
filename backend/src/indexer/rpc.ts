import { Block, JsonRpcProvider, TransactionResponse } from "ethers";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/pool";
import { epochIdAt } from "../domain/epoch";

const CONFIRMATIONS = Number(process.env.INDEXER_CONFIRMATIONS || 20);
const REORG_REWIND_BLOCKS = 128;

export interface IndexedTx {
  hash: string;
  blockNumber: number;
  blockHash: string;
  walletAddress: string;
  epochId: bigint;
  gasSpentWei: bigint;
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

  async processBlock(blockNumber: number): Promise<{ block: Block; transactions: IndexedTx[] }> {
    const block = await this.provider.getBlock(blockNumber, true);
    if (!block) throw new Error(`Block ${blockNumber} was not found`);
    const transactions: IndexedTx[] = [];

    for (const transaction of block.prefetchedTransactions) {
      const tx = transaction as TransactionResponse;
      const receipt = await this.provider.getTransactionReceipt(tx.hash);
      if (!receipt || receipt.status !== 1) continue;
      if (tx.to && tx.from.toLowerCase() === tx.to.toLowerCase() && tx.value === 0n) continue;

      const gasPrice = receipt.gasPrice || tx.gasPrice || 0n;
      const gasSpentWei = receipt.gasUsed * gasPrice;
      transactions.push({
        hash: tx.hash,
        blockNumber,
        blockHash: block.hash || receipt.blockHash,
        walletAddress: tx.from.toLowerCase(),
        epochId: epochIdAt(block.timestamp),
        gasSpentWei,
      });
    }
    return { block, transactions };
  }

  async saveBlock(block: Block, transactions: IndexedTx[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const transaction of transactions) {
        const exists = await tx.indexedTransaction.findUnique({ where: { hash: transaction.hash }, select: { hash: true } });
        if (exists) continue;
        await tx.indexedTransaction.create({
          data: {
            ...transaction,
            gasSpentWei: new Prisma.Decimal(transaction.gasSpentWei.toString()),
          },
        });
        await tx.txActivity.upsert({
          where: { walletAddress_epochId: { walletAddress: transaction.walletAddress, epochId: transaction.epochId } },
          update: {
            txCount: { increment: 1 },
            gasSpentWei: { increment: new Prisma.Decimal(transaction.gasSpentWei.toString()) },
          },
          create: {
            walletAddress: transaction.walletAddress,
            epochId: transaction.epochId,
            txCount: 1,
            gasSpentWei: new Prisma.Decimal(transaction.gasSpentWei.toString()),
          },
        });
      }
      await tx.indexerCursor.upsert({
        where: { chainId: this.chainId },
        update: {
          lastBlockNumber: block.number,
          lastBlockHash: block.hash || "",
          lastBlockTimestamp: block.timestamp,
        },
        create: {
          chainId: this.chainId,
          firstBlockNumber: block.number,
          firstBlockTimestamp: block.timestamp,
          lastBlockNumber: block.number,
          lastBlockHash: block.hash || "",
          lastBlockTimestamp: block.timestamp,
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
    const affected = await prisma.indexedTransaction.findMany({
      where: { blockNumber: { gte: rewind } },
      select: { epochId: true },
      distinct: ["epochId"],
    });
    await prisma.$transaction(async (tx) => {
      await tx.indexedTransaction.deleteMany({ where: { blockNumber: { gte: rewind } } });
      for (const { epochId } of affected) {
        await tx.txActivity.deleteMany({ where: { epochId } });
        const grouped = await tx.indexedTransaction.groupBy({
          by: ["epochId", "walletAddress"],
          where: { epochId },
          _count: { hash: true },
          _sum: { gasSpentWei: true },
        });
        for (const row of grouped) {
          await tx.txActivity.create({
            data: {
              epochId: row.epochId,
              walletAddress: row.walletAddress,
              txCount: row._count.hash,
              gasSpentWei: row._sum.gasSpentWei || new Prisma.Decimal(0),
            },
          });
        }
      }
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
    const start = cursor ? cursor.lastBlockNumber + 1 : Math.max(0, configuredStart);
    for (let blockNumber = start; blockNumber <= target; blockNumber++) {
      const { block, transactions } = await this.processBlock(blockNumber);
      await this.saveBlock(block, transactions);
    }
  }
}

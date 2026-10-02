import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { Prisma } from "@prisma/client";
import { getAddress } from "ethers";
import { prisma } from "../db/pool";
import { uploadSnapshot } from "./ipfs";
import { publishEligibilityRoot, readEligibilityRoot } from "./contract";
import { epochRange } from "../domain/epoch";
import { MIN_TWITTER_FOLLOWERS, partyRules } from "../domain/party";

export interface SnapshotEntry {
  index: number;
  address: string;
  proof: string[];
}

export interface SnapshotPayload {
  version: 1;
  epochId: string;
  merkleRoot: string;
  eligibleCount: number;
  createdAt: string;
  entries: SnapshotEntry[];
}

interface Coverage {
  firstBlockTimestamp: number;
  lastBlockTimestamp: number;
}

export function assertSnapshotCoverage(epochId: bigint, cursor: Coverage | null, now: number): void {
  const { start, end } = epochRange(epochId);
  if (now < end) throw new Error("Cannot snapshot an epoch before it ends");
  if (!cursor || cursor.firstBlockTimestamp > start || cursor.lastBlockTimestamp < end) {
    throw new Error("Indexer does not have confirmed coverage for the full epoch");
  }
}

export async function eligibleWallets(epochId: bigint) {
  const rules = partyRules();
  if (!rules) throw new Error("Party game is not configured");
  const freshSince = new Date(Date.now() - Number(process.env.TWITTER_FRESHNESS_HOURS || 24) * 60 * 60 * 1000);
  const stamps = await prisma.partyStamp.findMany({
    where: { partyId: rules.id, epochId },
    orderBy: [{ walletAddress: "asc" }, { completedAt: "asc" }],
  });
  const daysByWallet = new Map<string, Set<number>>();
  for (const stamp of stamps) {
    const days = daysByWallet.get(stamp.walletAddress) || new Set<number>();
    days.add(Math.floor(stamp.completedAt / 86400));
    daysByWallet.set(stamp.walletAddress, days);
  }
  const qualifiedWallets = [...daysByWallet.entries()]
    .filter(([, days]) => days.size >= 2)
    .map(([wallet]) => wallet)
    .sort();
  const twitter = await prisma.twitterVerification.findMany({
    where: {
      walletAddress: { in: qualifiedWallets },
      revokedAt: null,
      verifiedAt: { gte: freshSince },
      followersCount: { gte: MIN_TWITTER_FOLLOWERS },
    },
  });
  const byWallet = new Map(twitter.map((row) => [row.walletAddress, row]));
  return qualifiedWallets
    .filter((walletAddress) => byWallet.has(walletAddress))
    .map((walletAddress) => ({ walletAddress, twitter: byWallet.get(walletAddress)! }));
}

export async function buildSnapshot(epochId: bigint): Promise<SnapshotPayload> {
  const eligible = await eligibleWallets(epochId);
  if (eligible.length < 3) throw new Error("At least three eligible wallets are required to publish a draw");

  const values = eligible.map((row, index) => [
    epochId.toString(),
    index.toString(),
    getAddress(row.walletAddress),
  ]);
  const tree = StandardMerkleTree.of(values, ["uint256", "uint256", "address"]);
  const payload: SnapshotPayload = {
    version: 1,
    epochId: epochId.toString(),
    merkleRoot: tree.root,
    eligibleCount: values.length,
    createdAt: new Date().toISOString(),
    entries: eligible.map((row, index) => ({
      index,
      address: row.walletAddress,
      proof: tree.getProof(index),
    })),
  };
  return payload;
}

export async function createAndPublishSnapshot(epochId: bigint) {
  const existing = await prisma.eligibilitySnapshot.findUnique({ where: { epochId } });
  if (existing) {
    const payload = existing.payload as unknown as SnapshotPayload;
    let transactionHash: string | null = null;
    if (process.env.PUBLISH_ROOT === "true") {
      const onchain = await readEligibilityRoot(epochId);
      if (onchain.root === "0x" + "0".repeat(64)) {
        transactionHash = await publishEligibilityRoot(
          epochId,
          existing.merkleRoot,
          existing.eligibleCount,
          existing.snapshotUri || "",
        );
      } else if (onchain.root.toLowerCase() !== existing.merkleRoot.toLowerCase()) {
        throw new Error("Stored snapshot does not match the onchain root");
      }
    }
    return { payload, snapshotUri: existing.snapshotUri || "", transactionHash };
  }

  const now = Math.floor(Date.now() / 1000);
  const chainId = Number(process.env.MONAD_CHAIN_ID || 10143);
  const cursor = await prisma.indexerCursor.findUnique({ where: { chainId } });
  assertSnapshotCoverage(epochId, cursor, now);

  const payload = await buildSnapshot(epochId);
  const cid = await uploadSnapshot(payload);
  const snapshotUri = cid ? `ipfs://${cid}` : "";
  await prisma.eligibilitySnapshot.create({
    data: {
      epochId,
      merkleRoot: payload.merkleRoot,
      eligibleCount: payload.eligibleCount,
      snapshotUri: snapshotUri || null,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  let transactionHash: string | null = null;
  if (process.env.PUBLISH_ROOT === "true") {
    transactionHash = await publishEligibilityRoot(epochId, payload.merkleRoot, payload.eligibleCount, snapshotUri);
  }
  await prisma.auditLog.create({
    data: {
      action: "snapshot.created",
      detail: { epochId: epochId.toString(), merkleRoot: payload.merkleRoot, transactionHash },
    },
  });
  return { payload, snapshotUri, transactionHash };
}

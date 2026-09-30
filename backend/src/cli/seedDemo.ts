import "dotenv/config";
import { Prisma } from "@prisma/client";
import { buildSnapshot } from "../aggregator/build";
import { prisma } from "../db/pool";
import { epochIdAt, epochRange } from "../domain/epoch";

const wallets = [
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
] as const;

async function main() {
  if (process.env.DEMO_MODE !== "true" || process.env.NODE_ENV === "production") {
    throw new Error("Demo seeding requires DEMO_MODE=true and a nonproduction NODE_ENV");
  }

  const now = Math.floor(Date.now() / 1000);
  const currentEpoch = epochIdAt(now);
  const completedEpoch = currentEpoch - 1n;
  if (completedEpoch < 0n) throw new Error("No completed epoch is available");
  const range = epochRange(completedEpoch);
  const chainId = Number(process.env.MONAD_CHAIN_ID || 10143);

  await prisma.$transaction(async (tx) => {
    await tx.winner.deleteMany({ where: { epochId: completedEpoch } });
    await tx.eligibilitySnapshot.deleteMany({ where: { epochId: completedEpoch } });
    await tx.indexerCursor.upsert({
      where: { chainId },
      update: {
        firstBlockNumber: 1,
        firstBlockTimestamp: range.start,
        lastBlockNumber: 2,
        lastBlockHash: `0x${"ab".repeat(32)}`,
        lastBlockTimestamp: range.end,
      },
      create: {
        chainId,
        firstBlockNumber: 1,
        firstBlockTimestamp: range.start,
        lastBlockNumber: 2,
        lastBlockHash: `0x${"ab".repeat(32)}`,
        lastBlockTimestamp: range.end,
      },
    });

    for (const [index, walletAddress] of wallets.entries()) {
      await tx.twitterVerification.upsert({
        where: { walletAddress },
        update: { followersCount: 150 + index, verifiedAt: new Date(), revokedAt: null },
        create: {
          walletAddress,
          twitterId: `90000000000000000${index}`,
          username: `demo_player_${index + 1}`,
          followersCount: 150 + index,
          verifiedAt: new Date(),
        },
      });
      for (const epochId of [completedEpoch, currentEpoch]) {
        await tx.txActivity.upsert({
          where: { walletAddress_epochId: { walletAddress, epochId } },
          update: { txCount: 3 + index, gasSpentWei: new Prisma.Decimal("1000000000000000") },
          create: { walletAddress, epochId, txCount: 3 + index, gasSpentWei: new Prisma.Decimal("1000000000000000") },
        });
      }
    }
  });

  const payload = await buildSnapshot(completedEpoch);
  await prisma.eligibilitySnapshot.create({
    data: {
      epochId: completedEpoch,
      merkleRoot: payload.merkleRoot,
      eligibleCount: payload.eligibleCount,
      snapshotUri: null,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });
  const prizes = ["500000000000000000", "300000000000000000", "200000000000000000"];
  for (let rank = 0; rank < 3; rank += 1) {
    await prisma.winner.create({
      data: {
        epochId: completedEpoch,
        walletAddress: wallets[rank],
        winnerIndex: rank,
        rank,
        prizeAmount: new Prisma.Decimal(prizes[rank]),
      },
    });
  }
  await prisma.auditLog.create({
    data: { action: "demo.seeded", detail: { completedEpoch: completedEpoch.toString(), currentEpoch: currentEpoch.toString() } },
  });

  console.log(JSON.stringify({
    completedEpoch: completedEpoch.toString(),
    currentEpoch: currentEpoch.toString(),
    wallets,
    merkleRoot: payload.merkleRoot,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

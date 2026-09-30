import "dotenv/config";
import { createAndPublishSnapshot } from "../aggregator/build";
import { prisma } from "../db/pool";
import { epochIdAt } from "../domain/epoch";
import { recheckVerification } from "../twitter/oauth";

async function main() {
  const active = await prisma.twitterVerification.findMany({
    where: { revokedAt: null },
    select: { id: true },
  });
  const failures: unknown[] = [];
  for (const { id } of active) {
    try {
      await recheckVerification(id);
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) throw new Error(`Snapshot stopped because ${failures.length} X accounts could not be rechecked`);

  const requested = process.env.SNAPSHOT_EPOCH_ID;
  const epochId = requested
    ? BigInt(requested)
    : epochIdAt(Math.floor(Date.now() / 1000)) - 1n;
  if (epochId < 0n) throw new Error("There is no completed epoch to snapshot");
  const result = await createAndPublishSnapshot(epochId);
  console.log(JSON.stringify({
    epochId: result.payload.epochId,
    merkleRoot: result.payload.merkleRoot,
    eligibleCount: result.payload.eligibleCount,
    snapshotUri: result.snapshotUri,
    transactionHash: result.transactionHash,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

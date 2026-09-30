import "dotenv/config";
import { prisma } from "../db/pool";
import { recheckVerification } from "../twitter/oauth";

async function main() {
  const active = await prisma.twitterVerification.findMany({
    where: { revokedAt: null },
    select: { id: true },
  });
  const failures: string[] = [];
  for (const { id } of active) {
    try {
      await recheckVerification(id);
    } catch {
      failures.push(id);
    }
  }
  if (failures.length) throw new Error(`Failed to recheck ${failures.length} X accounts`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

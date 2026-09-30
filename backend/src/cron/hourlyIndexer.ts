import "dotenv/config";
import { prisma } from "../db/pool";
import { MonadIndexer } from "../indexer/rpc";

async function main() {
  await new MonadIndexer().run();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

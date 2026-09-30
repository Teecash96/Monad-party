import "dotenv/config";
import { Contract, EventLog, JsonRpcProvider } from "ethers";
import { Prisma } from "@prisma/client";
import { SnapshotPayload } from "../aggregator/build";
import { prisma } from "../db/pool";

const ABI = [
  "function winners(uint256,uint8) view returns (uint256 index,uint256 amount,bool claimed)",
  "function epochs(uint256) view returns (uint64 startTime,uint64 endTime,uint64 claimDeadline,address token,uint256 prizePool,uint256 requestId,uint256 eligibleCount,uint8 drawState,bool funded,bool rolledOver)",
  "event PrizeClaimed(uint256 indexed epochId,address indexed wallet,uint8 rank,uint256 amount)",
];

async function main() {
  const address = process.env.RAFFLE_CORE_ADDRESS;
  if (!address) throw new Error("RAFFLE_CORE_ADDRESS is required");
  const provider = new JsonRpcProvider(process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz");
  const contract = new Contract(address, ABI, provider);
  const snapshots = await prisma.eligibilitySnapshot.findMany({ orderBy: { epochId: "desc" }, take: 25 });

  for (const snapshot of snapshots) {
    const epoch = await contract.epochs(snapshot.epochId);
    if (Number(epoch.drawState) !== 2) continue;
    const payload = snapshot.payload as unknown as SnapshotPayload;
    const claimLogs = await contract.queryFilter(
      contract.filters.PrizeClaimed(snapshot.epochId),
      Number(process.env.RAFFLE_DEPLOYMENT_BLOCK || 0),
    );
    const claims = new Map<number, EventLog>();
    for (const log of claimLogs) {
      if (log instanceof EventLog) claims.set(Number(log.args.rank), log);
    }

    for (let rank = 0; rank < 3; rank++) {
      const winner = await contract.winners(snapshot.epochId, rank);
      const index = Number(winner.index);
      const entry = payload.entries[index];
      if (!entry) continue;
      const claim = claims.get(rank);
      let claimedAt: Date | null = null;
      if (claim) {
        const block = await claim.getBlock();
        claimedAt = new Date(block.timestamp * 1000);
      }
      await prisma.winner.upsert({
        where: { epochId_rank: { epochId: snapshot.epochId, rank } },
        update: {
          walletAddress: entry.address,
          winnerIndex: index,
          prizeAmount: new Prisma.Decimal(winner.amount.toString()),
          claimedAt,
          txHash: claim?.transactionHash || null,
        },
        create: {
          epochId: snapshot.epochId,
          walletAddress: entry.address,
          winnerIndex: index,
          rank,
          prizeAmount: new Prisma.Decimal(winner.amount.toString()),
          claimedAt,
          txHash: claim?.transactionHash || null,
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

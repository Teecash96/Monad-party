import { Router } from "express";
import { prisma } from "../db/pool";
import { asyncRoute } from "./utils";

export const historyRouter = Router();

historyRouter.get("/", asyncRoute(async (_request, response) => {
  const snapshots = await prisma.eligibilitySnapshot.findMany({
    include: { winners: { orderBy: { rank: "asc" } } },
    orderBy: { epochId: "desc" },
    take: 25,
  });
  response.json({
    epochs: snapshots.map((snapshot) => ({
      epochId: snapshot.epochId.toString(),
      root: snapshot.merkleRoot,
      eligibleCount: snapshot.eligibleCount,
      snapshotUri: snapshot.snapshotUri,
      winners: snapshot.winners.map((winner) => ({
        ...winner,
        epochId: winner.epochId.toString(),
        prizeAmount: winner.prizeAmount.toFixed(0),
      })),
    })),
  });
}));

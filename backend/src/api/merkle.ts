import { Router } from "express";
import { getAddress } from "ethers";
import { prisma } from "../db/pool";
import { SnapshotPayload } from "../aggregator/build";
import { asyncRoute } from "./utils";

export const merkleRouter = Router();

merkleRouter.get("/roots", asyncRoute(async (_request, response) => {
  const roots = await prisma.eligibilitySnapshot.findMany({
    orderBy: { epochId: "desc" },
    select: { epochId: true, merkleRoot: true, eligibleCount: true, snapshotUri: true, createdAt: true },
  });
  response.json(roots.map((root) => ({ ...root, epochId: root.epochId.toString() })));
}));

merkleRouter.get("/:epochId/root", asyncRoute(async (request, response) => {
  const snapshot = await prisma.eligibilitySnapshot.findUnique({
    where: { epochId: BigInt(request.params.epochId) },
    select: { merkleRoot: true, eligibleCount: true, snapshotUri: true },
  });
  if (!snapshot) {
    response.status(404).json({ error: "Snapshot not found" });
    return;
  }
  response.json(snapshot);
}));

merkleRouter.get("/:epochId/:address", asyncRoute(async (request, response) => {
  const epochId = BigInt(request.params.epochId);
  const address = getAddress(request.params.address).toLowerCase();
  const snapshot = await prisma.eligibilitySnapshot.findUnique({ where: { epochId } });
  if (!snapshot) {
    response.status(404).json({ error: "Snapshot not found" });
    return;
  }
  const payload = snapshot.payload as unknown as SnapshotPayload;
  const entry = payload.entries.find((item) => item.address === address);
  if (!entry) {
    response.status(404).json({ error: "Wallet is not eligible in this snapshot" });
    return;
  }
  response.json({
    epochId: epochId.toString(),
    merkleRoot: snapshot.merkleRoot,
    eligibleCount: snapshot.eligibleCount,
    ...entry,
  });
}));

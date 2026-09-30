import { Router } from "express";
import { getAddress } from "ethers";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db/pool";
import { asyncRoute } from "./utils";
import { consumeWalletChallenge, createWalletChallenge } from "../auth/challenge";

export const adminRouter = Router();
const bodySchema = z.object({
  walletAddress: z.string(),
  nonce: z.string().min(20),
  signature: z.string().min(20),
});
const adminLimit = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false });

adminRouter.post("/challenge", adminLimit, asyncRoute(async (request, response) => {
  const walletAddress = z.object({ walletAddress: z.string() }).parse(request.body).walletAddress;
  response.json(await createWalletChallenge(walletAddress, "admin_audit"));
}));

adminRouter.post("/audit", adminLimit, asyncRoute(async (request, response) => {
  const input = bodySchema.parse(request.body);
  const signer = getAddress(await consumeWalletChallenge(input.walletAddress, "admin_audit", input.nonce, input.signature));
  const configuredAdmin = process.env.ADMIN_WALLET_ADDRESS;
  if (!configuredAdmin || signer !== getAddress(configuredAdmin) || signer !== getAddress(input.walletAddress)) {
    response.status(403).json({ error: "Admin access denied" });
    return;
  }
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  response.json(logs);
}));

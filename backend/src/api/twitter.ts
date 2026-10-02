import { Router } from "express";
import { getAddress } from "ethers";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "../db/pool";
import { completeAuthorization, createAuthorization } from "../twitter/oauth";
import { createWalletChallenge, consumeWalletChallenge } from "../auth/challenge";
import { decrypt } from "../twitter/crypto";
import { revokeTwitterGrant } from "../twitter/api";
import { MIN_TWITTER_FOLLOWERS, twitterEligibility } from "../domain/party";
import { asyncRoute } from "./utils";

export const twitterRouter = Router();
const signedWallet = z.object({
  walletAddress: z.string(),
  nonce: z.string().min(20),
  signature: z.string().min(20),
});

const sensitiveLimit = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false });

twitterRouter.post("/challenge", sensitiveLimit, asyncRoute(async (request, response) => {
  const input = z.object({
    walletAddress: z.string(),
    action: z.enum(["connect", "disconnect"]),
  }).parse(request.body);
  const purpose = input.action === "connect" ? "twitter_link" : "twitter_disconnect";
  response.json(await createWalletChallenge(input.walletAddress, purpose));
}));

twitterRouter.post("/connect", sensitiveLimit, asyncRoute(async (request, response) => {
  const input = signedWallet.parse(request.body);
  response.json(await createAuthorization(input.walletAddress, input.nonce, input.signature));
}));

twitterRouter.get("/callback", asyncRoute(async (request, response) => {
  const state = z.string().min(20).parse(request.query.state);
  const code = z.string().min(5).parse(request.query.code);
  await completeAuthorization(state, code);
  const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
  response.redirect(`${frontend}/connect?twitter=connected`);
}));

twitterRouter.get("/status/:address", asyncRoute(async (request, response) => {
  const walletAddress = getAddress(request.params.address).toLowerCase();
  const verification = await prisma.twitterVerification.findUnique({ where: { walletAddress } });
  const connected = Boolean(verification && !verification.revokedAt);
  const freshnessMs = Number(process.env.TWITTER_FRESHNESS_HOURS || 24) * 60 * 60 * 1000;
  const fresh = Boolean(connected && verification!.verifiedAt.getTime() >= Date.now() - freshnessMs);
  const followersCount = connected ? verification!.followersCount : null;
  response.json({
    connected,
    username: connected ? verification!.username : null,
    followersCount,
    minimumFollowers: MIN_TWITTER_FOLLOWERS,
    fresh,
    eligible: twitterEligibility(fresh, followersCount ?? 0),
    verifiedAt: connected ? verification!.verifiedAt : null,
  });
}));

twitterRouter.post("/disconnect", sensitiveLimit, asyncRoute(async (request, response) => {
  const input = signedWallet.parse(request.body);
  const walletAddress = await consumeWalletChallenge(input.walletAddress, "twitter_disconnect", input.nonce, input.signature);
  const verification = await prisma.twitterVerification.findUnique({ where: { walletAddress } });
  if (verification?.accessTokenEncrypted) {
    try {
      await revokeTwitterGrant(decrypt(verification.accessTokenEncrypted));
    } catch (error) {
      console.error("X grant revocation failed; local credentials will still be erased", error);
    }
  }
  await prisma.twitterVerification.updateMany({
    where: { walletAddress },
    data: {
      revokedAt: new Date(),
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      tokenExpiresAt: null,
    },
  });
  await prisma.auditLog.create({ data: { action: "twitter.disconnected", walletAddress } });
  response.status(204).end();
}));

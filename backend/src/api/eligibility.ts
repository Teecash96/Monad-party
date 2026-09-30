import { Router } from "express";
import { getAddress } from "ethers";
import { z } from "zod";
import { prisma } from "../db/pool";
import { epochIdAt } from "../domain/epoch";
import { asyncRoute } from "./utils";

export const eligibilityRouter = Router();

eligibilityRouter.get("/:address", asyncRoute(async (request, response) => {
  const address = getAddress(request.params.address).toLowerCase();
  const epochId = request.query.epochId
    ? BigInt(z.string().regex(/^\d+$/).parse(request.query.epochId))
    : epochIdAt(Math.floor(Date.now() / 1000));
  const [activity, twitter] = await Promise.all([
    prisma.txActivity.findUnique({ where: { walletAddress_epochId: { walletAddress: address, epochId } } }),
    prisma.twitterVerification.findUnique({ where: { walletAddress: address } }),
  ]);
  const txCount = activity?.txCount || 0;
  const gasSpentWei = activity?.gasSpentWei.toFixed(0) || "0";
  const twitterConnected = Boolean(twitter && !twitter.revokedAt);
  const freshnessMs = Number(process.env.TWITTER_FRESHNESS_HOURS || 24) * 60 * 60 * 1000;
  const twitterFresh = Boolean(twitterConnected && twitter!.verifiedAt.getTime() >= Date.now() - freshnessMs);
  const twitterFollowers = twitterConnected ? twitter!.followersCount : 0;
  const eligible = txCount >= 3
    && BigInt(gasSpentWei) >= 1_000_000_000_000_000n
    && twitterFresh
    && twitterFollowers >= 100;

  response.json({
    epochId: epochId.toString(),
    eligible,
    txCount,
    gasSpentWei,
    twitterConnected,
    twitterFresh,
    twitterUsername: twitterConnected ? twitter!.username : null,
    twitterFollowers,
    needsTx: Math.max(0, 3 - txCount),
    needsFollowers: Math.max(0, 100 - twitterFollowers),
  });
}));

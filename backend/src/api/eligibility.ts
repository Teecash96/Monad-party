import { Router } from "express";
import { getAddress } from "ethers";
import { z } from "zod";
import { prisma } from "../db/pool";
import { epochIdAt } from "../domain/epoch";
import { asyncRoute } from "./utils";
import { partyProgress, partyRules } from "../domain/party";

export const eligibilityRouter = Router();

eligibilityRouter.get("/:address", asyncRoute(async (request, response) => {
  const address = getAddress(request.params.address).toLowerCase();
  const epochId = request.query.epochId
    ? BigInt(z.string().regex(/^\d+$/).parse(request.query.epochId))
    : epochIdAt(Math.floor(Date.now() / 1000));
  const rules = partyRules();
  const [stamps, twitter] = await Promise.all([
    rules ? prisma.partyStamp.findMany({
      where: { partyId: rules.id, walletAddress: address, epochId },
      orderBy: { completedAt: "asc" },
    }) : Promise.resolve([]),
    prisma.twitterVerification.findUnique({ where: { walletAddress: address } }),
  ]);
  const twitterConnected = Boolean(twitter && !twitter.revokedAt);
  const freshnessMs = Number(process.env.TWITTER_FRESHNESS_HOURS || 24) * 60 * 60 * 1000;
  const twitterFresh = Boolean(twitterConnected && twitter!.verifiedAt.getTime() >= Date.now() - freshnessMs);
  const progress = partyProgress(stamps.map((stamp) => stamp.completedAt), twitterFresh, Boolean(rules));

  response.json({
    epochId: epochId.toString(),
    party: {
      configured: Boolean(rules),
      id: rules?.id || null,
      gameAddress: rules?.gameAddress || null,
      gameUrl: rules?.gameUrl || null,
      minimumMilestone: rules?.minimumMilestone || null,
    },
    ...progress,
    twitterConnected,
    twitterFresh,
    twitterUsername: twitterConnected ? twitter!.username : null,
  });
}));

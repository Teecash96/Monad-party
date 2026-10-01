import { Router } from "express";
import { epochIdAt } from "../domain/epoch";
import { partyRules } from "../domain/party";

export const partyRouter = Router();

partyRouter.get("/current", (_request, response) => {
  const rules = partyRules();
  response.json({
    epochId: epochIdAt(Math.floor(Date.now() / 1000)).toString(),
    configured: Boolean(rules),
    id: rules?.id || null,
    gameAddress: rules?.gameAddress || null,
    gameUrl: rules?.gameUrl || null,
    minimumMilestone: rules?.minimumMilestone || null,
    requirements: ["Complete the featured game milestone", "Return and complete it on a second UTC day", "Connect X"],
  });
});

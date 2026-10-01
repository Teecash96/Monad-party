import { Interface, ZeroAddress, getAddress, keccak256, toUtf8Bytes } from "ethers";
import { z } from "zod";

export const gameEvents = new Interface([
  "event MilestoneCompleted(address indexed player, uint256 milestone)",
]);

export interface PartyRules {
  id: string;
  gameAddress: string;
  minimumMilestone: string;
  gameUrl: string;
}

export function partyRules(): PartyRules | null {
  if (!process.env.PARTY_GAME_ADDRESS) return null;
  const gameAddress = getAddress(process.env.PARTY_GAME_ADDRESS).toLowerCase();
  if (gameAddress === ZeroAddress) throw new Error("Party game cannot be the zero address");
  const minimumMilestone = z.string().regex(/^[1-9][0-9]*$/).parse(process.env.PARTY_MINIMUM_MILESTONE || "1");
  const gameUrl = z.string().url().startsWith("https://").parse(process.env.PARTY_GAME_URL);
  const chainId = z.coerce.number().int().positive().parse(process.env.MONAD_CHAIN_ID || "10143");
  const id = keccak256(toUtf8Bytes(JSON.stringify({ version: 1, chainId, gameAddress, minimumMilestone, activeDays: 2 })));
  return { id, gameAddress, minimumMilestone, gameUrl };
}

export function parseMilestoneLog(
  log: { address: string; topics: readonly string[]; data: string },
  rules: PartyRules,
): { player: string; milestone: bigint } | null {
  if (log.address.toLowerCase() !== rules.gameAddress) return null;
  try {
    const event = gameEvents.parseLog({ topics: [...log.topics], data: log.data });
    if (!event || event.name !== "MilestoneCompleted") return null;
    const milestone = event.args.milestone as bigint;
    if (milestone < BigInt(rules.minimumMilestone)) return null;
    return { player: getAddress(event.args.player).toLowerCase(), milestone };
  } catch {
    return null;
  }
}

export function partyProgress(timestamps: number[], twitterFresh: boolean, configured: boolean) {
  const days = [...new Set(timestamps.map((time) => Math.floor(time / 86400)))].sort((a, b) => a - b);
  return {
    milestoneComplete: days.length > 0,
    returnComplete: days.length >= 2,
    activeDays: days.length,
    days: days.map((day) => new Date(day * 86400000).toISOString().slice(0, 10)),
    eligible: configured && days.length >= 2 && twitterFresh,
  };
}

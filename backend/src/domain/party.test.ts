import { gameEvents, MIN_TWITTER_FOLLOWERS, parseMilestoneLog, partyProgress, partyRules, twitterEligibility } from "./party";

const env = { ...process.env };

beforeEach(() => {
  process.env.MONAD_CHAIN_ID = "10143";
  process.env.PARTY_GAME_ADDRESS = "0x1111111111111111111111111111111111111111";
  process.env.PARTY_GAME_URL = "https://game.example/play";
  process.env.PARTY_MINIMUM_MILESTONE = "3";
});

afterAll(() => {
  process.env = env;
});

test("accepts a configured game milestone at the threshold", () => {
  const rules = partyRules();
  expect(rules).not.toBeNull();
  const player = "0x2222222222222222222222222222222222222222";
  const encoded = gameEvents.encodeEventLog("MilestoneCompleted", [player, 3n]);
  expect(parseMilestoneLog({ address: rules!.gameAddress, ...encoded }, rules!)).toEqual({
    player,
    milestone: 3n,
  });
});

test("rejects other contracts and milestones below the threshold", () => {
  const rules = partyRules()!;
  const encoded = gameEvents.encodeEventLog("MilestoneCompleted", ["0x2222222222222222222222222222222222222222", 2n]);
  expect(parseMilestoneLog({ address: rules.gameAddress, ...encoded }, rules)).toBeNull();
  expect(parseMilestoneLog({ address: "0x3333333333333333333333333333333333333333", ...encoded }, rules)).toBeNull();
});

test("requires two different UTC days and an eligible X verification", () => {
  const firstDay = Date.UTC(2026, 8, 28) / 1000;
  expect(partyProgress([firstDay, firstDay + 3600], true, true).eligible).toBe(false);
  expect(partyProgress([firstDay, firstDay + 86400], false, true).eligible).toBe(false);
  expect(partyProgress([firstDay, firstDay + 86400], true, true)).toMatchObject({
    activeDays: 2,
    milestoneComplete: true,
    returnComplete: true,
    eligible: true,
  });
});

test("requires at least 100 fresh X followers", () => {
  expect(twitterEligibility(true, MIN_TWITTER_FOLLOWERS - 1)).toBe(false);
  expect(twitterEligibility(true, MIN_TWITTER_FOLLOWERS)).toBe(true);
  expect(twitterEligibility(false, MIN_TWITTER_FOLLOWERS + 1)).toBe(false);
});

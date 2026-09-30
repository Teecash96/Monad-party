import { challengeMessage } from "./challenge";

describe("wallet challenge", () => {
  it("binds the message to the action, domain, chain, nonce, and expiry", () => {
    process.env.FRONTEND_URL = "https://raffle.example";
    process.env.MONAD_CHAIN_ID = "10143";
    const expiry = new Date("2026-09-29T12:00:00.000Z");
    const message = challengeMessage(
      "0x0000000000000000000000000000000000000001",
      "twitter_link",
      "single-use-nonce",
      expiry,
    );
    expect(message).toContain("raffle.example");
    expect(message).toContain("Link X account");
    expect(message).toContain("Chain ID: 10143");
    expect(message).toContain("Nonce: single-use-nonce");
    expect(message).toContain(expiry.toISOString());
  });
});

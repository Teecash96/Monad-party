import { randomBytes } from "node:crypto";
import { decrypt, encrypt } from "./crypto";

describe("token encryption", () => {
  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  it("round trips and authenticates encrypted tokens", () => {
    const payload = encrypt("secret-token");
    expect(payload).not.toContain("secret-token");
    expect(decrypt(payload)).toBe("secret-token");
    const altered = payload.slice(0, -1) + (payload.endsWith("a") ? "b" : "a");
    expect(() => decrypt(altered)).toThrow();
  });
});

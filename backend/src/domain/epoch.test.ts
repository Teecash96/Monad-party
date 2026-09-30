import { epochIdAt, epochRange } from "./epoch";

describe("weekly epochs", () => {
  it("starts each epoch on Monday at midnight UTC", () => {
    const monday = Date.parse("2026-09-28T00:00:00Z") / 1000;
    const epoch = epochIdAt(monday);
    expect(epochRange(epoch).start).toBe(monday);
    expect(epochIdAt(monday + 7 * 24 * 60 * 60 - 1)).toBe(epoch);
    expect(epochIdAt(monday + 7 * 24 * 60 * 60)).toBe(epoch + 1n);
  });
});

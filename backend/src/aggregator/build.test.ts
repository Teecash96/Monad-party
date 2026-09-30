import { assertSnapshotCoverage } from "./build";
import { epochRange } from "../domain/epoch";

describe("snapshot coverage", () => {
  const epochId = 100n;
  const range = epochRange(epochId);

  it("accepts only a completed epoch with full confirmed coverage", () => {
    expect(() => assertSnapshotCoverage(epochId, {
      firstBlockTimestamp: range.start,
      lastBlockTimestamp: range.end,
    }, range.end)).not.toThrow();
  });

  it("rejects partial history and an unfinished epoch", () => {
    expect(() => assertSnapshotCoverage(epochId, {
      firstBlockTimestamp: range.start + 1,
      lastBlockTimestamp: range.end,
    }, range.end)).toThrow("full epoch");
    expect(() => assertSnapshotCoverage(epochId, {
      firstBlockTimestamp: range.start,
      lastBlockTimestamp: range.end - 1,
    }, range.end)).toThrow("full epoch");
    expect(() => assertSnapshotCoverage(epochId, {
      firstBlockTimestamp: range.start,
      lastBlockTimestamp: range.end,
    }, range.end - 1)).toThrow("before it ends");
  });
});

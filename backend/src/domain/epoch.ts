export const WEEK_SECONDS = 7 * 24 * 60 * 60;
export const MONDAY_OFFSET_SECONDS = 4 * 24 * 60 * 60;

export function epochIdAt(timestampSeconds: number): bigint {
  if (timestampSeconds < MONDAY_OFFSET_SECONDS) return 0n;
  return BigInt(Math.floor((timestampSeconds - MONDAY_OFFSET_SECONDS) / WEEK_SECONDS));
}

export function epochRange(epochId: bigint): { start: number; end: number } {
  const start = MONDAY_OFFSET_SECONDS + Number(epochId) * WEEK_SECONDS;
  return { start, end: start + WEEK_SECONDS };
}

/**
 * Highest-averages seat allocation (D'Hondt / Sainte-Laguë) from the native
 * per-list vote totals.
 *
 * The vote is an ordinary native single-choice election; the only step the
 * SDK does not do is turning `results[0]` (vote total per list) into seat
 * counts. That step is defined entirely by `AllocationConfig`, which the
 * example commits to the election metadata so the result is reproducible
 * and fixed before any vote is cast.
 *
 * Votes are kept as bigint and quotients are compared by cross-multiplication,
 * so there is no floating-point rounding. Ties go to the lower list index.
 * These are the bare divisor methods: real jurisdictions layer extra rules
 * (levelling seats, apparentement, regional sub-allocation) on top.
 */

export type DivisorMethod = 'dhondt' | 'sainte-lague';

export interface AllocationConfig {
  method: DivisorMethod;
  seats: number;
  /** Minimum share of the total vote to receive any seat. 0 disables it. */
  threshold?: number;
  /** How ties in the seat-by-seat comparison are broken. */
  tieBreak?: 'lowerIndex';
}

const divisor = (method: DivisorMethod, seatsWon: number): bigint =>
  method === 'dhondt' ? BigInt(seatsWon + 1) : BigInt(2 * seatsWon + 1);

export function allocateSeats(votes: bigint[], config: AllocationConfig): number[] {
  const { method, seats, threshold = 0 } = config;

  const total = votes.reduce((a, b) => a + b, 0n);
  // v / total >= threshold  <=>  v * SCALE >= round(threshold * SCALE) * total
  // compared directly (no intermediate floored cutoff) so a list exactly at
  // the boundary from below is never let in by a rounding-down cutoff.
  const thresholdScaled = BigInt(Math.round(threshold * 1_000_000));
  const eligible = votes.map((v) => (v * 1_000_000n >= thresholdScaled * total && v > 0n ? v : 0n));

  const result: number[] = new Array(votes.length).fill(0);
  for (let s = 0; s < seats; s++) {
    let best = -1;
    for (let i = 0; i < votes.length; i++) {
      if (eligible[i] === 0n) continue;
      if (best === -1) {
        best = i;
        continue;
      }
      // eligible[i] / divisor(result[i])  >  eligible[best] / divisor(result[best])
      if (eligible[i] * divisor(method, result[best]) > eligible[best] * divisor(method, result[i])) {
        best = i;
      }
    }
    if (best === -1) break; // every list below threshold or with no votes
    result[best]++;
  }
  return result;
}

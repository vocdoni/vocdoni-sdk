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
  /**
   * Minimum share of the total vote to receive any seat, as an exact
   * fraction: `{ num: 5, den: 100 }` is 5%. Omitted disables it. A fraction
   * (not a float) so thresholds that are not representable in binary — 1/3,
   * 2/3 — are compared exactly.
   */
  threshold?: { num: number; den: number };
  /** How ties in the seat-by-seat comparison are broken. */
  tieBreak: 'lowerIndex';
}

const divisor = (method: DivisorMethod, seatsWon: number): bigint =>
  method === 'dhondt' ? BigInt(seatsWon + 1) : BigInt(2 * seatsWon + 1);

export function allocateSeats(votes: bigint[], config: AllocationConfig): number[] {
  const { method, seats, threshold = { num: 0, den: 1 } } = config;

  const total = votes.reduce((a, b) => a + b, 0n);
  // v / total >= num / den  <=>  v * den >= num * total, cross-multiplied in
  // bigint: no intermediate cutoff to floor, and no float to round, so a list
  // exactly on the boundary is neither let in nor kept out by rounding.
  const num = BigInt(threshold.num);
  const den = BigInt(threshold.den);
  const eligible = votes.map((v) => (v * den >= num * total && v > 0n ? v : 0n));

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

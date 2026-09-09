/**
 * Borda count from the native ranked (linear-weighted) result matrix.
 *
 * A ranked election returns `results[choice][value]` = the summed voter
 * weight that assigned `value` points to `choice`. The Borda score of a
 * choice is the weighted sum of the points it received:
 * `sum over value of (value * results[choice][value])`.
 *
 * This reads the canonical on-chain aggregate, not raw envelopes, so census
 * weights are already applied and the result is independently reproducible.
 */
export const bordaScores = (results: string[][]): bigint[] =>
  results.map((row) => row.reduce((sum, weight, value) => sum + BigInt(value) * BigInt(weight), 0n));

/** Winning choice index. Ties are broken by lowest choice index. */
export const bordaWinner = (results: string[][]): number => {
  const scores = bordaScores(results);
  let winner = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[winner]) winner = i;
  }
  return winner;
};

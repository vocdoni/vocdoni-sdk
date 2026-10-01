/**
 * Decision logic for a two-round (runoff) election.
 *
 * Both rounds are ordinary native single-choice elections. These helpers
 * take the final per-candidate vote totals (`results[0]`, read after the
 * round has ended) as bigint, so there is no rounding. The runoff rule —
 * the majority denominator and how ties are broken — is fixed up front; in
 * the example it is committed to the round-1 election metadata.
 */

export interface RunoffRules {
  /**
   * A round-1 candidate wins outright with strictly more than this fraction
   * of the valid votes, given as an exact fraction: `{ num: 1, den: 2 }` is
   * an absolute majority. A fraction (not a float) so thresholds that are
   * not representable in binary — 1/3, 2/3 — are compared exactly.
   */
  majorityThreshold: { num: number; den: number };
  /** What the threshold is measured against. */
  denominator: 'validVotes';
  /** How ties (for the runoff cutline, and for the round-2 winner) are broken. */
  tieBreak: 'lowerIndex';
}

/** Candidate index with the most votes; ties broken by lower index. */
export const leader = (votes: bigint[]): number => {
  let best = 0;
  for (let i = 1; i < votes.length; i++) {
    if (votes[i] > votes[best]) best = i;
  }
  return best;
};

/** True when no candidate clears the threshold, so a second round is held. */
export const needsRunoff = (votes: bigint[], rules: RunoffRules): boolean => {
  // Empty ballot: there is no leader to index, and nobody has a majority.
  // (An all-zero ballot needs no special case — the comparison below is
  // 0 <= 0, so a runoff is signalled anyway.)
  if (votes.length === 0) return true;
  const total = votes.reduce((a, b) => a + b, 0n);
  const top = votes[leader(votes)];
  const { num, den } = rules.majorityThreshold;
  // top / total > num / den  <=>  top * den > num * total
  return top * BigInt(den) <= BigInt(num) * total;
};

/**
 * The two candidates that go through to round 2, higher total first.
 * Ties for either place are broken by lower candidate index.
 */
export const runoffContenders = (votes: bigint[]): [number, number] => {
  if (votes.length < 2) throw new Error('A runoff needs at least two candidates');
  const order = votes
    .map((v, index) => ({ v, index }))
    .sort((a, b) => (a.v === b.v ? a.index - b.index : a.v < b.v ? 1 : -1));
  return [order[0].index, order[1].index];
};

/** Winner of a two-candidate round; tie broken by lower index. */
export const roundWinner = (votes: bigint[]): number => (votes[1] > votes[0] ? 1 : 0);

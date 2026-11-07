/**
 * Condorcet method (Schulze variant) over a pairwise preference matrix.
 *
 * The matrix is derived from a native election result, not from raw
 * envelopes: each unordered candidate pair {i, j} is one binary field of a
 * single-choice-per-field ballot (value 0 = prefer i, value 1 = prefer j),
 * so `results[field]` is `[weight preferring i, weight preferring j]` and
 * `d[i][j]` / `d[j][i]` fall straight out of it. Census weights are applied
 * by the protocol.
 *
 * Limit: a pairwise ballot needs C(n, 2) fields, and the Ballot Protocol
 * caps a ballot at 64 fields, so this encoding handles up to 11 candidates.
 * The encoding also cannot force an individual ballot to be a transitive
 * ranking; the example builds ballots from rankings so they are, and Schulze
 * resolves any aggregate cycle deterministically regardless.
 */

/** Unordered candidate pairs in canonical order: (0,1), (0,2), ..., (n-2,n-1). */
export const candidatePairs = (n: number): Array<[number, number]> => {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) pairs.push([i, j]);
  }
  return pairs;
};

/** A voter's ranking (position = preference) -> one 0/1 value per pair. */
export const rankingToPairwiseBallot = (ranking: number[], n: number): number[] => {
  const pos = new Array<number>(n).fill(Number.MAX_SAFE_INTEGER);
  ranking.forEach((candidate, i) => (pos[candidate] = i));
  return candidatePairs(n).map(([i, j]) => (pos[i] < pos[j] ? 0 : 1));
};

/** Native `results` of the pairwise election -> the d[i][j] preference matrix. */
export const pairwiseFromResults = (results: string[][], n: number): bigint[][] => {
  const d: bigint[][] = Array.from({ length: n }, () => new Array<bigint>(n).fill(0n));
  candidatePairs(n).forEach(([i, j], field) => {
    d[i][j] += BigInt(results[field][0] ?? 0);
    d[j][i] += BigInt(results[field][1] ?? 0);
  });
  return d;
};

const max = (a: bigint, b: bigint): bigint => (a > b ? a : b);
const min = (a: bigint, b: bigint): bigint => (a < b ? a : b);

export interface SchulzeResult {
  winner: number;
  strongestPaths: bigint[][];
}

/**
 * Schulze winner from the pairwise matrix: strongest (widest-bottleneck)
 * path between every pair via a Floyd–Warshall variant, then the candidate
 * whose path to every other is at least as strong as the reverse. A cycle
 * or an exact top tie resolves to the lowest candidate index.
 */
export function schulze(pairwise: bigint[][]): SchulzeResult {
  const n = pairwise.length;
  const p: bigint[][] = Array.from({ length: n }, () => new Array<bigint>(n).fill(0n));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) p[i][j] = pairwise[i][j] > pairwise[j][i] ? pairwise[i][j] : 0n;
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      for (let k = 0; k < n; k++) {
        if (i === k || j === k) continue;
        p[j][k] = max(p[j][k], min(p[j][i], p[i][k]));
      }
    }
  }

  let winner = -1;
  for (let i = 0; i < n && winner === -1; i++) {
    let unbeaten = true;
    for (let j = 0; j < n; j++) {
      if (i !== j && p[i][j] < p[j][i]) {
        unbeaten = false;
        break;
      }
    }
    if (unbeaten) winner = i;
  }
  return { winner: winner === -1 ? 0 : winner, strongestPaths: p };
}

import {
  candidatePairs,
  pairwiseFromResults,
  rankingToPairwiseBallot,
  schulze,
} from '../../examples/typescript/src/utils/schulze-tally';

const m = (rows: number[][]): bigint[][] => rows.map((r) => r.map(BigInt));

describe('Pairwise / Schulze tally', () => {
  it('lists candidate pairs in canonical order', () => {
    expect(candidatePairs(4)).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ]);
  });

  it('encodes a ranking as one 0/1 value per pair', () => {
    expect(rankingToPairwiseBallot([0, 1, 2, 3], 4)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(rankingToPairwiseBallot([3, 2, 1, 0], 4)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(rankingToPairwiseBallot([1, 0, 2, 3], 4)).toEqual([1, 0, 0, 0, 0, 0]);
  });

  it('rebuilds the preference matrix from native field results', () => {
    const d = pairwiseFromResults(
      [
        ['5', '2'],
        ['3', '4'],
        ['6', '1'],
      ],
      3
    );
    expect(d.map((row) => row.map(String))).toEqual([
      ['0', '5', '3'],
      ['2', '0', '6'],
      ['4', '1', '0'],
    ]);
  });

  it('elects the Condorcet winner when one exists', () => {
    // candidate 1 beats both others head-to-head
    expect(
      schulze(
        m([
          [0, 1, 9],
          [9, 0, 9],
          [1, 1, 0],
        ])
      ).winner
    ).toBe(1);
  });

  it('resolves the Schulze method Wikipedia example (45 voters, winner E)', () => {
    const d = m([
      [0, 20, 26, 30, 22],
      [25, 0, 16, 33, 18],
      [19, 29, 0, 17, 24],
      [15, 12, 28, 0, 14],
      [23, 27, 21, 31, 0],
    ]);
    expect(schulze(d).winner).toBe(4);
  });

  it('breaks a perfect preference cycle by lowest candidate index', () => {
    expect(
      schulze(
        m([
          [0, 2, 1],
          [1, 0, 2],
          [2, 1, 0],
        ])
      ).winner
    ).toBe(0);
  });
});

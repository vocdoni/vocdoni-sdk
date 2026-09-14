import { allocateSeats } from '../../examples/typescript/src/utils/party-list-tally';

const v = (...n: number[]): bigint[] => n.map(BigInt);
const TIE_BREAK = { tieBreak: 'lowerIndex' } as const;

describe('Highest-averages seat allocation', () => {
  it("D'Hondt reference case: [550, 350, 200] over 4 seats -> [2, 1, 1]", () => {
    expect(allocateSeats(v(550, 350, 200), { method: 'dhondt', seats: 4, ...TIE_BREAK })).toEqual([2, 1, 1]);
  });

  it("Sainte-Laguë diverges from D'Hondt: [100, 80, 30, 20] over 8 seats", () => {
    expect(allocateSeats(v(100, 80, 30, 20), { method: 'dhondt', seats: 8, ...TIE_BREAK })).toEqual([4, 3, 1, 0]);
    expect(allocateSeats(v(100, 80, 30, 20), { method: 'sainte-lague', seats: 8, ...TIE_BREAK })).toEqual([3, 3, 1, 1]);
  });

  it('applies an eligibility threshold before allocating', () => {
    // total 1000, 5% cutoff = 50; lists C (40) and D (20) get no seats
    const config = { method: 'dhondt' as const, seats: 4, threshold: { num: 5, den: 100 }, ...TIE_BREAK };
    expect(allocateSeats(v(600, 340, 40, 20), config)).toEqual([3, 1, 0, 0]);
  });

  it('breaks quotient ties by lower list index', () => {
    // equal votes: every seat goes to the lower index first
    expect(allocateSeats(v(100, 100), { method: 'dhondt', seats: 3, ...TIE_BREAK })).toEqual([2, 1]);
  });

  it('returns all zeros when no list clears the threshold', () => {
    const config = { method: 'dhondt' as const, seats: 3, threshold: { num: 9, den: 10 }, ...TIE_BREAK };
    expect(allocateSeats(v(10, 10), config)).toEqual([0, 0]);
  });

  it('excludes a list that falls just short of the threshold, no rounding-down leak', () => {
    // total 9, 50% threshold: 4/9 = 44.4% must NOT clear it (floor(0.5*9)=4 would wrongly let it in)
    const config = { method: 'dhondt' as const, seats: 4, threshold: { num: 1, den: 2 }, ...TIE_BREAK };
    expect(allocateSeats(v(5, 4), config)).toEqual([4, 0]);
  });

  it('admits a list exactly on a non-binary threshold: 2/3 of the vote clears 2/3', () => {
    // Scaling the threshold to an integer (round(2/3 * 1e6) = 666667 > 2/3)
    // would wrongly exclude a list holding exactly the required share.
    const config = { method: 'dhondt' as const, seats: 2, threshold: { num: 2, den: 3 }, ...TIE_BREAK };
    expect(allocateSeats(v(2, 1), config)).toEqual([2, 0]);
  });

  it('handles vote totals past Number.MAX_SAFE_INTEGER without rounding', () => {
    const big = v(9007199254740993, 9007199254740991); // differ by 2, both > 2^53
    expect(allocateSeats(big, { method: 'dhondt', seats: 2, ...TIE_BREAK })).toEqual([1, 1]);
    expect(allocateSeats(big, { method: 'dhondt', seats: 1, ...TIE_BREAK })).toEqual([1, 0]);
  });
});

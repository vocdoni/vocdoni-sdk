import { allocateSeats } from '../../examples/typescript/src/utils/party-list-tally';

const v = (...n: number[]): bigint[] => n.map(BigInt);

describe('Highest-averages seat allocation', () => {
  it("D'Hondt reference case: [550, 350, 200] over 4 seats -> [2, 1, 1]", () => {
    expect(allocateSeats(v(550, 350, 200), { method: 'dhondt', seats: 4 })).toEqual([2, 1, 1]);
  });

  it("Sainte-Laguë diverges from D'Hondt: [100, 80, 30, 20] over 8 seats", () => {
    expect(allocateSeats(v(100, 80, 30, 20), { method: 'dhondt', seats: 8 })).toEqual([4, 3, 1, 0]);
    expect(allocateSeats(v(100, 80, 30, 20), { method: 'sainte-lague', seats: 8 })).toEqual([3, 3, 1, 1]);
  });

  it('applies an eligibility threshold before allocating', () => {
    // total 1000, 5% cutoff = 50; lists C (40) and D (20) get no seats
    expect(allocateSeats(v(600, 340, 40, 20), { method: 'dhondt', seats: 4, threshold: 0.05 })).toEqual([3, 1, 0, 0]);
  });

  it('breaks quotient ties by lower list index', () => {
    // equal votes: every seat goes to the lower index first
    expect(allocateSeats(v(100, 100), { method: 'dhondt', seats: 3 })).toEqual([2, 1]);
  });

  it('returns all zeros when no list clears the threshold', () => {
    expect(allocateSeats(v(10, 10), { method: 'dhondt', seats: 3, threshold: 0.9 })).toEqual([0, 0]);
  });

  it('excludes a list that falls just short of the threshold, no rounding-down leak', () => {
    // total 9, 50% threshold: 4/9 = 44.4% must NOT clear it (floor(0.5*9)=4 would wrongly let it in)
    expect(allocateSeats(v(5, 4), { method: 'dhondt', seats: 4, threshold: 0.5 })).toEqual([4, 0]);
  });

  it('handles vote totals past Number.MAX_SAFE_INTEGER without rounding', () => {
    const big = v(9007199254740993, 9007199254740991); // differ by 2, both > 2^53
    expect(allocateSeats(big, { method: 'dhondt', seats: 2 })).toEqual([1, 1]);
    expect(allocateSeats(big, { method: 'dhondt', seats: 1 })).toEqual([1, 0]);
  });
});

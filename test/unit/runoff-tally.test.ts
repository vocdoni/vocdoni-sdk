import { leader, needsRunoff, roundWinner, runoffContenders } from '../../examples/typescript/src/utils/runoff-tally';

const v = (...n: number[]): bigint[] => n.map(BigInt);
const RULES = {
  majorityThreshold: { num: 1, den: 2 },
  denominator: 'validVotes' as const,
  tieBreak: 'lowerIndex' as const,
};

describe('Two-round (runoff) decision logic', () => {
  it('no runoff when a candidate has an absolute majority', () => {
    expect(needsRunoff(v(6, 3, 1), RULES)).toBe(false);
    expect(leader(v(6, 3, 1))).toBe(0);
  });

  it('exactly half is not a majority, so a runoff is held', () => {
    expect(needsRunoff(v(5, 3, 2), RULES)).toBe(true);
  });

  it('picks the top two contenders, higher total first', () => {
    expect(runoffContenders(v(5, 4, 2, 1))).toEqual([0, 1]);
  });

  it('breaks a tie for second place by lower candidate index', () => {
    expect(runoffContenders(v(5, 3, 3, 1))).toEqual([0, 1]);
  });

  it('breaks a tie for first place by lower candidate index', () => {
    expect(runoffContenders(v(4, 4, 2))).toEqual([0, 1]);
  });

  it('round-2 winner is the plurality of the two, tie to lower index', () => {
    expect(roundWinner(v(7, 5))).toBe(0);
    expect(roundWinner(v(5, 7))).toBe(1);
    expect(roundWinner(v(6, 6))).toBe(0);
  });

  it('honours a custom majority threshold', () => {
    expect(needsRunoff(v(58, 42), { ...RULES, majorityThreshold: { num: 3, den: 5 } })).toBe(true);
    expect(needsRunoff(v(61, 39), { ...RULES, majorityThreshold: { num: 3, den: 5 } })).toBe(false);
  });

  it('compares a non-binary threshold exactly: 1/3 each is not more than 1/3', () => {
    const oneThird = { ...RULES, majorityThreshold: { num: 1, den: 3 } };
    // Scaling 1/3 to an integer (round(1/3 * 1e6) = 333333 < 1/3) would wrongly
    // hand this to the leader; cross-multiplication sees the exact tie.
    expect(needsRunoff(v(1, 1, 1), oneThird)).toBe(true);
    expect(needsRunoff(v(2, 1, 1), oneThird)).toBe(false);
  });

  it('no votes cast means a runoff is held (nobody has a majority)', () => {
    expect(needsRunoff(v(0, 0, 0), RULES)).toBe(true);
  });

  it('an empty ballot needs a runoff and has no contenders', () => {
    expect(needsRunoff([], RULES)).toBe(true);
    expect(() => runoffContenders([])).toThrow('at least two candidates');
    expect(() => runoffContenders(v(5))).toThrow('at least two candidates');
  });

  it('uses exact bigint math past Number.MAX_SAFE_INTEGER', () => {
    const a = 9007199254740993n; // 2^53 + 1 — one vote over half
    const b = 9007199254740991n; // 2^53 - 1
    // With Number both round to 2^53 and look tied; bigint sees a's majority.
    expect(needsRunoff([a, b], RULES)).toBe(false);
    expect(runoffContenders([a, b, 1n])).toEqual([0, 1]);
  });
});

import { bordaScores, bordaWinner } from '../../examples/typescript/src/utils/borda-tally';

// `results[choice][value]` = summed voter weight that gave `choice` that many points.
describe('Borda count from the native ranked result matrix', () => {
  it('scores a choice as the weighted sum of the points it received', () => {
    const results = [
      ['0', '0', '4'], // 2*4 = 8
      ['1', '3', '0'], // 1*3 = 3
      ['3', '1', '0'], // 1*1 = 1
    ];
    expect(bordaScores(results).map(String)).toEqual(['8', '3', '1']);
    expect(bordaWinner(results)).toBe(0);
  });

  it('handles heterogeneous ballots (voters split across point values)', () => {
    const results = [
      ['2', '3', '5'], // 1*3 + 2*5 = 13
      ['1', '2', '7'], // 1*2 + 2*7 = 16
      ['4', '5', '1'], // 1*5 + 2*1 = 7
    ];
    expect(bordaScores(results).map(String)).toEqual(['13', '16', '7']);
    expect(bordaWinner(results)).toBe(1);
  });

  it('breaks ties by lowest choice index', () => {
    expect(
      bordaWinner([
        ['0', '0', '3'],
        ['0', '0', '3'],
      ])
    ).toBe(0);
  });

  it('keeps scores as bigint (no precision loss past Number.MAX_SAFE_INTEGER)', () => {
    expect(bordaScores([['0', '0', '9007199254740993']])[0]).toBe(2n * 9007199254740993n);
  });
});

import { formatUnits } from '../../../src';

describe('Common util tests', () => {
  it('function formatUnits should work', () => {
    expect(formatUnits(10000000000000000000000000000n)).toEqual('10000000000.0');
    expect(formatUnits(10000000000000000000000000000n, 28)).toEqual('1.0');
    expect(formatUnits(1500000000000000000n)).toEqual('1.5');
  });
});

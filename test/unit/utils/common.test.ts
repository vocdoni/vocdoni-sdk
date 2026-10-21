import { formatUnits, randomUUID } from '../../../src';

describe('Common util tests', () => {
  it('function formatUnits should work', () => {
    expect(formatUnits(10000000000000000000000000000n)).toEqual('10000000000.0');
    expect(formatUnits('10000000000000000000000000000')).toEqual('10000000000.0');
    expect(formatUnits(100, 2)).toEqual('1.0');
    expect(formatUnits([0, 0, 1], 1)).toEqual('0.1');
    expect(formatUnits(10000000000000000000000000000n, 28)).toEqual('1.0');
    expect(formatUnits(1500000000000000000n)).toEqual('1.5');
  });
  it('function randomUUID should return distinct version 4 UUIDs', () => {
    const uuid = randomUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(randomUUID()).not.toEqual(uuid);
  });
});

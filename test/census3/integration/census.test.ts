import { EnvOptions, VocdoniCensus3Client } from '../../../src';

describe('Census3 censuses integration tests', () => {
  it('should return the supported censuses information', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const strategies = await client.getStrategies();
    if (strategies.length > 0) {
      const censuses = await client.getCensuses(strategies[0].ID);
      censuses.forEach((census) => {
        expect(census).toMatchObject({
          ID: expect.any(Number),
          strategyID: expect.any(Number),
          merkleRoot: expect.any(String),
          uri: expect.any(String),
          size: expect.any(Number),
          weight: expect.any(String),
          anonymous: expect.any(Boolean),
        });
      });
    }
  }, 15000);
  it('should return the census information', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const strategies = await client.getStrategies();
    if (strategies.length > 0) {
      const censuses = await client.getCensuses(strategies[0].ID);
      if (censuses.length > 0) {
        const census = await client.getCensus(censuses[0].ID);
        expect(census).toMatchObject({
          ID: expect.any(Number),
          strategyID: expect.any(Number),
          merkleRoot: expect.any(String),
          uri: expect.any(String),
          size: expect.any(Number),
          weight: expect.any(String),
          anonymous: expect.any(Boolean),
        });
      }
    }
  }, 15000);
});

import { EnvOptions, VocdoniCensus3Client } from '../../../src';

describe('Census3 service integration tests', () => {
  it('should return the supported chains information', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const supportedChains = await client.getSupportedChains();
    supportedChains.forEach((chain) => {
      expect(chain).toMatchObject({
        chainID: expect.any(Number),
        shortName: expect.any(String),
        name: expect.any(String),
      });
    });
  }, 5000);
});

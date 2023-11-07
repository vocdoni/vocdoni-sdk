import { EnvOptions, TokenCensus, VocdoniCensus3Client } from '../../../src';

describe('Census3 token integration tests', () => {
  it('should return the supported tokens', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const supportedTokens = await client.getSupportedTokens();
    supportedTokens.forEach((token) => {
      expect(token).toMatchObject({
        ID: expect.any(String),
        type: expect.any(String),
        startBlock: expect.any(Number),
        name: expect.any(String),
        symbol: expect.any(String),
        chainID: expect.any(Number),
        chainAddress: expect.any(String),
        status: expect.any(Object),
      });
    });
  }, 5000);
  it('should return the supported token types', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const supportedTypes = await client.getSupportedTypes();
    supportedTypes.forEach((type) => {
      expect(typeof type).toBe('string');
    });
  }, 5000);
  it('should return the given token', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const supportedTokens = await client.getSupportedTokens();
    if (supportedTokens.length > 0) {
      const token = await client.getToken(supportedTokens[0].ID, supportedTokens[0].chainID);
      expect(token).toMatchObject({
        ID: expect.any(String),
        type: expect.any(String),
        decimals: expect.any(Number),
        startBlock: expect.any(Number),
        symbol: expect.any(String),
        totalSupply: expect.any(String),
        name: expect.any(String),
        status: expect.any(Object),
        size: expect.any(Number),
        defaultStrategy: expect.any(Number),
        chainID: expect.any(Number),
        chainAddress: expect.any(String),
      });
    }
  }, 5000);
  it('should create the given token in the census3 service', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    try {
      await client.createToken('0xa117000000f279d81a1d3cc75430faa017fa5a2e', 'erc20', 1, null, ['test', 'test2'], 0);
    } catch (e) {}
    const token = await client.getToken('0xa117000000f279d81a1d3cc75430faa017fa5a2e', 1);
    expect(token).toMatchObject({
      ID: expect.any(String),
      type: expect.any(String),
      decimals: expect.any(Number),
      startBlock: expect.any(Number),
      symbol: expect.any(String),
      totalSupply: expect.any(String),
      name: expect.any(String),
      status: expect.any(Object),
      size: expect.any(Number),
      defaultStrategy: expect.any(Number),
      chainID: expect.any(Number),
      chainAddress: expect.any(String),
      tags: expect.any(Array),
    });
  }, 5000);
  it('should check if the given holder in a token exists', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const supportedTokens = await client.getSupportedTokens();
    if (supportedTokens.length > 0) {
      const randomHolder = await client.isHolderInToken(
        supportedTokens[0].ID,
        supportedTokens[0].chainID,
        '0x111000000000000000000000000000000000dEaD'
      );
      expect(randomHolder).toBeFalsy();
    }
  }, 5000);
  it('should create the default census from given token', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    let tokenCensus = null;
    try {
      tokenCensus = await client.createTokenCensus('0xa117000000f279D81A1D3cc75430fAA017FA5A2e', 1);
    } catch (e) {}

    if (tokenCensus) {
      expect(tokenCensus).toBeInstanceOf(TokenCensus);
      expect(tokenCensus).toMatchObject({
        censusId: expect.any(String),
        censusURI: expect.any(String),
        type: expect.any(String),
        weight: expect.any(BigInt),
        token: expect.any(Object),
      });
    }
  }, 35000);
});

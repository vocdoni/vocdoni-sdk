import { EnvOptions, VocdoniCensus3Client } from '../../../src';

describe('Census3 strategies integration tests', () => {
  it('should return the supported strategies', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const strategies = await client.getStrategies();
    strategies.forEach((strategy) => {
      expect(strategy).toMatchObject({
        ID: expect.any(Number),
        alias: expect.any(String),
        predicate: expect.any(String),
        uri: expect.any(String),
        tokens: expect.any(Object),
      });
    });
  }, 5000);
  it('should return the supported strategies by token', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const supportedTokens = await client.getSupportedTokens();
    if (supportedTokens.length > 0) {
      const strategies = await client.getStrategiesByToken(supportedTokens[0].ID, supportedTokens[0].chainID);
      strategies.forEach((strategy) => {
        expect(strategy).toMatchObject({
          ID: expect.any(Number),
          alias: expect.any(String),
          predicate: expect.any(String),
          uri: expect.any(String),
          tokens: expect.any(Object),
        });
        expect(strategy.tokens).toHaveProperty(supportedTokens[0].symbol);
      });
    }
  }, 5000);
  it('should return the given strategy', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const strategies = await client.getStrategies();
    if (strategies.length > 0) {
      const strategy = await client.getStrategy(strategies[0].ID);
      expect(strategy).toMatchObject({
        ID: expect.any(Number),
        alias: expect.any(String),
        predicate: expect.any(String),
        uri: expect.any(String),
        tokens: expect.any(Object),
      });
    }
  }, 5000);
  it('should return the given strategy size', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const strategies = await client.getStrategies();
    if (strategies.length > 0) {
      const size = await client.getStrategySize(strategies[0].ID);
      expect(typeof size).toBe('number');
    }
  }, 25000);
  it('should create a new strategy', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const supportedTokens = await client.getSupportedTokens();
    if (supportedTokens.length > 2) {
      const tokens = {
        [supportedTokens[0].symbol]: {
          ID: supportedTokens[0].ID,
          chainID: supportedTokens[0].chainID,
          minBalance: '10000',
        },
        [supportedTokens[1].symbol]: {
          ID: supportedTokens[1].ID,
          chainID: supportedTokens[1].chainID,
        },
        [supportedTokens[2].symbol]: {
          ID: supportedTokens[2].ID,
          chainID: supportedTokens[2].chainID,
          minBalance: '50',
        },
      };
      const strategyId = await client.createStrategy(
        'testStrategy_' + Date.now(),
        '(' + supportedTokens[0].symbol + ' OR ' + supportedTokens[1].symbol + ') AND ' + supportedTokens[2].symbol,
        tokens
      );
      expect(typeof strategyId).toBe('number');
    }
  }, 25000);
  it('should validate a predicate', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const supportedTokens = await client.getSupportedTokens();
    if (supportedTokens.length > 2) {
      const parsedPredicate = await client.validatePredicate(
        '(' + supportedTokens[0].symbol + ' OR ' + supportedTokens[1].symbol + ') AND ' + supportedTokens[2].symbol
      );
      expect(typeof parsedPredicate).toBe('object');
    }
  }, 5000);
  it('should return the supported strategies operators', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const operators = await client.getSupportedOperators();
    operators.operators.forEach((strategy) => {
      expect(strategy).toMatchObject({
        description: expect.any(String),
        tag: expect.any(String),
      });
    });
  }, 5000);
  it('should import a strategy from a given CID', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const cid = '';
    if (cid) {
      const importedStrategy = await client.importStrategy(cid);
      expect(importedStrategy).toMatchObject({
        ID: expect.any(Number),
        alias: expect.any(String),
        predicate: expect.any(String),
        uri: expect.any(String),
        tokens: expect.any(Object),
      });
    }
  }, 25000);
});

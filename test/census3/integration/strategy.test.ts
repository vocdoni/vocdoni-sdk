import { EnvOptions, VocdoniCensus3Client } from '../../../src';
import { isAddress } from '@ethersproject/address';
import { StrategyCensus } from '../../../src/types/census/census3/strategy';

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
  it('should return the holders by strategy', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const strategies = await client.getStrategies();
    if (strategies.length > 1) {
      const holders = await client.getStrategyHolders(strategies[1].ID, { pageSize: 10 });
      holders.holders.forEach((holder) => {
        expect(isAddress(holder.holder)).toBe(true);
        expect(typeof holder.weight).toBe('bigint');
      });
      expect(holders.pagination.pageSize).toBe(10);
      expect(isAddress(holders.pagination.nextCursor)).toBe(true);
      expect(isAddress(holders.pagination.prevCursor)).toBe(true);
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
  it('should return the given strategy estimation', async () => {
    const client = new VocdoniCensus3Client({ env: EnvOptions.DEV });
    const strategies = await client.getStrategies();
    if (strategies.length > 0) {
      const estimation = await client.getStrategyEstimation(strategies[0].ID);
      expect(typeof estimation).toBe('object');
      expect(typeof estimation.size).toBe('number');
      expect(typeof estimation.timeToCreateCensus).toBe('number');
      expect(typeof estimation.accuracy).toBe('number');
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
    operators.forEach((strategy) => {
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
  it('should create the census from the given strategy', async () => {
    const client = new VocdoniCensus3Client({
      env: EnvOptions.DEV,
      tx_wait: {
        retry_time: 10000,
        attempts: 20,
      },
    });
    const strategies = await client.getStrategies();
    if (strategies.length > 0) {
      let strategyCensus = null;
      try {
        strategyCensus = await client.createStrategyCensus(strategies[0].ID);
      } catch (e) {}
      expect(strategyCensus).toBeInstanceOf(StrategyCensus);
    }
  }, 435000);
});

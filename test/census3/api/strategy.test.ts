// @ts-ignore
import { URL } from './util/client.params';
import {
  Census3StrategyAPI,
  ErrInvalidStrategyPredicate,
  ErrNoEnoughtStrategyTokens,
  ErrNotFoundStrategy,
  ErrNotFoundToken,
} from '../../../src';

describe('Census3 strategy API tests', () => {
  it('should throw when fetching a non existent strategy', async () => {
    await expect(async () => {
      await Census3StrategyAPI.strategy(URL, 999999);
    }).rejects.toThrow(ErrNotFoundStrategy);
  }, 5000);
  it('should throw when creating a strategy with invalid token in predicate', async () => {
    await expect(async () => {
      await Census3StrategyAPI.create(URL, 'test_strategy', 'NO_EXISTS', {
        NO_EXISTS: {
          ID: '0x1324',
          chainID: 1,
          minBalance: '10000',
        },
      });
    }).rejects.toThrow(ErrNotFoundToken);
  }, 15000);
  it('should throw when creating a strategy with no token information', async () => {
    await expect(async () => {
      await Census3StrategyAPI.create(URL, 'test_strategy', 'NO_EXISTS', {});
    }).rejects.toThrow(ErrNoEnoughtStrategyTokens);
  }, 15000);
  it('should throw when validating an invalid predicate', async () => {
    await expect(async () => {
      await Census3StrategyAPI.validatePredicate(URL, 'DAxI XOOR (ANT OR ETH)');
    }).rejects.toThrow(ErrInvalidStrategyPredicate);
  }, 15000);
});

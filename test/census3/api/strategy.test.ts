// @ts-ignore
import { URL } from './util/client.params';
import { Census3StrategyAPI, ErrNotFoundStrategy } from '../../../src';

describe('Census3 strategy API tests', () => {
  it('should throw when fetching a non existent strategy', async () => {
    await expect(async () => {
      await Census3StrategyAPI.strategy(URL, 999999);
    }).rejects.toThrow(ErrNotFoundStrategy);
  }, 5000);
});

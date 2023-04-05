import { ChainAPI, ErrAPI } from '../../src';
// @ts-ignore
import { URL } from './util/client.params';

describe('Chain API tests', () => {
  it('should throw when asking for an invalid transaction', async () => {
    await expect(async () => {
      await ChainAPI.txInfo(URL, '0xReallyBad');
    }).rejects.toThrow(ErrAPI);
  }, 5000);
});

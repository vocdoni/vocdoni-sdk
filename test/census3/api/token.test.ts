// @ts-ignore
import { URL } from './util/client.params';
import { Census3TokenAPI, ErrCantGetToken, ErrNotFoundToken, ErrTokenAlreadyExists } from '../../../src';

describe('Census3 token API tests', () => {
  it('should throw when creating a non existent token', async () => {
    await expect(async () => {
      await Census3TokenAPI.create(URL, '0x0', 'erc20', 1, 0);
    }).rejects.toThrow(ErrCantGetToken);
  }, 5000);
  it('should throw when creating an already existent token', async () => {
    try {
      await Census3TokenAPI.create(URL, '0xa117000000f279d81a1d3cc75430faa017fa5a2e', 'erc20', 1, 0);
    } catch (e) {}
    await expect(async () => {
      await Census3TokenAPI.create(URL, '0xa117000000f279d81a1d3cc75430faa017fa5a2e', 'erc20', 1, 0);
    }).rejects.toThrow(ErrTokenAlreadyExists);
  }, 15000);
  it('should throw when fetching a non existent token', async () => {
    await expect(async () => {
      await Census3TokenAPI.token(URL, '0x0', 1);
    }).rejects.toThrow(ErrNotFoundToken);
  }, 5000);
});

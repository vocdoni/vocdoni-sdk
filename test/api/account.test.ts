import { AccountAPI } from '../../src';
// @ts-ignore
import { URL } from './util/client.params';
import { ErrAccountNotFound, ErrAddressMalformed } from '../../src';
import { Wallet } from '@ethersproject/wallet';

describe('Account API tests', () => {
  it('should throw when asking for an invalid account', async () => {
    await expect(async () => {
      await AccountAPI.info(URL, '0x1234');
    }).rejects.toThrow(ErrAddressMalformed);
  }, 5000);
  it('should throw when asking for a non existent account', async () => {
    const wallet = Wallet.createRandom();
    await expect(async () => {
      await AccountAPI.info(URL, wallet.address);
    }).rejects.toThrow(ErrAccountNotFound);
  }, 5000);
});

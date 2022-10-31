import { Wallet } from '@ethersproject/wallet';
import { VocdoniSDKClient } from '../../src';
import { Account } from '../../src';
import { strip0x } from '../../src/util/common';

describe('Account integration tests', () => {
  it('should bootstrap a new account', async () => {
    const wallet = Wallet.createRandom();
    const walletAddress = await wallet.getAddress();
    const client = new VocdoniSDKClient(process.env.API_URL, wallet);
    expect(await client.createAccount()).toStrictEqual({
      address: strip0x(walletAddress).toLowerCase(),
      balance: 0,
      electionIndex: 0,
      infoURL: 'ipfs://QmcjaM3MPrMVkoekEZU7ysuvR1qUNN3u56t79uXHR5CmpF',
      nonce: 0,
    });
  }, 75000);
  it('should bootstrap a new account and fetch tokens from faucet', async () => {
    const client = new VocdoniSDKClient(process.env.API_URL, Wallet.createRandom());
    const accountInfo = await client.createAccount({ getTokens: true });
    expect(accountInfo.balance).toBeGreaterThan(0);
  }, 75000);
  it('should bootstrap a new account and fetch tokens from faucet more than once', async () => {
    const client = new VocdoniSDKClient(process.env.API_URL, Wallet.createRandom());
    const accountInfo = await client.createAccount({ getTokens: true });
    expect(accountInfo.balance).toBeGreaterThan(0);

    await client
      .collectFaucetTokens()
      .then(finalAccountInfo => expect(finalAccountInfo.balance).toBeGreaterThan(accountInfo.balance));
  }, 75000);
  it('should bootstrap a new account and do nothing when creating it twice', async () => {
    const client = new VocdoniSDKClient(process.env.API_URL, Wallet.createRandom());
    const accountInfo = await client.createAccount();
    const accountInfoAfter = await client.createAccount();
    expect(accountInfo).toStrictEqual(accountInfoAfter);
  }, 75000);
  it('should set information for an account', async () => {
    const client = new VocdoniSDKClient(process.env.API_URL, Wallet.createRandom());

    const account = await client.createAccount({
      account: new Account({
        languages: ['es'],
        name: {
          es: 'test',
          asdasdsad: 'test',
          default: 'test',
        },
        description: 'description',
        feed: 'feed',
        avatar: 'avatar',
        header: 'header',
        logo: 'logo',
        meta: [
          { key: 'test', value: 'test' },
          { key: 'test2', value: 123 },
          { key: 'test3', value: [123, 456] },
          { key: 'test4', value: {} },
        ],
      }),
    });
    expect(account.infoURL).toEqual('ipfs://Qmcedb8V9zb4qkQvQdc8LjNhKrHbiQaoBEcgLsmDoTNXi1');
  }, 75000);
});

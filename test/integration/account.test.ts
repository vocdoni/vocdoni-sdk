import { Wallet } from '@ethersproject/wallet';
import { Account, VocdoniSDKClient } from '../../src';
import { strip0x } from '../../src/util/common';
import { FaucetAPI } from '../../src';
import { FAUCET_AUTH_TOKEN, FAUCET_URL } from '../../src/util/constants';
// @ts-ignore
import { clientParams } from './util/client.params';

let client: VocdoniSDKClient;
let wallet: Wallet;

beforeEach(async () => {
  wallet = Wallet.createRandom();
  client = new VocdoniSDKClient(clientParams(wallet));
});

describe('Account integration tests', () => {
  it('should bootstrap a new account and have the correct data', async () => {
    const walletAddress = await wallet.getAddress();
    const accountInfo = await client.createAccount();

    expect(accountInfo.address).toEqual(strip0x(walletAddress).toLowerCase());
    expect(accountInfo.balance).toBeGreaterThan(0);
    expect(accountInfo.electionIndex).toEqual(0);
    expect(accountInfo.infoURL).toEqual('ipfs://bagaaierag4icyuk3jcbabriqrjicorifpqeewjtblycdzghsgh2zqkek7mxq');
    expect(accountInfo.nonce).toEqual(0);
  }, 75000);
  it('should bootstrap a new account using a raw faucet package payload', async () => {
    const faucetPackage = await FaucetAPI.collect(FAUCET_URL.dev, FAUCET_AUTH_TOKEN.dev, await wallet.getAddress());
    const accountInfo = await client.createAccount({ faucetPackage: faucetPackage.faucetPackage });
    expect(accountInfo.balance).toBeGreaterThan(0);
  }, 75000);
  it('should bootstrap a new account and fetch tokens from faucet more than once', async () => {
    const accountInfo = await client.createAccount();
    expect(accountInfo.balance).toBeGreaterThan(0);

    await client
      .collectFaucetTokens()
      .then((finalAccountInfo) => expect(finalAccountInfo.balance).toBeGreaterThan(accountInfo.balance));
  }, 75000);
  it('should bootstrap a new account and do nothing when creating it twice', async () => {
    const accountInfo = await client.createAccount();
    const accountInfoAfter = await client.createAccount();
    expect(accountInfo).toStrictEqual(accountInfoAfter);
  }, 75000);
  it('should set information for an account', async () => {
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
    expect(account.infoURL).toEqual('ipfs://bagaaiera6sovylckaf45zt7blj7pr62ju2cmtk33hcq76vr3tteqncxyguka');
    expect(account.metadata.languages).toStrictEqual(['es']);
    expect(account.metadata.name).toStrictEqual({
      es: 'test',
      asdasdsad: 'test',
      default: 'test',
    });
    expect(account.metadata.meta).toStrictEqual({ test: 'test', test2: 123, test3: [123, 456], test4: {} });
  }, 75000);
  it('should set information for an account and then update it', async () => {
    await client.createAccount({
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
    const account = await client.updateAccountInfo(
      new Account({
        languages: ['es'],
        name: {
          es: 'test2',
          asdasdsad: 'test2',
          default: 'test2',
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
      })
    );
    expect(account.infoURL).toEqual('ipfs://bagaaieras2vfxq67cekncw4cqf3vxhmwnzamopnvzyn5uyrxtl5b5zlhnxna');
    expect(account.metadata.name).toStrictEqual({
      es: 'test2',
      asdasdsad: 'test2',
      default: 'test2',
    });
  }, 75000);
});

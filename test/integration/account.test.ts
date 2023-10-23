import { Wallet } from '@ethersproject/wallet';
import { Account, FaucetAPI, strip0x, VocdoniSDKClient } from '../../src';
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
    expect(accountInfo.infoURL).toEqual('ipfs://bafybeigv4mfmn3tyusbwmskfn6xhoyvv2i2svdq7pns6dphdivefr62k3q');
    expect(accountInfo.nonce).toEqual(0);
  }, 75000);
  it('should bootstrap a new account using a raw faucet package payload', async () => {
    const faucetUrl = process.env.FAUCET_URL ?? client.faucetService.url;
    const faucetPackage = await FaucetAPI.collect(faucetUrl, await wallet.getAddress());
    const accountInfo = await client.createAccount({ faucetPackage: faucetPackage.faucetPackage });
    expect(accountInfo.balance).toBeGreaterThan(0);
  }, 75000);
  it('should bootstrap a new account and fail when fetching tokens from faucet more than once', async () => {
    const accountInfo = await client.createAccount();
    expect(accountInfo.balance).toBeGreaterThan(0);
    await expect(async () => {
      await client.collectFaucetTokens();
    }).rejects;
  }, 75000);
  it('should bootstrap a new account and fetch tokens from raw faucet package', async () => {
    const accountInfo = await client.createAccount();
    expect(accountInfo.balance).toBeGreaterThan(0);

    await client
      .fetchFaucetPayload()
      .then((faucetPackage) => client.collectFaucetTokens(faucetPackage))
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
    expect(account.infoURL).toEqual('ipfs://bafybeigut3hara5spqfqgxrzlwjj7cp4avvdmcir4jdxaoyg3zlyfjdmfi');
    expect(account.account.languages).toStrictEqual(['es']);
    expect(account.account.name).toStrictEqual({
      es: 'test',
      asdasdsad: 'test',
      default: 'test',
    });
    expect(account.account.meta).toStrictEqual([
      { key: 'test', value: 'test' },
      { key: 'test2', value: 123 },
      { key: 'test3', value: [123, 456] },
      { key: 'test4', value: {} },
    ]);
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
    expect(account.infoURL).toEqual('ipfs://bafybeig3a7hb2nmjrppwk2ywcalbiliakvkuckerr57aoicez5nwk6vsh4');
    expect(account.account.name).toStrictEqual({
      es: 'test2',
      asdasdsad: 'test2',
      default: 'test2',
    });
  }, 75000);
  it('should send tokens from one account to another', async () => {
    const SEND_TX_COST = 1; // Ideally should be dynamic
    const TOKENS_AMOUNT = 10;

    const accountInfo = await client.createAccount();
    expect(accountInfo.balance).toBeGreaterThan(0);

    const destinationAccount = Wallet.createRandom();
    const destinationClient = new VocdoniSDKClient(clientParams(destinationAccount));
    const destinationInfo = await destinationClient.createAccount();
    expect(destinationInfo.balance).toBeGreaterThan(0);
    expect(destinationInfo.balance).toEqual(accountInfo.balance);

    await client
      .sendTokens({ to: destinationAccount.address, amount: TOKENS_AMOUNT })
      .then(() => client.fetchAccountInfo())
      .then((accountData) => expect(accountData.balance).toEqual(accountInfo.balance - TOKENS_AMOUNT - SEND_TX_COST))
      .then(() => destinationClient.fetchAccountInfo())
      .then((destinationData) => expect(destinationData.balance).toEqual(destinationInfo.balance + TOKENS_AMOUNT));
  }, 85000);
});

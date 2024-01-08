import { Wallet } from '@ethersproject/wallet';
import { AccountData, FaucetAPI, strip0x, VocdoniSDKClient } from '../../src';
// @ts-ignore
import { clientParams, setFaucetURL } from './util/client.params';

let client: VocdoniSDKClient;
let wallet: Wallet;

beforeEach(async () => {
  wallet = Wallet.createRandom();
  client = new VocdoniSDKClient(clientParams(wallet));
  client = setFaucetURL(client);
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
  it('should bootstrap a new account and do nothing when creating it twice', async () => {
    const accountInfo = await client.createAccount();
    const accountInfoAfter = await client.createAccount();
    expect(accountInfo).toStrictEqual(accountInfoAfter);
  }, 75000);
  it('should set information for an account', async () => {
    const account = await client.createAccount({
      accountData: AccountData.build({
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
        meta: {
          key1: { key: 'test', value: 'test' },
          key2: { key: 'test2', value: 123 },
          key3: { key: 'test3', value: [123, 456] },
          key4: { key: 'test4', value: {} },
        },
      }),
    });
    expect(account.infoURL).toEqual('ipfs://bafybeiay4ktvjfl6esemx5rstdpyjvd7ah46e4i2c6nad2vc3ol5qy7ely');
    expect(account.data.languages).toStrictEqual(['es']);
    expect(account.data.name).toStrictEqual({
      es: 'test',
      asdasdsad: 'test',
      default: 'test',
    });
    expect(account.data.meta).toStrictEqual({
      key1: { key: 'test', value: 'test' },
      key2: { key: 'test2', value: 123 },
      key3: { key: 'test3', value: [123, 456] },
      key4: { key: 'test4', value: {} },
    });
  }, 75000);
  it('should set information for an account and then update it', async () => {
    await client.createAccount({
      accountData: AccountData.build({
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
        meta: {
          key1: { key: 'test', value: 'test' },
          key2: { key: 'test2', value: 123 },
          key3: { key: 'test3', value: [123, 456] },
          key4: { key: 'test4', value: {} },
        },
      }),
    });
    const account = await client.updateAccountInfo(
      AccountData.build({
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
        meta: {
          key1: { key: 'test', value: 'test' },
          key2: { key: 'test2', value: 123 },
          key3: { key: 'test3', value: [123, 456] },
          key4: { key: 'test4', value: {} },
        },
      })
    );
    expect(account.infoURL).toEqual('ipfs://bafybeigyeqf6qefecyn7ypcoakep67272cq7kym6vuh6qitu3hxdalgyua');
    expect(account.data.name).toStrictEqual({
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
    let destinationClient = new VocdoniSDKClient(clientParams(destinationAccount));
    destinationClient = setFaucetURL(destinationClient);
    const destinationInfo = await destinationClient.createAccount();
    expect(destinationInfo.balance).toBeGreaterThan(0);
    expect(destinationInfo.balance).toEqual(accountInfo.balance);

    await client
      .sendTokens({ to: destinationAccount.address, amount: TOKENS_AMOUNT })
      .then(() => client.fetchAccount())
      .then((accountData) => expect(accountData.balance).toEqual(accountInfo.balance - TOKENS_AMOUNT - SEND_TX_COST))
      .then(() => destinationClient.fetchAccount())
      .then((destinationData) => expect(destinationData.balance).toEqual(destinationInfo.balance + TOKENS_AMOUNT));
  }, 85000);
});

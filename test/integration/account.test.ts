import { Wallet } from '@ethersproject/wallet';
import { VocdoniSDKClient } from '../../src';

describe('Account integration tests', () => {
  it('should bootstrap a new account and fetch tokens from faucet', async () => {
    const client = new VocdoniSDKClient(process.env.API_URL, Wallet.createRandom());
    expect(await client.ensureAccount()).toBeTruthy();

    await client.fetchAccountInfo().then(accountInfo => expect(accountInfo.balance).toBeGreaterThan(0));
  }, 75000);
  it('should bootstrap a new account and fetch tokens from faucet more than once', async () => {
    const client = new VocdoniSDKClient(process.env.API_URL, Wallet.createRandom());
    expect(await client.ensureAccount()).toBeTruthy();

    const accountInfo = await client.fetchAccountInfo();

    expect(await client.ensureAccount()).toBeTruthy();
    await client
      .fetchAccountInfo()
      .then(finalAccountInfo => expect(finalAccountInfo.balance).toBeGreaterThan(accountInfo.balance));
  }, 75000);
});

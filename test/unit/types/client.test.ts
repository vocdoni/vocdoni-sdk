import { EnvOptions, VocdoniSDKClient } from '../../../src';
import { API_URL, FAUCET_AUTH_TOKEN, FAUCET_URL } from '../../../src/util/constants';
import { Wallet } from '@ethersproject/wallet';

describe('Client tests', () => {
  it('should have the correct type', () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.DEV });
    expect(client).toBeInstanceOf(VocdoniSDKClient);
  });
  it('should have the correct default values for development environment', () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.DEV });
    expect(client.url).toEqual(API_URL.dev);
    expect(client.faucet.url).toEqual(FAUCET_URL.dev);
    expect(client.faucet.auth_token).toEqual(FAUCET_AUTH_TOKEN.dev);
    expect(client.faucet.token_limit).toBeUndefined();
  });
  it('should have the correct default values for staging environment', () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.STG });
    expect(client.url).toEqual(API_URL.stg);
    expect(client.faucet.url).toEqual(FAUCET_URL.stg);
    expect(client.faucet.auth_token).toEqual(FAUCET_AUTH_TOKEN.stg);
    expect(client.faucet.token_limit).toBeUndefined();
  });
  it('should have the correct default values for production environment', () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.PROD });
    expect(client.url).toEqual(API_URL.prod);
    expect(client.faucet.url).toBeUndefined();
    expect(client.faucet.auth_token).toBeUndefined();
    expect(client.faucet.token_limit).toBeUndefined();
  });
  it('should throw when trying to fetch tokens without wallet or signer', async () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.DEV });
    await expect(async () => {
      await client.fetchFaucetPayload();
    }).rejects.toThrow('No wallet or signer set');
  });
  it('should throw when trying to fetch tokens from production environment', async () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.PROD, wallet: Wallet.createRandom() });
    await expect(async () => {
      await client.fetchFaucetPayload();
    }).rejects.toThrow('No faucet URL');
  });
  it('should calculate the deterministic wallet based on data', async () => {
    const w1 = VocdoniSDKClient.generateWalletFromData('test');
    const w2 = VocdoniSDKClient.generateWalletFromData(['test']);
    const w3 = VocdoniSDKClient.generateWalletFromData('randomtest');
    const w4 = VocdoniSDKClient.generateWalletFromData(['random', 'test']);
    expect(w1.address).toEqual('0xC08B5542D177ac6686946920409741463a15dDdB');
    expect(w1.address).toEqual(w2.address);
    expect(w3.address).toEqual('0x3b4B77B8B87a9b429929fe4E8C3A6441533d1495');
    expect(w3.address).toEqual(w4.address);
  });
});

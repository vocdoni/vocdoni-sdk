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
});

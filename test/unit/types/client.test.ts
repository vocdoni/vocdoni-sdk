import { Wallet } from '@ethersproject/wallet';
import { EnvOptions, VocdoniSDKClient } from '../../../src';
import { API_URL, FAUCET_AUTH_TOKEN, FAUCET_URL, TX_WAIT_OPTIONS } from '../../../src/util/constants';

describe('Client tests', () => {
  it('should have the correct type', () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.DEV });
    expect(client).toBeInstanceOf(VocdoniSDKClient);
  });
  it('should have the correct default values for development environment', () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.DEV });
    expect(client.url).toEqual(API_URL.dev);
    expect(client.faucetService.url).toEqual(FAUCET_URL.dev);
    expect(client.faucetService.auth_token).toEqual(FAUCET_AUTH_TOKEN.dev);
    expect(client.faucetService.token_limit).toBeUndefined();
    expect(client.chainService.txWait.retryTime).toEqual(TX_WAIT_OPTIONS.retry_time);
    expect(client.chainService.txWait.attempts).toEqual(TX_WAIT_OPTIONS.attempts);
  });
  it('should have the correct default values for staging environment', () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.STG });
    expect(client.url).toEqual(API_URL.stg);
    expect(client.faucetService.url).toEqual(FAUCET_URL.stg);
    expect(client.faucetService.auth_token).toEqual(FAUCET_AUTH_TOKEN.stg);
    expect(client.faucetService.token_limit).toBeUndefined();
    expect(client.chainService.txWait.retryTime).toEqual(TX_WAIT_OPTIONS.retry_time);
    expect(client.chainService.txWait.attempts).toEqual(TX_WAIT_OPTIONS.attempts);
  });
  it('should have the correct default values for production environment', () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.PROD });
    expect(client.url).toEqual(API_URL.prod);
    expect(client.faucetService.url).toBeUndefined();
    expect(client.faucetService.auth_token).toBeUndefined();
    expect(client.faucetService.token_limit).toBeUndefined();
    expect(client.chainService.txWait.retryTime).toEqual(TX_WAIT_OPTIONS.retry_time);
    expect(client.chainService.txWait.attempts).toEqual(TX_WAIT_OPTIONS.attempts);
  });
  it('should have the correct given values for transaction waiting options', () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.DEV, tx_wait: { retry_time: 1000, attempts: 10 } });
    expect(client.chainService.txWait.retryTime).toEqual(1000);
    expect(client.chainService.txWait.attempts).toEqual(10);
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
  it('should assign a random Wallet to the client and return the private key', async () => {
    const client = new VocdoniSDKClient({ env: EnvOptions.DEV });
    const privateKey = client.generateRandomWallet();
    expect(client.wallet).toBeInstanceOf(Wallet);
    if (client.wallet instanceof Wallet) {
      expect(privateKey).toEqual(client.wallet.privateKey);
    }
  });
});

import { ClientOptions, EnvOptions } from '../../../src';
import { Wallet } from '@ethersproject/wallet';
import { VocdoniSDKClient } from '@vocdoni/sdk';

export const clientParams = (wallet?: Wallet): ClientOptions => ({
  env: EnvOptions.DEV,
  api_url: process.env.API_URL,
  wallet: wallet ?? Wallet.createRandom(),
});

export const setFaucetURL = (client: VocdoniSDKClient): VocdoniSDKClient => {
  client.faucetService.url = process.env.FAUCET_URL ?? client.faucetService.url;
  return client;
};

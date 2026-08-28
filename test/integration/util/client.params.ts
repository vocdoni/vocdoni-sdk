import { ClientOptions, EnvOptions, VocdoniSDKClient } from '../../../src';
import { Wallet } from '@ethersproject/wallet';
// @ts-ignore
import { requireEnv } from '../../util/env';

export const clientParams = (wallet?: Wallet): ClientOptions => ({
  env: EnvOptions.DEV,
  api_url: requireEnv('API_URL'),
  wallet: wallet ?? Wallet.createRandom(),
});

export const setFaucetURL = (client: VocdoniSDKClient): VocdoniSDKClient => {
  client.faucetService.url = requireEnv('FAUCET_URL');
  return client;
};

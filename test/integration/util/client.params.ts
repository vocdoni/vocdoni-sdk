import { ClientOptions, EnvOptions } from '../../../src';
import { Wallet } from '@ethersproject/wallet';

export const clientParams = (wallet?: Wallet): ClientOptions => ({
  env: EnvOptions.DEV,
  api_url: process.env.API_URL,
  wallet: wallet ?? Wallet.createRandom(),
});

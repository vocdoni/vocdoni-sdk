import { API_URL } from '../../../src/util/constants';
import { VocdoniSDKClient } from '../../../src';

export const URL = process.env.API_URL ?? API_URL.dev;

export const setFaucetURL = (client: VocdoniSDKClient): VocdoniSDKClient => {
  client.faucetService.url = process.env.FAUCET_URL ?? client.faucetService.url;
  return client;
};

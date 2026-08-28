import { VocdoniSDKClient } from '../../../src';
// @ts-ignore
import { requireEnv } from '../../util/env';

export const URL = requireEnv('API_URL');

export const setFaucetURL = (client: VocdoniSDKClient): VocdoniSDKClient => {
  client.faucetService.url = requireEnv('FAUCET_URL');
  return client;
};

import { EnvOptions, VocdoniSDKClient, VocdoniCensus3Client } from '@vocdoni/sdk';
import { Wallet } from '@ethersproject/wallet';

export const getDefaultClient = () => {
  const wallet = Wallet.createRandom();
  const client = new VocdoniSDKClient({
    env: EnvOptions.STG,
    wallet: wallet,
  });

  return client;
};

export const getDefaultCensus3Client = () => {
  return new VocdoniCensus3Client({ env: EnvOptions.STG });
};

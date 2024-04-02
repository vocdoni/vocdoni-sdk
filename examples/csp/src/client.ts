import { EnvOptions, VocdoniSDKClient } from '@vocdoni/sdk';
import { Wallet } from '@ethersproject/wallet';

export const getDefaultClient = () => {
  const wallet = Wallet.createRandom();
  const client = new VocdoniSDKClient({
    env: EnvOptions.STG,
    wallet: wallet,
  });

  return { wallet, client };
};

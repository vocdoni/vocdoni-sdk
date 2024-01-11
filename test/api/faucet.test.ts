import { EnvOptions, ErrFaucetAlreadyFunded, VocdoniSDKClient } from '../../src';
// @ts-ignore
import { URL, setFaucetURL } from './util/client.params';
import { Wallet } from '@ethersproject/wallet';

let client: VocdoniSDKClient;
let wallet: Wallet;

beforeEach(async () => {
  wallet = Wallet.createRandom();
  client = new VocdoniSDKClient({
    env: EnvOptions.DEV,
    api_url: URL,
    wallet,
  });
  client = setFaucetURL(client);
});

describe('Faucet API tests', () => {
  it('should throw trying to requests tokens twice', async () => {
    await client.createAccount();
    await expect(async () => {
      try {
        await client.collectFaucetTokens();
      } catch (e) {
        expect(e.untilDate).toBeInstanceOf(Date);
        throw e;
      }
    }).rejects.toThrow(ErrFaucetAlreadyFunded);
  }, 85000);
});

import { CspService, Election, CspCensus, VocdoniSDKClient, EnvOptions } from '../../src';
// @ts-ignore
import { setFaucetURL, URL } from './util/client.params';
import { Wallet } from '@ethersproject/wallet';
// @ts-ignore
import { requireEnv } from '../util/env';

const service = new CspService({});

const CSP_URL = requireEnv('BLINDCSP_URL');
const CSP_PUBKEY = requireEnv('BLINDCSP_PUBKEY');

const createElection = async () => {
  const census = new CspCensus(CSP_PUBKEY, CSP_URL);

  let client = new VocdoniSDKClient({
    env: EnvOptions.DEV,
    api_url: URL,
    wallet: Wallet.createRandom(),
  });
  client = setFaucetURL(client);

  const election = Election.from({
    title: 'Election title',
    description: 'Election description',
    header: 'https://source.unsplash.com/random',
    streamUri: 'https://source.unsplash.com/random',
    endDate: new Date().getTime() + 10000000,
    census,
    maxCensusSize: 10,
  });

  election.addQuestion('This is a title', 'This is a description', [
    {
      title: 'Option 1',
      value: 0,
    },
    {
      title: 'Option 2',
      value: 1,
    },
  ]);

  return client
    .createAccount()
    .then(() => client.createElection(election))
    .then((electionId) => client.fetchElection(electionId));
};

describe('Csp Service tests', () => {
  it('should have the correct type and properties', () => {
    expect(service).toBeInstanceOf(CspService);
    expect(service.url).toBeUndefined();
    expect(service.info).toBeUndefined();
  });
  it('should throw when fetching info without URL', async () => {
    await expect(async () => {
      await service.setInfo();
    }).rejects.toThrow();
  });
  it('should fetch the correct URL', async () => {
    const election = await createElection();
    service.setUrlFromElection(election);
    expect(service.url).toEqual(CSP_URL);
    expect(service.info).toBeUndefined();
  }, 285000);
  it('should fetch the info', async () => {
    await service.setInfo();
    expect(service.info).toBeDefined();
  }, 285000);
});

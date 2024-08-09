import {
  Election,
  ElectionAPI,
  EnvOptions,
  ErrCantParseElectionID,
  ErrElectionNotFound,
  ErrNoElectionKeys,
  PlainCensus,
  VocdoniSDKClient,
} from '../../src';
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

const createElection = (census, electionType?, voteType?) => {
  const election = Election.from({
    title: 'SDK Testing - Title',
    description: 'SDK Testing - Description',
    startDate: new Date().getTime() + 10000000,
    endDate: new Date().getTime() + 20000000,
    census,
    electionType: electionType ?? null,
    voteType: voteType ?? null,
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

  return election;
};

describe('Election API tests', () => {
  it('should throw when asking for an invalid election', async () => {
    await expect(async () => {
      await ElectionAPI.info(URL, '0xReallyBad');
    }).rejects.toThrow(ErrCantParseElectionID);
    await expect(async () => {
      await ElectionAPI.keys(URL, '0xReallyBad');
    }).rejects.toThrow(ErrCantParseElectionID);
  }, 15000);
  it('should throw when asking for a non existent election', async () => {
    await expect(async () => {
      await ElectionAPI.info(URL, '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFdeadbeef');
    }).rejects.toThrow(ErrElectionNotFound);
    await expect(async () => {
      await ElectionAPI.keys(URL, '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFdeadbeef');
    }).rejects.toThrow(ErrElectionNotFound);
  }, 15000);
  it('should throw when asking for the keys of an election which is not encrypted', async () => {
    const voter = Wallet.createRandom();
    const census = new PlainCensus();
    census.add(await voter.getAddress());

    const election = createElection(census);
    await client.createAccount();
    const electionId = await client.createElection(election);

    await expect(async () => {
      await ElectionAPI.keys(URL, electionId);
    }).rejects.toThrow(ErrNoElectionKeys);
  }, 85000);
});

import { Election, EnvOptions, PlainCensus, VocdoniSDKClient, Vote } from '../../src';
// @ts-ignore
import { URL } from './util/client.params';
import { ErrElectionNotStarted } from '../../src/api/errors';
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

describe('Vote API tests', () => {
  it('should throw trying to vote when election has not started', async () => {
    const voter = Wallet.createRandom();
    const census = new PlainCensus();
    census.add(await voter.getAddress());

    const election = createElection(census);
    await client.createAccount();
    const electionId = await client.createElection(election);

    client.wallet = voter;
    client.setElectionId(electionId);
    const vote = new Vote([1]);

    await expect(async () => {
      await client.submitVote(vote);
    }).rejects.toThrow(ErrElectionNotStarted);
  }, 85000);
});

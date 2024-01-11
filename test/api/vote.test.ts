import {
  Election,
  ElectionStatus,
  EnvOptions,
  ErrElectionFinished,
  ErrElectionNotStarted,
  PlainCensus,
  VocdoniSDKClient,
  Vote,
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
    startDate: new Date().getTime() + 12000,
    endDate: new Date().getTime() + 24000,
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
  it('should throw trying to vote when election has not started and when is already finished', async () => {
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

    let publishedElection;
    do {
      publishedElection = await client.fetchElection(electionId);
    } while (publishedElection.status !== ElectionStatus.ENDED);

    await expect(async () => {
      await client.submitVote(vote);
    }).rejects.toThrow(ErrElectionFinished);
  }, 120000);
});

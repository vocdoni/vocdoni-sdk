import { computePublicKey } from '@ethersproject/signing-key';
import { Wallet } from '@ethersproject/wallet';
import { Election, PlainCensus, VocdoniSDKClient, Vote, WeightedCensus } from '../../src';
import { delay } from '../../src/util/common';

let client: VocdoniSDKClient;
let creator: Wallet;

beforeEach(async () => {
  creator = Wallet.createRandom();
  client = new VocdoniSDKClient(process.env.API_URL, creator);
}, 15000);

const createElection = (census) => {
  const election = new Election({
    title: 'Election title',
    description: 'Election description',
    header: 'https://source.unsplash.com/random',
    streamUri: 'https://source.unsplash.com/random',
    endDate: new Date().getTime() + 10000000,
    census,
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

describe('Election integration tests', () => {
  it('should create an election with public keys census', async () => {
    const census = new PlainCensus();
    census.add(computePublicKey(Wallet.createRandom().publicKey, true));
    census.add(computePublicKey(Wallet.createRandom().publicKey, true));
    census.add(computePublicKey(Wallet.createRandom().publicKey, true));
    const voter = Wallet.createRandom();
    census.add(computePublicKey(voter.publicKey, true));

    const election = createElection(census);

    await client.createAccount();

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        return delay(25000);
      })
      .then(() => {
        client.wallet = voter;
        const vote = new Vote([1]);
        return client.submitVote(vote);
      })
      .then((voteHash) => expect(voteHash).toMatch(/^[0-9a-fA-F]{64}$/));
  }, 85000);
  it('should create an election with addresses census', async () => {
    const census = new PlainCensus();

    census.add(await Wallet.createRandom().getAddress());
    census.add(await Wallet.createRandom().getAddress());
    census.add(await Wallet.createRandom().getAddress());
    const voter = Wallet.createRandom();
    census.add(await voter.getAddress());

    const election = createElection(census);

    await client.createAccount();

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        return delay(25000);
      })
      .then(() => {
        client.wallet = voter;
        const vote = new Vote([1]);
        return client.submitVote(vote);
      })
      .then((voteHash) => expect(voteHash).toMatch(/^[0-9a-fA-F]{64}$/));
  }, 85000);
  it('should create an election with 100 participants and each of them should vote correctly', async () => {
    const numVotes = 100; // should be even number
    const census = new PlainCensus();

    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());
    census.add(participants.map((participant) => participant.address));

    const election = createElection(census);

    await client.createAccount();

    let electionIdentifier;

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        electionIdentifier = electionId;
        return delay(12000);
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant, index) => {
            client = new VocdoniSDKClient(process.env.API_URL, participant, electionIdentifier);
            return client.submitVote(new Vote([index % 2]));
          })
        )
      )
      .then(() => client.fetchElection())
      .then((electionData) => {
        expect(electionData.voteCount).toEqual(numVotes);
        expect(electionData.result[0][0]).toEqual(electionData.result[0][1]);
      });
  }, 285000);
  it('should create an election with 100 weighted participants and each of them should vote correctly', async () => {
    const numVotes = 100; // should be even number
    const census = new WeightedCensus();

    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());
    census.add(
      participants.map((participant, index) => ({
        key: participant.address,
        weight: BigInt(index + 1),
      }))
    );

    const election = createElection(census);

    await client.createAccount();

    let electionIdentifier;

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        electionIdentifier = electionId;
        return delay(12000);
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant, index) => {
            client = new VocdoniSDKClient(process.env.API_URL, participant, electionIdentifier);
            return client.submitVote(new Vote([index % 2]));
          })
        )
      )
      .then(() => client.fetchElection())
      .then((electionData) => {
        expect(electionData.voteCount).toEqual(numVotes);
        expect(+electionData.result[0][0]).toBeLessThan(+electionData.result[0][1]);
        expect(+electionData.result[0][0] + +electionData.result[0][1]).toEqual((numVotes * (numVotes + 1)) / 2);
        expect(+electionData.result[0][0]).toEqual(+electionData.result[0][1] - numVotes / 2);
      });
  }, 285000);
});

import { computePublicKey } from '@ethersproject/signing-key';
import { Wallet } from '@ethersproject/wallet';
import { Election, EnvOptions, PlainCensus, VocdoniSDKClient, Vote, WeightedCensus } from '../../src';
import { delay } from '../../src/util/common';
import { ElectionStatus } from '../../src/core/election';

let client: VocdoniSDKClient;
let creator: Wallet;

beforeEach(async () => {
  creator = Wallet.createRandom();
  client = new VocdoniSDKClient({
    env: EnvOptions.DEV,
    api_url: process.env.API_URL,
    wallet: creator,
  });
}, 15000);

const createElection = (census, electionType?) => {
  const election = Election.from({
    title: 'Election title',
    description: 'Election description',
    header: 'https://source.unsplash.com/random',
    streamUri: 'https://source.unsplash.com/random',
    endDate: new Date().getTime() + 10000000,
    census,
    electionType: electionType ?? null,
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
      .then((voteId) => expect(voteId).toMatch(/^[0-9a-fA-F]{64}$/));
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
      .then((voteId) => expect(voteId).toMatch(/^[0-9a-fA-F]{64}$/));
  }, 85000);
  it('should create an election with 10 participants and each of them should vote correctly', async () => {
    const numVotes = 10; // should be even number
    const census = new PlainCensus();

    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());
    census.add(participants.map((participant) => participant.address));

    const unpublishedElection = createElection(census);

    await client.createAccount();

    let electionIdentifier;

    await client
      .createElection(unpublishedElection)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        electionIdentifier = electionId;
        return delay(12000);
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant, index) => {
            const pClient = new VocdoniSDKClient({
              env: EnvOptions.DEV,
              wallet: participant,
              electionId: electionIdentifier,
            });
            const isAbleToVote = await pClient.isAbleToVote();
            expect(isAbleToVote).toBeTruthy();
            return pClient.submitVote(new Vote([index % 2]));
          })
        )
      )
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.id).toEqual(electionIdentifier);
        expect(election.title).toEqual(unpublishedElection.title);
        expect(election.voteCount).toEqual(numVotes);
        expect(election.results[0][0]).toEqual(election.results[0][1]);
      });
  }, 285000);
  it('should create an election with 10 weighted participants and each of them should vote correctly', async () => {
    const numVotes = 10; // should be even number
    const census = new WeightedCensus();

    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());
    census.add(
      participants.map((participant, index) => ({
        key: participant.address,
        weight: BigInt(index + 1),
      }))
    );

    const unpublishedElection = createElection(census);

    await client.createAccount();

    let electionIdentifier;

    await client
      .createElection(unpublishedElection)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        electionIdentifier = electionId;
        return delay(12000);
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant, index) => {
            const pClient = new VocdoniSDKClient({
              env: EnvOptions.DEV,
              wallet: participant,
              electionId: electionIdentifier,
            });
            const isAbleToVote = await pClient.isAbleToVote();
            expect(isAbleToVote).toBeTruthy();
            return pClient.submitVote(new Vote([index % 2]));
          })
        )
      )
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.id).toEqual(electionIdentifier);
        expect(election.title).toEqual(unpublishedElection.title);
        expect(election.voteCount).toEqual(numVotes);
        expect(+election.results[0][0]).toBeLessThan(+election.results[0][1]);
        expect(+election.results[0][0] + +election.results[0][1]).toEqual((numVotes * (numVotes + 1)) / 2);
        expect(+election.results[0][0]).toEqual(+election.results[0][1] - numVotes / 2);
      });
  }, 285000);
  it('should create an encrypted election with 10 participants and each of them should vote correctly', async () => {
    const numVotes = 10; // should be even number
    const census = new PlainCensus();

    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());
    census.add(participants.map((participant) => participant.address));

    const unpublishedElection = createElection(census, {
      secretUntilTheEnd: true,
    });

    await client.createAccount();

    let electionIdentifier;

    await client
      .createElection(unpublishedElection)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        electionIdentifier = electionId;
        return delay(12000);
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant, index) => {
            const pClient = new VocdoniSDKClient({
              env: EnvOptions.DEV,
              wallet: participant,
              electionId: electionIdentifier,
            });
            const isAbleToVote = await pClient.isAbleToVote();
            expect(isAbleToVote).toBeTruthy();
            return pClient.submitVote(new Vote([index % 2]));
          })
        )
      )
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.id).toEqual(electionIdentifier);
        expect(election.title).toEqual(unpublishedElection.title);
        expect(election.voteCount).toEqual(numVotes);
        expect(election.finalResults).toBeFalsy();
      });
  }, 285000);
  it('should create an election and end it successfully', async () => {
    const census = new PlainCensus();
    census.add(await Wallet.createRandom().getAddress());
    await client.createAccount();

    const unpublishedElection = createElection(census);

    await client
      .createElection(unpublishedElection)
      .then((electionId) => {
        client.setElectionId(electionId);
        return client.fetchElection();
      })
      .then((election) => {
        expect(election.status).toEqual(ElectionStatus.READY);
        return client.endElection();
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.status).toEqual(ElectionStatus.ENDED);
      });
  }, 85000);
  it('should create an election and pause it successfully', async () => {
    const census = new PlainCensus();
    census.add(await Wallet.createRandom().getAddress());
    await client.createAccount();

    const unpublishedElection = createElection(census);

    await client
      .createElection(unpublishedElection)
      .then((electionId) => {
        client.setElectionId(electionId);
        return client.fetchElection();
      })
      .then((election) => {
        expect(election.status).toEqual(ElectionStatus.READY);
        return client.pauseElection();
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.status).toEqual(ElectionStatus.PAUSED);
      });
  }, 85000);
  it('should create an election and cancel it successfully', async () => {
    const census = new PlainCensus();
    census.add(await Wallet.createRandom().getAddress());
    await client.createAccount();

    const unpublishedElection = createElection(census);

    await client
      .createElection(unpublishedElection)
      .then((electionId) => {
        client.setElectionId(electionId);
        return client.fetchElection();
      })
      .then((election) => {
        expect(election.status).toEqual(ElectionStatus.READY);
        return client.cancelElection();
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.status).toEqual(ElectionStatus.CANCELED);
      });
  }, 85000);
  it('should create an election, pause it and then continue successfully', async () => {
    const census = new PlainCensus();
    census.add(await Wallet.createRandom().getAddress());
    await client.createAccount();

    const unpublishedElection = createElection(census);

    await client
      .createElection(unpublishedElection)
      .then((electionId) => {
        client.setElectionId(electionId);
        return client.fetchElection();
      })
      .then((election) => {
        expect(election.status).toEqual(ElectionStatus.READY);
        return client.pauseElection();
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.status).toEqual(ElectionStatus.PAUSED);
        return client.continueElection();
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.status).toEqual(ElectionStatus.READY);
      });
  }, 85000);
});

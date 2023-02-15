import { computePublicKey } from '@ethersproject/signing-key';
import { Wallet } from '@ethersproject/wallet';
import { Election, PlainCensus, VocdoniSDKClient, Vote, WeightedCensus } from '../../src';
import { delay } from '../../src/util/common';
import { ElectionStatus } from '../../src/core/election';
// @ts-ignore
import { clientParams } from './util/client.params';

let client: VocdoniSDKClient;
let wallet: Wallet;

beforeEach(async () => {
  wallet = Wallet.createRandom();
  client = new VocdoniSDKClient(clientParams(wallet));
});

const createElection = (census, electionType?, voteType?) => {
  const election = Election.from({
    title: 'SDK Testing - Title',
    description: 'SDK Testing - Description',
    endDate: new Date().getTime() + 10000000,
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
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionIdentifier);
            const isInCensus = await pClient.isInCensus();
            expect(isInCensus).toBeTruthy();
            const hasAlreadyVoted = await pClient.hasAlreadyVoted();
            expect(hasAlreadyVoted).toBeFalsy();
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
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant) => {
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionIdentifier);
            const isInCensus = await pClient.isInCensus();
            expect(isInCensus).toBeTruthy();
            const hasAlreadyVoted = await pClient.hasAlreadyVoted();
            expect(hasAlreadyVoted).toBeTruthy();
            const isAbleToVote = await pClient.isAbleToVote();
            expect(isAbleToVote).toBeFalsy();
          })
        )
      );
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
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionIdentifier);
            const isInCensus = await pClient.isInCensus();
            expect(isInCensus).toBeTruthy();
            const hasAlreadyVoted = await pClient.hasAlreadyVoted();
            expect(hasAlreadyVoted).toBeFalsy();
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
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant) => {
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionIdentifier);
            const isInCensus = await pClient.isInCensus();
            expect(isInCensus).toBeTruthy();
            const hasAlreadyVoted = await pClient.hasAlreadyVoted();
            expect(hasAlreadyVoted).toBeTruthy();
            const isAbleToVote = await pClient.isAbleToVote();
            expect(isAbleToVote).toBeFalsy();
          })
        )
      );
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
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionIdentifier);
            const isInCensus = await pClient.isInCensus();
            expect(isInCensus).toBeTruthy();
            const hasAlreadyVoted = await pClient.hasAlreadyVoted();
            expect(hasAlreadyVoted).toBeFalsy();
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
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant) => {
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionIdentifier);
            const isInCensus = await pClient.isInCensus();
            expect(isInCensus).toBeTruthy();
            const hasAlreadyVoted = await pClient.hasAlreadyVoted();
            expect(hasAlreadyVoted).toBeTruthy();
            const isAbleToVote = await pClient.isAbleToVote();
            expect(isAbleToVote).toBeFalsy();
          })
        )
      );
  }, 285000);
  it('should create an election with overwrite votes allowed 2 times and 4 participants and each of them should vote correctly all times', async () => {
    const numVotes = 4; // should be even number
    const resendVoteCount = 2; // number of send vote retries
    const census = new PlainCensus();

    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());
    census.add(participants.map((participant) => participant.address));

    const unpublishedElection = createElection(
      census,
      {},
      {
        maxVoteOverwrites: resendVoteCount,
      }
    );

    await client.createAccount();

    let electionIdentifier;
    let totalNumVotes = 0;

    await client
      .createElection(unpublishedElection)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        electionIdentifier = electionId;
        return delay(12000);
      })
      .then(async () => {
        for (let i = 0; i <= resendVoteCount; i++) {
          await Promise.all(
            participants.map(async (participant, index) => {
              const pClient = new VocdoniSDKClient(clientParams(participant));
              pClient.setElectionId(electionIdentifier);
              const isInCensus = await pClient.isInCensus();
              expect(isInCensus).toBeTruthy();
              const hasAlreadyVoted = await pClient.hasAlreadyVoted();
              expect(hasAlreadyVoted).toBe(i !== 0);
              const isAbleToVote = await pClient.isAbleToVote();
              expect(isAbleToVote).toBeTruthy();
              const votesLeft = await pClient.votesLeftCount();
              expect(votesLeft).toBe(resendVoteCount - i + 1);

              await pClient.submitVote(new Vote([index % 2]));
              totalNumVotes++;

              const isAbleToVoteAfterVote = await pClient.isAbleToVote();
              expect(isAbleToVoteAfterVote).toBe(i !== resendVoteCount);
              const votesLeftAfterVote = await pClient.votesLeftCount();
              expect(votesLeftAfterVote).toBe(resendVoteCount - i);
            })
          );
        }
        expect(totalNumVotes).toBe((resendVoteCount + 1) * participants.length);
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.id).toEqual(electionIdentifier);
        expect(election.title).toEqual(unpublishedElection.title);
        //expect(election.voteCount).toEqual(numVotes); @TODO fix when backend returns the correct result
        expect(election.voteCount).toEqual((resendVoteCount + 1) * participants.length);
        expect(election.results[0][0]).toEqual(election.results[0][1]);
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant) => {
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionIdentifier);
            const isInCensus = await pClient.isInCensus();
            expect(isInCensus).toBeTruthy();
            const hasAlreadyVoted = await pClient.hasAlreadyVoted();
            expect(hasAlreadyVoted).toBeTruthy();
            const isAbleToVote = await pClient.isAbleToVote();
            expect(isAbleToVote).toBeFalsy();
          })
        )
      );
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

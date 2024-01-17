import { Wallet } from '@ethersproject/wallet';
import {
  BudgetElection,
  CensusType,
  Election,
  ElectionCreationSteps,
  ElectionResultsTypeNames,
  ElectionStatus,
  MultiChoiceElection,
  PlainCensus,
  PublishedCensus,
  VocdoniSDKClient,
  Vote,
  VoteSteps,
  WeightedCensus,
} from '../../src';
// @ts-ignore
import { clientParams, setFaucetURL } from './util/client.params';
// @ts-ignore
import { waitForElectionReady } from './util/client.utils';
import { SDK_VERSION } from '../../src/version';

let client: VocdoniSDKClient;
let wallet: Wallet;

beforeEach(async () => {
  wallet = Wallet.createRandom();
  client = new VocdoniSDKClient(clientParams(wallet));
  client = setFaucetURL(client);
});

const createElection = (census, electionType?, voteType?, maxCensusSize?) => {
  const election = Election.from({
    title: 'SDK Testing - Title',
    description: 'SDK Testing - Description',
    endDate: new Date().getTime() + 10000000,
    census,
    maxCensusSize,
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
  it('should create an election with correct information', async () => {
    const census = new PlainCensus();
    census.add(await Wallet.createRandom().getAddress());

    const election = createElection(census);

    election.meta = {
      test: 'testValue',
      array: [1, 2],
      object: {
        test1: 'test1',
        test2: 'test2',
      },
      census: {
        fields: ['firstname', 'lastname', 'email'],
        type: 'spreadsheet',
      },
    };

    await client.createAccount();

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        return client.fetchElection();
      })
      .then((publishedElection) => {
        expect(publishedElection.title).toEqual(election.title);
        expect(publishedElection.description).toEqual(election.description);
        expect(publishedElection.meta).toStrictEqual({
          test: 'testValue',
          array: [1, 2],
          object: {
            test1: 'test1',
            test2: 'test2',
          },
          census: {
            fields: ['firstname', 'lastname', 'email'],
            type: 'spreadsheet',
          },
          sdk: {
            version: SDK_VERSION,
          },
        });
        expect(publishedElection.get('census.type')).toEqual('spreadsheet');
        expect(publishedElection.electionType).toStrictEqual({
          autoStart: true,
          interruptible: true,
          dynamicCensus: false,
          secretUntilTheEnd: false,
          anonymous: false,
        });
        expect(publishedElection.voteType).toStrictEqual({
          uniqueChoices: false,
          maxVoteOverwrites: 0,
          costFromWeight: false,
          costExponent: 10000,
          maxCount: 1,
          maxValue: 1,
          maxTotalCost: 0,
        });
        expect(publishedElection.manuallyEnded).toBeFalsy();
        expect(publishedElection.fromArchive).toBeFalsy();
        expect(publishedElection.chainId).toBeDefined();
        expect(publishedElection.maxCensusSize).toEqual(1);
        expect(publishedElection.resultsType.name).toEqual(ElectionResultsTypeNames.SINGLE_CHOICE_MULTIQUESTION);
        expect(publishedElection.resultsType.properties).toStrictEqual({});
      });
  }, 85000);
  it('should create an election step by step', async () => {
    const census = new PlainCensus();
    census.add(await Wallet.createRandom().getAddress());

    const election = createElection(census);

    await client.createAccount();

    for await (const value of client.createElectionSteps(election)) {
      expect(Object.values(ElectionCreationSteps)).toContain(value.key);
    }
  }, 850000);
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
        return waitForElectionReady(client, electionId);
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

    const notInCensusParticipant = Wallet.createRandom();
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
        return waitForElectionReady(client, electionId);
      })
      .then(() =>
        Promise.all(
          participants
            .map(async (participant, index) => {
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
            .concat(
              [...new Array(1)].map(async () => {
                const pClient = new VocdoniSDKClient(clientParams(notInCensusParticipant));
                pClient.setElectionId(electionIdentifier);
                const isInCensus = await pClient.isInCensus();
                expect(isInCensus).toBeFalsy();
                const hasAlreadyVoted = await pClient.hasAlreadyVoted();
                expect(hasAlreadyVoted).toBeFalsy();
                const isAbleToVote = await pClient.isAbleToVote();
                expect(isAbleToVote).toBeFalsy();
                return notInCensusParticipant.getAddress();
              })
            )
        )
      )
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.id).toEqual(electionIdentifier);
        expect(election.title).toEqual(unpublishedElection.title);
        expect(election.voteCount).toEqual(numVotes);
        expect(election.results[0][0]).toEqual(election.results[0][1]);
        expect(election.census.size).toEqual(numVotes);
        expect(election.census.weight).toEqual(BigInt(numVotes));
        expect(election.status).toEqual(ElectionStatus.ONGOING);
        expect(election.maxCensusSize).toEqual(numVotes);
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

    const notInCensusParticipant = Wallet.createRandom();
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
        return waitForElectionReady(client, electionId);
      })
      .then(() =>
        Promise.all(
          participants
            .map(async (participant, index) => {
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
            .concat(
              [...new Array(1)].map(async () => {
                const pClient = new VocdoniSDKClient(clientParams(notInCensusParticipant));
                pClient.setElectionId(electionIdentifier);
                const isInCensus = await pClient.isInCensus();
                expect(isInCensus).toBeFalsy();
                const hasAlreadyVoted = await pClient.hasAlreadyVoted();
                expect(hasAlreadyVoted).toBeFalsy();
                const isAbleToVote = await pClient.isAbleToVote();
                expect(isAbleToVote).toBeFalsy();
                return notInCensusParticipant.getAddress();
              })
            )
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
        expect(election.census.size).toEqual(numVotes);
        expect(election.census.weight).toEqual(BigInt((numVotes * (numVotes + 1)) / 2));
        expect(election.status).toEqual(ElectionStatus.ONGOING);
        expect(election.maxCensusSize).toEqual(numVotes);
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

    const notInCensusParticipant = Wallet.createRandom();
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
        return waitForElectionReady(client, electionId);
      })
      .then(() =>
        Promise.all(
          participants
            .map(async (participant, index) => {
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
            .concat(
              [...new Array(1)].map(async () => {
                const pClient = new VocdoniSDKClient(clientParams(notInCensusParticipant));
                pClient.setElectionId(electionIdentifier);
                const isInCensus = await pClient.isInCensus();
                expect(isInCensus).toBeFalsy();
                const hasAlreadyVoted = await pClient.hasAlreadyVoted();
                expect(hasAlreadyVoted).toBeFalsy();
                const isAbleToVote = await pClient.isAbleToVote();
                expect(isAbleToVote).toBeFalsy();
                return notInCensusParticipant.getAddress();
              })
            )
        )
      )
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.id).toEqual(electionIdentifier);
        expect(election.title).toEqual(unpublishedElection.title);
        expect(election.voteCount).toEqual(numVotes);
        expect(election.finalResults).toBeFalsy();
        expect(election.census.size).toEqual(numVotes);
        expect(election.census.weight).toEqual(BigInt(numVotes));
        expect(election.status).toEqual(ElectionStatus.ONGOING);
        expect(election.maxCensusSize).toEqual(numVotes);
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
        return waitForElectionReady(client, electionId);
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
              i !== 0 ? expect(hasAlreadyVoted).toBeTruthy() : expect(hasAlreadyVoted).toBeFalsy();
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
        expect(election.voteCount).toEqual(numVotes);
        expect(election.results[0][0]).toEqual(election.results[0][1]);
        expect(election.census.size).toEqual(numVotes);
        expect(election.census.weight).toEqual(BigInt(numVotes));
        expect(election.status).toEqual(ElectionStatus.ONGOING);
        expect(election.maxCensusSize).toEqual(numVotes);
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
        expect([ElectionStatus.ONGOING, ElectionStatus.UPCOMING]).toContain(election.status);
        expect(election.manuallyEnded).toBeFalsy();
        return client.endElection();
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect([ElectionStatus.ENDED, ElectionStatus.RESULTS]).toContain(election.status);
        expect(election.manuallyEnded).toBeTruthy();
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
        expect([ElectionStatus.ONGOING, ElectionStatus.UPCOMING]).toContain(election.status);
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
        expect([ElectionStatus.ONGOING, ElectionStatus.UPCOMING]).toContain(election.status);
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
        expect([ElectionStatus.ONGOING, ElectionStatus.UPCOMING]).toContain(election.status);
        return client.pauseElection();
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.status).toEqual(ElectionStatus.PAUSED);
        return client.continueElection();
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect([ElectionStatus.ONGOING, ElectionStatus.UPCOMING]).toContain(election.status);
      });
  }, 85000);
  it('should create a multichoice election and have the correct values set', async () => {
    const census = new PlainCensus();
    const participants: Wallet[] = [...new Array(5)].map(() => Wallet.createRandom());
    census.add(participants.map((participant) => participant.address));

    const election = MultiChoiceElection.from({
      title: 'SDK Testing - Title',
      description: 'SDK Testing - Description',
      endDate: new Date().getTime() + 10000000,
      census,
      maxNumberOfChoices: 3,
      canAbstain: true,
      canRepeatChoices: false,
    });

    election.addQuestion('This is a title', 'This is a description', [
      {
        title: 'Red',
      },
      {
        title: 'Green',
      },
      {
        title: 'Blue',
      },
      {
        title: 'White',
      },
      {
        title: 'Black',
      },
    ]);

    await client.createAccount();
    await client
      .createElection(election)
      .then((electionId) => {
        client.setElectionId(electionId);
        return electionId;
      })
      .then((electionId) =>
        Promise.all(
          participants.map(async (participant) => {
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionId);
            const vote = new Vote([0, 5, 7]);
            return pClient.submitVote(vote);
          })
        )
      )
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.voteType.maxCount).toEqual(3);
        expect(election.voteType.maxValue).toEqual(7);
        expect(election.voteType.maxTotalCost).toEqual(0);
        expect(election.voteType.uniqueChoices).toEqual(true);
        expect(election.resultsType.name).toEqual(ElectionResultsTypeNames.MULTIPLE_CHOICE);
        expect(election.resultsType.properties).toStrictEqual({
          canAbstain: true,
          repeatChoice: false,
          abstainValues: ['5', '6', '7'],
        });
        expect(election.results).toStrictEqual([
          ['5', '0', '0', '0', '0', '0', '0', '0'],
          ['0', '0', '0', '0', '0', '5', '0', '0'],
          ['0', '0', '0', '0', '0', '0', '0', '5'],
        ]);
        expect(election.questions[0].numAbstains).toEqual('10');
      });
  }, 850000);
  it('should create a budget election without weights and have the correct values set', async () => {
    const census = new PlainCensus();
    const participants: Wallet[] = [...new Array(5)].map(() => Wallet.createRandom());
    census.add(participants.map((participant) => participant.address));

    const election = BudgetElection.from({
      title: 'SDK Testing - Title',
      description: 'SDK Testing - Description',
      endDate: new Date().getTime() + 10000000,
      census,
      useCensusWeightAsBudget: false,
      maxBudget: 20,
    });

    election.addQuestion('This is a title', 'This is a description', [
      {
        title: 'Red',
      },
      {
        title: 'Green',
      },
      {
        title: 'Blue',
      },
      {
        title: 'White',
      },
      {
        title: 'Black',
      },
    ]);

    await client.createAccount();
    await client
      .createElection(election)
      .then((electionId) => {
        client.setElectionId(electionId);
        return electionId;
      })
      .then((electionId) =>
        Promise.all(
          participants.map(async (participant) => {
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionId);
            const vote = new Vote([15, 3, 1, 0, 0]);
            return pClient.submitVote(vote);
          })
        )
      )
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.voteType.maxCount).toEqual(5);
        expect(election.voteType.maxValue).toEqual(0);
        expect(election.voteType.maxTotalCost).toEqual(20);
        expect(election.voteType.uniqueChoices).toEqual(false);
        expect(election.resultsType.name).toEqual(ElectionResultsTypeNames.BUDGET);
        expect(election.resultsType.properties).toStrictEqual({
          useCensusWeightAsBudget: false,
          maxBudget: 20,
          forceFullBudget: false,
          minStep: 1,
        });
        expect(election.results).toStrictEqual([['75'], ['15'], ['5'], ['0'], ['0']]);
      });
  }, 850000);
  it('should create a budget election with weights and have the correct values set', async () => {
    const census = new WeightedCensus();
    const participants: Wallet[] = [...new Array(5)].map(() => Wallet.createRandom());
    census.add(
      participants.map((participant, index) => ({
        key: participant.address,
        weight: BigInt(index + 1),
      }))
    );

    const election = BudgetElection.from({
      title: 'SDK Testing - Title',
      description: 'SDK Testing - Description',
      endDate: new Date().getTime() + 10000000,
      census,
      useCensusWeightAsBudget: true,
    });

    election.addQuestion('This is a title', 'This is a description', [
      {
        title: 'Red',
      },
      {
        title: 'Green',
      },
      {
        title: 'Blue',
      },
      {
        title: 'White',
      },
      {
        title: 'Black',
      },
    ]);

    await client.createAccount();
    await client
      .createElection(election)
      .then((electionId) => {
        client.setElectionId(electionId);
        return electionId;
      })
      .then((electionId) =>
        Promise.all(
          participants.map(async (participant, index) => {
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionId);
            const vote = new Vote([index, 0, 1, 0, 0]);
            return pClient.submitVote(vote);
          })
        )
      )
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.voteType.maxCount).toEqual(5);
        expect(election.voteType.maxValue).toEqual(0);
        expect(election.voteType.maxTotalCost).toEqual(0);
        expect(election.voteType.uniqueChoices).toEqual(false);
        expect(election.resultsType.name).toEqual(ElectionResultsTypeNames.BUDGET);
        expect(election.resultsType.properties).toStrictEqual({
          useCensusWeightAsBudget: true,
          maxBudget: null,
          forceFullBudget: false,
          minStep: 1,
        });
        expect(election.results).toStrictEqual([['10'], ['0'], ['5'], ['0'], ['0']]);
      });
  }, 850000);
  it('should create a quadratic election with 10 participants and the results should be correct', async () => {
    const VOTERS_NUM = 10;
    const COST_EXPONENT = 2;
    const CREDITS = 14;
    const VOTE_ARRAY = [1, 0, 3, 2];
    const EXPECTED_RESULTS = [['10'], ['0'], ['30'], ['20']];
    const MAX_VALUE = 0;
    const MAX_COUNT = 4;

    const VOTE_OPTIONS = {
      maxValue: MAX_VALUE,
      maxCount: MAX_COUNT,
      uniqueChoices: false,
      costFromWeight: true,
      costExponent: COST_EXPONENT,
    };

    const participants: Wallet[] = [...new Array(VOTERS_NUM)].map(() => Wallet.createRandom());
    const census = new WeightedCensus();
    census.add(
      participants.map((participant) => ({
        key: participant.address,
        weight: BigInt(CREDITS),
      }))
    );

    const unpublishedElection = createElection(census, null, VOTE_OPTIONS);

    await client.createAccount();

    let electionIdentifier;

    await client
      .createElection(unpublishedElection)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        electionIdentifier = electionId;
        return waitForElectionReady(client, electionId);
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant) => {
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionIdentifier);
            return pClient.submitVote(new Vote(VOTE_ARRAY));
          })
        )
      )
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.id).toEqual(electionIdentifier);
        expect(election.voteType.costExponent).toStrictEqual(VOTE_OPTIONS.costExponent);
        expect(election.voteType.costFromWeight).toStrictEqual(VOTE_OPTIONS.costFromWeight);
        expect(election.voteType.maxCount).toStrictEqual(VOTE_OPTIONS.maxCount);
        expect(election.voteType.maxValue).toStrictEqual(VOTE_OPTIONS.maxValue);
        expect(election.voteType.uniqueChoices).toStrictEqual(VOTE_OPTIONS.uniqueChoices);
        expect(election.voteCount).toEqual(VOTERS_NUM);
        expect(election.results).toEqual(EXPECTED_RESULTS);
      });
  }, 285000);
  it('should create an approval election with 10 participants and the results should be correct', async () => {
    const VOTERS_NUM = 10;
    const VOTE_ARRAY = [0, 1, 0, 1];
    const EXPECTED_RESULTS = [
      ['10', '0'],
      ['0', '10'],
      ['10', '0'],
      ['0', '10'],
    ];
    const MAX_COUNT = 4;
    const MAX_VALUE = 1;
    const MAX_TOTAL_COST = 2;

    const VOTE_OPTIONS = {
      uniqueChoices: false,
      costFromWeight: false,
      maxCount: MAX_COUNT,
      maxValue: MAX_VALUE,
      maxTotalCost: MAX_TOTAL_COST,
    };

    const participants: Wallet[] = [...new Array(VOTERS_NUM)].map(() => Wallet.createRandom());
    const census = new PlainCensus();
    census.add(participants.map((participant) => participant.address));

    const unpublishedElection = createElection(census, null, VOTE_OPTIONS);

    await client.createAccount();

    let electionIdentifier;

    await client
      .createElection(unpublishedElection)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        electionIdentifier = electionId;
        return waitForElectionReady(client, electionId);
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant) => {
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionIdentifier);
            return pClient.submitVote(new Vote(VOTE_ARRAY));
          })
        )
      )
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.id).toEqual(electionIdentifier);
        expect(election.voteType.maxTotalCost).toStrictEqual(VOTE_OPTIONS.maxTotalCost);
        expect(election.voteType.costFromWeight).toStrictEqual(VOTE_OPTIONS.costFromWeight);
        expect(election.voteType.maxCount).toStrictEqual(VOTE_OPTIONS.maxCount);
        expect(election.voteType.maxValue).toStrictEqual(VOTE_OPTIONS.maxValue);
        expect(election.voteType.uniqueChoices).toStrictEqual(VOTE_OPTIONS.uniqueChoices);
        expect(election.voteCount).toEqual(VOTERS_NUM);
        expect(election.results).toEqual(EXPECTED_RESULTS);
      });
  }, 285000);
  it('should create a ranked election with 10 participants and the results should be correct', async () => {
    const VOTERS_NUM = 10;
    const VOTE_ARRAY = [2, 3, 0, 1, 4];
    const EXPECTED_RESULTS = [
      ['0', '0', '10', '0', '0'],
      ['0', '0', '0', '10', '0'],
      ['10', '0', '0', '0', '0'],
      ['0', '10', '0', '0', '0'],
      ['0', '0', '0', '0', '10'],
    ];
    const MAX_COUNT = 5;
    const MAX_VALUE = 4;
    const UNIQUE_CHOICES = true;

    const VOTE_OPTIONS = {
      uniqueChoices: UNIQUE_CHOICES,
      costFromWeight: false,
      maxCount: MAX_COUNT,
      maxValue: MAX_VALUE,
      maxTotalCost: 0,
    };

    const participants: Wallet[] = [...new Array(VOTERS_NUM)].map(() => Wallet.createRandom());
    const census = new PlainCensus();
    census.add(participants.map((participant) => participant.address));

    const unpublishedElection = createElection(census, null, VOTE_OPTIONS);

    await client.createAccount();

    let electionIdentifier;

    await client
      .createElection(unpublishedElection)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        electionIdentifier = electionId;
        return waitForElectionReady(client, electionId);
      })
      .then(() =>
        Promise.all(
          participants.map(async (participant) => {
            const pClient = new VocdoniSDKClient(clientParams(participant));
            pClient.setElectionId(electionIdentifier);
            return pClient.submitVote(new Vote(VOTE_ARRAY));
          })
        )
      )
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.id).toEqual(electionIdentifier);
        expect(election.voteType.maxTotalCost).toStrictEqual(VOTE_OPTIONS.maxTotalCost);
        expect(election.voteType.costFromWeight).toStrictEqual(VOTE_OPTIONS.costFromWeight);
        expect(election.voteType.maxCount).toStrictEqual(VOTE_OPTIONS.maxCount);
        expect(election.voteType.maxValue).toStrictEqual(VOTE_OPTIONS.maxValue);
        expect(election.voteType.uniqueChoices).toStrictEqual(VOTE_OPTIONS.uniqueChoices);
        expect(election.voteCount).toEqual(VOTERS_NUM);
        expect(election.results).toEqual(EXPECTED_RESULTS);
      });
  }, 285000);
  it('should estimate the correct price for elections', async () => {
    const census = new PublishedCensus(
      '43cbda11b9d1a322c03eac325eb8a7b72779b46a76f8a727cff94b539ed9b903',
      'ipfs://QmeowUvr4Q9SMBSB942QVzFAqQQYukbjLYXxwANH3oTxbf',
      CensusType.WEIGHTED
    );
    const election = createElection(census);

    await expect(client.estimateElectionCost(election)).rejects.toThrow(
      'Could not estimate cost because maxCensusSize is not set'
    );

    const desviationPercentAllowed = 5;
    const upperCost = (cost) => {
      return cost + cost * (desviationPercentAllowed / 100);
    };
    const lowerCost = (cost) => {
      return cost - cost * (desviationPercentAllowed / 100);
    };

    election.maxCensusSize = 100;
    let realCost = await client.calculateElectionCost(election);
    let estimateCost = await client.estimateElectionCost(election);
    expect(estimateCost).toBeGreaterThanOrEqual(lowerCost(realCost));
    expect(estimateCost).toBeLessThan(upperCost(realCost));

    election.maxCensusSize = 10000;
    realCost = await client.calculateElectionCost(election);
    estimateCost = await client.estimateElectionCost(election);
    expect(estimateCost).toBeGreaterThanOrEqual(lowerCost(realCost));
    expect(estimateCost).toBeLessThan(upperCost(realCost));

    election.voteType.maxVoteOverwrites = 10;
    realCost = await client.calculateElectionCost(election);
    estimateCost = await client.estimateElectionCost(election);
    expect(estimateCost).toBeGreaterThanOrEqual(lowerCost(realCost));
    expect(estimateCost).toBeLessThan(upperCost(realCost));

    election.electionType.anonymous = true;
    realCost = await client.calculateElectionCost(election);
    estimateCost = await client.estimateElectionCost(election);
    expect(estimateCost).toBeGreaterThanOrEqual(lowerCost(realCost));
    expect(estimateCost).toBeLessThan(upperCost(realCost));

    election.electionType.secretUntilTheEnd = true;
    realCost = await client.calculateElectionCost(election);
    estimateCost = await client.estimateElectionCost(election);
    expect(estimateCost).toBeGreaterThanOrEqual(lowerCost(realCost));
    expect(estimateCost).toBeLessThan(upperCost(realCost));

    election.endDate = new Date(election.endDate.setMonth(election.endDate.getMonth() + 2));
    realCost = await client.calculateElectionCost(election);
    estimateCost = await client.estimateElectionCost(election);
    expect(estimateCost).toBeGreaterThanOrEqual(lowerCost(realCost));
    expect(estimateCost).toBeLessThan(upperCost(realCost));

    election.endDate = new Date();
    await expect(client.estimateElectionCost(election)).rejects.toThrow(
      'Could not estimate cost because of negative election blocks size'
    );
  }, 15000);
  it('should be able to change an election census successfully and perform voting', async () => {
    const census1 = new PlainCensus();
    const census2 = new PlainCensus();
    const voter1 = Wallet.createRandom();
    const voter2 = Wallet.createRandom();
    census1.add(await voter1.getAddress());
    census2.add(await voter1.getAddress());
    census2.add(await voter2.getAddress());

    const clientVoter1 = new VocdoniSDKClient(clientParams(voter1));
    const clientVoter2 = new VocdoniSDKClient(clientParams(voter2));

    const election = createElection(
      census1,
      {
        dynamicCensus: true,
      },
      null,
      census2.participants.length
    );

    await client.createAccount();

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        clientVoter1.setElectionId(electionId);
        clientVoter2.setElectionId(electionId);
        return waitForElectionReady(client, electionId);
      })
      .then(async () => {
        // Check voter2 is not in the census
        const isInCensus2 = await clientVoter2.isInCensus();
        expect(isInCensus2).toBeFalsy();
        const hasAlreadyVoted2 = await clientVoter2.hasAlreadyVoted();
        expect(hasAlreadyVoted2).toBeFalsy();
        const isAbleToVote2 = await clientVoter2.isAbleToVote();
        expect(isAbleToVote2).toBeFalsy();
        // Check voter1 is in the census
        const isInCensus = await clientVoter1.isInCensus();
        expect(isInCensus).toBeTruthy();
        const hasAlreadyVoted = await clientVoter1.hasAlreadyVoted();
        expect(hasAlreadyVoted).toBeFalsy();
        const isAbleToVote = await clientVoter1.isAbleToVote();
        expect(isAbleToVote).toBeTruthy();
        // Vote with voter 1
        const vote = new Vote([1]);
        return clientVoter1.submitVote(vote);
      })
      .then(() => client.createCensus(census2))
      .then(() => client.changeElectionCensus(client.electionId, census2.censusId, census2.censusURI))
      .then(async () => {
        // Check voter2 is in the census
        const isInCensus2 = await clientVoter2.isInCensus();
        expect(isInCensus2).toBeTruthy();
        const hasAlreadyVoted2 = await clientVoter2.hasAlreadyVoted();
        expect(hasAlreadyVoted2).toBeFalsy();
        const isAbleToVote2 = await clientVoter2.isAbleToVote();
        expect(isAbleToVote2).toBeTruthy();
        // Check voter1 is in the census but already voted
        const isInCensus = await clientVoter1.isInCensus();
        expect(isInCensus).toBeTruthy();
        const hasAlreadyVoted = await clientVoter1.hasAlreadyVoted();
        expect(hasAlreadyVoted).toBeTruthy();
        const isAbleToVote = await clientVoter1.isAbleToVote();
        expect(isAbleToVote).toBeFalsy();
        // Vote with voter 2
        const vote = new Vote([0]);
        return clientVoter2.submitVote(vote);
      })
      .then(async () => {
        // Check voter2 is in the census but already voted
        const isInCensus2 = await clientVoter2.isInCensus();
        expect(isInCensus2).toBeTruthy();
        const hasAlreadyVoted2 = await clientVoter2.hasAlreadyVoted();
        expect(hasAlreadyVoted2).toBeTruthy();
        const isAbleToVote2 = await clientVoter2.isAbleToVote();
        expect(isAbleToVote2).toBeFalsy();
        // Check voter1 is in the census but already voted
        const isInCensus = await clientVoter1.isInCensus();
        expect(isInCensus).toBeTruthy();
        const hasAlreadyVoted = await clientVoter1.hasAlreadyVoted();
        expect(hasAlreadyVoted).toBeTruthy();
        const isAbleToVote = await clientVoter1.isAbleToVote();
        expect(isAbleToVote).toBeFalsy();
        return client.fetchElection();
      })
      .then((election) => {
        expect(election.id).toEqual(client.electionId);
        expect(election.voteCount).toEqual(census2.size);
        expect(election.results[0][0]).toEqual(election.results[0][1]);
        expect(election.census.censusId).toEqual(census2.censusId);
        expect(election.census.censusURI).toEqual(census2.censusURI);
      });
  }, 185000);
  it('should return the next election id', async () => {
    const census = new PlainCensus();
    census.add(await Wallet.createRandom().getAddress());

    const election = createElection(census);

    await client.createAccount();

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        return waitForElectionReady(client, electionId);
      })
      .then(async () => {
        const nextElectionId = await client.electionService.nextElectionId(await client.wallet.getAddress(), election);
        expect(nextElectionId).toEqual(client.electionId.slice(0, -1) + '1');
      });
  }, 85000);
  it('should vote with steps', async () => {
    const census = new PlainCensus();
    const voter = Wallet.createRandom();
    census.add(await voter.getAddress());

    const election = createElection(census);

    await client.createAccount();

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        return waitForElectionReady(client, electionId);
      })
      .then(async () => {
        client.wallet = voter;
        const vote = new Vote([1]);
        for await (const value of client.submitVoteSteps(vote)) {
          expect(Object.values(VoteSteps)).toContain(value.key);
          if (value.key === VoteSteps.DONE) {
            expect(value.voteId).toMatch(/^[0-9a-fA-F]{64}$/);
          }
        }
      });
  }, 85000);
});

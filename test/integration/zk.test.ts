// @ts-ignore
import { clientParams, setFaucetURL } from './util/client.params';
import {
  AnonymousVote,
  Election,
  ElectionStatus,
  PlainCensus,
  VocdoniSDKClient,
  Vote,
  WeightedCensus,
} from '../../src';
import { Wallet } from '@ethersproject/wallet';
// @ts-ignore
import { waitForElectionReady } from './util/client.utils';

let client: VocdoniSDKClient;
let wallet: Wallet;

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

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

describe('zkSNARK test', () => {
  it('should create an anonymous election and vote successfully', async () => {
    const census = new PlainCensus();
    const voter1 = Wallet.createRandom();
    const voter2 = Wallet.createRandom();
    // User that votes with account with SIK
    census.add((client.wallet as Wallet).address);
    // User that votes and has no account
    census.add(voter1.address);
    // User that votes with account without SIK
    census.add(voter2.address);

    const election = createElection(census, {
      anonymous: true,
    });

    await client.createAccount({
      sik: true,
      password: 'password123',
    });

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        return client.fetchElection();
      })
      .then((publishedElection) => {
        expect(publishedElection.electionType.anonymous).toBeTruthy();
        return waitForElectionReady(client, publishedElection.id);
      })
      .then(async () => {
        await expect(async () => {
          await client.submitVote(new Vote([0]));
        }).rejects.toThrow();
        const vote = new AnonymousVote([0], 'password123');
        return client.submitVote(vote);
      })
      .then(() => {
        client.wallet = voter1;
        const vote = new AnonymousVote([0], 'password456');
        return client.submitVote(vote);
      })
      .then(() => {
        client.wallet = voter2;
        return client.createAccount({ sik: false });
      })
      .then(() => {
        const vote = new Vote([1]);
        return client.submitVote(vote);
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.electionType.anonymous).toBeTruthy();
        expect(election.voteCount).toEqual(3);
        expect(election.results[0][0]).toEqual('2');
        expect(election.results[0][1]).toEqual('1');
        expect(election.census.size).toEqual(3);
        expect(election.census.weight).toEqual(BigInt(3));
      });
  }, 285000);
  it('should create a weighted anonymous election and vote successfully', async () => {
    const census = new WeightedCensus();
    const voter1 = Wallet.createRandom();
    const voter2 = Wallet.createRandom();
    // User that votes with account with SIK
    census.add({
      key: (client.wallet as Wallet).address,
      weight: BigInt(12),
    });
    // User that votes and has no account
    census.add({
      key: voter1.address,
      weight: BigInt(120),
    });
    // User that votes with account without SIK
    census.add({
      key: voter2.address,
      weight: BigInt(1200),
    });

    const election = createElection(census, {
      anonymous: true,
    });

    await client.createAccount({
      sik: true,
      password: 'password123',
    });

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        return client.fetchElection();
      })
      .then((publishedElection) => {
        expect(publishedElection.electionType.anonymous).toBeTruthy();
        return waitForElectionReady(client, publishedElection.id);
      })
      .then(async () => {
        await expect(async () => {
          await client.submitVote(new Vote([0]));
        }).rejects.toThrow();
        const vote = new AnonymousVote([0], 'password123');
        return client.submitVote(vote);
      })
      .then(() => {
        client.wallet = voter1;
        const vote = new AnonymousVote([0], 'password456');
        return client.submitVote(vote);
      })
      .then(() => {
        client.wallet = voter2;
        return client.createAccount({ sik: false });
      })
      .then(() => {
        const vote = new Vote([1]);
        return client.submitVote(vote);
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.electionType.anonymous).toBeTruthy();
        expect(election.voteCount).toEqual(3);
        expect(election.results[0][0]).toEqual('132');
        expect(election.results[0][1]).toEqual('1200');
        expect(election.census.size).toEqual(3);
        expect(election.census.weight).toEqual(BigInt(12 + 120 + 1200));
      });
  }, 285000);
  it('should create an anonymous election with 12 participants and each of them should vote correctly', async () => {
    const numVotes = 12; // should be even number
    const census = new PlainCensus();

    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());
    census.add(participants.map((participant) => participant.address));

    const election = createElection(census, {
      anonymous: true,
    });

    await client.createAccount();

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        return waitForElectionReady(client, electionId);
      })
      .then(async () => {
        for (let i = 0; i < participants.length; i++) {
          client.wallet = participants[i];
          let vote: Vote | AnonymousVote = new Vote([i % 2]);

          if (i % 3 == 0) {
            await client.createAccount({
              sik: true,
              password: participants[i].address,
            });
            await expect(async () => {
              await client.submitVote(new AnonymousVote([i % 2], 'wrongpassword'));
            }).rejects.toThrow();
            vote = new AnonymousVote([i % 2], participants[i].address);
          } else if (i % 3 == 1) {
            await client.createAccount({ sik: false });
          }
          const isInCensus = await client.isInCensus();
          expect(isInCensus).toBeTruthy();
          await expect(async () => {
            await client.hasAlreadyVoted();
          }).rejects.toThrow();
          await expect(async () => {
            await client.isAbleToVote();
          }).rejects.toThrow();
          await client.submitVote(vote);
        }
      })
      .then(() => client.fetchElection())
      .then((election) => {
        expect(election.electionType.anonymous).toBeTruthy();
        expect(election.voteCount).toEqual(numVotes);
      });
  }, 720000);
  it('should create an anonymous election with temporary SIKs and they should be removed once the election is finished', async () => {
    const census = new PlainCensus();
    const creator = client.wallet;
    const voter1 = Wallet.createRandom();
    const voter2 = Wallet.createRandom();
    census.add(voter1.address);
    census.add(voter2.address);

    const election = createElection(census, {
      anonymous: true,
    });
    election.temporarySecretIdentity = true;

    await client.createAccount();

    await client
      .createElection(election)
      .then((electionId) => {
        expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
        client.setElectionId(electionId);
        return waitForElectionReady(client, electionId);
      })
      .then(async () => {
        await expect(async () => {
          await client.anonymousService.fetchAccountSIK(voter1.address);
        }).rejects.toThrow();
        await expect(async () => {
          await client.anonymousService.fetchAccountSIK(voter2.address);
        }).rejects.toThrow();

        client.wallet = voter1;
        await client.submitVote(new Vote([0]));
        client.wallet = voter2;
        await client.submitVote(new Vote([1]));

        await expect(async () => {
          await client.anonymousService.fetchAccountSIK(voter1.address);
        }).resolves;
        await expect(async () => {
          await client.anonymousService.fetchAccountSIK(voter2.address);
        }).resolves;

        client.wallet = creator;
        return client.endElection();
      })
      .then(async () => {
        let electionInfo = await client.fetchElection();
        while (electionInfo.status === ElectionStatus.ENDED) {
          electionInfo = await client.fetchElection();
        }
        await expect(async () => {
          await client.anonymousService.fetchAccountSIK(voter1.address);
        }).rejects.toThrow();
        await expect(async () => {
          await client.anonymousService.fetchAccountSIK(voter2.address);
        }).rejects.toThrow();
      });
  }, 720000);
});

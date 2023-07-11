import chalk from 'chalk';
import { getDefaultClient, getRandomVoters, submitVote, waitForElectionReady } from './utils';
import { Wallet } from '@ethersproject/wallet';
import { Election, IVoteType, OffchainCensus, PlainCensus, UnpublishedElection } from '@vocdoni/sdk';

export const getPlainCensus = (voters: number) => {
  console.log('Creating census with some random wallets...');
  const participants: Wallet[] = getRandomVoters(voters);
  const census = new PlainCensus();
  census.add(participants.map((participant, index) => participant.address));
  return { census, participants };
};

export const createElection = (
  census: OffchainCensus,
  voteOpts: IVoteType | undefined,
  title: string,
  description: string
) => {
  const endDate = new Date();
  endDate.setHours(endDate.getHours() + 10);

  return Election.from({
    title: title + ' ' + endDate.toISOString(),
    description: description,
    header: 'https://source.unsplash.com/random',
    streamUri: 'https://source.unsplash.com/random',
    endDate: endDate.getTime(),
    census,
    voteType: voteOpts,
  });
};

export const executeElection = async (
  election: UnpublishedElection,
  participants: Wallet[],
  voteArray: number[] | ((index: number) => number[])
) => {
  console.log(chalk.yellow('Creating a new voting process!'));

  console.log('Creating account...');
  const { client } = getDefaultClient();
  await client.createAccount();

  let electionIdentifier: string;

  return await client
    .createElection(election)
    .then((electionId) => {
      client.setElectionId(electionId);
      console.log(chalk.green('Election created!'), chalk.blue(electionId));
      console.log('Waiting a bit to ensure we can vote...');
      client.setElectionId(electionId);
      electionIdentifier = electionId;
      return waitForElectionReady(client, electionId);
    })
    .then(() => {
      console.log(chalk.green('Election ready!'));
      console.log('Submitting all votes');
      return Promise.all(
        participants.map(async (participant, index) => {
          console.log(
            `Submitting vote ${index} with value ${voteArray}`,
            chalk.yellow('VoterId: '),
            chalk.blue(participant.address)
          );
          return submitVote(
            participant,
            electionIdentifier,
            typeof voteArray === 'function' ? voteArray(index) : voteArray
          );
        })
      );
    })
    .then(() => {
      console.log(chalk.green('Votes submitted!'));
      return client.fetchElection();
    })
    .then((election) => {
      console.log('Election results: ', election.results);
    });
};

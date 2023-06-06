import { Wallet } from '@ethersproject/wallet';
import { Election, EnvOptions, IVoteType, OffchainCensus, PlainCensus, VocdoniSDKClient, Vote } from '@vocdoni/sdk';
import chalk from 'chalk';
import { getDefaultClient, getRandomVoters, submitVote, waitForElectionReady } from './utils/utils';
import { createElection, executeElection } from './utils/election-process';

/**
 * Example for Approval voting
 *
 * Example: select your three favourite colors from a list of 4.
 *
 * https://developer.vocdoni.io/protocol/ballot#multiple-choice
 */

/**
 * Defines the total number of random voters participating in the election.
 * */
const VOTERS_NUM = 10;

/**
 * The value should correspond to the number of choices of the given question.
 *  */
const MAX_COUNT = 4;

/**
 * Specifies the maximum value that can be assigned to any single choice. For this kind of election we want that the voter
 * can give only a vote for each color, so this value must be `1`
 * */
const MAX_VALUE = 1;

/**
 * Used to set the maximum number of choices a user can select. For example, if `2` the user can select two of the 4
 * available choices.
 */
const MAX_TOTAL_COST = 2;

/**
 * An array representing a voter's choices. Each entry in the array corresponds to a selected choice in the election,
 * and the value assigned to each entry have to be 1. The maximum number of choices a voter can select is defined by
 * `MAX_TOTAL_COST`. The length of this array should match the total number of choices in the election (`MAX_COUNT`)
 *
 * With the sample vote array `[0, 1, 0, 1]`, and with `10` voters, we would anticipate the following result:
 *
 * ```
 * [ [ '10', '0' ], [ '0', '10' ], [ '10', '0' ], [ '0', '10' ] ]
 * ```
 *
 * This means:
 *
 * - For choice `0`, all 10 voters assigned it `0` points,
 * - For choice `1`, all 10 voters assigned it `1` point,
 * - For choice `2`, all 10 voters assigned it `0` points, and
 * - For choice `3`, all 10 voters assigned it `1` point.
 */
const VOTE_ARRAY = [0, 1, 1, 1];

/**
 * An example configuration for setting up approval voting
 */
const ELECTION_OPTS: IVoteType = {
  uniqueChoices: false,
  costFromWeight: false,
  maxCount: MAX_COUNT,
  maxValue: MAX_VALUE,
  maxTotalCost: MAX_TOTAL_COST,
};

const _createElection = (census: OffchainCensus) => {
  const election = createElection(census, ELECTION_OPTS, 'Election title: Approval ', 'Election description: Approval');

  election.addQuestion('Favourite color', '', [
    {
      title: 'Green',
      value: 0,
    },
    {
      title: 'Blue',
      value: 1,
    },
    {
      title: 'Pink',
      value: 2,
    },
    {
      title: 'Orange',
      value: 3,
    },
  ]);

  return election;
};

async function main() {
  console.log('Creating census with some random wallets...');
  const participants: Wallet[] = getRandomVoters(VOTERS_NUM);
  const census = new PlainCensus();
  census.add(participants.map((participant, index) => participant.address));

  console.log('Creating election...');
  const election = _createElection(census);

  await executeElection(election, participants, VOTE_ARRAY);
}

main()
  .then(() => {
    console.log(chalk.green('Done ✅'));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

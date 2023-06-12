import chalk from 'chalk';
import { Wallet } from '@ethersproject/wallet';
import { IVoteType, OffchainCensus, UnpublishedElection, WeightedCensus } from '@vocdoni/sdk';
import { getRandomVoters } from './utils/utils';
import { createElection, executeElection } from './utils/election-process';

/**
 * Example of quadratic voting election
 *
 * https://developer.vocdoni.io/protocol/ballot#quadratic-voting
 */

/**
 * Set the total number of random voters.
 */
const VOTERS_NUM = 10;

/**
 * Define the exponent for quadratic voting calculation. In the context of quadratic voting, this value
 * is usually set to 2. This exponent determines the cost of a vote. For example, if a voter assigns 2 credits to an option,
 * the cost of that vote would be 2^2 = 4.
 */
const COST_EXPONENT = 2;

/**
 * Defines the total amount of credits available to each voter for casting their votes.
 * In this example, every voter is assumed to have an equal amount of credits. However, in a different scenario,
 * each voter could be allotted a varying number of credits depending on their weight in a weighted census.
 */
const CREDITS = 14;

/**
 * An array representing a single voter's allocation of credits towards various options.
 *
 * For example, the array [1, 0, 3, 2] signifies:
 *
 * - `1` credit assigned to option 0,
 * - `0` credit assigned to option 1,
 * - `3` credit assigned to option 2,
 * - `2` credit assigned to option 3,
 *
 * The cost of these votes in a quadratic voting system would be:
 *
 * ```
 * 1^2 = 1 (Cost for option 0)
 * 0^2 = 0 (Cost for option 1)
 * 3^2 = 9 (Cost for option 2)
 * 2^2 = 4 (Cost for option 3)
 * Total = 14 (Total cost of votes)
 * ```
 *
 * The total cost of the votes must not exceed the total `CREDITS` available to the voter.
 *
 * Given these parameters, an election involving 10 voters would yield the following results:
 *
 * ```
 * [[ 10, 0, 30, 20 ]]
 * ```
 */
const VOTE_ARRAY = [1, 0, 3, 2];

/**
 * Must be 0 for quadratic elections
 */
const MAX_VALUE = 0;

/**
 * Have to be the choices length
 */
const MAX_COUNT = 4;

/**
 * An example configuration for setting up a quadratic voting system.
 */
const VOTE_OPTIONS: IVoteType = {
  maxValue: MAX_VALUE,
  maxCount: MAX_COUNT,
  uniqueChoices: false,
  costFromWeight: true, // This will set that the weight on a weighted census is actually the credits available
  costExponent: COST_EXPONENT,
};

const _createElection = (census: OffchainCensus): UnpublishedElection => {
  const election = createElection(
    census,
    VOTE_OPTIONS,
    'Quadratic vote election',
    'What NGO have to receive the credits?'
  );
  election.addQuestion("Select NGO's", 'Quadratic vote example', [
    {
      title: 'Greenpeace',
      value: 0,
    },
    {
      title: 'Red Cross',
      value: 1,
    },
    {
      title: 'MSF',
      value: 2,
    },
    {
      title: 'Amnesty',
      value: 3,
    },
  ]);

  return election;
};

async function main() {
  console.log('Creating census with some random wallets...');
  const participants: Wallet[] = getRandomVoters(VOTERS_NUM);
  const census = new WeightedCensus();
  census.add(
    participants.map((participant, index) => ({
      key: participant.address,
      weight: BigInt(CREDITS),
    }))
  );

  console.log('Creating election...');
  const election = _createElection(census);

  await executeElection(election, participants, VOTE_ARRAY);
  console.log(
    'Expected results: ',
    VOTE_ARRAY.map((value, i) => [String(value * VOTERS_NUM)])
  );
  console.log(chalk.yellow('This results only work if the VOTE_ARRAY is the same for all voters'));
}

main()
  .then(() => {
    console.log(chalk.green('Done ✅'));
    process.exit(0);
  })
  .catch((err) => {
    console.error(chalk.red(err));
    process.exit(1);
  });

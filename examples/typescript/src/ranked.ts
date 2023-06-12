import { IVoteType, OffchainCensus } from '@vocdoni/sdk';
import chalk from 'chalk';
import { createElection, executeElection, getPlainCensus } from './utils/election-process';

/**
 * Example for ranked election.
 *
 * For example: Sort your 5 favorite blockchains: Bitcoin:0, Ethereum:1, Monero:2, Zcash:3, Polkadot:4.
 *
 * Your first option gets 5 points,... the last 0 points.
 *
 * https://developer.vocdoni.io/protocol/ballot#linear-weighted-choice
 */

/**
 * Defines the total number of random voters participating in the election.
 * */
const VOTERS_NUM = 10;

/**
 * The value should correspond to the number of choices of the given question.
 *  */
const MAX_COUNT = 5;

/**
 * Specifies the maximum value that can be assigned to any single choice. For instance, if voters can rate
 * options on a scale of 0 to 3, `MAX_VALUE` should be set to `4`.
 * */
const MAX_VALUE = 4;

/**
 * This must be set to true, unlike in the case of approval voting.
 */
const UNIQUE_CHOICES = true;

/**
 * An array representing a voter's choices. Each entry in the array corresponds to a choice in the election,
 * and the value assigned to each entry represents the voter's rating for that choice. The length of this array
 * should match the total number of choices in the election (`MAX_COUNT`), and the value assigned to each entry
 * should not exceed `MAX_VALUE`.
 *
 * With the following vote array `[2, 3, 0, 1, 4]` and with `10` voters, the expected result haves to be:
 *
 * ```
 * [
 *   [ '0', '0', '10', '0', '0' ],
 *   [ '0', '0', '0', '10', '0' ],
 *   [ '10', '0', '0', '0', '0' ],
 *   [ '0', '10', '0', '0', '0' ],
 *   [ '0', '0', '0', '0', '10' ]
 * ]
 * ```
 *
 * This means:
 *
 * - For choice `0`, all 10 voters select it as `2` option,
 * - For choice `1`, all 10 voters select it as `3` option,
 * - For choice `2`, all 10 voters select it as `0` option,
 * - For choice `3`, all 10 voters select it as `1` option,
 * - For choice `4`, all 10 voters select it as `4` option,
 */
const VOTE_ARRAY = [2, 3, 0, 1, 4];

/**
 * An example configuration for setting up a linear weighted system
 */
const VOTE_OPTIONS: IVoteType = {
  uniqueChoices: UNIQUE_CHOICES,
  costFromWeight: false,
  maxCount: MAX_COUNT,
  maxValue: MAX_VALUE,
  maxTotalCost: 0,
};

const _createElection = (census: OffchainCensus) => {
  const election = createElection(
    census,
    VOTE_OPTIONS,
    'Sort your 5 favorite blockchains',
    'Sort your 5 favorite blockchains'
  );

  election.addQuestion('Favourite blockchain', '', [
    {
      title: 'Bitcoin',
      value: 0,
    },
    {
      title: 'Ethereum',
      value: 1,
    },
    {
      title: 'Monero',
      value: 2,
    },
    {
      title: 'Zcash',
      value: 3,
    },
    {
      title: 'Polkadot',
      value: 4,
    },
  ]);

  return election;
};

async function main() {
  console.log('Creating census with some random wallets...');
  const { census, participants } = getPlainCensus(VOTERS_NUM);

  console.log('Creating election...');
  const election = _createElection(census);

  await executeElection(election, participants, VOTE_ARRAY);
  // Calculate the results array depending on the parameters above
  // This example only work if the VOTE_ARRAY is the same for all the voters
  const result = VOTE_ARRAY.map((vote) => {
    let arr = Array(MAX_COUNT).fill('0');
    arr[vote] = VOTERS_NUM.toString();
    return arr;
  });
  console.log('Expected results: ', result);
  console.log(chalk.yellow('This results only work if the VOTE_ARRAY is the same for all voters'));
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

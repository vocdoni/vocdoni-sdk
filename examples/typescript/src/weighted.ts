import { OffchainCensus, WeightedCensus } from '@vocdoni/sdk';
import chalk from 'chalk';
import { createElection, executeElection } from './utils/election-process';
import { Wallet } from '@ethersproject/wallet';
import { getRandomVoters } from './utils/utils';

/**
 * Example for Weighted Voting.
 *
 * Weighted voting is a voting model where the weight of some participants' votes is greater than others.
 *
 * The process creation anb use of the ballot protocol is the same as on any other Election, the key difference is the
 * use of a `WeightedCensus` instead of a `PlainCensus`.
 *
 * Note that Contrary to quadratic voting, the `costFromWeight` attribute in the vote type needs to be set to false or
 * left undefined in this context.
 *
 * Essentially, you can use the SDK for any vote type except quadratic voting (which already uses the weighted census
 * but for different objectives).
 * The votes are stored on the blockchain like any other voting process. When the results are retrieved from the API,
 * the indexer applies the weight to every vote, and this reflects in the results matrix.
 *
 * For instance, consider that 4 voters have to vote on the question: "Do you like chocolate?" with possible answers "yes" and "no".
 * The weight distribution and votes are as follows:
 *
 * - Voter 1: Weight = 1, Votes for option 0 (no), hence adds 1 vote.
 * - Voter 2: Weight = 2, Votes for option 1 (yes), hence adds 2 votes.
 * - Voter 3: Weight = 3, Votes for option 0 (no), hence adds 3 votes.
 * - Voter 4: Weight = 4, Votes for option 1 (yes), hence adds 4 votes.
 *
 * The total weight is `1 + 2 + 3 + 4 = 10` and will be distributed among the choices.
 *
 * The results array will return by the API should look like:
 *
 * ```
 * [ [ '4', '6' ] ]
 * ```
 *
 * Here, for option 0 (no): `1 + 3 = 4` and for option 1 (yes): `2 + 4 = 6`.
 */

/**
 * Defines the total number of random voters participating in the election.
 * */
const VOTERS_NUM = 4; // Have to be even number

/**
 * The process of generate a `WeightedCensus` is similar to create a `PlainCensus` with the difference that you have to
 * add the vote weight to every participant. As shown below, we are giving to each voter a weight associated to its
 * position on an array. For 4 voters, the first one will have a weight of 1, and the last will have 4.
 * @param participants
 */
const getWeightedCensus = (participants: Wallet[]) => {
  const census = new WeightedCensus();
  census.add(
    participants.map((participant, index) => ({
      key: participant.address,
      weight: BigInt(index + 1),
    }))
  );
  return census;
};

/**
 * Here we are generating the vote array for every voter. If we have 10 voters, 5 will vote option 0 and 5 will vote
 * option 1 depending on its position on the voters array. On this way we are giving the half of the votes to one option
 * and the other half to the other, but every voter will have more voting power.
 * @param index
 */
const getVoteArray = (index: number) => [index % 2];

const _createElection = (census: OffchainCensus) => {
  const election = createElection(
    census,
    undefined,
    'Do you like chocolate?',
    'Simple survey asking for the preference for chocolate'
  );

  election.addQuestion('Select your choice', '', [
    {
      title: 'Yes',
      value: 0,
    },
    {
      title: 'No',
      value: 1,
    },
  ]);

  return election;
};

async function main() {
  console.log('Creating census with some random wallets...');
  const participants: Wallet[] = getRandomVoters(VOTERS_NUM);
  const census = getWeightedCensus(participants);

  console.log('Creating election...');
  const election = _createElection(census);

  await executeElection(election, participants, getVoteArray);
  // Calculate the results array depending on the parameters above
  const result: number[][] = [[0, 0]];
  participants.forEach((value, index) => {
    result[0][getVoteArray(index)[0]] += Number(census.participants[index].weight);
  });
  console.log(
    'Expected results: ',
    result.map((inner) => inner.map((num) => num.toString())) // To string because the backend return BigInt and on the prompt are shown as strings
  );
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

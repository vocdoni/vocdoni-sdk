import chalk from 'chalk';
import { Election, Vote } from '@vocdoni/sdk';
import { getDefaultClient, waitForElectionReady } from './utils/utils';
import { getPlainCensus } from './utils/election-process';
import { allocateSeats, AllocationConfig } from './utils/party-list-tally';

/**
 * Example: proportional seat allocation (D'Hondt / Sainte-Laguë).
 *
 * Ballot: a native single-choice election — each voter picks one list.
 * Result: `fetchElection().results[0]` is the vote total per list.
 *
 * The only non-native step is turning those totals into seats. The rule for
 * doing so (method, seat count, threshold, tie-break) is committed to the
 * election metadata before voting opens, so an observer can reproduce the
 * allocation and the organizer cannot change it after seeing the votes. The
 * tally below reads the rule back from the published metadata, not from a
 * local constant.
 *
 * https://developer.vocdoni.io/protocol/ballot
 */

const LISTS = ['List A', 'List B', 'List C'];
const VOTE_DISTRIBUTION = [11, 7, 4]; // deterministic voters per list, for the demo

const ALLOCATION: AllocationConfig = { method: 'dhondt', seats: 4, threshold: 0, tieBreak: 'lowerIndex' };

async function main() {
  const totalVoters = VOTE_DISTRIBUTION.reduce((a, b) => a + b, 0);
  console.log('Creating census with some random wallets...');
  const { census, participants } = getPlainCensus(totalVoters);

  console.log('Creating election...');
  const { client } = getDefaultClient();
  await client.createAccount();

  const endDate = new Date();
  endDate.setHours(endDate.getHours() + 10);
  const election = Election.from({
    title: 'Party list vote — council seats ' + new Date().toISOString(),
    description: 'Pick one list.',
    endDate: endDate.getTime(),
    census,
  });
  // Commit the allocation rule on-chain, before any vote is cast.
  election.meta = { allocation: ALLOCATION };
  election.addQuestion(
    'Which list do you support?',
    '',
    LISTS.map((title, value) => ({ title, value }))
  );

  const electionId = await client.createElection(election);
  client.setElectionId(electionId);
  console.log(chalk.green('Election created!'), chalk.blue(electionId));
  await waitForElectionReady(client, electionId);

  console.log('Submitting votes...');
  let voterIndex = 0;
  for (let list = 0; list < VOTE_DISTRIBUTION.length; list++) {
    for (let i = 0; i < VOTE_DISTRIBUTION[list]; i++) {
      const voterClient = getDefaultClient(participants[voterIndex++]).client;
      voterClient.setElectionId(electionId);
      await voterClient.submitVote(new Vote([list]));
    }
  }

  const finalElection = await client.fetchElection(electionId);
  const votes = finalElection.results[0].map((count) => BigInt(count));
  const { allocation } = finalElection.meta as { allocation: AllocationConfig };
  const seats = allocateSeats(votes, allocation);

  console.log(chalk.green('Votes per list:'), votes.map(String).join(', '));
  console.log(chalk.green(`Seats per list (${allocation.method}):`), LISTS.map((l, i) => `${l}: ${seats[i]}`).join(', '));
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

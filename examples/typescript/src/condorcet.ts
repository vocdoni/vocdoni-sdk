import chalk from 'chalk';
import { Election, IVoteType } from '@vocdoni/sdk';
import { getDefaultClient, submitVote, waitForElectionReady } from './utils/utils';
import { getPlainCensus } from './utils/election-process';
import { candidatePairs, pairwiseFromResults, rankingToPairwiseBallot, schulze } from './utils/schulze-tally';

/**
 * Example: Condorcet method (Schulze variant).
 *
 * Ballot: each unordered candidate pair {i, j} is one binary field of a
 * native single-choice-per-field election — value 0 prefers i, value 1
 * prefers j. `fetchElection().results[field]` is then `[weight for i,
 * weight for j]`, i.e. the pairwise preference matrix, with census weights
 * already applied and no raw envelope reading.
 *
 * The method and the pair ordering are committed to the election metadata
 * so the tally is reproducible. Needs C(n, 2) fields; the Ballot Protocol's
 * 64-field cap means up to 11 candidates this way.
 *
 * https://developer.vocdoni.io/protocol/ballot
 */

const OPTIONS = ['Alps retreat', 'Beach retreat', 'Countryside retreat', 'Downtown retreat'];

// each voter's full ranking, position = preference order, value = option index
const RANKINGS = [
  [0, 1, 2, 3],
  [1, 0, 3, 2],
  [2, 0, 1, 3],
  [0, 2, 1, 3],
  [1, 2, 0, 3],
];

async function main() {
  const n = OPTIONS.length;
  const pairs = candidatePairs(n);

  console.log('Creating census with some random wallets...');
  const { census, participants } = getPlainCensus(RANKINGS.length);

  console.log('Creating election...');
  const { client } = getDefaultClient();
  await client.createAccount();

  const voteType: IVoteType = {
    uniqueChoices: false,
    costFromWeight: false,
    maxCount: pairs.length, // one field per candidate pair
    maxValue: 1, // binary: 0 prefers the first candidate of the pair, 1 the second
    maxTotalCost: 0,
  };

  const endDate = new Date();
  endDate.setHours(endDate.getHours() + 10);
  const election = Election.from({
    title: 'Condorcet (Schulze) — retreat destination ' + new Date().toISOString(),
    description: 'For each pairing, pick the option you prefer.',
    endDate: endDate.getTime(),
    census,
    voteType,
  });
  election.meta = { condorcet: { method: 'schulze', pairs, tieBreak: 'lowest-index' } };
  election.addQuestion(
    'Head-to-head preferences',
    '',
    pairs.map(([i, j], value) => ({ title: `${OPTIONS[i]} vs ${OPTIONS[j]}`, value }))
  );

  const electionId = await client.createElection(election);
  client.setElectionId(electionId);
  console.log(chalk.green('Election created!'), chalk.blue(electionId));
  await waitForElectionReady(client, electionId);

  await Promise.all(
    participants.map((participant, i) => submitVote(participant, electionId, rankingToPairwiseBallot(RANKINGS[i], n)))
  );

  await client.endElection(electionId);
  const finalElection = await client.fetchElection(electionId);
  const pairwise = pairwiseFromResults(finalElection.results, n);
  const { winner } = schulze(pairwise);

  console.log(chalk.green('Winner:'), OPTIONS[winner]);
  console.log('Pairwise matrix:', JSON.stringify(pairwise.map((row) => row.map(String))));
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

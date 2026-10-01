import chalk from 'chalk';
import { Election, Vote } from '@vocdoni/sdk';
import { getDefaultClient, waitForElectionReady } from './utils/utils';
import { getPlainCensus } from './utils/election-process';
import { calculateMMP } from './utils/mmp-tally';

/**
 * Example: Mixed-Member Proportional (MMP) built on top of the Vocdoni SDK.
 *
 * Not a native election type — it's a composition of several *separate*
 * native elections (one native single-choice election per local
 * constituency, plus one native single-choice "list vote" election), with
 * the compensation math (turning local wins + list proportions into final
 * seat counts) computed afterwards from their aggregate results — see
 * `utils/mmp-tally.ts`. Nothing here needs raw envelope access; every piece
 * is an ordinary native election and `fetchResults()` is enough.
 *
 * Real-world use: MMP is used to elect the German Bundestag (since 1949)
 * and the New Zealand House of Representatives (since 1996), and — in a
 * regional form — the Scottish Parliament. See
 * https://en.wikipedia.org/wiki/Mixed-member_proportional_representation
 *
 * https://developer.vocdoni.io/protocol/ballot
 */

const PARTIES = ['A', 'B', 'C'];
const TOTAL_SEATS = 10;

// 5 local constituencies, each a separate single-choice election — this
// demo hardcodes who wins each one for reproducibility, matching what the
// on-chain votes below actually produce
const CONSTITUENCY_WINNER_VOTES = [
  [6, 3, 1], // constituency 1: party A wins
  [5, 4, 1], // constituency 2: party A wins
  [2, 6, 2], // constituency 3: party B wins
  [1, 2, 5], // constituency 4: party C wins
  [7, 2, 1], // constituency 5: party A wins
];

// the separate "list vote" — one election, one vote per voter for a party list
const LIST_VOTE_DISTRIBUTION = [40, 35, 25]; // votes for A, B, C

async function runSingleChoiceElection(title: string, options: string[], distribution: number[]) {
  const totalVoters = distribution.reduce((a, b) => a + b, 0);
  const { census, participants } = getPlainCensus(totalVoters);

  const { client } = getDefaultClient();
  await client.createAccount();

  const endDate = new Date();
  endDate.setHours(endDate.getHours() + 10);
  const election = Election.from({ title, description: '', endDate: endDate.getTime(), census });
  election.addQuestion(
    title,
    '',
    options.map((option, value) => ({ title: option, value }))
  );

  const electionId = await client.createElection(election);
  client.setElectionId(electionId);
  await waitForElectionReady(client, electionId);

  let voterIndex = 0;
  for (let choice = 0; choice < distribution.length; choice++) {
    for (let i = 0; i < distribution[choice]; i++) {
      const voterClient = getDefaultClient(participants[voterIndex++]).client;
      voterClient.setElectionId(electionId);
      await voterClient.submitVote(new Vote([choice]));
    }
  }

  const finalElection = await client.fetchElection(electionId);
  const voteCounts = finalElection.results[0].map((count) => Number(count));
  return { electionId, voteCounts };
}

async function main() {
  // Reference case, hand-verified: local winners [A,A,B,C,A] (A wins 3,
  // B wins 1, C wins 1), list votes {A:40,B:35,C:25}, 10 total seats,
  // D'Hondt. Proportional target from the list vote alone: A=4, B=4, C=2
  // (D'Hondt quotients: 40,35,25,20,17.5,13.3,12.5,11.7,10,8.75 -> top 10
  // are 4xA, 4xB, 2xC). Nobody's local wins exceed their target, so no
  // overhang: compensation = target - local = A:1, B:3, C:1, giving final
  // totals A:4, B:4, C:2, summing to exactly 10.
  const reference = calculateMMP(['A', 'A', 'B', 'C', 'A'], { A: 40, B: 35, C: 25 }, 10, 'dhondt');
  const referenceOk =
    reference.perParty.A.total === 4 && reference.perParty.B.total === 4 && reference.perParty.C.total === 2;
  if (!referenceOk) {
    throw new Error(`MMP reference case failed: expected A:4 B:4 C:2, got ${JSON.stringify(reference.perParty)}`);
  }

  console.log(chalk.yellow(`Running ${CONSTITUENCY_WINNER_VOTES.length} local constituency elections...`));
  const localWinners: string[] = [];
  for (let c = 0; c < CONSTITUENCY_WINNER_VOTES.length; c++) {
    const { voteCounts } = await runSingleChoiceElection(
      `Constituency ${c + 1} — ${new Date().toISOString()}`,
      PARTIES,
      CONSTITUENCY_WINNER_VOTES[c]
    );
    const winnerIndex = voteCounts.reduce((best, v, i) => (v > voteCounts[best] ? i : best), 0);
    localWinners.push(PARTIES[winnerIndex]);
    console.log(`  constituency ${c + 1}: ${PARTIES[winnerIndex]} (${voteCounts.join('/')})`);
  }

  console.log(chalk.yellow('Running the list vote election...'));
  const { voteCounts: listVoteCounts } = await runSingleChoiceElection(
    'Party list vote — ' + new Date().toISOString(),
    PARTIES,
    LIST_VOTE_DISTRIBUTION
  );
  const listVotes: Record<string, number> = {};
  PARTIES.forEach((p, i) => (listVotes[p] = listVoteCounts[i]));
  console.log('  list votes:', JSON.stringify(listVotes));

  const result = calculateMMP(localWinners, listVotes, TOTAL_SEATS, 'dhondt');
  console.log(chalk.green('Final seats:'), JSON.stringify(result.perParty, null, 2));
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

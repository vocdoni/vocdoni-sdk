import chalk from 'chalk';
import { ElectionMeta, Election, PlainCensus, Vote, VocdoniSDKClient } from '@vocdoni/sdk';
import { Wallet } from '@ethersproject/wallet';
import { getDefaultClient, waitForElectionReady } from './utils/utils';
import { getPlainCensus } from './utils/election-process';
import { needsRunoff, roundWinner, runoffContenders, RunoffRules } from './utils/runoff-tally';

/**
 * Example: two-round (runoff) election.
 *
 * There is no native "hold a second round if nobody clears 50%" primitive,
 * so this is orchestration: two ordinary native single-choice elections run
 * by the same organiser over the same census. Each round is ended before
 * its results are read. The runoff rule (majority denominator, tie-break)
 * is committed to round 1's metadata; round 2's metadata points back at
 * round 1. A round-2 vote is a fresh vote by the same electorate, not a
 * transfer of round-1 votes.
 *
 * https://developer.vocdoni.io/protocol/ballot
 */

const CANDIDATES = ['Alameda', 'Bettencourt', 'Carvalho', 'Dias'];
const RULES: RunoffRules = {
  majorityThreshold: { num: 1, den: 2 },
  denominator: 'validVotes',
  tieBreak: 'lowerIndex',
};

// Deterministic demo. Round 1: nobody clears 50%. Round 2: the same voters
// choose between the top two.
const ROUND1_DISTRIBUTION = [5, 4, 2, 1];
const ROUND2_DISTRIBUTION = [7, 5];

async function runRound(
  client: VocdoniSDKClient,
  census: PlainCensus,
  voters: Wallet[],
  title: string,
  options: string[],
  distribution: number[],
  meta: ElectionMeta
): Promise<{ electionId: string; votes: bigint[]; meta: ElectionMeta }> {
  const endDate = new Date();
  endDate.setHours(endDate.getHours() + 10);
  const election = Election.from({ title, description: '', endDate: endDate.getTime(), census });
  election.meta = meta;
  election.addQuestion(
    title,
    '',
    options.map((option, value) => ({ title: option, value }))
  );

  const electionId = await client.createElection(election);
  client.setElectionId(electionId);
  console.log(chalk.green('Election created!'), chalk.blue(electionId));
  await waitForElectionReady(client, electionId);

  let voterIndex = 0;
  for (let choice = 0; choice < distribution.length; choice++) {
    for (let i = 0; i < distribution[choice]; i++) {
      const voterClient = getDefaultClient(voters[voterIndex++]).client;
      voterClient.setElectionId(electionId);
      await voterClient.submitVote(new Vote([choice]));
    }
  }

  // End the round before reading its results — no decision on provisional counts.
  await client.endElection(electionId);
  const finalElection = await client.fetchElection(electionId);
  return {
    electionId,
    votes: finalElection.results[0].map((count) => BigInt(count)),
    meta: finalElection.meta,
  };
}

/** A round with no valid votes has no winner — never fall through to a tie-break. */
function assertVotesCast(votes: bigint[]): void {
  if (votes.reduce((a, b) => a + b, 0n) === 0n) {
    throw new Error('No votes cast — no winner can be declared');
  }
}

async function main() {
  const voterCount = ROUND1_DISTRIBUTION.reduce((a, b) => a + b, 0);
  const { census, participants } = getPlainCensus(voterCount);

  const { client } = getDefaultClient();
  await client.createAccount();

  console.log(chalk.yellow('Round 1'));
  const round1 = await runRound(
    client,
    census,
    participants,
    'Council presidency, round 1 ' + new Date().toISOString(),
    CANDIDATES,
    ROUND1_DISTRIBUTION,
    { runoff: { round: 1, rules: RULES } }
  );
  console.log('Votes:', CANDIDATES.map((c, i) => `${c}: ${round1.votes[i]}`).join(', '));

  // Decide from the rule published in round 1's metadata, not the local
  // constant — that published copy is what an observer can check.
  const { rules } = (round1.meta as { runoff: { rules: RunoffRules } }).runoff;

  if (!needsRunoff(round1.votes, rules)) {
    assertVotesCast(round1.votes);
    const [top] = runoffContenders(round1.votes);
    console.log(chalk.green(`${CANDIDATES[top]} wins in round 1 (absolute majority)`));
    return;
  }

  const [firstIdx, secondIdx] = runoffContenders(round1.votes);
  const runoffCandidates = [CANDIDATES[firstIdx], CANDIDATES[secondIdx]];
  console.log(chalk.yellow('Round 2:'), runoffCandidates.join(' vs '));

  const round2 = await runRound(
    client,
    census,
    participants,
    'Council presidency, round 2 ' + new Date().toISOString(),
    runoffCandidates,
    ROUND2_DISTRIBUTION,
    { runoff: { round: 2, runoffOf: round1.electionId, contenders: [firstIdx, secondIdx], rules } }
  );

  assertVotesCast(round2.votes);
  const winner = roundWinner(round2.votes);
  console.log(chalk.green(`Winner: ${runoffCandidates[winner]}`), `(${round2.votes[0]} vs ${round2.votes[1]})`);
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

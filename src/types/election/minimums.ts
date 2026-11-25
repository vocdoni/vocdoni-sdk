import invariant from 'tiny-invariant';
import { IVoteType } from './election';
import { Vote } from '../vote';

/**
 * The highest `costExponent` the chain accepts when `minTotalCost` is set: the minimum cost has no early bound,
 * so the chain refuses to compute larger powers.
 */
export const MAX_COST_EXPONENT_WITH_MIN_TOTAL_COST = 8;

interface VoteOptions {
  maxCount: number;
  maxValue: number;
  maxVoteOverwrites: number;
  maxTotalCost: number;
  costExponent: number;
}

/**
 * Adds the ballot minimums of the vote type to the vote options sent to the chain, rejecting the combinations
 * `NewProcessTx` refuses.
 *
 * @param options - The vote options without minimums
 * @param voteType - The vote type holding the minimums
 */
export function withVoteMinimums(
  options: VoteOptions,
  voteType: IVoteType
): VoteOptions & { minValue: number; minTotalCost: number } {
  const minValue = voteType.minValue ?? 0;
  const minTotalCost = voteType.minTotalCost ?? 0;

  invariant(Number.isInteger(minValue) && minValue >= 0, 'Min value must be a non-negative integer');
  invariant(Number.isInteger(minTotalCost) && minTotalCost >= 0, 'Min total cost must be a non-negative integer');
  invariant(
    !(options.maxValue > 0 && minValue > options.maxValue),
    'Min value (' + minValue + ') cannot be greater than max value (' + options.maxValue + ')'
  );
  invariant(
    !(options.maxTotalCost > 0 && minTotalCost > options.maxTotalCost),
    'Min total cost (' + minTotalCost + ') cannot be greater than max total cost (' + options.maxTotalCost + ')'
  );
  invariant(
    !(minTotalCost > 0 && options.costExponent > MAX_COST_EXPONENT_WITH_MIN_TOTAL_COST),
    'Cost exponent cannot be greater than ' + MAX_COST_EXPONENT_WITH_MIN_TOTAL_COST + ' when min total cost is set'
  );

  return { ...options, minValue, minTotalCost };
}

/**
 * Checks a vote against the ballot minimums of the vote type, as the chain does: every value is at least
 * `minValue`, and Σ value^costExponent (with 0^0 = 1) is at least `minTotalCost`. A minimum of 0 is not enforced.
 *
 * @param vote - The vote to check
 * @param voteType - The vote type of the election
 */
export function checkVoteMinimums(vote: Vote, voteType: IVoteType): void {
  const minValue = voteType.minValue ?? 0;
  if (minValue > 0) {
    vote.votes.forEach((value) => {
      if (BigInt(value) < BigInt(minValue)) {
        throw new Error('Invalid choice value, minimum is ' + minValue);
      }
    });
  }

  const minTotalCost = voteType.minTotalCost ?? 0;
  if (minTotalCost > 0) {
    const exponent = BigInt(voteType.costExponent ?? 1);
    const totalCost = vote.votes.reduce<bigint>((acc, value) => acc + BigInt(value) ** exponent, BigInt(0));
    if (totalCost < BigInt(minTotalCost)) {
      throw new Error('Total cost is below the minimum of ' + minTotalCost);
    }
  }
}

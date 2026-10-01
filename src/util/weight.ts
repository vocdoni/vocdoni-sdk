/**
 * Validates a CSP vote weight and normalizes it to a bigint.
 *
 * Safe integers given as `number` and decimal strings are accepted and converted, so loosely typed
 * callers keep working, and a weight that went through JSON as `weight.toString()` (bigints are not
 * JSON-serializable) can be passed back as is. Zero is rejected rather than encoded: a weight-zero vote
 * counts for nothing, and older SDK releases silently treated `0n` as "no weight" (i.e. weight 1), so
 * failing loudly is safer than changing its meaning. The upper bound mirrors the chain's own
 * `saltedkey.MaxVoteWeightBits` (160): a larger weight is rejected by the node at vote time.
 *
 * @param weight - The vote weight
 */
export function normalizeVoteWeight(weight: bigint | number | string): bigint {
  if (typeof weight === 'number' && Number.isInteger(weight) && !Number.isSafeInteger(weight)) {
    throw new Error(
      'Vote weight is outside the safe integer range and has lost precision as a number; pass it as a bigint or string'
    );
  }
  if (typeof weight === 'number' && Number.isSafeInteger(weight)) {
    weight = BigInt(weight);
  }
  if (typeof weight === 'string' && /^\d+$/.test(weight)) {
    weight = BigInt(weight);
  }
  if (typeof weight !== 'bigint' || weight < 1n || weight >= 1n << 160n) {
    throw new Error('Vote weight must be an integer in the range [1, 2^160)');
  }
  return weight;
}

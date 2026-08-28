import { Buffer } from 'buffer';

/**
 * Represents a vote
 */
export class Vote {
  private _votes: Array<number | bigint>;
  private _memo?: string;

  public static readonly MAX_MEMO_BYTES = 256;

  /**
   * Constructs a vote
   *
   * @param votes - The list of votes values
   * @param memo - Optional free-text note attached by the voter (max 256 bytes when UTF-8 encoded)
   */
  public constructor(votes: Array<number | bigint>, memo?: string) {
    this.votes = votes;
    this.memo = memo;
  }

  get votes(): Array<number | bigint> {
    return this._votes;
  }

  set votes(value: Array<number | bigint>) {
    this._votes = value;
  }

  /**
   * Optional free-text note attached by the voter, e.g. an open "Other" answer.
   *
   * Two caveats worth knowing before relying on it:
   *
   * - The memo is gated behind a soft fork on the chain side. Until it activates
   *   for the target chain, the memo is silently ignored: it is not stored, not
   *   hashed into the vote and not returned by the API.
   * - On anonymous elections the vote transaction is not signed and the memo is
   *   not covered by the zk proof, so it can be altered in transit. Free text
   *   also weakens the anonymity set. Do not put anything sensitive in it.
   *
   * An empty memo is normalized to `undefined`, matching how the chain stores it.
   */
  get memo(): string | undefined {
    return this._memo;
  }

  set memo(value: string | undefined) {
    if (value && Buffer.byteLength(value, 'utf8') > Vote.MAX_MEMO_BYTES) {
      throw new Error('Memo cannot be longer than ' + Vote.MAX_MEMO_BYTES + ' bytes');
    }
    this._memo = value || undefined;
  }
}

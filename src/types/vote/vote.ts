/**
 * Represents a vote
 */
export class Vote {
  private _votes: Array<number | bigint>;
  private _memo?: string;

  public static MAX_MEMO_BYTES = 256;

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

  get memo(): string {
    return this._memo;
  }

  set memo(value: string) {
    if (value && new TextEncoder().encode(value).length > Vote.MAX_MEMO_BYTES) {
      throw new Error('Memo cannot be longer than ' + Vote.MAX_MEMO_BYTES + ' bytes');
    }
    this._memo = value;
  }
}

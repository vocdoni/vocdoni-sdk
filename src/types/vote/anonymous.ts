import { Vote } from './vote';

export class AnonymousVote extends Vote {
  private _password: string;
  private _signature: string;

  /**
   * Constructs an anonymous vote
   *
   * @param votes - The list of votes values
   * @param signature - The signature of the payload
   * @param password - The password of the anonymous vote
   * @param memo - Optional free-text note attached by the voter (max 256 bytes when UTF-8 encoded).
   *   Note it is neither signed nor covered by the zk proof on anonymous elections, see {@link Vote.memo}
   */
  public constructor(votes: Array<number | bigint>, signature?: string, password: string = '0', memo?: string) {
    super(votes, memo);
    this.password = password;
    this.signature = signature;
  }

  get password(): string {
    return this._password;
  }

  set password(value: string) {
    this._password = value;
  }

  get signature(): string {
    return this._signature;
  }

  set signature(value: string) {
    this._signature = value;
  }
}

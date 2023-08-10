import { Vote } from './vote';

export class AnonymousVote extends Vote {
  private _password: string;

  /**
   * Constructs a csp vote
   *
   * @param votes The list of votes values
   * @param password The password of the anonymous vote
   */
  public constructor(votes: Array<number | bigint>, password: string = '0') {
    super(votes);
    this.password = password;
  }

  get password(): string {
    return this._password;
  }

  set password(value: string) {
    this._password = value;
  }
}

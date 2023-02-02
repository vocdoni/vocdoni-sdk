import { Vote } from './vote';

export class CspVote extends Vote {
  private _signature: string;

  /**
   * Constructs a csp vote
   *
   * @param votes The list of votes values
   * @param signature The CSP signature
   */
  public constructor(votes: Array<number | bigint>, signature: string) {
    super(votes);
    this.signature = signature;
  }

  get signature(): string {
    return this._signature;
  }

  set signature(value: string) {
    this._signature = value;
  }
}

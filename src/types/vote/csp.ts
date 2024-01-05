import { Vote } from './vote';
import { CspProofType } from '../../core/vote';

export class CspVote extends Vote {
  private _signature: string;
  private _proof_type: CspProofType;

  /**
   * Constructs a csp vote
   *
   * @param votes The list of votes values
   * @param signature The CSP signature
   * @param proof_type The CSP proof type
   */
  public constructor(votes: Array<number | bigint>, signature: string, proof_type?: CspProofType) {
    super(votes);
    this.signature = signature;
    this.proof_type = proof_type;
  }

  get signature(): string {
    return this._signature;
  }

  set signature(value: string) {
    this._signature = value;
  }

  get proof_type(): CspProofType {
    return this._proof_type;
  }

  set proof_type(value: CspProofType) {
    this._proof_type = value;
  }
}

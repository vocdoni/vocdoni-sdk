import { Vote } from './vote';
import { CspProofType } from '../../services';
import { normalizeVoteWeight } from '../../util/weight';

export class CspVote extends Vote {
  private _signature: string;
  private _proof_type: CspProofType;
  private _weight: bigint;

  /**
   * Constructs a csp vote
   *
   * @param votes - The list of votes values
   * @param signature - The CSP signature
   * @param proof -_type The CSP proof type
   * @param weight - The vote weight
   */
  public constructor(votes: Array<number | bigint>, signature: string, proof_type?: CspProofType, weight?: bigint) {
    super(votes);
    this.signature = signature;
    this.proof_type = proof_type;
    this.weight = weight;
  }

  get signature(): string {
    return this._signature;
  }

  set signature(value: string) {
    // cspSign resolves to a `{ signature, weight }` object: fail here rather than deep inside submitVote.
    // A missing signature is still allowed, so it can be set after construction.
    if (value != null && typeof value !== 'string') {
      throw new Error(
        'Invalid CSP signature: expected a hex string; pass the object returned by cspSign to cspVote instead'
      );
    }
    this._signature = value;
  }

  get proof_type(): CspProofType {
    return this._proof_type;
  }

  set proof_type(value: CspProofType) {
    this._proof_type = value;
  }

  get weight(): bigint {
    return this._weight;
  }

  set weight(value: bigint) {
    // validate here so an invalid weight fails when the vote is built, not at submitVote time
    this._weight = value == null ? undefined : normalizeVoteWeight(value);
  }
}

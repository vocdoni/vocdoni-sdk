import { Service, ServiceProperties } from './service';
import invariant from 'tiny-invariant';
import { CensusType, CspVote, Election, Vote } from '../types';
import { CspAPI, ICspInfoResponse } from '../api/csp';
import { CensusBlind, getBlindedPayload } from '../util/blind-signing';
import { ProofCA_Type } from '@vocdoni/proto/vochain';

interface CspServiceProperties {
  info: ICspInfoResponse;
}

type CspServiceParameters = ServiceProperties & CspServiceProperties;

export enum CspProofType {
  ECDSA = ProofCA_Type.ECDSA,
  ECDSA_PIDSALTED = ProofCA_Type.ECDSA_PIDSALTED,
  ECDSA_BLIND = ProofCA_Type.ECDSA_BLIND,
  ECDSA_BLIND_PIDSALTED = ProofCA_Type.ECDSA_BLIND_PIDSALTED,
}

export class CspService extends Service implements CspServiceProperties {
  public info: ICspInfoResponse;

  /**
   * The weight last passed to `cspSign` on this instance (`undefined` if it was signed unweighted),
   * remembered so the paired `cspVote` call can default to it without the caller having to pass the
   * weight twice. `undefined` here just means "not yet set"; whether `cspSign` has actually been
   * called is tracked separately via `signedWeightSet`.
   */
  private signedWeight?: bigint;
  private signedWeightSet = false;

  /**
   * Instantiate the CSP service.
   *
   * @param params - The service parameters
   */
  constructor(params: Partial<CspServiceParameters>) {
    super();
    Object.assign(this, params);
  }

  static fetchUrlFromElection(election: Election): string {
    invariant(election || election.census.type === CensusType.CSP, 'Election set is not from CSP type');
    return election.census.censusURI;
  }

  setUrlFromElection(election: Election): string {
    return (this.url = CspService.fetchUrlFromElection(election));
  }

  async setInfo(): Promise<ICspInfoResponse> {
    invariant(this.url, 'No CSP URL set');

    return (this.info = await CspAPI.info(this.url));
  }

  async cspStep(electionId: string, stepNumber: number, data: any[], authToken?: string) {
    invariant(this.url, 'No CSP URL set');
    invariant(this.info, 'No CSP information set');

    return CspAPI.step(
      this.url,
      electionId,
      this.info.signatureType[0],
      this.info.authType,
      stepNumber,
      data,
      authToken
    );
  }

  /**
   * Asks the CSP to blind-sign the CA bundle for the given voter.
   *
   * For weighted votes, `weight` MUST match the weight submitted with the vote (see `cspVote`):
   * the chain verifies the CSP signature against the submitted bundle, which includes the weight.
   * This instance remembers the `weight` it was called with, so the following `cspVote` call on
   * the same instance does not need to repeat it (see `cspVote` for details).
   *
   * @param electionId - The election id
   * @param address - The voter address
   * @param token - The token granted by the CSP authentication steps
   * @param weight - The vote weight attested by the CSP
   */
  async cspSign(electionId: string, address: string, token: string, weight?: bigint) {
    invariant(this.url, 'No CSP URL set');
    invariant(this.info, 'No CSP information set');

    this.signedWeight = weight;
    this.signedWeightSet = true;

    const { hexBlinded: blindedPayload, userSecretData } = getBlindedPayload(electionId, token, address, weight);

    return CspAPI.sign(this.url, electionId, this.info.signatureType[0], blindedPayload, token).then((signature) =>
      CensusBlind.unblind(signature.signature, userSecretData)
    );
  }

  /**
   * Builds the `CspVote` to be submitted with the given CSP signature.
   *
   * When `weight` is omitted and a preceding `cspSign` call was made on this instance, it defaults
   * to the weight that was signed for, since the CSP signature is only valid against a bundle built
   * with that exact weight. Passing a `weight` that conflicts with the one remembered from `cspSign`
   * throws, rather than silently preferring one of the two values and reintroducing the mismatch
   * between the blind-signed payload and the submitted bundle.
   *
   * @param vote - The vote to be cast
   * @param signature - The (unblinded) CSP signature
   * @param proof_type - The CSP proof type
   * @param weight - The vote weight; defaults to the weight passed to the last `cspSign` call on this instance, if any
   */
  cspVote(vote: Vote, signature: string, proof_type?: CspProofType, weight?: bigint): CspVote {
    if (this.signedWeightSet && weight !== undefined && weight !== this.signedWeight) {
      throw new Error(
        `Vote weight (${weight}) does not match the weight signed by the CSP (${this.signedWeight}). ` +
          'Pass the same weight to cspSign and cspVote, or omit it from cspVote to reuse the signed weight.'
      );
    }

    return CspService.cspVote(vote, signature, proof_type, this.signedWeightSet ? this.signedWeight : weight);
  }

  static cspVote(vote: Vote, signature: string, proof_type?: CspProofType, weight?: bigint): CspVote {
    return new CspVote(vote.votes, signature, proof_type, weight);
  }
}

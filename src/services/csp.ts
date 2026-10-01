import { Service, ServiceProperties } from './service';
import invariant from 'tiny-invariant';
import { CensusType, CspVote, Election, Vote } from '../types';
import { CspAPI, ICspInfoResponse } from '../api/csp';
import { CensusBlind, getBlindedPayload } from '../util/blind-signing';
import { ProofCA_Type } from '@vocdoni/proto/vochain';
import { normalizeVoteWeight } from '../util/weight';

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

/**
 * A CSP signature together with the weight it was signed for (`undefined` if unweighted).
 *
 * The CSP signature is only valid against a bundle built with that exact weight, so `cspSign` returns
 * both and `cspVote` accepts them together: the weight travels with the signature wherever it goes.
 * To send it elsewhere as JSON (bigints are not JSON-serializable), serialize the weight with
 * `weight.toString()`: `cspVote` also accepts the weight as a decimal string.
 */
export type CspSignature = {
  signature: string;
  weight?: bigint;
};

/**
 * What `cspVote` accepts as a signature: a `CspSignature` as returned by `cspSign`, or one rebuilt from
 * JSON, where the weight was serialized with `weight.toString()` (or as a safe-integer number).
 */
export type CspSignatureInput = { signature: string; weight?: bigint | number | string };

export class CspService extends Service implements CspServiceProperties {
  public info: ICspInfoResponse;

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
   * For weighted votes, `weight` MUST match the weight submitted with the vote: the chain verifies the
   * CSP signature against the submitted bundle, which includes the weight. The returned `CspSignature`
   * carries that weight, so passing it as is to `cspVote` builds the vote with it.
   *
   * @param electionId - The election id
   * @param address - The voter address
   * @param token - The token granted by the CSP authentication steps
   * @param weight - The vote weight attested by the CSP
   */
  async cspSign(electionId: string, address: string, token: string, weight?: bigint): Promise<CspSignature> {
    invariant(this.url, 'No CSP URL set');
    invariant(this.info, 'No CSP information set');

    // normalized once, so the blinded bundle and the returned weight share the same value
    const signedWeight = weight == null ? undefined : normalizeVoteWeight(weight);
    const { hexBlinded: blindedPayload, userSecretData } = getBlindedPayload(electionId, token, address, signedWeight);

    const { signature: blindSignature } = await CspAPI.sign(
      this.url,
      electionId,
      this.info.signatureType[0],
      blindedPayload,
      token
    );
    return { signature: CensusBlind.unblind(blindSignature, userSecretData), weight: signedWeight };
  }

  cspVote(vote: Vote, signature: string | CspSignatureInput, proof_type?: CspProofType, weight?: bigint): CspVote {
    return CspService.cspVote(vote, signature, proof_type, weight);
  }

  /**
   * Builds the `CspVote` to be submitted with the given CSP signature.
   *
   * When `signature` is a `CspSignature` (as returned by `cspSign`) and `weight` is omitted, the vote
   * uses the weight the signature was signed for, since the CSP signature is only valid against a
   * bundle built with that exact weight. Passing a `weight` that conflicts with it throws, rather than
   * silently preferring one of the two values. A plain signature string uses the given `weight` as is.
   *
   * @param vote - The vote to be cast
   * @param signature - The (unblinded) CSP signature, either as returned by `cspSign` or as a hex string
   * @param proof_type - The CSP proof type
   * @param weight - The vote weight; defaults to the weight carried by `signature`, if any
   */
  static cspVote(
    vote: Vote,
    signature: string | CspSignatureInput,
    proof_type?: CspProofType,
    weight?: bigint
  ): CspVote {
    if (typeof signature === 'string') {
      const cspVote = new CspVote(vote.votes, signature, proof_type, weight);
      cspVote.memo = vote.memo;
      return cspVote;
    }
    // a plain Error rather than tiny-invariant, which strips the message in production builds
    if (typeof signature?.signature !== 'string') {
      throw new Error('Invalid CSP signature: expected a hex string or the object returned by cspSign');
    }

    // normalize both sides: a CspSignature rebuilt from JSON may carry the weight as a number or string
    const signedWeight = signature.weight == null ? undefined : normalizeVoteWeight(signature.weight);
    if (weight != null && normalizeVoteWeight(weight) !== signedWeight) {
      throw new Error(
        `Vote weight (${weight}) does not match the weight signed by the CSP (${signedWeight ?? 'none'}). ` +
          'Pass the same weight to cspSign and cspVote, or omit it from cspVote to reuse the signed weight.'
      );
    }

    const cspVote = new CspVote(vote.votes, signature.signature, proof_type, signedWeight);
    cspVote.memo = vote.memo;
    return cspVote;
  }
}

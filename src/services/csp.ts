import { Service, ServiceProperties } from './service';
import invariant from 'tiny-invariant';
import { CensusType, CspVote, Election, Vote } from '../types';
import { CspAPI, ICspInfoResponse } from '../api/csp';
import { CensusBlind, getBlindedPayload } from '../util/blind-signing';
import { CspProofType } from '../core/vote';

interface CspServiceProperties {
  info: ICspInfoResponse;
}

type CspServiceParameters = ServiceProperties & CspServiceProperties;

export class CspService extends Service implements CspServiceProperties {
  public info: ICspInfoResponse;

  /**
   * Instantiate the CSP service.
   *
   * @param {Partial<CspServiceParameters>} params The service parameters
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

  async cspSign(electionId: string, address: string, token: string) {
    invariant(this.url, 'No CSP URL set');
    invariant(this.info, 'No CSP information set');

    const { hexBlinded: blindedPayload, userSecretData } = getBlindedPayload(electionId, token, address);

    return CspAPI.sign(this.url, electionId, this.info.signatureType[0], blindedPayload, token).then((signature) =>
      CensusBlind.unblind(signature.signature, userSecretData)
    );
  }

  cspVote(vote: Vote, signature: string, proof_type?: CspProofType): CspVote {
    return CspService.cspVote(vote, signature, proof_type);
  }

  static cspVote(vote: Vote, signature: string, proof_type?: CspProofType): CspVote {
    return new CspVote(vote.votes, signature, proof_type);
  }
}

import axios from 'axios';

enum VoteAPIMethods {
  VOTE = 'https://gw1-azeno.vocdoni.net/v2/vote/submit',
}

export interface VoteAPIResponse {
  /**
   * The hash of the transaction
   */
  txHash: string;

  /**
   * The identifier of the vote, also called nullifier.
   */
  voteID: string;
}

export interface VoteAPIRequest {
  /**
   * The payload of the vote
   */
  TxPayload: string;
}

export abstract class VoteAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  public static submit(request: VoteAPIRequest): Promise<VoteAPIResponse> {
    return axios
      .post<VoteAPIResponse>(VoteAPIMethods.VOTE, JSON.stringify(request))
      .then(response => response.data)
      .catch(error => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}

import axios from 'axios';

enum VoteAPIMethods {
  VOTE = '/votes',
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

export abstract class VoteAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  /**
   * Voting
   *
   * @param {string} url API endpoint URL
   * @param {string} payload The base64 encoded vote transaction
   *
   * @returns {Promise<VoteAPIResponse>}
   */
  public static submit(url: string, payload: string): Promise<VoteAPIResponse> {
    return axios
      .post<VoteAPIResponse>(url + VoteAPIMethods.VOTE, JSON.stringify({ txPayload: payload }))
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}

import axios from 'axios';
import { API } from './api';

enum VoteAPIMethods {
  VOTE = '/votes',
  INFO = '/votes',
  VERIFY = '/votes/verify',
}

export interface IVoteSubmitResponse {
  /**
   * The hash of the transaction
   */
  txHash: string;

  /**
   * The identifier of the vote, also called nullifier.
   */
  voteID: string;
}

export interface IVoteInfoResponse {
  /**
   * The hash of the transaction
   */
  txHash: string;

  /**
   * The identifier of the vote, also called nullifier.
   */
  voteID: string;

  /**
   * Encryption key indexes used
   */
  encryptionKeys?: number[];

  /**
   * The stringified vote package JSON.
   */
  package: string;

  /**
   * The weight of the vote.
   */
  weight: string;

  /**
   * The identifier of the election.
   */
  electionID: string;

  /**
   * The block number where the transaction is mined.
   */
  blockHeight: number;

  /**
   * The index inside the block where the transaction is mined.
   */
  transactionIndex: number;

  /**
   * The number of votes overwrites.
   */
  overwriteCount: number;

  /**
   * Date when the vote was emitted
   */
  date: string;
}

export abstract class VoteAPI extends API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Voting
   *
   * @param {string} url API endpoint URL
   * @param {string} payload The base64 encoded vote transaction
   *
   * @returns {Promise<IVoteSubmitResponse>}
   */
  public static submit(url: string, payload: string): Promise<IVoteSubmitResponse> {
    return axios
      .post<IVoteSubmitResponse>(url + VoteAPIMethods.VOTE, { txPayload: payload })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Vote info
   *
   * @param {string} url API endpoint URL
   * @param {string} voteId The identifier of the vote
   *
   * @returns {Promise<IVoteInfoResponse>}
   */
  public static info(url: string, voteId: string): Promise<IVoteInfoResponse> {
    return axios
      .get<IVoteInfoResponse>(url + VoteAPIMethods.INFO + '/' + voteId)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Verify vote. A vote exists in a process.
   *
   * @param {string} url API endpoint URL
   * @param {string} processId The process identifier
   * @param {string} voteId The identifier of the vote
   *
   * @returns {Promise<boolean>} Return true if response has status 200
   */
  public static verify(url: string, processId: string, voteId: string): Promise<boolean> {
    return axios
      .get(url + VoteAPIMethods.VERIFY + '/' + processId + '/' + voteId)
      .then((response) => response.status === 200)
      .catch(this.isApiError);
  }
}

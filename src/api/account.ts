import axios from 'axios';
import { IElectionListResponse } from './election';
import { API } from './api';
import { AccountMetadata } from '../types';

enum AccountAPIMethods {
  INFO = '/accounts',
  SET_INFO = '/accounts',
  ELECTIONS = '/accounts/{accountId}/elections/page',
  TRANSFERS = '/accounts/{accountId}/transfers/page',
}

interface IAccountInfoResponse {
  /**
   * The address of the account
   */
  address: string;

  /**
   * The current balance in tokens.
   */
  balance: number;

  /**
   * The nonce of the account.
   */
  nonce: number;

  /**
   * The sik of the account.
   */
  sik: string;

  /**
   * The index of the elections created by the account.
   */
  electionIndex: number;

  /**
   * The information URI of the account
   */
  infoURI?: string;

  /**
   * The metadata of the account
   */
  metadata: AccountMetadata;
}

interface IAccountSetInfoResponse {
  /**
   * The hash of the transaction
   */
  txHash: string;

  /**
   * The metadata URL
   */
  metadataURL: number;
}

interface IAccountTransfersResponse {
  amount: number;
  from: string;
  height: number;
  txHash: string;
  timestamp: string;
  to: string;
}

export abstract class AccountAPI extends API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Fetches an Account information
   *
   * @param {string} url API endpoint URL
   * @param {string} address The one we want the info from
   * @returns {Promise<IAccountInfoResponse>}
   */
  public static info(url: string, address: string): Promise<IAccountInfoResponse> {
    return axios
      .get<IAccountInfoResponse>(url + AccountAPIMethods.INFO + '/' + address)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Sets Account information
   *
   * @param {string} url API endpoint URL
   * @param {string} payload The set information info raw payload to be submitted to the chain
   * @param {string} metadata The base64 encoded metadata JSON object
   * @returns {Promise<IAccountSetInfoResponse>}
   */
  public static setInfo(url: string, payload: string, metadata: string): Promise<IAccountSetInfoResponse> {
    return axios
      .post<IAccountSetInfoResponse>(url + AccountAPIMethods.SET_INFO, { txPayload: payload, metadata })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns paginated list of transfers for a specific account
   *
   * @param {string} url API endpoint URL
   * @param {string} accountId accountId to get transfers
   * @param {number} page The page number
   * @returns {Promise<IAccountTransfersResponse>}
   */
  public static transfersList(url: string, accountId: string, page: number = 0): Promise<IAccountTransfersResponse> {
    return axios
      .get<IAccountTransfersResponse>(url + AccountAPIMethods.TRANSFERS.replace('{accountId}', accountId) + '/' + page)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns paginated list of elections for a specific account
   *
   * @param {string} url API endpoint URL
   * @param {string} accountId accountId to get elections
   * @param {number} page The page number
   * @returns {Promise<IElectionListResponse>}
   */
  public static electionsList(url: string, accountId: string, page: number = 0): Promise<IElectionListResponse> {
    return axios
      .get<IElectionListResponse>(url + AccountAPIMethods.ELECTIONS.replace('{accountId}', accountId) + '/' + page)
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

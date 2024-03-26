import axios from 'axios';
import { IElectionListResponse } from './election';
import { API } from './api';
import { IAccountMetadata } from '../types';

enum AccountAPIMethods {
  LIST = '/accounts/page',
  NUM_ACCOUNTS = '/accounts/count',
  INFO = '/accounts/{accountId}',
  METADATA = '/accounts/{accountId}/metadata',
  SET_INFO = '/accounts',
  ELECTIONS = '/accounts/{accountId}/elections/page',
  TRANSFERS = '/accounts/{accountId}/transfers/page',
  NUM_TRANSFERS = '/accounts/{accountId}/transfers/count',
}

export type IAccountSummary = Pick<IAccountInfoResponse, 'address' | 'balance' | 'nonce'>;

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
  infoURL?: string;

  /**
   * The metadata of the account
   */
  metadata: IAccountMetadata;
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

interface IAccountTransfer {
  amount: number;
  from: string;
  height: number;
  txHash: string;
  timestamp: string;
  to: string;
}

interface IAccountTransfersResponse {
  transfers: {
    received: Array<IAccountTransfer>;
    sent: Array<IAccountTransfer>;
  };
}

export interface IAccountsListResponse {
  /**
   * List of accounts
   */
  accounts: Array<IAccountSummary>;
}

export interface IAccountTransfersCountResponse {
  /**
   * Number of account's transfers
   */
  count: number;
}

export interface IAccountsCountResponse {
  /**
   * Number of accounts
   */
  count: number;
}

export abstract class AccountAPI extends API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Returns paginated list of accounts
   *
   * @param {string} url API endpoint URL
   * @param {number} page The page number
   * @returns {Promise<IAccountsListResponse>}
   */
  public static list(url: string, page: number = 0): Promise<IAccountsListResponse> {
    return axios
      .get<IAccountsListResponse>(url + AccountAPIMethods.LIST + '/' + page)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the number of accounts
   *
   * @param {string} url API endpoint URL
   * @returns {Promise<IAccountsCountResponse>}
   */
  public static count(url: string): Promise<IAccountsCountResponse> {
    return axios
      .get<IAccountsCountResponse>(url + AccountAPIMethods.NUM_ACCOUNTS)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Fetches an Account information
   *
   * @param {string} url API endpoint URL
   * @param {string} accountId The account we want the info from
   * @returns {Promise<IAccountInfoResponse>}
   */
  public static info(url: string, accountId: string): Promise<IAccountInfoResponse> {
    return axios
      .get<IAccountInfoResponse>(url + AccountAPIMethods.INFO.replace('{accountId}', accountId))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Fetches the account metadata
   *
   * @param {string} url API endpoint URL
   * @param {string} accountId The account we want the info from
   * @returns {Promise<IAccountMetadata>}
   */
  public static metadata(url: string, accountId: string): Promise<IAccountMetadata> {
    return axios
      .get<IAccountMetadata>(url + AccountAPIMethods.METADATA.replace('{accountId}', accountId))
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
   * Returns the account's transfers count
   *
   * @param {string} url API endpoint URL
   * @param {string} accountId accountId to get the transfers count
   * @returns {Promise<IAccountTransfersCountResponse>}
   */
  public static transfersCount(url: string, accountId: string): Promise<IAccountTransfersCountResponse> {
    return axios
      .get<IAccountTransfersCountResponse>(url + AccountAPIMethods.NUM_TRANSFERS.replace('{accountId}', accountId))
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

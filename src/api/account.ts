import axios from 'axios';

enum AccountAPIMethods {
  INFO = '/accounts',
  SET_INFO = '/accounts',
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
   * The index of the elections created by the account.
   */
  electionIndex: number;

  /**
   * The information URI of the account
   */
  infoURI?: string;
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

export abstract class AccountAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

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
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
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
      .post<IAccountSetInfoResponse>(url + AccountAPIMethods.SET_INFO, JSON.stringify({ txPayload: payload, metadata }))
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}

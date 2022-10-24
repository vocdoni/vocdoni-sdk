import axios from 'axios';

enum AccountAPIMethods {
  INFO = '/account',
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

export abstract class AccountAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  public static info(url: string, address: string): Promise<IAccountInfoResponse> {
    return axios
      .get<IAccountInfoResponse>(url + AccountAPIMethods.INFO + '/' + address)
      .then(response => response.data)
      .catch(error => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}

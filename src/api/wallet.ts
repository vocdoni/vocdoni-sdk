import axios from 'axios';
import { strip0x } from '../util/common';

enum WalletAPIMethods {
  ADD = '/wallet/add',
}

interface IWalletAddResponse {
  /**
   * The address of the added account
   */
  address: string;

  /**
   * The new token added
   */
  token: string;
}

export abstract class WalletAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  public static add(url: string, privateKey: string): Promise<IWalletAddResponse> {
    return axios
      .post<IWalletAddResponse>(url + WalletAPIMethods.ADD + '/' + strip0x(privateKey))
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}

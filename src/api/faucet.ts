import axios from 'axios';
import { API } from './api';

interface IFaucetCollectResponse {
  /**
   * The amount of tokens.
   */
  amount: string;

  /**
   * The base64 JSON containing the payload and the signature
   */
  faucetPackage: string;
}

export abstract class FaucetAPI extends API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Calls the collect tokens method. Only works under development.
   *
   * @param {string} url API endpoint URL
   * @param {string} authToken Authentication token
   * @param {string} address Address to send the tokens to
   * @returns {Promise<IFaucetCollectResponse>}
   */
  public static collect(url: string, authToken: string, address: string): Promise<IFaucetCollectResponse> {
    return axios
      .get<IFaucetCollectResponse>(url + '/' + address, {
        headers: {
          Authorization: 'Bearer ' + authToken,
        },
      })
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

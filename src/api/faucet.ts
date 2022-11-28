import axios from 'axios';

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

export abstract class FaucetAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

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
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}

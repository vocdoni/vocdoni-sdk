import axios from 'axios';

export interface IFaucetPackage {
  /**
   * The payload of the transaction
   */
  payload: {
    /**
     * The amount of tokens
     */
    amount: number;

    /**
     * The identifier of the faucet payload
     */
    identifier: number;

    /**
     * The account where the tokens are transferred
     */
    to: string;
  };

  /**
   * The signature of the transaction
   */
  signature: string;
}

interface IFaucetCollectResponse {
  /**
   * The amount of tokens.
   */
  amount: number;

  /**
   * The raw payload of the faucet transaction
   */
  faucetPayload: string;

  /**
   * The json package of the faucet transaction
   */
  JSONFaucetPackage: IFaucetPackage;

  /**
   * The signature of the transaction
   */
  signature: string;
}

export abstract class FaucetAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  public static collect(url: string, authToken: string, address: string): Promise<IFaucetCollectResponse> {
    return axios
      .get<IFaucetCollectResponse>(url + '/' + address, {
        headers: {
          Authorization: 'Bearer ' + authToken,
        },
      })
      .then(response => response.data)
      .catch(error => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}

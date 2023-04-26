import axios from 'axios';
import { Census3API } from './api';

enum Census3TokenAPIMethods {
  LIST = '/tokens',
}

export interface ICensus3Token {
  /**
   * The id (address) of the token.
   */
  id: string;

  /**
   * The name of the token.
   */
  name: string;

  /**
   * The type of the token.
   */
  type: string;

  /**
   * The creation block.
   */
  creation_block: number;
}

export interface ICensus3TokenListResponse {
  /**
   * The list of the tokens
   */
  tokens: Array<ICensus3Token>;
}

export abstract class Census3TokenAPI extends Census3API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Fetches list of already added tokens
   *
   * @param {string} url API endpoint URL
   * @returns {Promise<IChainGetInfoResponse>}
   */
  public static list(url: string): Promise<ICensus3TokenListResponse> {
    return axios
      .get<ICensus3TokenListResponse>(url + Census3TokenAPIMethods.LIST)
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

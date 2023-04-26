import axios from 'axios';
import { Census3API } from './api';

enum Census3TokenAPIMethods {
  LIST = '/tokens',
  TYPES = '/tokens/types',
  TOKEN = '/tokens/{id}',
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

  /**
   * The symbol of the token.
   */
  symbol: string;

  /**
   * The decimals of the token
   */
  decimals: number;

  /**
   * The total supply of the token.
   */
  total_supply: string;

  /**
   * The census3 status of the token.
   */
  status: {
    /**
     * If the token is already synced or not.
     */
    synced: boolean;

    /**
     * At which number of block the token is synced
     */
    at_block: number;

    /**
     * The progress percentage of the sync
     */
    progress: number;
  };
}

export interface ICensus3TokenSummary {
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
  tokens: Array<ICensus3TokenSummary>;
}

export interface ICensus3TokenTypesResponse {
  /**
   * The list of the tokens types
   */
  supported_tokens: Array<string>;
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
   * @returns {Promise<ICensus3TokenListResponse>}
   */
  public static list(url: string): Promise<ICensus3TokenListResponse> {
    return axios
      .get<ICensus3TokenListResponse>(url + Census3TokenAPIMethods.LIST)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Fetches list of tokens types
   *
   * @param {string} url API endpoint URL
   * @returns {Promise<ICensus3TokenTypesResponse>}
   */
  public static types(url: string): Promise<ICensus3TokenTypesResponse> {
    return axios
      .get<ICensus3TokenTypesResponse>(url + Census3TokenAPIMethods.TYPES)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Fetches list of tokens types
   *
   * @param {string} url API endpoint URL
   * @param {string} id The id of the token
   * @returns {Promise<ICensus3TokenTypesResponse>}
   */
  public static token(url: string, id: string): Promise<ICensus3TokenTypesResponse> {
    return axios
      .get<ICensus3TokenTypesResponse>(url + Census3TokenAPIMethods.TOKEN.replace('{id}', id))
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

import axios from 'axios';
import { Census3API } from './api';

enum Census3TokenAPIMethods {
  LIST = '/token',
  CREATE = '/token',
  TYPES = '/token/types',
  TOKEN = '/token/{id}',
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
  startBlock: number;

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
  totalSupply: string;

  /**
   * The default strategy assigned.
   */
  defaultStrategy: number;

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
    atBlock: number;

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
  startBlock: number;
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
  supportedTypes: Array<string>;
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
   * @returns {Promise<ICensus3Token>}
   */
  public static token(url: string, id: string): Promise<ICensus3Token> {
    return axios
      .get<ICensus3Token>(url + Census3TokenAPIMethods.TOKEN.replace('{id}', id))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Triggers a new scan for the provided token, starting from the defined block.
   *
   * @param {string} url API endpoint URL
   * @param {string} id The token address
   * @param {string} type The type of the token
   * @param {number} startBlock The start block
   * @returns {Promise<IFileCIDResponse>} promised IFileCIDResponse
   */
  public static create(url: string, id: string, type: string, startBlock: number): Promise<void> {
    return axios
      .post(url + Census3TokenAPIMethods.CREATE, JSON.stringify({ id, type, startBlock }))
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

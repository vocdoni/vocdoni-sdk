import axios from 'axios';
import { Census3API, Census3Pagination } from './api';

enum Census3TokenAPIMethods {
  LIST = '/tokens',
  CREATE = '/tokens',
  TYPES = '/tokens/types',
  TOKEN = '/tokens/{tokenID}?chainID={chainID}',
  HOLDER = '/tokens/{tokenID}/holders/{holderID}?chainID={chainID}',
}

export type Census3Token = {
  /**
   * The id (address) of the token.
   */
  ID: string;

  /**
   * The name of the token.
   */
  name: string;

  /**
   * The type of the token.
   */
  type: string;

  /**
   * The chain id of the token.
   */
  chainID: number;

  /**
   * The external identifier of the token.
   */
  externalID?: string;

  /**
   * The chain address of the token.
   */
  chainAddress: string;

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
   * The tags of the token.
   */
  tags?: string;

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
};

export type Census3TokenSummary = Pick<
  Census3Token,
  'ID' | 'name' | 'type' | 'startBlock' | 'symbol' | 'tags' | 'chainID' | 'externalID' | 'chainAddress' | 'status'
>;

export interface ICensus3TokenListResponse {
  /**
   * The list of the tokens
   */
  tokens: Array<Census3TokenSummary>;
}

export interface ICensus3TokenListResponsePaginated extends ICensus3TokenListResponse {
  /**
   * The pagination information
   */
  pagination: Census3Pagination;
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
   * @param {Census3Pagination} pagination Pagination options
   * @returns {Promise<ICensus3TokenListResponsePaginated>}
   */
  public static list(url: string, pagination?: Census3Pagination): Promise<ICensus3TokenListResponsePaginated> {
    return axios
      .get<ICensus3TokenListResponsePaginated>(url + Census3TokenAPIMethods.LIST + this.serializePagination(pagination))
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
   * Fetch the full token information
   *
   * @param {string} url API endpoint URL
   * @param {string} tokenId The identifier of the token
   * @param {number} chainId The chain identifier of the token
   * @param {string} externalId The identifier used by external provider
   * @returns {Promise<Census3Token>}
   */
  public static token(url: string, tokenId: string, chainId: number, externalId?: string): Promise<Census3Token> {
    return axios
      .get<Census3Token>(
        url +
          Census3TokenAPIMethods.TOKEN.replace('{tokenID}', tokenId).replace('{chainID}', String(chainId)) +
          (externalId ? '&externalID=' + externalId : '')
      )
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns if the holder ID is already registered in the database as a holder of the token ID and chain ID provided.
   *
   * @param {string} url API endpoint URL
   * @param {string} tokenId The identifier of the token
   * @param {number} chainId The chain identifier of the token
   * @param {string} holderId The identifier of the holder
   * @param {string} externalId The identifier used by external provider
   * @returns {Promise<boolean>} If the holder exists in the database as a holder
   */
  public static holder(
    url: string,
    tokenId: string,
    chainId: number,
    holderId: string,
    externalId?: string
  ): Promise<boolean> {
    return axios
      .get<boolean>(
        url +
          Census3TokenAPIMethods.HOLDER.replace('{tokenID}', tokenId)
            .replace('{holderID}', holderId)
            .replace('{chainID}', String(chainId)) +
          (externalId ? '&externalID=' + externalId : '')
      )
      .then((response) => response.data === true)
      .catch(this.isApiError);
  }

  /**
   * Triggers a new scan for the provided token, starting from the defined block.
   *
   * @param {string} url API endpoint URL
   * @param {string} id The token address
   * @param {string} type The type of the token
   * @param {number} chainId The chain id of the token
   * @param {number} startBlock The start block
   * @param {string[]} tags The tags assigned for the token
   * @param {string} externalId The identifier used by external provider
   * @returns {Promise<IFileCIDResponse>} promised IFileCIDResponse
   */
  public static create(
    url: string,
    id: string,
    type: string,
    chainId: number,
    startBlock: number,
    tags?: string,
    externalId?: string
  ): Promise<void> {
    return axios
      .post(url + Census3TokenAPIMethods.CREATE, {
        ID: id,
        type,
        chainID: chainId,
        startBlock,
        tags,
        externalID: externalId,
      })
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

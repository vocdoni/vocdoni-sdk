import axios from 'axios';
import { Census3API } from './api';

enum Census3StrategyAPIMethods {
  LIST = '/strategies/page/{page}',
  CREATE = '/strategies',
  LIST_BY_TOKEN = '/strategies/token/{id}',
  STRATEGY = '/strategies/{id}',
}

export interface ICensus3StrategiesListResponse {
  /**
   * The list of the strategies identifiers
   */
  strategies: Array<number>;
}

export interface ICensus3StrategyResponse {
  /**
   * The strategy identifier
   */
  id: number;

  /**
   * The list of tokens
   */
  tokens: Array<ICensus3StrategyToken>;

  /**
   * The predicate
   */
  predicate: string;
}

export interface ICensus3StrategyToken {
  /**
   * The id (address) of the token.
   */
  id: string;

  /**
   * The name of the token.
   */
  name: string;

  /**
   * The minimum balance.
   */
  minBalance: string;

  /**
   * The method used for checking balances.
   */
  method: string;
}

export interface ICensus3StrategyCreateResponse {
  /**
   * The identifier of the created strategy
   */
  strategyId: number;
}

export abstract class Census3StrategyAPI extends Census3API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Fetches list of strategies
   *
   * @param {string} url API endpoint URL
   * @param {number} page The page number
   * @param {string} token The token id or address
   * @returns {Promise<ICensus3StrategiesListResponse>}
   */
  public static list(url: string, page: number = 0, token?: string): Promise<ICensus3StrategiesListResponse> {
    if (token) {
      return axios
        .get<ICensus3StrategiesListResponse>(url + Census3StrategyAPIMethods.LIST_BY_TOKEN.replace('{id}', token))
        .then((response) => response.data)
        .catch(this.isApiError);
    }
    return axios
      .get<ICensus3StrategiesListResponse>(url + Census3StrategyAPIMethods.LIST.replace('{page}', String(page)))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the information of the strategy
   *
   * @param {string} url API endpoint URL
   * @param {number} id The identifier of the strategy
   * @returns {Promise<ICensus3StrategyResponse>}
   */
  public static strategy(url: string, id: number): Promise<ICensus3StrategyResponse> {
    return axios
      .get<ICensus3StrategyResponse>(url + Census3StrategyAPIMethods.STRATEGY.replace('{id}', String(id)))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Creates a new strategy based on the given token strategies and predicate.
   *
   * @param {string} url API endpoint URL
   * @param {Array<ICensus3StrategyToken>} tokens The token list with strategies
   * @param {string} strategy The stringified strategy (predicate)
   * @returns {Promise<ICensus3StrategyCreateResponse>} promised ICensus3StrategyCreateResponse
   */
  public static create(
    url: string,
    tokens: Array<ICensus3StrategyToken>,
    strategy: string
  ): Promise<ICensus3StrategyCreateResponse> {
    return axios
      .post<ICensus3StrategyCreateResponse>(url + Census3StrategyAPIMethods.CREATE, { tokens, strategy })
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

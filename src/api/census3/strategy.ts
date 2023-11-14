import axios from 'axios';
import { Census3API, Census3Pagination, ICensus3QueueResponse } from './api';

enum Census3StrategyAPIMethods {
  LIST = '/strategies',
  LIST_BY_TOKEN = '/strategies/token/{tokenID}?chainID={chainID}',
  CREATE = '/strategies',
  IMPORT = '/strategies/import/{cid}',
  IMPORT_QUEUE = '/strategies/import/queue/{queueId}',
  STRATEGY = '/strategies/{id}',
  SIZE = '/strategies/{id}/size',
  SIZE_QUEUE = '/strategies/{id}/size/queue/{queueId}',
  VALIDATE_PREDICATE = '/strategies/predicate/validate',
  OPERATORS = '/strategies/predicate/operators',
}

export interface ICensus3StrategiesListResponse {
  /**
   * The list of the strategies identifiers
   */
  strategies: Array<Census3Strategy>;
}
export interface ICensus3StrategiesListResponsePaginated extends ICensus3StrategiesListResponse {
  /**
   * The pagination information
   */
  pagination: Census3Pagination;
}

export type Census3Strategy = {
  /**
   * The strategy identifier
   */
  ID: number;

  /**
   * The strategy alias
   */
  alias: string;

  /**
   * The strategy predicate
   */
  predicate: string;

  /**
   * The URI of the strategy
   */
  uri: string;

  /**
   * The list of tokens
   */
  tokens: { [key: string]: Census3StrategyToken };
};

export type Census3StrategyToken = {
  /**
   * The id (address) of the token.
   */
  ID: string;

  /**
   * The chain id of the token.
   */
  chainID: number;

  /**
   * The chain address of the token.
   */
  chainAddress: string;

  /**
   * The external identifier of the token.
   */
  externalID?: string;

  /**
   * The minimum balance for the strategy.
   */
  minBalance?: string;
};

export type Census3CreateStrategyToken = Omit<Census3StrategyToken, 'chainAddress'>;

export interface ICensus3StrategySizeQueueResponse {
  /**
   * If the queue has been done
   */
  done: boolean;

  /**
   * The error of the queue
   */
  error: {
    /**
     * The code of the error
     */
    code: number;

    /**
     * The string of the error
     */
    error: string;
  };

  /**
   * The size of the strategy
   */
  size: number;
}

export interface ICensus3StrategyImportQueueResponse {
  /**
   * If the queue has been done
   */
  done: boolean;

  /**
   * The error of the queue
   */
  error: {
    /**
     * The code of the error
     */
    code: number;

    /**
     * The string of the error
     */
    error: string;
  };

  /**
   * The imported strategy
   */
  strategy: Census3Strategy;
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
  strategyID: number;
}

export interface ICensus3ValidatePredicateToken {
  /**
   * The literal of the predicate
   */
  literal: string;
}

export interface ICensus3ValidatePredicateChild {
  /**
   * The operator used in the predicate
   */
  operator: string;

  /**
   * The list of tokens of the predicate
   */
  tokens: Array<ICensus3ValidatePredicateToken | ICensus3ValidatePredicateChild>;
}

export interface ICensus3StrategiesOperator {
  /**
   * The description of the operator
   */
  description: string;

  /**
   * The tag of the operator
   */
  tag: string;
}

export interface ICensus3StrategiesOperatorsResponse {
  /**
   * The list of supported operators
   */
  operators: Array<ICensus3StrategiesOperator>;
}

export interface ICensus3ValidatePredicateResponse {
  /**
   * The parsed version of the predicate
   */
  result: {
    /**
     * The childs of the predicate
     */
    childs: ICensus3ValidatePredicateChild;
  };
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
   * @param {Census3Pagination} pagination Pagination options
   * @returns {Promise<ICensus3StrategiesListResponsePaginated>}
   */
  public static list(url: string, pagination?: Census3Pagination): Promise<ICensus3StrategiesListResponsePaginated> {
    return axios
      .get<ICensus3StrategiesListResponsePaginated>(
        url + Census3StrategyAPIMethods.LIST + this.serializePagination(pagination)
      )
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Fetches list of strategies based on given token
   *
   * @param {string} url API endpoint URL
   * @param {string} tokenId The identifier of the token
   * @param {number} chainId The chain identifier of the token
   * @param {string} externalId The identifier used by external provider
   * @returns {Promise<ICensus3StrategiesListResponse>}
   */
  public static listByToken(
    url: string,
    tokenId: string,
    chainId: number,
    externalId?: string
  ): Promise<ICensus3StrategiesListResponse> {
    return axios
      .get<ICensus3StrategiesListResponse>(
        url +
          Census3StrategyAPIMethods.LIST_BY_TOKEN.replace('{tokenID}', tokenId).replace('{chainID}', String(chainId)) +
          (externalId ? '&externalID=' + externalId : '')
      )
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the information of the strategy
   *
   * @param {string} url API endpoint URL
   * @param {number} id The identifier of the strategy
   * @returns {Promise<Census3Strategy>}
   */
  public static strategy(url: string, id: number): Promise<Census3Strategy> {
    return axios
      .get<Census3Strategy>(url + Census3StrategyAPIMethods.STRATEGY.replace('{id}', String(id)))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the size of the strategy
   *
   * @param {string} url API endpoint URL
   * @param {number} id The identifier of the strategy
   * @returns {Promise<ICensus3QueueResponse>} The queue identifier
   */
  public static size(url: string, id: number): Promise<ICensus3QueueResponse> {
    return axios
      .get<ICensus3QueueResponse>(url + Census3StrategyAPIMethods.SIZE.replace('{id}', String(id)))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the information of the strategy size queue
   *
   * @param {string} url API endpoint URL
   * @param {number} strategyId The identifier of the strategy
   * @param {string} queueId The identifier of the strategy size queue
   * @returns {Promise<ICensus3StrategySizeQueueResponse>}
   */
  public static sizeQueue(
    url: string,
    strategyId: number,
    queueId: string
  ): Promise<ICensus3StrategySizeQueueResponse> {
    return axios
      .get<ICensus3StrategySizeQueueResponse>(
        url + Census3StrategyAPIMethods.SIZE_QUEUE.replace('{id}', String(strategyId)).replace('{queueId}', queueId)
      )
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the information of the strategy import queue
   *
   * @param {string} url API endpoint URL
   * @param {string} queueId The identifier of the strategy import queue
   * @returns {Promise<ICensus3StrategyImportQueueResponse>}
   */
  public static importQueue(url: string, queueId: string): Promise<ICensus3StrategyImportQueueResponse> {
    return axios
      .get<ICensus3StrategyImportQueueResponse>(
        url + Census3StrategyAPIMethods.IMPORT_QUEUE.replace('{queueId}', queueId)
      )
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Imports a strategy from IPFS from the given cid.
   *
   * @param {string} url API endpoint URL
   * @param {string} cid The cid of the IPFS where the strategy is stored
   * @returns {Promise<ICensus3QueueResponse>} The queue identifier
   */
  public static import(url: string, cid: string): Promise<ICensus3QueueResponse> {
    return axios
      .post<ICensus3QueueResponse>(url + Census3StrategyAPIMethods.IMPORT.replace('{cid}', cid))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Creates a new strategy based on the given token strategies and predicate.
   *
   * @param {string} url API endpoint URL
   * @param {string} alias The alias of the strategy
   * @param {string} predicate The predicate of the strategy
   * @param tokens The token list for the strategy
   * @returns {Promise<ICensus3StrategyCreateResponse>} The identifier of the created strategy
   */
  public static create(
    url: string,
    alias: string,
    predicate: string,
    tokens: { [key: string]: Census3CreateStrategyToken }
  ): Promise<ICensus3StrategyCreateResponse> {
    return axios
      .post<ICensus3StrategyCreateResponse>(url + Census3StrategyAPIMethods.CREATE, { alias, predicate, tokens })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Validates a predicate.
   *
   * @param {string} url API endpoint URL
   * @param {string} predicate The predicate of the strategy
   * @returns {Promise<ICensus3ValidatePredicateResponse>} Parsed version of the predicate
   */
  public static validatePredicate(url: string, predicate: string): Promise<ICensus3ValidatePredicateResponse> {
    return axios
      .post<ICensus3ValidatePredicateResponse>(url + Census3StrategyAPIMethods.VALIDATE_PREDICATE, { predicate })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the list of supported operators to build strategy predicates.
   *
   * @param {string} url API endpoint URL
   * @returns {Promise<ICensus3StrategiesOperatorsResponse>}
   */
  public static operators(url: string): Promise<ICensus3StrategiesOperatorsResponse> {
    return axios
      .get<ICensus3StrategiesOperatorsResponse>(url + Census3StrategyAPIMethods.OPERATORS)
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

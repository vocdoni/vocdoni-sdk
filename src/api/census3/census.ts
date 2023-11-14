import axios from 'axios';
import { Census3API, ICensus3QueueResponse } from './api';

enum Census3CensusAPIMethods {
  LIST_BY_STRATEGY = '/censuses/strategy/{id}',
  CREATE = '/censuses',
  CENSUS = '/censuses/{id}',
  QUEUE = '/censuses/queue/{id}',
}

export interface ICensus3CensusListResponse {
  /**
   * The list of the strategies identifiers
   */
  censuses: Array<ICensus3CensusResponse>;
}

export interface ICensus3CensusResponse {
  /**
   * The identifier of the census
   */
  ID: number;

  /**
   * The identifier of the strategy of the built census
   */
  strategyID: number;

  /**
   * The root of the census
   */
  merkleRoot: string;

  /**
   * The URI of the census
   */
  uri: string;

  /**
   * The size of the census (number of token holders)
   */
  size: number;

  /**
   * The weight of the census (weight of all token holders)
   */
  weight: string;

  /**
   * If the census is anonymous or not
   */
  anonymous: boolean;
}

export interface ICensus3CensusQueueResponse {
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
   * The census
   */
  census: ICensus3CensusResponse;
}

export abstract class Census3CensusAPI extends Census3API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Fetches list of census based on given strategy
   *
   * @param {string} url API endpoint URL
   * @param {number} strategy The identifier of the strategy
   * @returns {Promise<ICensus3CensusListResponse>}
   */
  public static list(url: string, strategy: number): Promise<ICensus3CensusListResponse> {
    return axios
      .get<ICensus3CensusListResponse>(url + Census3CensusAPIMethods.LIST_BY_STRATEGY.replace('{id}', String(strategy)))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the information of the census
   *
   * @param {string} url API endpoint URL
   * @param {number} id The identifier of the census
   * @returns {Promise<ICensus3CensusResponse>}
   */
  public static census(url: string, id: number): Promise<ICensus3CensusResponse> {
    return axios
      .get<ICensus3CensusResponse>(url + Census3CensusAPIMethods.CENSUS.replace('{id}', String(id)))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the information of the census queue
   *
   * @param {string} url API endpoint URL
   * @param {string} id The identifier of the census queue
   * @returns {Promise<ICensus3CensusQueueResponse>}
   */
  public static queue(url: string, id: string): Promise<ICensus3CensusQueueResponse> {
    return axios
      .get<ICensus3CensusQueueResponse>(url + Census3CensusAPIMethods.QUEUE.replace('{id}', id))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Requests the creation of a new census with the strategy provided.
   *
   * @param {string} url API endpoint URL
   * @param {number} strategyId The strategy identifier
   * @param {boolean} anonymous If the census has to be anonymous
   * @returns {Promise<ICensus3QueueResponse>} The queue identifier
   */
  public static create(url: string, strategyId: number, anonymous: boolean = false): Promise<ICensus3QueueResponse> {
    return axios
      .post<ICensus3QueueResponse>(url + Census3CensusAPIMethods.CREATE, {
        strategyID: strategyId,
        anonymous,
      })
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

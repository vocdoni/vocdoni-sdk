import axios from 'axios';
import { Census3API } from './api';

enum Census3CensusAPIMethods {
  LIST_BY_STRATEGY = '/census/strategy/{id}',
  CENSUS = '/census/{id}',
}

export interface ICensus3CensusListResponse {
  /**
   * The list of the strategies identifiers
   */
  censuses: Array<number>;
}

export interface ICensus3CensusResponse {
  /**
   * The identifier of the census
   */
  id: number;

  /**
   * The identifier of the strategy of the built census
   */
  strategyId: number;

  /**
   * The root of the census
   */
  merkleRoot: string;

  /**
   * The URI of the census
   */
  uri: string;
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
}

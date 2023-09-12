import axios from 'axios';
import { Census3API } from './api';

enum Census3ServiceAPIMethods {
  INFO = '/info',
}

export interface ICensus3ServiceInfoResponse {
  /**
   * The list of supported chains
   */
  chainIDs: Array<number>;
}

export abstract class Census3ServiceAPI extends Census3API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Fetches supported chains from the service
   *
   * @param {string} url API endpoint URL
   * @returns {Promise<ICensus3ServiceInfoResponse>}
   */
  public static info(url: string): Promise<ICensus3ServiceInfoResponse> {
    return axios
      .get<ICensus3ServiceInfoResponse>(url + Census3ServiceAPIMethods.INFO)
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

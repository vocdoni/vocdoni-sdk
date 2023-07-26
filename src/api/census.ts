import axios from 'axios';
import { CensusType } from '../types';
import { strip0x } from '../util/common';
import { API } from './api';

enum CensusAPIMethods {
  CREATE = '/censuses',
  ADD = '/censuses/{id}/participants',
  PUBLISH = '/censuses/{id}/publish',
  PROOF = '/censuses/{id}/proof',
  SIZE = '/censuses/{id}/size',
  WEIGHT = '/censuses/{id}/weight',
  TYPE = '/censuses/{id}/type',
}

interface ICensusCreateResponse {
  /**
   * The identifier of the census
   */
  censusID: string;
}

interface ICensusAddResponse {}

interface ICensusPublishResponse {
  /**
   * The identifier of the published census
   */
  censusID: string;

  /**
   * The URI of the published census
   */
  uri: string;
}

export interface ICensusProofResponse {
  /**
   * The type of the census
   */
  type: CensusType;

  /**
   * The weight as a string
   */
  weight: string;

  /**
   * The root (id) of the census
   */
  censusRoot: string;

  /**
   * The proof for the given key
   */
  censusProof: string;

  /**
   * The value for the given key
   */
  value: string;

  /**
   * The census siblings
   */
  censusSiblings?: Array<string>;
}

interface ICensusSizeResponse {
  /**
   * The size of the census (number of participants)
   */
  size: number;
}

interface ICensusWeightResponse {
  /**
   * The weight of the census as a BigInt (sum of all weights)
   */
  weight: string;
}

interface ICensusTypeResponse {
  /**
   * The type of the census
   */
  type: CensusType;
}

export abstract class CensusAPI extends API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Create's a new census in the API.
   *
   * @param {string} url API endpoint URL
   * @param {string} authToken Authentication token
   * @param {CensusType} type Type of census to be created
   * @returns {Promise<ICensusCreateResponse>}
   */
  public static create(url: string, authToken: string, type: CensusType): Promise<ICensusCreateResponse> {
    return axios
      .post<ICensusCreateResponse>(url + CensusAPIMethods.CREATE + '/' + type, null, {
        headers: {
          Authorization: 'Bearer ' + authToken,
        },
      })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Adds participants to a census
   *
   * @param {string} url API endpoint URL
   * @param {string} authToken Authentication token
   * @param {string} censusId The id of the census to which participants are being added
   * @param {Array.<{key: string, weight: BigInt | null}>} participants An array of participants
   * @returns {Promise<ICensusAddResponse>}
   */
  public static add(
    url: string,
    authToken: string,
    censusId: string,
    participants: Array<{
      key: string;
      weight?: bigint;
    }>
  ): Promise<ICensusAddResponse> {
    return axios
      .post<ICensusAddResponse>(
        url + CensusAPIMethods.ADD.replace('{id}', censusId),
        {
          participants: participants.map((participant) => ({
            key: participant.key,
            weight: typeof participant.weight == 'bigint' ? participant.weight.toString() : '1',
          })),
        },
        {
          headers: {
            Authorization: 'Bearer ' + authToken,
          },
        }
      )
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Publishes the census, so it can be used in processes
   *
   * @param {string} url API endpoint URL
   * @param {string} authToken Authentication token
   * @param {string} censusId The census ID we're publishing
   * @returns {Promise<ICensusPublishResponse>} on success
   */
  public static publish(url: string, authToken: string, censusId: string): Promise<ICensusPublishResponse> {
    return axios
      .post<ICensusPublishResponse>(url + CensusAPIMethods.PUBLISH.replace('{id}', censusId), null, {
        headers: {
          Authorization: 'Bearer ' + authToken,
        },
      })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Checks if the specified address is in the specified census
   *
   * @param {string} url API endpoint URL
   * @param {string} censusId The census ID of which we want the proof from
   * @param {string} key The address to be checked
   * @returns {Promise<ICensusProofResponse>} on success
   */
  public static proof(url: string, censusId: string, key: string): Promise<ICensusProofResponse> {
    return axios
      .get<ICensusProofResponse>(url + CensusAPIMethods.PROOF.replace('{id}', censusId) + '/' + strip0x(key))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the size of a given census
   *
   * @param {string} url API endpoint URL
   * @param {string} censusId The census ID
   * @returns {Promise<ICensusSizeResponse>}
   */
  public static size(url: string, censusId: string): Promise<ICensusSizeResponse> {
    return axios
      .get<ICensusSizeResponse>(url + CensusAPIMethods.SIZE.replace('{id}', censusId))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the weight of a given census
   *
   * @param {string} url API endpoint URL
   * @param {string} censusId The census ID
   * @returns {Promise<ICensusWeightResponse>}
   */
  public static weight(url: string, censusId: string): Promise<ICensusWeightResponse> {
    return axios
      .get<ICensusWeightResponse>(url + CensusAPIMethods.WEIGHT.replace('{id}', censusId))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the type of a given census
   *
   * @param {string} url API endpoint URL
   * @param {string} censusId The census ID
   * @returns {Promise<ICensusTypeResponse>}
   */
  public static type(url: string, censusId: string): Promise<ICensusTypeResponse> {
    return axios
      .get<ICensusTypeResponse>(url + CensusAPIMethods.TYPE.replace('{id}', censusId))
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

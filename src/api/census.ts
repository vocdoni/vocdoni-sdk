import axios from 'axios';
import { CensusType } from '../types';
import { strip0x } from '../util/common';

enum CensusAPIMethods {
  CREATE = '/censuses',
  ADD = '/censuses/{id}/participants',
  PUBLISH = '/censuses/{id}/publish',
  PROOF = '/censuses/{id}/proof',
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

interface ICensusProofResponse {
  /**
   * The weight as a string
   */
  weight: string;

  /**
   * The proof for the given key
   */
  proof: string;

  /**
   * The value for the given key
   */
  value: string;
}

export abstract class CensusAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

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
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
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
      weight?: BigInt;
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
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
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
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
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
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}

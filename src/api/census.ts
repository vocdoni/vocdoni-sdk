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

  public static add(
    url: string,
    authToken: string,
    censusId: string,
    key: string,
    weight?: BigInt
  ): Promise<ICensusAddResponse> {
    return axios
      .post<ICensusAddResponse>(
        url + CensusAPIMethods.ADD.replace('{id}', censusId),
        {
          participants: [
            {
              key,
              weight: typeof weight !== 'undefined' ? weight.toString() : '1',
            },
          ],
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

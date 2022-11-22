import axios from 'axios';

enum FileAPIMethods {
  CID = '/files/cid',
}

interface IFileCIDResponse {
  /**
   * The calculated CID of the data
   */
  cid: string;
}

export abstract class FileAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  public static cid(url: string, payload: string): Promise<IFileCIDResponse> {
    return axios
      .post<IFileCIDResponse>(url + FileAPIMethods.CID, JSON.stringify({ payload }))
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}

import axios, { AxiosError } from 'axios';
import { ErrAccountNotFound, ErrAddressMalformed, ErrAPI, ErrElectionNotStarted } from './errors';

export abstract class API {
  /**
   * Cannot be constructed.
   */
  protected constructor() {}

  protected static isApiError(error: AxiosError): never {
    if (!axios.isAxiosError(error)) throw error;
    const err = error?.response?.data;
    if (err['code'] && !isNaN(Number(err['code']))) {
      switch (err['code']) {
        case 4000:
          throw new ErrAddressMalformed(err['error']);
        case 4003:
          throw new ErrAccountNotFound(err['error']);
        case 5003:
          return API.isVochainError(err['error']);
        default:
          throw error;
      }
    } else if (err) {
      throw new ErrAPI(error.response.status + ' ' + error.response.statusText + ': ' + err);
    }
    throw error;
  }

  private static isVochainError(error: string): never {
    switch (true) {
      case error.includes('starts at height') && error.includes('current height is'):
        throw new ErrElectionNotStarted(error);
      default:
        throw error;
    }
  }
}

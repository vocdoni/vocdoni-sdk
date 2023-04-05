import axios, { AxiosError } from 'axios';
import {
  ErrAccountNotFound,
  ErrAddressMalformed,
  ErrAPI,
  ErrCantParseElectionID,
  ErrElectionNotFound,
  ErrElectionNotStarted,
} from './errors';

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
        case 4017:
          throw new ErrCantParseElectionID(err['error']);
        case 4046:
          throw new ErrElectionNotFound(err['error']);
        case 5003:
          return API.isVochainError(err['error']);
        default:
          return API.isUndefinedError(error, err['error']);
      }
    } else if (err) {
      return API.isUndefinedError(error, err as string);
    }
    return API.isUndefinedError(error);
  }

  private static isVochainError(error: string): never {
    switch (true) {
      case error.includes('starts at height') && error.includes('current height is'):
        throw new ErrElectionNotStarted(error);
      default:
        throw error;
    }
  }

  private static isUndefinedError(error: AxiosError, message?: string): never {
    throw new ErrAPI(error.response.status + ' ' + error.response.statusText + ': ' + message, error);
  }
}

import axios, { AxiosError } from 'axios';
import {
  ErrAccountNotFound,
  ErrAddressMalformed,
  ErrAPI,
  ErrCantParseElectionID,
  ErrCantParsePayloadAsJSON,
  ErrElectionNotFound,
  ErrElectionNotStarted,
  ErrNoElectionKeys,
} from './errors';

export abstract class API {
  /**
   * Cannot be constructed.
   */
  protected constructor() {}

  protected static isApiError(error: AxiosError): never {
    if (!axios.isAxiosError(error)) throw error;
    const err = error?.response?.data;
    if (err && err['code'] && !isNaN(Number(err['code']))) {
      switch (err['code']) {
        case 4000:
          throw new ErrAddressMalformed(err['error']);
        case 4003:
          throw new ErrAccountNotFound(err['error']);
        case 4017:
          throw new ErrCantParseElectionID(err['error']);
        case 4020:
          throw new ErrCantParsePayloadAsJSON(err['error']);
        case 4045:
          throw new ErrElectionNotFound(err['error']);
        case 4047:
          throw new ErrNoElectionKeys(err['error']);
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
    switch (true) {
      case error.response?.status != null && error.response?.statusText != null:
        throw new ErrAPI(error.response.status + ' ' + error.response.statusText + ': ' + message, error);
      case error.response?.status != null:
        throw new ErrAPI(error.response.status + ': ' + message, error);
      case message != null:
        throw new ErrAPI(message, error);
      default:
        throw new ErrAPI('Undefined API error', error);
    }
  }
}

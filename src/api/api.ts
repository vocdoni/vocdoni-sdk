import axios, { AxiosError } from 'axios';
import {
  ErrAccountNotFound,
  ErrAddressMalformed,
  ErrAPI,
  ErrBlockNotFound,
  ErrCantParseElectionID,
  ErrCantParsePayloadAsJSON,
  ErrElectionFinished,
  ErrElectionNotFound,
  ErrElectionNotStarted,
  ErrFaucetAlreadyFunded,
  ErrNoElectionKeys,
  ErrOrganizationNotFound,
} from './errors';

export class ErrPageNotFound extends Error {
  constructor(message?: string) {
    super(message ? message : 'page not found');
  }
}

export type PaginationRequest = {
  page: number;
  limit: number;
};

export interface PaginationResponse {
  pagination: {
    totalItems: number;
    previousPage: number | null;
    currentPage: number;
    nextPage: number | null;
    lastPage: number;
  };
}

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
        case 4006:
          throw new ErrOrganizationNotFound(err['error']);
        case 4008:
          throw new ErrBlockNotFound(err['error']);
        case 4017:
          throw new ErrCantParseElectionID(err['error']);
        case 4020:
          throw new ErrCantParsePayloadAsJSON(err['error']);
        case 4045:
          throw new ErrElectionNotFound(err['error']);
        case 4047:
          throw new ErrNoElectionKeys(err['error']);
        case 4057:
          throw new ErrPageNotFound(err['error']);
        case 5001:
        case 5003:
          return API.isVochainError(err['error']);
        default:
          return API.isUndefinedError(error, err['error']);
      }
    } else if (err) {
      const errorMessage = err['error'] ? (err['error'] as string) : (err as string);
      return API.isUndefinedError(error, errorMessage);
    }
    return API.isUndefinedError(error);
  }

  private static isVochainError(error: string): never {
    switch (true) {
      case error.includes('starts at') && error.includes('current'):
        throw new ErrElectionNotStarted(error);
      case error.includes('finished at') && error.includes('current'):
        throw new ErrElectionFinished(error);
      case error.includes('current state: ENDED'):
        throw new ErrElectionFinished(error);
      default:
        throw new ErrAPI(error);
    }
  }

  protected static isUndefinedError(error: AxiosError, message?: string): never {
    API.isFaucetError(message);
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

  private static isFaucetError(message?: string) {
    switch (true) {
      case message && message.includes('already funded') && message.includes('wait until'):
        throw new ErrFaucetAlreadyFunded(message);
    }
  }

  protected static createQueryParams(params: Record<string, any>): string {
    return Object.entries(params)
      .filter(([_, val]) => val != null)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');
  }
}

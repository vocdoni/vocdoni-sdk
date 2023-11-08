import { API } from '../api';
import axios, { AxiosError } from 'axios';
import {
  ErrCantAddHoldersToCensus,
  ErrCantCreateCensus,
  ErrCantCreateToken,
  ErrCantGetCensus,
  ErrCantGetLastBlockNumber,
  ErrCantGetStrategies,
  ErrCantGetStrategy,
  ErrCantGetToken,
  ErrCantGetTokenCount,
  ErrCantGetTokenHolders,
  ErrCantGetTokens,
  ErrChainIDNotSupported,
  ErrEncodeAPIInfo,
  ErrEncodeCensus,
  ErrEncodeCensuses,
  ErrEncodeQueueItem,
  ErrEncodeStrategies,
  ErrEncodeStrategy,
  ErrEncodeStrategyHolders,
  ErrEncodeToken,
  ErrEncodeTokenHolders,
  ErrEncodeTokens,
  ErrEncodeTokenTypes,
  ErrInitializingWeb3,
  ErrMalformedCensusID,
  ErrMalformedCensusQueueID,
  ErrMalformedChainID,
  ErrMalformedPagination,
  ErrMalformedStrategyID,
  ErrMalformedToken,
  ErrNoStrategies,
  ErrNotFoundCensus,
  ErrNotFoundStrategy,
  ErrNotFoundToken,
  ErrNotFoundTokenHolders,
  ErrNoTokens,
  ErrPruningCensus,
  ErrTokenAlreadyExists,
} from './errors';

export type Census3Pagination = {
  /**
   * The next cursor.
   */
  nextCursor?: string;

  /**
   * The previous cursor.
   */
  prevCursor?: string;

  /**
   * The page size.
   */
  pageSize?: number;
};

export abstract class Census3API extends API {
  /**
   * Cannot be constructed.
   */
  protected constructor() {
    super();
  }

  protected static serializePagination(pagination?: Census3Pagination): string {
    if (!pagination) return '';
    let serialized = '?';
    if (pagination.nextCursor) serialized += `nextCursor=${pagination.nextCursor}&`;
    if (pagination.prevCursor) serialized += `prevCursor=${pagination.prevCursor}&`;
    if (pagination.pageSize) serialized += `pageSize=${pagination.pageSize}`;
    return serialized;
  }

  protected static isApiError(error: AxiosError): never {
    if (!axios.isAxiosError(error)) throw error;
    const err = error?.response?.data;
    if (err && err['code'] && !isNaN(Number(err['code']))) {
      switch (err['code']) {
        case ErrCantGetToken.code:
          throw new ErrCantGetToken(err['error']);
        case ErrMalformedToken.code:
          throw new ErrMalformedToken(err['error']);
        case ErrTokenAlreadyExists.code:
          throw new ErrTokenAlreadyExists(err['error']);
        case ErrCantCreateToken.code:
          throw new ErrCantCreateToken(err['error']);
        case ErrInitializingWeb3.code:
          throw new ErrInitializingWeb3(err['error']);
        case ErrNotFoundToken.code:
          throw new ErrNotFoundToken(err['error']);
        case ErrCantGetLastBlockNumber.code:
          throw new ErrCantGetLastBlockNumber(err['error']);
        case ErrEncodeTokens.code:
          throw new ErrEncodeTokens(err['error']);
        case ErrEncodeTokenTypes.code:
          throw new ErrEncodeTokenTypes(err['error']);
        case ErrCantGetTokens.code:
          throw new ErrCantGetTokens(err['error']);
        case ErrNoStrategies.code:
          throw new ErrNoStrategies(err['error']);
        case ErrCantGetStrategies.code:
          throw new ErrCantGetStrategies(err['error']);
        case ErrEncodeStrategies.code:
          throw new ErrEncodeStrategies(err['error']);
        case ErrMalformedStrategyID.code:
          throw new ErrMalformedStrategyID(err['error']);
        case ErrNotFoundStrategy.code:
          throw new ErrNotFoundStrategy(err['error']);
        case ErrCantGetStrategy.code:
          throw new ErrCantGetStrategy(err['error']);
        case ErrEncodeStrategy.code:
          throw new ErrEncodeStrategy(err['error']);
        case ErrNotFoundCensus.code:
          throw new ErrNotFoundCensus(err['error']);
        case ErrCantGetCensus.code:
          throw new ErrCantGetCensus(err['error']);
        case ErrEncodeCensuses.code:
          throw new ErrEncodeCensuses(err['error']);
        case ErrCantCreateCensus.code:
          throw new ErrCantCreateCensus(err['error']);
        case ErrEncodeStrategyHolders.code:
          throw new ErrEncodeStrategyHolders(err['error']);
        case ErrMalformedCensusID.code:
          throw new ErrMalformedCensusID(err['error']);
        case ErrEncodeCensus.code:
          throw new ErrEncodeCensus(err['error']);
        case ErrNotFoundTokenHolders.code:
          throw new ErrNotFoundTokenHolders(err['error']);
        case ErrNoTokens.code:
          throw new ErrNoTokens(err['error']);
        case ErrCantAddHoldersToCensus.code:
          throw new ErrCantAddHoldersToCensus(err['error']);
        case ErrPruningCensus.code:
          throw new ErrPruningCensus(err['error']);
        case ErrCantGetTokenHolders.code:
          throw new ErrCantGetTokenHolders(err['error']);
        case ErrEncodeToken.code:
          throw new ErrEncodeToken(err['error']);
        case ErrEncodeTokenHolders.code:
          throw new ErrEncodeTokenHolders(err['error']);
        case ErrCantGetTokenCount.code:
          throw new ErrCantGetTokenCount(err['error']);
        case ErrEncodeAPIInfo.code:
          throw new ErrEncodeAPIInfo(err['error']);
        case ErrMalformedPagination.code:
          throw new ErrMalformedPagination(err['error']);
        case ErrChainIDNotSupported.code:
          throw new ErrChainIDNotSupported(err['error']);
        case ErrMalformedChainID.code:
          throw new ErrMalformedChainID(err['error']);
        case ErrMalformedCensusQueueID.code:
          throw new ErrMalformedCensusQueueID(err['error']);
        case ErrEncodeQueueItem.code:
          throw new ErrEncodeQueueItem(err['error']);
        default:
          return API.isUndefinedError(error, err['error']);
      }
    } else if (err) {
      return API.isUndefinedError(error, err as string);
    }
    return API.isUndefinedError(error);
  }
}

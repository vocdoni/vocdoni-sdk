import { AxiosError } from 'axios';
import { ErrAccountNotFound, ErrAddressMalformed } from './errors';

export abstract class API {
  /**
   * Cannot be constructed.
   */
  protected constructor() {}

  protected static isApiError(error: AxiosError) {
    const err = error?.response?.data;
    if (err['code'] && !isNaN(Number(err['code']))) {
      switch (err['code']) {
        case 4000:
          throw new ErrAddressMalformed(err['error']);
        case 4003:
          throw new ErrAccountNotFound(err['error']);
        default:
          throw error;
      }
    }
  }
}

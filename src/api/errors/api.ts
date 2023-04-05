import { AxiosError } from 'axios';

export class ErrAPI extends Error {
  public raw: AxiosError;

  constructor(message?: string, error?: AxiosError) {
    super(message ? message : 'api error');
    this.raw = error;
  }
}

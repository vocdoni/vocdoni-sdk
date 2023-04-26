import { CENSUS3_URL } from './util/constants';
import { ClientOptions } from './client';
import { Census3TokenAPI } from './api';

export class VocdoniCensus3Client {
  public url: string;

  /**
   * Instantiate new VocdoniCensus3 client.
   *
   * To instantiate the client just pass the `ClientOptions` you want or empty object to let defaults.
   *
   * `const client = new VocdoniCensus3Client({EnvOptions.PROD})`
   *
   * @param {ClientOptions} opts optional arguments
   */
  constructor(opts: ClientOptions) {
    this.url = opts.api_url ?? CENSUS3_URL[opts.env];
  }

  getSupportedTokens(): Promise<object> {
    return Census3TokenAPI.list(this.url).then((list) => list.tokens);
  }
}

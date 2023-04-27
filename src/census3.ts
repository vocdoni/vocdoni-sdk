import { CENSUS3_URL } from './util/constants';
import { ClientOptions } from './client';
import { Census3CensusAPI, Census3StrategiesAPI, Census3TokenAPI } from './api';
import invariant from 'tiny-invariant';

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

  getSupportedTypes(): Promise<object> {
    return Census3TokenAPI.types(this.url).then((types) => types.supported_tokens);
  }

  getToken(id: string): Promise<object> {
    invariant(id, 'No token id');
    return Census3TokenAPI.token(this.url, id);
  }

  getStrategiesList(options?: { page?: number; token?: string }): Promise<number[]> {
    return Census3StrategiesAPI.list(this.url, options?.page ?? 0, options?.token).then(
      (strategies) => strategies.strategies
    );
  }

  getStrategies(options?: { page?: number; token?: string }): Promise<object[]> {
    return this.getStrategiesList(options).then((strategies) =>
      Promise.all(strategies.map((strategyId) => this.getStrategy(strategyId)))
    );
  }

  getStrategy(id: number): Promise<object> {
    invariant(id || id >= 0, 'No strategy id');
    return Census3StrategiesAPI.strategy(this.url, id);
  }

  getCensusesList(options?: { strategyId?: number }): Promise<number[]> {
    invariant(options.strategyId || options.strategyId >= 0, 'No strategy id');
    return Census3CensusAPI.list(this.url, options?.strategyId).then((censuses) => censuses.censuses);
  }

  getCensuses(options?: { strategyId?: number }): Promise<object[]> {
    return this.getCensusesList(options).then((censuses) =>
      Promise.all(censuses.map((strategyId) => this.getCensus(strategyId)))
    );
  }

  getCensus(id: number): Promise<object> {
    invariant(id || id >= 0, 'No census id');
    return Census3CensusAPI.census(this.url, id);
  }
}

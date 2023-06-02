import { CENSUS3_URL } from './util/constants';
import { ClientOptions } from './client';
import { Census3CensusAPI, Census3StrategyAPI, Census3TokenAPI, ICensus3CensusResponse, ICensus3Token } from './api';
import invariant from 'tiny-invariant';
import { isAddress } from '@ethersproject/address';
import { TokenCensus } from './types';

export type Token = ICensus3Token;

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
    return Census3TokenAPI.types(this.url).then((types) => types.supportedTypes);
  }

  getToken(id: string): Promise<Token> {
    invariant(id, 'No token id');
    return Census3TokenAPI.token(this.url, id);
  }

  createToken(address: string, type: string, startBlock: number = 0): Promise<void> {
    invariant(address, 'No token address');
    invariant(type, 'No token type');
    invariant(isAddress(address), 'Incorrect token address');
    return Census3TokenAPI.create(this.url, address, type, startBlock);
  }

  getStrategiesList(options?: { page?: number; token?: string }): Promise<number[]> {
    return Census3StrategyAPI.list(this.url, options?.page ?? 0, options?.token).then(
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
    return Census3StrategyAPI.strategy(this.url, id);
  }

  createStrategy(
    tokens: Array<{ id: string; name: string; minBalance: string; method: string }>,
    strategy: string
  ): Promise<number> {
    invariant(strategy, 'No strategy set');
    invariant(tokens.length > 0, 'No tokens set');
    tokens.map((token) => invariant(isAddress(token.id), 'Invalid token address'));
    return Census3StrategyAPI.create(this.url, tokens, strategy).then((createStrategy) => createStrategy.strategyId);
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

  getCensus(id: number): Promise<ICensus3CensusResponse> {
    invariant(id || id >= 0, 'No census id');
    return Census3CensusAPI.census(this.url, id);
  }

  createCensus(strategyId: number, blockNumber?: number): Promise<number> {
    invariant(strategyId || strategyId >= 0, 'No strategy id');
    return Census3CensusAPI.create(this.url, strategyId, blockNumber).then((createCensus) => createCensus.censusId);
  }

  async createTokenCensus(address: string): Promise<TokenCensus> {
    const token = await this.getToken(address);
    if (!token.status.synced) {
      return Promise.reject('Token is not yet synced.');
    }

    return this.createCensus(token.defaultStrategy)
      .then((censusId) => this.getCensus(censusId))
      .then((census) => new TokenCensus(census.merkleRoot, census.uri, token, census.size, BigInt(census.weight)));
  }
}

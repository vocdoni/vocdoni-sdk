import { CENSUS3_URL } from './util/constants';
import { ClientOptions } from './client';
import {
  Census3CensusAPI,
  Census3ServiceAPI,
  Census3StrategyAPI,
  Census3TokenAPI,
  ICensus3CensusResponse,
  ICensus3StrategyResponse,
  ICensus3SupportedChain,
  Census3Token,
  Census3TokenSummary,
} from './api';
import invariant from 'tiny-invariant';
import { isAddress } from '@ethersproject/address';
import { TokenCensus } from './types';

export type Token = Omit<Census3Token, 'tags'> & { tags: string[] };
export type TokenSummary = Census3TokenSummary;
export type Strategy = ICensus3StrategyResponse;
export type Census3Census = ICensus3CensusResponse;
export type SupportedChain = ICensus3SupportedChain;

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

  /**
   * Returns a list of summarized tokens supported by the service
   *
   * @returns {Promise<TokenSummary[]>} Token summary list
   */
  getSupportedTokens(): Promise<TokenSummary[]> {
    return Census3TokenAPI.list(this.url, { pageSize: -1 }).then((list) => list.tokens ?? []);
  }

  /**
   * Returns a list of supported chain identifiers
   *
   * @returns {Promise<number[]>} Supported chain list
   */
  getSupportedChains(): Promise<SupportedChain[]> {
    return Census3ServiceAPI.info(this.url).then((info) => info.supportedChains ?? []);
  }

  /**
   * Returns a list of supported tokens type
   *
   * @returns {Promise<string[]>} Supported tokens type list
   */
  getSupportedTypes(): Promise<string[]> {
    return Census3TokenAPI.types(this.url).then((types) => types.supportedTypes);
  }

  /**
   * Returns the full token information based on the id (address)
   *
   * @param {string} id The id (address) of the token
   * @param {number} chainId The id of the chain
   * @param {string} externalId The identifier used by external provider
   * @returns {Promise<Token>} The token information
   */
  getToken(id: string, chainId: number, externalId?: string): Promise<Token> {
    invariant(id, 'No token id');
    invariant(chainId, 'No chain id');
    return Census3TokenAPI.token(this.url, id, chainId, externalId).then((token) => ({
      ...token,
      tags: token.tags?.split(',') ?? [],
    }));
  }

  /**
   * Returns if the holder ID is already registered in the database as a holder of the token.
   *
   * @param {string} tokenId The id (address) of the token
   * @param {number} chainId The id of the chain
   * @param {string} holderId The identifier of the holder
   * @param {string} externalId The identifier used by external provider
   * @returns {Promise<Token>} The token information
   */
  isHolderInToken(tokenId: string, chainId: number, holderId: string, externalId?: string): Promise<boolean> {
    invariant(tokenId, 'No token id');
    invariant(holderId, 'No holder id');
    invariant(chainId, 'No chain id');
    return Census3TokenAPI.holder(this.url, tokenId, chainId, holderId, externalId);
  }

  /**
   * Creates a new token to be tracked in the service
   *
   * @param {string} address The address of the token
   * @param {string} type The type of the token
   * @param {number} chainId The chain id of the token
   * @param {string} externalId The identifier used by external provider
   * @param {string} tags The tag list to associate the token with
   * @param {string} startBlock The start block where to start scanning
   */
  createToken(
    address: string,
    type: string,
    chainId: number = 1,
    externalId: string = '',
    tags: string[] = [],
    startBlock: number = 0
  ): Promise<void> {
    invariant(address, 'No token address');
    invariant(type, 'No token type');
    invariant(isAddress(address), 'Incorrect token address');
    return Census3TokenAPI.create(this.url, address, type, chainId, startBlock, tags?.join(), externalId);
  }

  /**
   * Returns the strategies identifiers list
   *
   * @param {{ page?: number; token?: string }} options The options for listing
   * @returns {Promise<number[]>} The list of strategies identifiers
   */
  getStrategiesList(options?: { page?: number; token?: string }): Promise<number[]> {
    return Census3StrategyAPI.list(this.url, options?.page ?? 0, options?.token).then(
      (strategies) => strategies.strategies
    );
  }

  /**
   * Returns the strategies list
   *
   * @param {{ page?: number; token?: string }} options The options for listing
   * @returns {Promise<Strategy[]>} The list of strategies
   */
  getStrategies(options?: { page?: number; token?: string }): Promise<Strategy[]> {
    return this.getStrategiesList(options).then((strategies) =>
      Promise.all(strategies.map((strategyId) => this.getStrategy(strategyId)))
    );
  }

  /**
   * Returns the information of the strategy based on the id
   *
   * @param {number} id The id of the strategy
   * @returns {Promise<Strategy>} The strategy information
   */
  getStrategy(id: number): Promise<Strategy> {
    invariant(id || id >= 0, 'No strategy id');
    return Census3StrategyAPI.strategy(this.url, id);
  }

  /**
   * Creates a new strategy based on the given tokens and predicate
   *
   * @param {Array<{ id: string; name: string; minBalance: string; method: string }>} tokens The tokens information
   * @param {string} strategy The strategy predicate
   * @returns {Promise<number>} The strategy id
   */
  createStrategy(
    tokens: Array<{ id: string; name: string; minBalance: string; method: string }>,
    strategy: string
  ): Promise<number> {
    invariant(strategy, 'No strategy set');
    invariant(tokens.length > 0, 'No tokens set');
    tokens.map((token) => invariant(isAddress(token.id), 'Invalid token address'));
    return Census3StrategyAPI.create(this.url, tokens, strategy).then((createStrategy) => createStrategy.strategyId);
  }

  /**
   * Returns the census3 censuses identifiers list
   *
   * @param {{ strategyId?: number }} options The options for listing
   * @returns {Promise<number[]>} The list of census3 censuses identifiers
   */
  getCensusesList(options?: { strategyId?: number }): Promise<Census3Census[]> {
    invariant(options.strategyId || options.strategyId >= 0, 'No strategy id');
    return Census3CensusAPI.list(this.url, options?.strategyId).then((response) => response.censuses);
  }

  /**
   * Returns the census3 censuses list
   *
   * @param {{ strategyId?: number }} options The options for listing
   * @returns {Promise<Census3Census[]>} The list of census3 censuses
   */
  getCensuses(options?: { strategyId?: number }): Promise<Census3Census[]> {
    return this.getCensusesList(options).then((censuses) =>
      Promise.all(censuses.map((census) => this.getCensus(census.censusID)))
    );
  }

  /**
   * Returns the census3 census based on the given identifier
   *
   * @param {number} id The id of the census
   * @returns {Promise<Census3Census>} The census3 census
   */
  getCensus(id: number): Promise<Census3Census> {
    invariant(id || id >= 0, 'No census id');
    return Census3CensusAPI.census(this.url, id);
  }

  /**
   * Creates the census based on the given strategy
   *
   * @param {number} strategyId The id of the strategy
   * @param {boolean} anonymous If the census has to be anonymous
   * @param {number} blockNumber The block number
   * @returns {Promise<Census3Census>} The census information
   */
  createCensus(strategyId: number, anonymous: boolean = false, blockNumber?: number): Promise<Census3Census> {
    invariant(strategyId || strategyId >= 0, 'No strategy id');

    const waitForQueue = (queueId: string): Promise<Census3Census> => {
      return Census3CensusAPI.queue(this.url, queueId).then((queue) => {
        switch (true) {
          case queue.done && queue.error?.code?.toString().length > 0:
            return Promise.reject(new Error('Could not create the census'));
          case queue.done:
            return Promise.resolve(queue.census);
          default:
            return waitForQueue(queueId);
        }
      });
    };

    return Census3CensusAPI.create(this.url, strategyId, anonymous, blockNumber)
      .then((createCensus) => createCensus.queueID)
      .then((queueId) => waitForQueue(queueId));
  }

  /**
   * Returns the actual census based on the given token
   *
   * @param {string} address The address of the token
   * @param {number} chainId The id of the chain
   * @param {boolean} anonymous If the census has to be anonymous
   * @param {string} externalId The identifier used by external provider
   * @returns {Promise<TokenCensus>} The token census
   */
  async createTokenCensus(
    address: string,
    chainId: number,
    anonymous: boolean = false,
    externalId?: string
  ): Promise<TokenCensus> {
    const token = await this.getToken(address, chainId, externalId);
    if (!token.status.synced) {
      return Promise.reject('Token is not yet synced.');
    }

    return this.createCensus(token.defaultStrategy, anonymous).then(
      (census) => new TokenCensus(census.merkleRoot, census.uri, anonymous, token, census.size, BigInt(census.weight))
    );
  }
}

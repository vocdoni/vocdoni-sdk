import { Service, ServiceProperties } from './service';
import { CensusType, ICensusParticipant, PlainCensus, WeightedCensus } from '../types';
import { CensusAPI, ICensusPublishResponse, WalletAPI } from '../api';
import { Wallet } from '@ethersproject/wallet';
import invariant from 'tiny-invariant';

interface CensusServiceProperties {
  auth: CensusAuth;
  chunk_size: number;
}

type CensusServiceParameters = ServiceProperties & CensusServiceProperties;

type CensusAuth = {
  identifier: string;
  wallet: Wallet;
};

/**
 * @typedef CensusProof
 * @property {string} weight
 * @property {string} proof
 * @property {string} value
 */
export type CensusProof = {
  type: CensusType;
  weight: string;
  root: string;
  proof: string;
  value: string;
  siblings?: Array<string>;
};

/**
 * @typedef CspCensusProof
 * @property {string} type
 * @property {string} address
 * @property {string} signature
 * @property {bigint} weight
 */
export type CspCensusProof = {
  type?: number;
  address: string;
  signature: string;
  weight?: bigint;
};

export class CensusService extends Service implements CensusServiceProperties {
  public auth: CensusAuth;
  public chunk_size: number;

  /**
   * Instantiate the census service.
   *
   * @param {Partial<CensusServiceParameters>} params The service parameters
   */
  constructor(params: Partial<CensusServiceParameters>) {
    super();
    Object.assign(this, params);
  }

  /**
   * Fetches the information of a given census.
   *
   * @param censusId
   * @returns {Promise<{size: number, weight: bigint}>}
   */
  fetchCensusInfo(censusId: string): Promise<{ size: number; weight: bigint; type: CensusType }> {
    invariant(this.url, 'No URL set');

    return Promise.all([
      CensusAPI.size(this.url, censusId),
      CensusAPI.weight(this.url, censusId),
      CensusAPI.type(this.url, censusId),
    ])
      .then(([size, weight, type]) => ({
        size: size.size,
        weight: BigInt(weight.weight),
        type: type.type,
      }))
      .catch(() => ({
        size: undefined,
        weight: undefined,
        type: undefined,
      }));
  }

  /**
   * Fetches proof that an address is part of the specified census.
   *
   * @param {string} censusId Census we want to check the address against
   * @param {string} key The address to be found
   * @returns {Promise<CensusProof>}
   */
  async fetchProof(censusId: string, key: string): Promise<CensusProof> {
    invariant(this.url, 'No URL set');

    return CensusAPI.proof(this.url, censusId, key).then((censusProof) => ({
      type: censusProof.type,
      weight: censusProof.weight,
      root: censusProof.censusRoot,
      proof: censusProof.censusProof,
      value: censusProof.value,
      siblings: censusProof.censusSiblings ?? null,
    }));
  }

  create(censusType: CensusType): Promise<string> {
    invariant(this.url, 'No URL set');

    return this.fetchAccountToken()
      .then(() => CensusAPI.create(this.url, this.auth.identifier, censusType))
      .then((response) => response.censusID);
  }

  async add(censusId: string, participants: ICensusParticipant[]) {
    invariant(this.url, 'No URL set');
    invariant(this.auth, 'No census auth set');
    invariant(this.chunk_size, 'No chunk size set');

    const participantsChunked = participants.reduce((result, item, index) => {
      const chunkIndex = Math.floor(index / this.chunk_size);

      if (!result[chunkIndex]) {
        result[chunkIndex] = [];
      }

      result[chunkIndex].push(item);

      return result;
    }, []);

    for (const chunk of participantsChunked) {
      await CensusAPI.add(this.url, this.auth.identifier, censusId, chunk);
    }

    return censusId;
  }

  private addParallel(censusId: string, participants: ICensusParticipant[]) {
    invariant(this.url, 'No URL set');
    invariant(this.auth, 'No census auth set');
    invariant(this.chunk_size, 'No chunk size set');

    const participantsChunked = participants.reduce((result, item, index) => {
      const chunkIndex = Math.floor(index / this.chunk_size);

      if (!result[chunkIndex]) {
        result[chunkIndex] = [];
      }

      result[chunkIndex].push(item);

      return result;
    }, []);

    return participantsChunked.map((chunk) => CensusAPI.add(this.url, this.auth.identifier, censusId, chunk));
  }

  /**
   * Publishes the given census identifier.
   *
   * @param {string} censusId The census identifier
   */
  publish(censusId: string): Promise<ICensusPublishResponse> {
    invariant(this.url, 'No URL set');
    invariant(this.auth, 'No census auth set');

    return CensusAPI.publish(this.url, this.auth.identifier, censusId);
  }

  /**
   * Publishes the given census.
   *
   * @param {PlainCensus | WeightedCensus} census The census to be published.
   * @returns {Promise<void>}
   */
  createCensus(census: PlainCensus | WeightedCensus): Promise<void> {
    return this.create(census.type)
      .then((censusId) => this.add(censusId, census.participants))
      .then((censusId) => this.publish(censusId))
      .then((censusPublish) => {
        census.censusId = censusPublish.censusID;
        census.censusURI = censusPublish.uri;
        census.size = census.participants.length;
        census.weight = census.participants.reduce(
          (currentValue, participant) => currentValue + participant.weight,
          BigInt(0)
        );
      });
  }

  /**
   * Publishes the given census.
   *
   * @param {PlainCensus | WeightedCensus} census The census to be published.
   * @returns {Promise<void>}
   */
  // @ts-ignore
  private createCensusParallel(census: PlainCensus | WeightedCensus): Promise<void> {
    return this.create(census.type).then((censusId) =>
      Promise.all(this.addParallel(censusId, census.participants))
        .then(() => this.publish(censusId))
        .then((censusPublish) => {
          census.censusId = censusPublish.censusID;
          census.censusURI = censusPublish.uri;
          census.size = census.participants.length;
          census.weight = census.participants.reduce(
            (currentValue, participant) => currentValue + participant.weight,
            BigInt(0)
          );
        })
    );
  }

  /**
   * Fetches the specific account token auth and sets it to the current instance.
   *
   * @returns {Promise<void>}
   */
  fetchAccountToken(): Promise<void> {
    if (this.auth) {
      return Promise.resolve();
    }
    invariant(this.url, 'No URL set');

    this.auth = {
      identifier: '',
      wallet: Wallet.createRandom(),
    };

    return WalletAPI.add(this.url, this.auth.wallet.privateKey).then((addWalletResponse) => {
      this.auth.identifier = addWalletResponse.token;
    });
  }
}

import { Service, ServiceProperties } from './service';
import { CensusType, PlainCensus, WeightedCensus } from '../types';
import { CensusAPI, WalletAPI } from '../api';
import { Wallet } from '@ethersproject/wallet';
import invariant from 'tiny-invariant';

interface CensusServiceProperties {
  auth: CensusAuth;
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

  /**
   * Publishes the given census.
   *
   * @param {PlainCensus | WeightedCensus} census The census to be published.
   * @returns {Promise<void>}
   */
  createCensus(census: PlainCensus | WeightedCensus): Promise<void> {
    invariant(this.url, 'No URL set');
    const censusCreation = this.fetchAccountToken().then(() =>
      CensusAPI.create(this.url, this.auth.identifier, census.type)
    );

    const censusAdding = censusCreation.then((censusCreateResponse) =>
      CensusAPI.add(this.url, this.auth.identifier, censusCreateResponse.censusID, census.participants)
    );

    return Promise.all([censusCreation, censusAdding])
      .then((censusData) => CensusAPI.publish(this.url, this.auth.identifier, censusData[0].censusID))
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

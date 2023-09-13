import { Service, ServiceProperties } from './service';
import { ChainAPI, IChainGetCostsResponse, IChainTxReference } from '../api';
import invariant from 'tiny-invariant';
import { delay } from '../util/common';

interface ChainServiceProperties {
  chainCosts: ChainCosts;
  chainData: ChainData;
  txWait: TxWaitOptions;
}

type ChainServiceParameters = ServiceProperties & ChainServiceProperties;

export type ChainCosts = IChainGetCostsResponse;
export type ChainTx = IChainTxReference;

/**
 * Specify custom retry times and attempts when waiting for a transaction.
 *
 * @typedef TxWaitOptions
 * @property {number} retryTime
 * @property {number} attempts
 */
export type TxWaitOptions = {
  retryTime: number;
  attempts: number;
};

export type ChainData = {
  chainId: string;
  blockTime: number[];
  height: number;
  blockTimestamp: number;
  maxCensusSize: number;
};

export class ChainService extends Service implements ChainServiceProperties {
  public chainCosts: ChainCosts;
  public chainData: ChainData;
  public txWait: TxWaitOptions;

  /**
   * Instantiate the chain service.
   *
   * @param {Partial<ChainServiceParameters>} params The service parameters
   */
  constructor(params: Partial<ChainServiceParameters>) {
    super();
    Object.assign(this, params);
  }

  /**
   * Fetches blockchain information if needed.
   *
   * @returns {Promise<ChainData>}
   */
  fetchChainData(): Promise<ChainData> {
    if (this.chainData) {
      return Promise.resolve(this.chainData);
    }
    invariant(this.url, 'No URL set');

    return ChainAPI.info(this.url).then((chainData) => {
      this.chainData = chainData;
      return chainData;
    });
  }

  /**
   * Fetches blockchain costs information if needed.
   *
   * @returns {Promise<ChainCosts>}
   */
  fetchChainCosts(): Promise<ChainCosts> {
    if (this.chainCosts) {
      return Promise.resolve(this.chainCosts);
    }
    invariant(this.url, 'No URL set');

    return ChainAPI.costs(this.url).then((chainCosts) => {
      this.chainCosts = chainCosts;
      return chainCosts;
    });
  }

  /**
   * Submits a transaction to the blockchain
   *
   * @param {string} payload The transaction data payload
   * @returns {Promise<string>} The transaction hash
   */
  submitTx(payload: string): Promise<string> {
    invariant(this.url, 'No URL set');
    return ChainAPI.submitTx(this.url, payload).then((txData) => txData.hash);
  }

  /**
   * Fetches information about a transaction from the blockchain.
   *
   * @param {string} txHash The transaction hash which we want to retrieve the info from
   * @returns {Promise<ChainTx>} The chain transaction
   */
  txInfo(txHash: string): Promise<ChainTx> {
    invariant(this.url, 'No URL set');
    return ChainAPI.txInfo(this.url, txHash);
  }

  /**
   * A convenience method to wait for a transaction to be executed. It will
   * loop trying to get the transaction information, and will retry every time
   * it fails.
   *
   * @param {string} tx Transaction to wait for
   * @param {number} wait The delay in milliseconds between tries
   * @param {attempts} attempts The attempts to try before failing
   * @returns {Promise<void>}
   */
  waitForTransaction(tx: string, wait?: number, attempts?: number): Promise<void> {
    const waitTime = wait ?? this.txWait?.retryTime;
    const attemptsNum = attempts ?? this.txWait?.attempts;
    invariant(waitTime, 'No transaction wait time set');
    invariant(attemptsNum, 'No transaction attempts set');

    return attemptsNum === 0
      ? Promise.reject('Time out waiting for transaction: ' + tx)
      : this.txInfo(tx)
          .then(() => Promise.resolve())
          .catch(() => delay(waitTime).then(() => this.waitForTransaction(tx, waitTime, attemptsNum - 1)));
  }
}

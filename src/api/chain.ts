import axios from 'axios';
import { API } from './api';
import { ErrTransactionNotFound } from './errors';
import { Tx } from './chain/index';

enum ChainAPIMethods {
  INFO = '/chain/info',
  TX_INFO = '/chain/transactions/reference',
  TX_INFO_BLOCK = '/chain/transactions/{blockHeight}/{txIndex}',
  TX_COUNT = '/chain/transactions/count',
  SUBMIT_TX = '/chain/transactions',
  TX_LIST = '/chain/transactions/page',
  ORGANIZATION_COUNT = '/chain/organizations/count',
  ORGANIZATION_LIST = '/chain/organizations/page',
  VALIDATORS_LIST = '/chain/validators',
  BLOCK_INFO = '/chain/blocks/',
}

export interface IChainGetInfoResponse {
  /**
   * The id of the current chain
   */
  chainId: string;

  /**
   * The different block times from the chain.
   */
  blockTime: number[];

  /**
   * The number of elections existing on the Vochain.
   */
  electionCount: number;

  /**
   * The number of organizations existing on the Vochain.
   */
  organizationCount: number;

  /**
   * The time of the genesis block.
   */
  genesisTime: string;

  /**
   * The height or actual block of the current chain.
   */
  height: number;

  /**
   * Whether the blockchain is syncing.
   */
  syncing: boolean;

  /**
   * The timestamp of the actual block.
   */
  blockTimestamp: number;

  /**
   * The number of transactions.
   */
  transactionCount: number;

  /**
   * The number of validators.
   */
  validatorCount: number;

  /**
   * The number of votes.
   */
  voteCount: number;

  /**
   * The circuit configuration tag.
   */
  circuitConfigurationTag: string;

  /**
   * The maximum size of a census.
   */
  maxCensusSize: number;
}

export enum TransactionType {
  VOTE_ENVELOPE = 'vote',
  NEW_PROCESS_TX = 'newProcess',
  ADMIN_TX = 'admin',
  SET_PROCESS_TX = 'setProcess',
  REGISTER_KEY_TX = 'registerKey',
  MINT_TOKENS_TX = 'mintTokens',
  SEND_TOKENS_TX = 'sendTokens',
  SET_TRANSACTION_COSTS_TX = 'setTransactionCosts',
  SET_ACCOUNT_TX = 'setAccount',
  COLLECT_FAUCET_TX = 'collectFaucet',
  SET_KEYKEEPER_TX = 'setKeykeeper',
}

export interface IChainTxReference {
  /**
   * The number of the transaction.
   */
  transactionNumber: number;

  /**
   * The hash of the transaction.
   */
  transactionHash: string;

  /**
   * The number of the block where the transaction is.
   */
  blockHeight: number;

  /**
   * The index of the transaction inside the block.
   */
  transactionIndex: number;

  /**
   * The type of the transaction.
   */
  transactionType: TransactionType;
}

export interface IChainTxCountResponse {
  /**
   * The number of transactions
   */
  count: number;
}

export interface IChainSubmitTxResponse {
  /**
   * The hash of the transaction
   */
  hash: string;

  /**
   * The response data (can vary depending on the transaction type)
   */
  response: string;

  /**
   * The response code
   */
  code: number;
}

export interface IChainTxListResponse {
  /**
   * List of transactions reference
   */
  transactions: Array<IChainTxReference>;
}

export interface IChainOrganizationCountResponse {
  /**
   * The number of organizations
   */
  count: number;
}

interface IChainOrganizationResponse {
  /**
   * The identifier of the organization
   */
  organizationID: string;

  /**
   * The number of elections
   */
  electionCount: number;
}

export interface IChainOrganizationListResponse {
  /**
   * The list of organizations
   */
  organizations: Array<IChainOrganizationResponse>;
}

interface BlockID {
  hash: string;
  parts: {
    total: number;
    hash: string;
  };
}

export interface IChainBlockInfoResponse {
  data: {
    txs: Array<string>;
  };
  evidence: {
    evidence: Array<string>;
  };
  header: {
    appHash: string;
    chainId: string;
    consensusHash: string;
    dataHash: string;
    evidenceHash: string;
    height: string;
    lastBlockId: BlockID;
    lastCommitHash: string;
    lastResultsHash: string;
    nextValidatorsHash: string;
    proposerAddress: string;
    time: string;
    validatorsHash: string;
    version: {
      block: number;
      app: number;
    };
  };
  lastCommit: {
    blockId: BlockID;
    height: number;
    round: number;
    signatures: Array<{
      blockIdFlag: number;
      signature: string;
      timestamp: string;
      validatorAddress: string;
    }>;
  };
}

export interface IChainValidator {
  /**
   * Current power of the validator
   */
  power: number;

  /**
   * Validator public key
   */
  pubKey: string;

  /**
   * Validator address
   */
  address: string;

  /**
   * Validator name reference. Could be empty.
   */
  name: string;
}

export interface IChainValidatorsListResponse {
  /**
   * The list of validators
   */
  validators: Array<IChainValidator>;
}

export abstract class ChainAPI extends API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Fetches info about the blockchain status.
   *
   * @param {string} url API endpoint URL
   * @returns {Promise<IChainGetInfoResponse>}
   */
  public static info(url: string): Promise<IChainGetInfoResponse> {
    return axios
      .get<IChainGetInfoResponse>(url + ChainAPIMethods.INFO)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the number of transactions registered on the Vocchain
   *
   * @param {string} url API endpoint URL
   * @returns {Promise<IChainOrganizationCountResponse>}
   */
  public static txCount(url: string): Promise<IChainTxCountResponse> {
    return axios
      .get<IChainTxCountResponse>(url + ChainAPIMethods.TX_COUNT)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Fetches information about a transaction from the blockchain.
   *
   * @param {string} url API endpoint URL
   * @param {string} txHash The transaction hash which we want to retrieve the info from
   * @returns {Promise<IChainTxReference>}
   */
  public static txInfo(url: string, txHash: string): Promise<IChainTxReference> {
    return axios
      .get<IChainTxReference>(url + ChainAPIMethods.TX_INFO + '/' + txHash)
      .then((response) => {
        if (response.status === 204) {
          throw new ErrTransactionNotFound();
        }
        return response.data;
      })
      .catch(this.isApiError);
  }

  /**
   * Fetches information about a transaction by its containing block an index on the block.
   *
   * @param {string} url API endpoint URL
   * @param {string} blockHeight Block with the containing transaction
   * @param {string} txIndex Index on the block
   * @returns {Promise<Tx>}
   */
  public static txInfoByBlock(url: string, blockHeight: number, txIndex: number): Promise<Tx> {
    return axios
      .get<Tx>(
        url +
          ChainAPIMethods.TX_INFO_BLOCK.replace('{blockHeight}', String(blockHeight)).replace(
            '{txIndex}',
            String(txIndex)
          )
      )
      .then((response) => {
        return response.data;
      })
      .catch(this.isApiError);
  }

  /**
   * Submits a transaction to the blockchain
   *
   * @param {string} url API endpoint URL
   * @param {string} payload The transaction data payload
   * @returns {Promise<IChainSubmitTxResponse>}
   */
  public static submitTx(url: string, payload: string): Promise<IChainSubmitTxResponse> {
    return axios
      .post<IChainSubmitTxResponse>(url + ChainAPIMethods.SUBMIT_TX, JSON.stringify({ payload }))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the list of transactions by page
   *
   * @param url {string} url API endpoint URL
   * @param page {number} page The page number
   * @returns {Promise<IChainTxListResponse>}
   */
  public static txList(url: string, page: number = 0): Promise<IChainTxListResponse> {
    return axios
      .get<IChainTxListResponse>(url + ChainAPIMethods.TX_LIST + '/' + page)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the number of organizations
   *
   * @param {string} url API endpoint URL
   * @returns {Promise<IChainOrganizationCountResponse>}
   */
  public static organizationCount(url: string): Promise<IChainOrganizationCountResponse> {
    return axios
      .get<IChainOrganizationCountResponse>(url + ChainAPIMethods.ORGANIZATION_COUNT)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the list of organizations by page
   *
   * @param {string} url API endpoint URL
   * @param {number} page The page number
   * @returns {Promise<IChainOrganizationListResponse>}
   */
  public static organizationList(url: string, page: number = 0): Promise<IChainOrganizationListResponse> {
    return axios
      .get<IChainOrganizationListResponse>(url + ChainAPIMethods.ORGANIZATION_LIST + '/' + page)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Get block information by height
   *
   * @param {string} url API endpoint URL
   * @param {number} height block height
   * @returns {Promise<IChainBlockInfoResponse>}
   */
  public static blockByHeight(url: string, height: number): Promise<IChainBlockInfoResponse> {
    return axios
      .get<IChainBlockInfoResponse>(url + ChainAPIMethods.BLOCK_INFO + '/' + height)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the list of validators
   *
   * @param {string} url API endpoint URL
   * @returns {Promise<IChainOrganizationListResponse>}
   */
  public static validatorsList(url: string): Promise<IChainValidatorsListResponse> {
    return axios
      .get<IChainValidatorsListResponse>(url + ChainAPIMethods.VALIDATORS_LIST)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Get block information by hash
   *
   * @param {string} url API endpoint URL
   * @param {string} hash block hash
   * @returns {Promise<IChainBlockInfoResponse>}
   */
  public static blockByHash(url: string, hash: string): Promise<IChainBlockInfoResponse> {
    return axios
      .get<IChainBlockInfoResponse>(url + ChainAPIMethods.BLOCK_INFO + '/' + hash)
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

import axios from 'axios';
import { API } from './api';
import { ErrTransactionNotFound } from './errors';
import { Tx } from './chain/';
export * from './chain/';

enum ChainAPIMethods {
  INFO = '/chain/info',
  COSTS = '/chain/info/electionPriceFactors',
  CIRCUITS = '/chain/info/circuit',
  TX_INFO = '/chain/transactions/reference',
  TX_INFO_BLOCK = '/chain/transactions/{blockHeight}/{txIndex}',
  SUBMIT_TX = '/chain/transactions',
  TX_LIST = '/chain/transactions/page',
  ORGANIZATION_COUNT = '/chain/organizations/count',
  ORGANIZATION_LIST = '/chain/organizations/page',
  ORGANIZATION_LIST_FILTERED = '/chain/organizations/filter/page',
  VALIDATORS_LIST = '/chain/validators',
  BLOCK_INFO = '/chain/blocks',
  BLOCK_INFO_BY_HASH = '/chain/blocks/hash',
  BLOCK_TRANSACTIONS = '/chain/blocks/{height}/transactions/page/{page}',
  DATE_TO_BLOCK = '/chain/dateToBlock/{timestamp}',
  BLOCK_TO_DATE = '/chain/blockToDate/{height}',
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

export interface IChainGetCostsResponse {
  /**
   * The base price.
   */
  basePrice: number;

  /**
   * The capacity of the chain.
   */
  capacity: number;

  /**
   * The factors.
   */
  factors: {
    k1: number;
    k2: number;
    k3: number;
    k4: number;
    k5: number;
    k6: number;
    k7: number;
  };
}

export interface IChainGetCircuitResponse {
  /**
   * The base uri of the files.
   */
  uri: string;

  /**
   * The path of the circuit.
   */
  circuitPath: string;

  /**
   * The circuit levels.
   */
  levels: number;

  /**
   * The hash of the proving key file.
   */
  zKeyHash: string;

  /**
   * The name of the proving key file.
   */
  zKeyFilename: string;

  /**
   * The hash of the verification key file.
   */
  vKeyHash: string;

  /**
   * The name of the verification key file.
   */
  vKeyFilename: string;

  /**
   * The hash of the WASM file.
   */
  wasmHash: string;

  /**
   * The name of the WASM file.
   */
  wasmFilename: string;
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

export interface IChainOrganizationResponse {
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
  hash: string;
  header: {
    appHash: string;
    chainId: string;
    consensusHash: string;
    dataHash: string;
    evidenceHash: string;
    height: number;
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

export interface IBlockTransactionsResponse {
  blockNumber: number;
  transactionCount: number;
  transactions: Array<IChainTxReference>;
}

interface IDateToBlockResponse {
  height: number;
}

interface IBlockToDateResponse {
  date: string;
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
   * @param url - API endpoint URL
   */
  public static info(url: string): Promise<IChainGetInfoResponse> {
    return axios
      .get<IChainGetInfoResponse>(url + ChainAPIMethods.INFO)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Fetches info about the blockchain costs.
   *
   * @param url - API endpoint URL
   */
  public static costs(url: string): Promise<IChainGetCostsResponse> {
    return axios
      .get<IChainGetCostsResponse>(url + ChainAPIMethods.COSTS)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Fetches info about the blockchain anonymous circuits.
   *
   * @param url - API endpoint URL
   */
  public static circuits(url: string): Promise<IChainGetCircuitResponse> {
    return axios
      .get<IChainGetCircuitResponse>(url + ChainAPIMethods.CIRCUITS)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Fetches a circuit.
   *
   * @param url - Circuit URL
   */
  public static circuit(url: string): Promise<Uint8Array> {
    return axios
      .get<Uint8Array>(url, { responseType: 'arraybuffer' })
      .then((response) => new Uint8Array(response.data))
      .catch(this.isApiError);
  }

  /**
   * Fetches information about a transaction from the blockchain.
   *
   * @param url - API endpoint URL
   * @param txHash - The transaction hash which we want to retrieve the info from
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
   * @param url - API endpoint URL
   * @param blockHeight - Block with the containing transaction
   * @param txIndex - Index on the block
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
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Submits a transaction to the blockchain
   *
   * @param url - API endpoint URL
   * @param payload - The transaction data payload
   */
  public static submitTx(url: string, payload: string): Promise<IChainSubmitTxResponse> {
    return axios
      .post<IChainSubmitTxResponse>(url + ChainAPIMethods.SUBMIT_TX, { payload })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the list of transactions by page
   *
   * @param url - {string} url API endpoint URL
   * @param page - {number} page The page number
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
   * @param url - API endpoint URL
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
   * @param url - API endpoint URL
   * @param page - The page number
   * @param organizationId - Organization id or partial id to search. It has to be a valid hex string.
   */
  public static organizationList(
    url: string,
    page: number = 0,
    organizationId?: string
  ): Promise<IChainOrganizationListResponse> {
    if (organizationId) {
      return axios
        .post<IChainOrganizationListResponse>(url + ChainAPIMethods.ORGANIZATION_LIST_FILTERED + '/' + page, {
          organizationId: organizationId,
        })
        .then((response) => response.data)
        .catch(this.isApiError);
    }
    return axios
      .get<IChainOrganizationListResponse>(url + ChainAPIMethods.ORGANIZATION_LIST + '/' + page)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Get block information by height
   *
   * @param url - API endpoint URL
   * @param height - block height
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
   * @param url - API endpoint URL
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
   * @param url - API endpoint URL
   * @param hash - block hash
   */
  public static blockByHash(url: string, hash: string): Promise<IChainBlockInfoResponse> {
    return axios
      .get<IChainBlockInfoResponse>(url + ChainAPIMethods.BLOCK_INFO_BY_HASH + '/' + hash)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Get paginated list of transactions registered on specific block
   *
   * @param url - API endpoint URL
   * @param height - block height
   * @param page - the page number
   */
  public static blockTransactions(url: string, height: number, page: number = 0): Promise<IBlockTransactionsResponse> {
    return axios
      .get<IBlockTransactionsResponse>(
        url + ChainAPIMethods.BLOCK_TRANSACTIONS.replace('{height}', String(height)).replace('{page}', String(page))
      )
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * By a given date give the estimate block for the current Vochain.
   * @param url - API URL
   * @param timeStamp - unix format timestamp
   */
  public static dateToBlock(url: string, timeStamp: number): Promise<IDateToBlockResponse> {
    return axios
      .get<IDateToBlockResponse>(url + ChainAPIMethods.DATE_TO_BLOCK.replace('{timestamp}', String(timeStamp)))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Return approximate date by a given block height.
   *
   * @param url - API URL
   * @param height - block height to calculate approximate timestamp
   * @return {Promise<IBlockToDateResponse>}
   */
  public static blockToDate(url: string, height: number): Promise<IBlockToDateResponse> {
    return axios
      .get<IBlockToDateResponse>(url + ChainAPIMethods.BLOCK_TO_DATE.replace('{height}', String(height)))
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

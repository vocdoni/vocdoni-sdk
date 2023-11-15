import axios from 'axios';
import { AllElectionStatus, ElectionMetadata, ElectionStatus } from '../types';
import { API } from './api';

enum ElectionAPIMethods {
  INFO = '/elections',
  PRICE = '/elections/price',
  KEYS = '/elections/{id}/keys',
  CREATE = '/elections',
  VOTES = '/elections/{id}/votes/page/{page}',
  VOTES_COUNT = '/elections/{id}/votes/count',
  LIST = '/elections/page/{page}',
  LIST_FILTERED = '/elections/filter/page/{page}',
}

export interface ICensus {
  /**
   * The type of the census
   */
  censusOrigin: CensusTypeEnum;

  /**
   * The root of the census
   */
  censusRoot: string;

  /**
   * The post register root of the census
   */
  postRegisterCensusRoot: string;

  /**
   * The URL of the census
   */
  censusURL: string;

  /**
   * Max size of the census. How many voters the census can have.
   */
  maxCensusSize: number;
}

export interface IVoteMode {
  /**
   * If the vote is serial
   */
  serial: boolean;

  /**
   * If the vote is anonymous
   */
  anonymous: boolean;

  /**
   * If the vote is encrypted
   */
  encryptedVotes: boolean;

  /**
   * If the vote values are unique
   */
  uniqueValues: boolean;

  /**
   * Cost from weight of the election
   */
  costFromWeight: boolean;
}

export interface IElectionMode {
  /**
   * If the election should start automatically
   */
  autoStart: boolean;

  /**
   * If the election is interruptible
   */
  interruptible: boolean;

  /**
   * If the election has a dynamic census
   */
  dynamicCensus: boolean;

  /**
   * If the election has encrypted metadata
   */
  encryptedMetaData: boolean;

  /**
   * If the election has preregister phase
   */
  preRegister: boolean;
}

export interface ITallyMode {
  /**
   * The max count of the vote's values sum
   */
  maxCount: number;

  /**
   * The max value of the vote's values
   */
  maxValue: number;

  /**
   * The max number of votes overwrites
   */
  maxVoteOverwrites: number;

  /**
   * The max total cost of the votes
   */
  maxTotalCost: number;

  /**
   * The cost exponent of the vote
   */
  costExponent: number;
}

export interface IElectionCreateResponse {
  /**
   * The hash of the transaction
   */
  txHash: string;

  /**
   * The election identifier
   */
  electionID: string;

  /**
   * The metadata URL
   */
  metadataURL: number;
}

export enum CensusTypeEnum {
  CENSUS_UNKNOWN = 'CENSUS_UNKNOWN',
  OFF_CHAIN_TREE = 'OFF_CHAIN_TREE',
  OFF_CHAIN_TREE_WEIGHTED = 'OFF_CHAIN_TREE_WEIGHTED',
  OFF_CHAIN_CA = 'OFF_CHAIN_CA',
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
  ERC777 = 'ERC777',
  MINI_ME = 'MINI_ME',
}

export interface IElectionInfoResponse {
  /**
   * The id of the election
   */
  electionId: string;

  /**
   * The id of the organization that created the election
   */
  organizationId: string;

  /**
   * The status of the election
   */
  status: Exclude<AllElectionStatus, ElectionStatus.ONGOING | ElectionStatus.UPCOMING>;

  /**
   * The start date of the election
   */
  startDate: string;

  /**
   * The end date of the election
   */
  endDate: string;

  /**
   * The number of votes of the election
   */
  voteCount: number;

  /**
   * If the election has the final results
   */
  finalResults: boolean;

  /**
   * The result of the election
   */
  result?: Array<Array<string>>;

  /**
   * If the election has been ended manually
   */
  manuallyEnded: boolean;

  /**
   * If the election comes from the archive
   */
  fromArchive: boolean;

  /**
   * The chain identifier of the election
   */
  chainId: string;

  /**
   * The census of the election
   */
  census: ICensus;

  /**
   * The URL of the metadata
   */
  metadataURL: string;

  /**
   * The date of creation of the election
   */
  creationTime: string;

  /**
   * The voting mode of the election
   */
  voteMode: IVoteMode;

  /**
   * The election mode of the election
   */
  electionMode: IElectionMode;

  /**
   * The tally mode of the vote
   */
  tallyMode: ITallyMode;

  /**
   * The metadata of the election
   */
  metadata: ElectionMetadata;
}

export interface IEncryptionKey {
  /**
   * The index of the encryption key
   */
  index: number;

  /**
   * The encryption key
   */
  key: string;
}

export interface IElectionKeysResponse {
  publicKeys: IEncryptionKey[];
  privateKeys: IEncryptionKey[];
}

interface IElectionVotesCountResponse {
  /**
   * The number of votes
   */
  count: number;
}

interface IElectionCalculatePriceResponse {
  /**
   * The price of the election
   */
  price: number;
}

export interface IElectionVote {
  /**
   * Containing transaction hash
   */
  txHash: string;

  /**
   * Vote unique identifier also known as vote nullifier
   */
  voteID: string;

  /**
   * Account that emit the vote
   */
  voterID: string;

  /**
   * Block containing the vote transaction
   */
  blockHeight: number;

  /**
   * Transaction number on the block
   */
  transactionIndex: number;
}

export interface IElectionVoteListResponse {
  /**
   * List of votes
   */
  votes: Array<IElectionVote>;
}

export interface IElectionSummary {
  /**
   * The id of the election
   */
  electionId: string;

  /**
   * The id of the organization
   */
  organizationId: string;

  /**
   * The status of the election
   */
  status: Exclude<AllElectionStatus, ElectionStatus.ONGOING | ElectionStatus.UPCOMING>;

  /**
   * The start date of the election
   */
  startDate: string;

  /**
   * The end date of the election
   */
  endDate: string;

  /**
   * The number of votes of the election
   */
  voteCount: number;

  /**
   * If the election has the final results
   */
  finalResults: boolean;
}

export interface IElectionListResponse {
  /**
   * List of election summaries
   */
  elections: Array<IElectionSummary>;
}

export interface IElectionListFilter {
  organizationId?: string;
  electionId?: string;
  withResults?: boolean;
  status?: Exclude<AllElectionStatus, ElectionStatus.ONGOING | ElectionStatus.UPCOMING>;
}

export abstract class ElectionAPI extends API {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  /**
   * Fetches info about the specified process.
   *
   * @param {string} url API endpoint URL
   * @param {string} electionId The identifier of the election
   * @returns {Promise<IElectionInfoResponse>}
   */
  public static info(url: string, electionId: string): Promise<IElectionInfoResponse> {
    return axios
      .get<IElectionInfoResponse>(url + ElectionAPIMethods.INFO + '/' + electionId)
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Fetches the encryption keys from the specified process.
   *
   * @param {string} url API endpoint URL
   * @param {string} electionId The identifier of the election
   * @returns {Promise<IElectionKeysResponse>}
   */
  public static keys(url: string, electionId: string): Promise<IElectionKeysResponse> {
    return axios
      .get<IElectionKeysResponse>(url + ElectionAPIMethods.KEYS.replace('{id}', electionId))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Creates a new election.
   *
   * @param {string} url API endpoint URL
   * @param {string} payload The set information info raw payload to be submitted to the chain
   * @param {string} metadata The base64 encoded metadata JSON object
   * @returns {Promise<IElectionCreateResponse>}
   */
  public static create(url: string, payload: string, metadata: string): Promise<IElectionCreateResponse> {
    return axios
      .post<IElectionCreateResponse>(url + ElectionAPIMethods.CREATE, { txPayload: payload, metadata })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the number of votes of a given election
   *
   * @param {string} url API endpoint URL
   * @param {string} electionId The identifier of the election
   * @returns {Promise<IElectionVotesCountResponse>}
   */
  public static votesCount(url: string, electionId: string): Promise<IElectionVotesCountResponse> {
    return axios
      .get<IElectionVotesCountResponse>(url + ElectionAPIMethods.VOTES_COUNT.replace('{id}', electionId))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the list of votes for a given election
   *
   * @param {string} url API endpoint URL
   * @param {string} electionId The identifier of the election
   * @param {number} page The page number
   * @returns {Promise<IElectionVoteListResponse>}
   */
  public static votesList(url: string, electionId: string, page: number = 0): Promise<IElectionVoteListResponse> {
    return axios
      .get<IElectionVoteListResponse>(
        url + ElectionAPIMethods.VOTES.replace('{id}', electionId).replace('{page}', String(page))
      )
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Return list of all elections in the chain
   *
   * @param {string} url API endpoint URL
   * @param {number} page The page number
   * @param {string} organizationId Search by partial organizationId
   * @param {string} electionId Search by partial electionId
   * @param {boolean} withResults Return elections with results or live results
   * @param {Exclude<AllElectionStatus, ElectionStatus.ONGOING | ElectionStatus.UPCOMING>} status Search by election status
   * @returns {Promise<IElectionListResponse>}
   */
  public static electionsList(
    url: string,
    page: number = 0,
    { organizationId, electionId, withResults, status }: IElectionListFilter = {}
  ): Promise<IElectionListResponse> {
    if (organizationId || electionId || withResults || status) {
      return axios
        .post<IElectionListResponse>(url + ElectionAPIMethods.LIST_FILTERED.replace('{page}', String(page)), {
          organizationId,
          electionId,
          withResults,
          status,
        })
        .then((response) => response.data)
        .catch(this.isApiError);
    }
    return axios
      .get<IElectionListResponse>(url + ElectionAPIMethods.LIST.replace('{page}', String(page)))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Calculates the election price.
   *
   * @param {string} url API endpoint URL
   * @param {number} maxCensusSize
   * @param {number} electionBlocks
   * @param {boolean} encryptedVotes
   * @param {boolean} anonymousVotes
   * @param {number} maxVoteOverwrite
   * @returns {Promise<IElectionCalculatePriceResponse>}
   */
  public static price(
    url: string,
    maxCensusSize: number,
    electionBlocks: number,
    encryptedVotes: boolean,
    anonymousVotes: boolean,
    maxVoteOverwrite: number
  ): Promise<IElectionCalculatePriceResponse> {
    return axios
      .post<IElectionCalculatePriceResponse>(url + ElectionAPIMethods.PRICE, {
        maxCensusSize,
        electionBlocks,
        encryptedVotes,
        anonymousVotes,
        maxVoteOverwrite,
      })
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

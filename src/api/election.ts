import axios from 'axios';
import { AllElectionStatus, ElectionMetadata, ElectionStatus } from '../types';
import { API, PaginationResponse } from './api';
import { FetchElectionsParametersWithPagination } from '../services';

enum ElectionAPIMethods {
  INFO = '/elections',
  LIST = '/elections',
  NEXT_ELECTION_ID = '/elections/id',
  PRICE = '/elections/price',
  KEYS = '/elections/{id}/keys',
  METADATA_HISTORY = '/elections/{id}/metadata/history',
  CREATE = '/elections',
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

export interface IElectionNextIdResponse {
  /**
   * The next election identifier
   */
  electionID: string;
}

export enum CensusTypeEnum {
  CENSUS_UNKNOWN = 'CENSUS_UNKNOWN',
  OFF_CHAIN_TREE = 'OFF_CHAIN_TREE',
  OFF_CHAIN_TREE_WEIGHTED = 'OFF_CHAIN_TREE_WEIGHTED',
  OFF_CHAIN_CA = 'OFF_CHAIN_CA',
  OFF_CHAIN_CA_V2 = 'OFF_CHAIN_CA_V2',
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
   * The chain identifier of the election
   */
  chainId: string;

  /**
   * The census of the election. Omitted for metadata-only elections.
   */
  census?: ICensus;

  /**
   * The URL of the metadata
   */
  metadataURL: string;

  /**
   * The hex-encoded hash of the current election metadata. Omitted when the election has no metadata hash.
   */
  metadataHash?: string;

  /**
   * The id of the metadata-only election this election links to as its parent. Omitted when it has none.
   */
  parentElectionId?: string;

  /**
   * Set for a metadata-only election, which only commits metadata shared by the elections linking to it as
   * their parent, and takes no votes. Omitted otherwise.
   */
  metadataOnly?: boolean;

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
   * The metadata of the election (can be encrypted)
   */
  metadata: ElectionMetadata | string;
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

export interface IElectionMetadataVersion {
  /**
   * The URL of the metadata of this version
   */
  metadataURL: string;

  /**
   * The hex-encoded hash of the metadata of this version. Omitted when the version has no metadata hash.
   */
  metadataHash?: string;

  /**
   * The block height at which this version was set
   */
  blockHeight: number;

  /**
   * The index of the transaction that set this version within its block
   */
  txIndex: number;

  /**
   * The hash of the transaction that set this version
   */
  txHash: string;

  /**
   * The timestamp of the block at which this version was set
   */
  timestamp: string;
}

export interface IElectionMetadataHistoryResponse {
  /**
   * The metadata versions the election has had, oldest first
   */
  versions: Array<IElectionMetadataVersion>;
}

interface IElectionCalculatePriceResponse {
  /**
   * The price of the election
   */
  price: number;
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

  /**
   * If the election has been ended manually
   */
  manuallyEnded: boolean;

  /**
   * The chain identifier
   */
  chainId: string;

  /**
   * The id of the metadata-only election this election links to as its parent. Omitted when it has none.
   */
  parentElectionId?: string;

  /**
   * Set for a metadata-only election, which only commits metadata shared by the elections linking to it as
   * their parent, and takes no votes. Omitted otherwise.
   */
  metadataOnly?: boolean;
}

export interface IElectionListResponse extends IElectionList, PaginationResponse {}

export interface IElectionList {
  /**
   * List of election summaries
   */
  elections: Array<IElectionSummary>;
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
   * @param url - API endpoint URL
   * @param electionId - The identifier of the election
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
   * @param url - API endpoint URL
   * @param electionId - The identifier of the election
   */
  public static keys(url: string, electionId: string): Promise<IElectionKeysResponse> {
    return axios
      .get<IElectionKeysResponse>(url + ElectionAPIMethods.KEYS.replace('{id}', electionId))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Fetches the metadata version history of the specified election.
   *
   * @param url - API endpoint URL
   * @param electionId - The identifier of the election
   */
  public static metadataHistory(url: string, electionId: string): Promise<IElectionMetadataHistoryResponse> {
    return axios
      .get<IElectionMetadataHistoryResponse>(url + ElectionAPIMethods.METADATA_HISTORY.replace('{id}', electionId))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Creates a new election.
   *
   * @param url - API endpoint URL
   * @param payload - The set information info raw payload to be submitted to the chain
   * @param metadata - The base64 encoded metadata JSON object
   */
  public static create(url: string, payload: string, metadata: string): Promise<IElectionCreateResponse> {
    return axios
      .post<IElectionCreateResponse>(url + ElectionAPIMethods.CREATE, { txPayload: payload, metadata })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Returns the next election id.
   *
   * @param url - API endpoint URL
   * @param organizationId - The identifier of the organization
   * @param censusOrigin - The census origin
   * @param delta - The stride to next election id, being 0 the next one
   * @param envelopeType - The envelope type
   */
  public static nextElectionId(
    url: string,
    organizationId: string,
    censusOrigin: number,
    delta: number = 0,
    envelopeType?: Partial<IVoteMode>
  ): Promise<IElectionNextIdResponse> {
    return axios
      .post<IElectionNextIdResponse>(url + ElectionAPIMethods.NEXT_ELECTION_ID, {
        organizationId,
        censusOrigin,
        envelopeType,
        delta,
      })
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Return list of all elections in the chain
   *
   * @param url - API endpoint URL
   * @param params - The parameters to filter the elections
   */
  public static list(
    url: string,
    params?: Partial<FetchElectionsParametersWithPagination>
  ): Promise<IElectionListResponse> {
    const queryParams = this.createQueryParams(params);
    return axios
      .get<IElectionListResponse>(url + ElectionAPIMethods.LIST + (queryParams ? '?' + queryParams : ''))
      .then((response) => response.data)
      .catch(this.isApiError);
  }

  /**
   * Calculates the election price.
   *
   * @param url - API endpoint URL
   * @param maxCensusSize -
   * @param electionDuration -
   * @param encryptedVotes -
   * @param anonymousVotes -
   * @param maxVoteOverwrite -
   */
  public static price(
    url: string,
    maxCensusSize: number,
    electionDuration: number,
    encryptedVotes: boolean,
    anonymousVotes: boolean,
    maxVoteOverwrite: number
  ): Promise<IElectionCalculatePriceResponse> {
    return axios
      .post<IElectionCalculatePriceResponse>(url + ElectionAPIMethods.PRICE, {
        maxCensusSize,
        electionDuration,
        encryptedVotes,
        anonymousVotes,
        maxVoteOverwrite,
      })
      .then((response) => response.data)
      .catch(this.isApiError);
  }
}

import axios from 'axios';
import { ElectionMetadata } from '../types';

enum ElectionAPIMethods {
  INFO = '/elections',
  KEYS = '/elections/{id}/keys',
  CREATE = '/elections',
  VOTES = '/elections/{id}/votes/page/{page}',
  VOTES_COUNT = '/elections/{id}/votes/count',
}

export interface IResults {
  value: string[];
}

export interface ICensus {
  censusOrigin: string;
  censusRoot: string;
  postRegisterCensusRoot: string;
  censusURL: string;
}

export interface IVoteMode {
  serial: boolean;
  anonymous: boolean;
  encryptedVotes: boolean;
  uniqueValues: boolean;
  costFromWeight: boolean;
}

export interface IElectionMode {
  autoStart: boolean;
  interruptible: boolean;
  dynamicCensus: boolean;
  encryptedMetaData: boolean;
  preRegister: boolean;
}

export interface ITallyMode {
  maxCount: number;
  maxValue: number;
  maxVoteOverwrites: number;
  maxTotalCost: number;
  costExponent: number;
}

export interface IElection {
  electionId: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  voteCount: number;
  finalResults: boolean;
  result: IResults[];
  electionCount: number;
  census: ICensus;
  metadataURL: string;
  creationTime: string;
  voteMode: IVoteMode;
  electionMode: IElectionMode;
  tallyMode: ITallyMode;
}

interface IElectionCreateResponse {
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

interface IElectionInfoResponse {
  /**
   * The id of the election
   */
  electionId: string;

  /**
   * The status of the election
   */
  status: string; // @TODO

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
   * The number of elections done by the account
   */
  electionCount: number;

  /**
   * The census of the election
   */
  census: {
    /**
     * The type of the census
     */
    censusOrigin: string;

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
  };

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
  voteMode: {
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
  };

  /**
   * The election mode of the election
   */
  electionMode: {
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
    uniqueValues: boolean;
  };

  /**
   * The tally mode of the vote
   */
  tallyMode: {
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
  };

  /**
   * The metadata of the election
   */
  metadata: ElectionMetadata;
}

interface IEncryptionPublicKey {
  /**
   * The index of the encryption key
   */
  index: number;

  /**
   * The encryption key
   */
  key: string;
}

interface IElectionKeysResponse {
  /**
   * The hash of the transaction
   */
  publicKeys: IEncryptionPublicKey[];
}

interface IElectionVotesCountResponse {
  /**
   * The number of votes
   */
  count: number;
}

interface IElectionVotesListResponse {
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

export abstract class ElectionAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

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
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }

  /**
   * Fetches the encryption keys from the specified process.
   *
   * @param {string} url API endpoint URL
   * @param {string} electionId The identifier of the election
   * @returns {Promise<Array<IEncryptionPublicKey>>}
   */
  public static keys(url: string, electionId: string): Promise<Array<IEncryptionPublicKey>> {
    return axios
      .get<IElectionKeysResponse>(url + ElectionAPIMethods.KEYS.replace('{id}', electionId))
      .then((response) => response.data.publicKeys)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
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
      .post<IElectionCreateResponse>(url + ElectionAPIMethods.CREATE, JSON.stringify({ txPayload: payload, metadata }))
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }

  /**
   * Returns the number of votes of an election
   *
   * @param {string} url API endpoint URL
   * @param {string} electionId The identifier of the election
   * @returns {Promise<IElectionVotesCountResponse>}
   */
  public static electionVotesCount(url: string, electionId: string): Promise<IElectionVotesCountResponse> {
    return axios
      .get<IElectionVotesCountResponse>(url + ElectionAPIMethods.VOTES_COUNT.replace('{id}', electionId))
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }

  /**
   * Returns the list of votes for a process
   *
   * @param {string} url API endpoint URL
   * @param {string} electionId The identifier of the election
   * @param {number} page The page number
   * @returns {Promise<IElectionVotesListResponse>}
   */
  public static electionVotesList(
    url: string,
    electionId: string,
    page: number = 0
  ): Promise<IElectionVotesListResponse> {
    return axios
      .get<IElectionVotesListResponse>(
        url + ElectionAPIMethods.VOTES.replace('{id}', electionId).replace('{page}', String(page))
      )
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}

import axios from 'axios';

enum ElectionAPIMethods {
  INFO = '/elections',
  CREATE = '/elections',
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

export interface IElectionInfoRequest {
  /**
   * The identifier of the election
   */
  electionId: string;
}

export interface IElectionInfoResponse {}

interface IElectionCreateRequest {
  /**
   * The create process raw payload to be submitted to the chain
   */
  txPayload: string;

  /**
   * The base64 encoded metadata JSON object
   */
  metadata: string;
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

export abstract class ElectionAPI {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  /**
   * Fetches info about the specified process.
   *
   * @param {string} url API endpoint URL
   * @returns {Promise<IElectionInfoRequest>}
   */
  public static info(url: string, request: IElectionInfoRequest): Promise<IElection> {
    return axios
      .get<IElection>(url + ElectionAPIMethods.INFO + '/' + request.electionId)
      .then((response) => response.data)
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
   * @returns {Promise<IElectionCreateRequest>}
   */
  public static create(url: string, data: IElectionCreateRequest): Promise<IElectionCreateResponse> {
    return axios
      .post<IElectionCreateResponse>(url + ElectionAPIMethods.CREATE, JSON.stringify(data))
      .then((response) => response.data)
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          throw new Error('Request error: ' + error.message);
        }
        throw error;
      });
  }
}

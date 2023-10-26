import { Service, ServiceProperties } from './service';
import { Census, InvalidElection, PublishedCensus, PublishedElection, UnpublishedElection } from '../types';
import { AccountAPI, ElectionAPI, IElectionCreateResponse, IElectionKeysResponse } from '../api';
import { CensusService } from './census';
import { allSettled } from '../util/promise';
import invariant from 'tiny-invariant';
import { ElectionCore } from '../core/election';
import { ChainService } from './chain';
import { Wallet } from '@ethersproject/wallet';
import { Signer } from '@ethersproject/abstract-signer';

interface ElectionServiceProperties {
  censusService: CensusService;
  chainService: ChainService;
}

type ElectionServiceParameters = ServiceProperties & ElectionServiceProperties;

export interface FetchElectionsParameters {
  account: string;
  page: number;
}

export type ElectionKeys = IElectionKeysResponse;
export type ElectionCreatedInformation = IElectionCreateResponse;

export enum ElectionCreationSteps {
  GET_CHAIN_DATA = 'get-chain-data',
  CENSUS_CREATED = 'census-created',
  GET_ACCOUNT_DATA = 'get-account-data',
  GET_DATA_PIN = 'get-data-pin',
  GENERATE_TX = 'generate-tx',
  SIGN_TX = 'sign-tx',
  CREATING = 'creating',
  DONE = 'done',
}

export type ElectionCreationStepValue =
  | { key: ElectionCreationSteps.GET_CHAIN_DATA }
  | { key: ElectionCreationSteps.CENSUS_CREATED }
  | { key: ElectionCreationSteps.GET_ACCOUNT_DATA }
  | { key: ElectionCreationSteps.GET_DATA_PIN }
  | { key: ElectionCreationSteps.GENERATE_TX }
  | { key: ElectionCreationSteps.SIGN_TX }
  | { key: ElectionCreationSteps.CREATING; txHash: string }
  | { key: ElectionCreationSteps.DONE; electionId: string };

export class ElectionService extends Service implements ElectionServiceProperties {
  public censusService: CensusService;
  public chainService: ChainService;

  /**
   * Instantiate the election service.
   *
   * @param {Partial<ElectionServiceParameters>} params The service parameters
   */
  constructor(params: Partial<ElectionServiceParameters>) {
    super();
    Object.assign(this, params);
  }

  public async signTransaction(tx: Uint8Array, message: string, walletOrSigner: Wallet | Signer): Promise<string> {
    invariant(this.chainService, 'No chain service set');
    return this.chainService.fetchChainData().then((chainData) => {
      const payload = message
        .replace('{hash}', ElectionCore.hashTransaction(tx))
        .replace('{chainId}', chainData.chainId);
      return ElectionCore.signTransaction(tx, payload, walletOrSigner);
    });
  }

  /**
   * Fetches info about an election.
   *
   * @param {string} electionId The id of the election
   * @returns {Promise<UnpublishedElection>}
   */
  async fetchElection(electionId: string): Promise<PublishedElection> {
    invariant(this.url, 'No URL set');
    invariant(this.censusService, 'No census service set');

    const electionInfo = await ElectionAPI.info(this.url, electionId);

    return this.censusService
      .get(electionInfo.census.censusRoot)
      .then((censusInfo) =>
        PublishedElection.build({
          id: electionInfo.electionId,
          organizationId: electionInfo.organizationId,
          title: electionInfo.metadata?.title,
          description: electionInfo.metadata?.description,
          header: electionInfo.metadata?.media.header,
          streamUri: electionInfo.metadata?.media.streamUri,
          meta: electionInfo.metadata?.meta,
          startDate: electionInfo.startDate,
          endDate: electionInfo.endDate,
          census: new PublishedCensus(
            electionInfo.census.censusRoot,
            electionInfo.census.censusURL,
            censusInfo.type ??
              Census.censusTypeFromCensusOrigin(electionInfo.census.censusOrigin, electionInfo.voteMode.anonymous),
            censusInfo.size,
            censusInfo.weight
          ),
          maxCensusSize: electionInfo.census.maxCensusSize,
          manuallyEnded: electionInfo.manuallyEnded,
          status: electionInfo.status,
          voteCount: electionInfo.voteCount,
          finalResults: electionInfo.finalResults,
          results: electionInfo.result,
          metadataURL: electionInfo.metadataURL,
          creationTime: electionInfo.creationTime,
          electionType: {
            autoStart: electionInfo.electionMode.autoStart,
            interruptible: electionInfo.electionMode.interruptible,
            dynamicCensus: electionInfo.electionMode.dynamicCensus,
            secretUntilTheEnd: electionInfo.voteMode.encryptedVotes,
            anonymous: electionInfo.voteMode.anonymous,
          },
          voteType: {
            uniqueChoices: electionInfo.voteMode.uniqueValues,
            maxVoteOverwrites: electionInfo.tallyMode.maxVoteOverwrites,
            costFromWeight: electionInfo.voteMode.costFromWeight,
            costExponent: electionInfo.tallyMode.costExponent,
            maxCount: electionInfo.tallyMode.maxCount,
            maxValue: electionInfo.tallyMode.maxValue,
            maxTotalCost: electionInfo.tallyMode.maxTotalCost,
          },
          questions: electionInfo.metadata?.questions.map((question, qIndex) => ({
            title: question.title,
            description: question.description,
            choices: question.choices.map((choice, cIndex) => ({
              title: choice.title,
              value: choice.value,
              results: electionInfo.result ? electionInfo.result[qIndex][cIndex] : null,
            })),
          })),
          raw: electionInfo,
        })
      )
      .catch((err) => {
        err.electionId = electionInfo.electionId;
        throw err;
      });
  }

  async fetchElections(params: Partial<FetchElectionsParameters>): Promise<Array<PublishedElection | InvalidElection>> {
    invariant(this.url, 'No URL set');
    const settings = {
      account: null,
      page: 0,
      ...params,
    };

    let electionList;
    if (settings.account) {
      electionList = AccountAPI.electionsList(this.url, settings.account, settings.page);
    } else {
      electionList = ElectionAPI.electionsList(this.url, settings.page);
    }

    return electionList
      .then((elections) =>
        allSettled(elections?.elections?.map((election) => this.fetchElection(election.electionId)) ?? [])
      )
      .then((elections) =>
        elections.map((election) =>
          election.status === 'fulfilled' ? election.value : new InvalidElection({ id: election?.reason?.electionId })
        )
      );
  }

  /**
   * Creates a new election.
   *
   * @param {string} payload The set information info raw payload to be submitted to the chain
   * @param {string} metadata The base64 encoded metadata JSON object
   * @returns {Promise<ElectionCreatedInformation>} The created election information
   */
  create(payload: string, metadata: string): Promise<ElectionCreatedInformation> {
    invariant(this.url, 'No URL set');
    return ElectionAPI.create(this.url, payload, metadata);
  }

  /**
   * Fetches the encryption keys from the specified process.
   *
   * @param {string} electionId The identifier of the election
   * @returns {Promise<ElectionKeys>}
   */
  keys(electionId: string): Promise<ElectionKeys> {
    invariant(this.url, 'No URL set');
    return ElectionAPI.keys(this.url, electionId);
  }

  /**
   * Estimates the election cost
   *
   * @returns {Promise<number>} The cost in tokens.
   */
  estimateElectionCost(election: UnpublishedElection): Promise<number> {
    invariant(this.chainService, 'No chain service set');
    return Promise.all([this.chainService.fetchChainCosts(), this.chainService.fetchChainData()])
      .then(([chainCosts, chainData]) => ElectionCore.estimateElectionCost(election, chainCosts, chainData))
      .then((cost) => Math.trunc(cost));
  }

  /**
   * Calculate the election cost
   *
   * @returns {Promise<number>} The cost in tokens.
   */
  calculateElectionCost(election: UnpublishedElection): Promise<number> {
    invariant(this.chainService, 'No chain service set');
    invariant(this.url, 'No URL set');
    return this.chainService
      .fetchChainData()
      .then((chainData) =>
        ElectionAPI.price(
          this.url,
          election.maxCensusSize,
          ElectionCore.estimateElectionBlocks(election, chainData),
          election.electionType.secretUntilTheEnd,
          election.electionType.anonymous,
          election.voteType.maxVoteOverwrites
        )
      )
      .then((cost) => cost.price);
  }
}

import { Service, ServiceProperties } from './service';
import { Census, InvalidElection, PublishedCensus, PublishedElection } from '../types';
import { AccountAPI, ElectionAPI } from '../api';
import { CensusService } from './census';
import { allSettled } from '../util/promise';
import invariant from 'tiny-invariant';

interface ElectionServiceProperties {
  censusService: CensusService;
}

type ElectionServiceParameters = ServiceProperties & ElectionServiceProperties;

export interface FetchElectionsParameters {
  account: string;
  page: number;
}

export class ElectionService extends Service implements ElectionServiceProperties {
  public censusService: CensusService;

  /**
   * Instantiate the CSP service.
   *
   * @param {Partial<ElectionServiceParameters>} params The service parameters
   */
  constructor(params: Partial<ElectionServiceParameters>) {
    super();
    Object.assign(this, params);
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
      .fetchCensusInfo(electionInfo.census.censusRoot)
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
}

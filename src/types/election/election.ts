import { IQuestion } from '../metadata/election';
import { PublishedCensus } from '../census/published';
import { PlainCensus } from '../census/plain';
import { WeightedCensus } from '../census/weighted';
import { MultiLanguage } from '../../util/lang';
import { UnpublishedElection } from './unpublished';

export interface IVoteType {
  uniqueChoices?: boolean;
  maxVoteOverwrites?: number;
  costFromWeight?: boolean;
  costExponent?: number;
}

export interface IElectionType {
  autoStart?: boolean;
  interruptible?: boolean;
  dynamicCensus?: boolean;
  secretUntilTheEnd?: boolean;
  anonymous?: boolean;
}

export interface IElectionParameters {
  title: string | MultiLanguage<string>;
  description: string | MultiLanguage<string>;
  header?: string;
  streamUri?: string;
  startDate?: string | number | Date;
  endDate: string | number | Date;
  census: PublishedCensus | PlainCensus | WeightedCensus;
  voteType?: IVoteType;
  electionType?: IElectionType;
  questions?: IQuestion[];
  maxCensusSize?: number;
}

/**
 * Represents an election
 */
export abstract class Election {
  protected _title: MultiLanguage<string>;
  protected _description: MultiLanguage<string>;
  protected _header: string;
  protected _streamUri: string;
  protected _startDate: Date;
  protected _endDate: Date;
  protected _electionType: IElectionType;
  protected _voteType: IVoteType;
  protected _questions: IQuestion[];
  protected _census: PublishedCensus | PlainCensus | WeightedCensus;
  protected _maxCensusSize: number;

  /**
   * Constructs an election
   *
   * @param params Election parameters
   */
  protected constructor(params?: IElectionParameters) {
    if (params) {
      this._title = typeof params.title === 'string' ? { default: params.title } : params.title;
      this._description = typeof params.description === 'string' ? { default: params.description } : params.description;
      this._header = params.header;
      this._streamUri = params.streamUri;
      this._startDate = params.startDate ? new Date(params.startDate) : null;
      this._endDate = new Date(params.endDate);
      this._electionType = params.electionType;
      this._voteType = params.voteType;
      this._questions = params.questions ?? [];
      this._census = params.census;
      this._maxCensusSize = params.maxCensusSize;
    }
  }

  /**
   * Returns an unpublished election object
   *
   * @param params Unpublished Election parameters
   */
  public static from(params: IElectionParameters) {
    return new UnpublishedElection(params);
  }

  get title(): MultiLanguage<string> {
    return this._title;
  }

  get description(): MultiLanguage<string> {
    return this._description;
  }

  get header(): string {
    return this._header;
  }

  get streamUri(): string {
    return this._streamUri;
  }

  get startDate(): Date {
    return this._startDate;
  }

  get endDate(): Date {
    return this._endDate;
  }

  get electionType(): IElectionType {
    return this._electionType;
  }

  get voteType(): IVoteType {
    return this._voteType;
  }

  get questions(): IQuestion[] {
    return this._questions;
  }

  get census(): PublishedCensus | PlainCensus | WeightedCensus {
    return this._census;
  }

  get maxCensusSize(): number {
    return this._maxCensusSize;
  }
}

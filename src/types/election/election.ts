import { IQuestion } from '../metadata';
import { Census } from '../census';
import { MultiLanguage } from '../../util/lang';
import { UnpublishedElection } from './unpublished';

export interface IVoteType {
  /**
   * Voter can only select one answer for question
   */
  uniqueChoices?: boolean;
  /**
   * The number of times a voter con overwrite its vote (change vote option).
   */
  maxVoteOverwrites?: number;
  /**
   * For weighted census, the user's balance will be used as the `maxCost`. This allows splitting the voting power among
   * several choices, even including quadratic voting scenarios.
   */
  costFromWeight?: boolean;
  /* Defines the exponent that will be used to compute the "cost" of the options voted and compare it against `maxTotalCost`.
   * totalCost = Σ (value[i] ** costExponent) <= maxTotalCost
   *
   * Exponent range:
   * - 0 => 0.0000
   * - 10000 => 1.0000
   * - 65535 => 6.5535
   */
  costExponent?: number;
}

export interface IElectionType {
  /**
   * If false, election will start PAUSED and will have to be resumed manually.
   */
  autoStart?: boolean;
  /**
   * The process can be paused and resumed.
   */
  interruptible?: boolean;
  /**
   * Can add more voters to the census tree during the election.
   */
  dynamicCensus?: boolean;
  /**
   * Protect the results until the end of the process if true. It will show live results otherwise.
   */
  secretUntilTheEnd?: boolean;
  /**
   * Enable anonymous voting.
   */
  anonymous?: boolean;
}

/**
 * Define election parameters.
 */
export interface IElectionParameters {
  /**
   * Election title
   */
  title: string | MultiLanguage<string>;
  /**
   * Election description
   */
  description?: string | MultiLanguage<string>;
  /**
   * Election header image url.
   */
  header?: string;
  /**
   * Election stream Uri (ex: a video url)
   */
  streamUri?: string;
  /**
   * Metadata (anything added by the election creator)
   */
  meta?: object;
  startDate?: string | number | Date;
  endDate: string | number | Date;
  census: Census;
  voteType?: IVoteType;
  electionType?: IElectionType;
  questions?: IQuestion[];

  /**
   * Is used to limit the number of votes that can be registered for an election. This feature helps to prevent any
   * potential overflow of the blockchain when the number of votes goes beyond the maximum limit.
   *
   * In order to create an election, the creator is required to set the MaxCensusSize parameter to a proper value.
   * Typically, this value should be equal to the size of the census. If the MaxCensusSize parameter is set to 0, an
   * error will occur and the election cannot be created.
   *
   * If the number of votes exceeds this limit, will throw `Max census size for the election is greater than allowed
   * size` error.
   */
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
  protected _meta: object;
  protected _startDate: Date;
  protected _endDate: Date;
  protected _electionType: IElectionType;
  protected _voteType: IVoteType;
  protected _questions: IQuestion[];
  protected _census: Census;
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
      this._meta = params.meta;
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

  get meta(): object {
    return this._meta;
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

  get census(): Census {
    return this._census;
  }

  get maxCensusSize(): number {
    return this._maxCensusSize;
  }
}

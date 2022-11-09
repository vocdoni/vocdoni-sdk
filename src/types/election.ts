import invariant from 'tiny-invariant';
import { IChoice, IQuestion } from './metadata/election';
import { PublishedCensus } from './census/published';
import { PlainCensus } from './census/plain';
import { WeightedCensus } from './census/weighted';
import { MultiLanguage } from '../util/lang';

export interface IVoteType {
  uniqueChoices: boolean;
  maxVoteOverwrites: number;
  costFromWeight: boolean;
  costExponent: number;
}

export interface IElectionType {
  autoStart?: boolean;
  interruptible?: boolean;
  dynamicCensus?: boolean;
  secretUntilTheEnd?: boolean;
  anonymous?: boolean;
}

export interface IElection {
  title: string | MultiLanguage<string>;
  description: string | MultiLanguage<string>;
  header: string;
  streamUri: string;
  startDate?: string | number | Date;
  endDate: string | number | Date;
  census: PublishedCensus | PlainCensus | WeightedCensus;
  voteType?: IVoteType;
  electionType?: IElectionType;
  questions?: IQuestion[];
}

/**
 * Represents an election
 */
export class Election {
  private _title: MultiLanguage<string>;
  private _description: MultiLanguage<string>;
  private _header: string;
  private _streamUri: string;
  private _startDate: Date;
  private _endDate: Date;
  private _census: PublishedCensus | PlainCensus | WeightedCensus;
  private _electionType: IElectionType;
  private _voteType: IVoteType;
  private _questions: IQuestion[];

  /**
   * Constructs an election
   *
   * @param params Election parameters
   */
  public constructor(params: IElection) {
    this.title = typeof params.title === 'string' ? { default: params.title } : params.title;
    this.description = typeof params.description === 'string' ? { default: params.description } : params.description;
    this.header = params.header;
    this.streamUri = params.streamUri;
    this.startDate = params.startDate ? new Date(params.startDate) : null;
    this.endDate = new Date(params.endDate);
    this.census = params.census;
    this.electionType = Election.fullElectionType(params.electionType);
    this.voteType = Election.fullVoteType(params.voteType);
    this.questions = params.questions ?? [];
  }

  public addQuestion(
    title: string | MultiLanguage<string>,
    description: string | MultiLanguage<string>,
    choices: Array<{ title: string; value: number } | { title: MultiLanguage<string>; value: number }>
  ): Election {
    this._questions.push({
      title: typeof title === 'string' ? { default: title } : title,
      description: typeof description === 'string' ? { default: description } : description,
      choices: choices.map((choice) => {
        return {
          title: typeof choice.title === 'string' ? { default: choice.title } : choice.title,
          value: choice.value,
        } as IChoice;
      }),
    });

    return this;
  }

  public removeQuestion(questionNumber: number): Election {
    invariant(this._questions[questionNumber - 1], 'Question cannot be removed');
    this._questions.splice(questionNumber - 1, 1);
    return this;
  }

  private static fullElectionType(value: IElectionType): IElectionType {
    return {
      autoStart: typeof value?.autoStart === 'boolean' ? value.autoStart === true : true,
      interruptible: typeof value?.interruptible === 'boolean' ? value.interruptible === true : true,
      dynamicCensus: typeof value?.dynamicCensus === 'boolean' ? value.dynamicCensus === true : false,
      secretUntilTheEnd: typeof value?.secretUntilTheEnd === 'boolean' ? value.secretUntilTheEnd === true : false,
      anonymous: typeof value?.anonymous === 'boolean' ? value.anonymous === true : false,
    };
  }

  private static fullVoteType(value: IVoteType): IVoteType {
    return {
      uniqueChoices: typeof value?.uniqueChoices === 'boolean' ? value.uniqueChoices === true : false,
      maxVoteOverwrites: typeof value?.maxVoteOverwrites === 'number' ? value.maxVoteOverwrites : 1,
      costFromWeight: typeof value?.costFromWeight === 'boolean' ? value.costFromWeight === true : false,
      costExponent: typeof value?.costExponent === 'number' ? value.costExponent : 10000,
    };
  }

  get title(): MultiLanguage<string> {
    return this._title;
  }

  set title(value: MultiLanguage<string>) {
    invariant(value?.default.length > 0, 'Title is not set');
    this._title = value;
  }

  get description(): MultiLanguage<string> {
    return this._description;
  }

  set description(value: MultiLanguage<string>) {
    invariant(value?.default.length > 0, 'Description is not set');
    this._description = value;
  }

  get header(): string {
    return this._header;
  }

  set header(value: string) {
    this._header = value;
  }

  get streamUri(): string {
    return this._streamUri;
  }

  set streamUri(value: string) {
    this._streamUri = value;
  }

  get startDate(): Date {
    return this._startDate;
  }

  set startDate(value: Date) {
    invariant(!value || !isNaN(value.getTime()), 'Invalid start date');
    this._startDate = value;
  }

  get endDate(): Date {
    return this._endDate;
  }

  set endDate(value: Date) {
    invariant(!isNaN(value.getTime()), 'Invalid end date');
    invariant(value > this.startDate, 'The end date cannot be prior to the start date');
    this._endDate = value;
  }

  get electionType(): IElectionType {
    return this._electionType;
  }

  set electionType(value: IElectionType) {
    this._electionType = Election.fullElectionType(value);
  }

  get voteType(): IVoteType {
    return this._voteType;
  }

  set voteType(value: IVoteType) {
    this._voteType = Election.fullVoteType(value);
  }

  get questions(): IQuestion[] {
    return this._questions;
  }

  set questions(value: IQuestion[]) {
    this._questions = value;
  }

  get census(): PublishedCensus | PlainCensus | WeightedCensus {
    return this._census;
  }

  set census(value: PublishedCensus | PlainCensus | WeightedCensus) {
    invariant(
      value instanceof PlainCensus || value instanceof PublishedCensus || value instanceof WeightedCensus,
      'Invalid census'
    );
    this._census = value;
  }
}

import { MultiLanguage } from '../../util/lang';
import {
  checkValidElectionMetadata,
  ElectionMetadata,
  ElectionMetadataTemplate,
  IChoice,
  IQuestion,
} from '../metadata';
import invariant from 'tiny-invariant';
import { CspCensus, PlainCensus, PublishedCensus, WeightedCensus } from '../census';
import { Election, IElectionParameters, IElectionType, IVoteType } from './election';

/**
 * Represents an unpublished election
 */
export class UnpublishedElection extends Election {
  /**
   * Constructs an unpublished election
   *
   * @param params Election parameters
   */
  public constructor(params: IElectionParameters) {
    super();
    this.title = typeof params.title === 'string' ? { default: params.title } : params.title;
    this.description = typeof params.description === 'string' ? { default: params.description } : params.description;
    this.header = params.header;
    this.streamUri = params.streamUri;
    this.meta = params.meta;
    this.startDate = params.startDate ? new Date(params.startDate) : null;
    this.endDate = new Date(params.endDate);
    this.census = params.census;
    this.electionType = UnpublishedElection.fullElectionType(params.electionType);
    this.voteType = UnpublishedElection.fullVoteType(params.voteType);
    this.questions = params.questions ?? [];
    this.maxCensusSize = params.maxCensusSize;
  }

  public addQuestion(
    title: string | MultiLanguage<string>,
    description: string | MultiLanguage<string>,
    choices: Array<{ title: string; value: number } | { title: MultiLanguage<string>; value: number }>
  ): UnpublishedElection {
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

  public removeQuestion(questionNumber: number): UnpublishedElection {
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
      maxVoteOverwrites: typeof value?.maxVoteOverwrites === 'number' ? value.maxVoteOverwrites : 0,
      costFromWeight: typeof value?.costFromWeight === 'boolean' ? value.costFromWeight === true : false,
      costExponent: typeof value?.costExponent === 'number' ? value.costExponent : 10000,
    };
  }

  public generateMetadata(): ElectionMetadata {
    const metadata = ElectionMetadataTemplate;

    metadata.title = this.title;
    metadata.description = this.description;
    metadata.media = {
      header: this.header,
      streamUri: this.streamUri,
    };
    metadata.meta = this.meta;
    metadata.questions = this.questions.map((question) => {
      return {
        title: question.title,
        description: question.description,
        choices: question.choices.map((choice) => {
          return {
            title: choice.title,
            value: choice.value,
          };
        }),
      };
    });

    checkValidElectionMetadata(metadata);

    return metadata;
  }

  get title(): MultiLanguage<string> {
    return super.title;
  }

  set title(value: MultiLanguage<string>) {
    invariant(value?.default.length > 0, 'Title is not set');
    this._title = value;
  }

  get description(): MultiLanguage<string> {
    return super.description;
  }

  set description(value: MultiLanguage<string>) {
    this._description = value;
  }

  get header(): string {
    return super.header;
  }

  set header(value: string) {
    this._header = value;
  }

  get streamUri(): string {
    return super.streamUri;
  }

  set streamUri(value: string) {
    this._streamUri = value;
  }

  get meta(): object {
    return super.meta;
  }

  set meta(value: object) {
    this._meta = value;
  }

  get startDate(): Date {
    return super.startDate;
  }

  set startDate(value: Date) {
    invariant(!value || !isNaN(value.getTime()), 'Invalid start date');
    this._startDate = value;
  }

  get endDate(): Date {
    return super.endDate;
  }

  set endDate(value: Date) {
    invariant(!isNaN(value.getTime()), 'Invalid end date');
    invariant(value.getTime() > (this._startDate?.getTime() ?? 0), 'The end date cannot be prior to the start date');
    this._endDate = value;
  }

  get electionType(): IElectionType {
    return super.electionType;
  }

  set electionType(value: IElectionType) {
    this._electionType = UnpublishedElection.fullElectionType(value);
  }

  get voteType(): IVoteType {
    return super.voteType;
  }

  set voteType(value: IVoteType) {
    this._voteType = UnpublishedElection.fullVoteType(value);
  }

  get questions(): IQuestion[] {
    return super.questions;
  }

  set questions(value: IQuestion[]) {
    this._questions = value;
  }

  get census(): PublishedCensus | PlainCensus | WeightedCensus | CspCensus {
    return super.census;
  }

  set census(value: PublishedCensus | PlainCensus | WeightedCensus | CspCensus) {
    invariant(
      value instanceof PlainCensus ||
        value instanceof PublishedCensus ||
        value instanceof WeightedCensus ||
        value instanceof CspCensus,
      'Invalid census'
    );
    this._census = value;
  }

  get maxCensusSize(): number {
    return super.maxCensusSize;
  }

  set maxCensusSize(value: number) {
    invariant(value == null || value > 0, 'Maximum census size cannot be zero or negative');
    this._maxCensusSize = value;
  }
}

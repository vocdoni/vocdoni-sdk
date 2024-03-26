import { MultiLanguage } from '../../util/lang';
import { AccountMetadataTemplate, checkValidAccountMetadata, IAccountMetadata, Metadata } from '../metadata';

export interface IAccountData {
  languages?: string[];
  name?: string | MultiLanguage<string>;
  description?: string | MultiLanguage<string>;
  feed?: string | MultiLanguage<string>;
  header?: string;
  avatar?: string;
  logo?: string;
  meta?: Metadata;
}

/**
 * Represents an account
 */
export class AccountData {
  private _languages: string[];
  private _name: MultiLanguage<string>;
  private _description: MultiLanguage<string>;
  private _feed: MultiLanguage<string>;
  private _header: string;
  private _avatar: string;
  private _logo: string;
  private _meta: Metadata;

  /**
   * Constructs an account
   *
   * @param params Account parameters
   */
  public constructor(params?: IAccountData) {
    this.languages = params?.languages ?? [];
    this.name = params?.name
      ? typeof params?.name === 'string'
        ? { default: params?.name }
        : params?.name
      : { default: '' };
    this.description = params?.description
      ? typeof params?.description === 'string'
        ? { default: params?.description }
        : params?.description
      : { default: '' };
    this.feed = params?.feed
      ? typeof params?.feed === 'string'
        ? { default: params?.feed }
        : params?.feed
      : { default: '' };
    this.header = params?.header ?? '';
    this.avatar = params?.avatar ?? '';
    this.logo = params?.logo ?? '';
    this.meta = params?.meta ?? {};
  }

  /**
   * Returns an account object
   *
   * @param params Account parameters
   */
  public static build(params: IAccountData) {
    return new AccountData(params);
  }

  public generateMetadata(): IAccountMetadata {
    const metadata = AccountMetadataTemplate;

    metadata.languages = this.languages;
    metadata.name = this.name;
    metadata.description = this.description;
    metadata.newsFeed = this.feed;
    metadata.media = {
      avatar: this.avatar,
      header: this.header,
      logo: this.logo,
    };
    metadata.meta = this.meta ?? {};

    checkValidAccountMetadata(metadata);

    return metadata;
  }

  get name(): MultiLanguage<string> {
    return this._name;
  }

  set name(value: MultiLanguage<string>) {
    this._name = value;
  }

  get description(): MultiLanguage<string> {
    return this._description;
  }

  set description(value: MultiLanguage<string>) {
    this._description = value;
  }

  get header(): string {
    return this._header;
  }

  set header(value: string) {
    this._header = value;
  }

  get avatar(): string {
    return this._avatar;
  }

  set avatar(value: string) {
    this._avatar = value;
  }

  get logo(): string {
    return this._logo;
  }

  set logo(value: string) {
    this._logo = value;
  }

  get feed(): MultiLanguage<string> {
    return this._feed;
  }

  set feed(value: MultiLanguage<string>) {
    this._feed = value;
  }

  get meta(): Metadata {
    return this._meta;
  }

  set meta(value: Metadata) {
    this._meta = value;
  }

  get languages(): string[] {
    return this._languages;
  }

  set languages(value: string[]) {
    this._languages = value;
  }
}

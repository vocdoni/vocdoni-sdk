import { AccountData } from './data';

export interface IAccount {
  address: string;
  nonce: number;
  balance: number;
  electionIndex: number;
  infoURL?: string;
  sik?: string;
  data?: AccountData;
}

/**
 * Represents an account
 */
export class Account {
  private readonly _address: string;
  private readonly _nonce: number;
  private readonly _balance: number;
  private readonly _electionIndex: number;
  private readonly _infoURL: string;
  private readonly _sik: string;
  private readonly _data: AccountData;

  /**
   * Constructs an account
   *
   * @param params Account parameters
   */
  public constructor(params: IAccount) {
    this._address = params.address;
    this._nonce = params.nonce;
    this._balance = params.balance;
    this._electionIndex = params.electionIndex;
    this._infoURL = params.infoURL;
    this._sik = params.sik;
    this._data = params.data;
  }

  /**
   * Returns an account
   *
   * @param params Account parameters
   */
  public static build(params: IAccount) {
    return new Account(params);
  }

  get address(): string {
    return this._address;
  }

  get nonce(): number {
    return this._nonce;
  }

  get balance(): number {
    return this._balance;
  }

  get electionIndex(): number {
    return this._electionIndex;
  }

  get infoURL(): string {
    return this._infoURL;
  }

  get sik(): string {
    return this._sik;
  }

  get data(): AccountData {
    return this._data;
  }
}

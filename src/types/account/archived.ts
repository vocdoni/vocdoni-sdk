import { AccountData } from './data';

export interface IArchivedAccount {
  data?: AccountData;
}

/**
 * Represents an account
 */
export class ArchivedAccount {
  private readonly _data: AccountData;

  /**
   * Constructs an account
   *
   * @param params Account parameters
   */
  public constructor(params: IArchivedAccount) {
    this._data = params.data;
  }

  /**
   * Returns an account
   *
   * @param params Account parameters
   */
  public static build(params: IArchivedAccount) {
    return new ArchivedAccount(params);
  }

  get data(): AccountData {
    return this._data;
  }
}

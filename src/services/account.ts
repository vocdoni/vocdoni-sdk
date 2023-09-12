import { Service, ServiceProperties } from './service';
import { ChainService } from './chain';
import { Account } from '../types';
import { AccountAPI } from '../api';
import invariant from 'tiny-invariant';
import { Wallet } from '@ethersproject/wallet';
import { Signer } from '@ethersproject/abstract-signer';
import { AccountCore } from '../core/account';

interface AccountServiceProperties {
  chainService: ChainService;
}

type AccountServiceParameters = ServiceProperties & AccountServiceProperties;

/**
 * @typedef AccountData
 * @property {string} address
 * @property {number} balance
 * @property {number} nonce
 * @property {number} electionIndex
 * @property {string | null} infoURL
 * @property {Account} account
 */
export type AccountData = {
  address: string;
  balance: number;
  nonce: number;
  electionIndex: number;
  infoURL?: string;
  account: Account;
};

export class AccountService extends Service implements AccountServiceProperties {
  public chainService: ChainService;

  /**
   * Instantiate the election service.
   *
   * @param {Partial<AccountServiceParameters>} params The service parameters
   */
  constructor(params: Partial<AccountServiceParameters>) {
    super();
    Object.assign(this, params);
  }

  /**
   * Fetches account information.
   *
   * @param {string} address The account address to fetch the information
   * @returns {Promise<AccountData>}
   */
  async fetchAccountInfo(address: string): Promise<AccountData> {
    invariant(this.url, 'No URL set');
    let accountData;
    accountData = await AccountAPI.info(this.url, address);

    accountData.account = Account.build({
      languages: accountData.metadata?.languages,
      name: accountData.metadata?.name,
      description: accountData.metadata?.description,
      feed: accountData.metadata?.newsFeed,
      header: accountData.metadata?.media?.header,
      avatar: accountData.metadata?.media?.avatar,
      logo: accountData.metadata?.media?.logo,
      meta: Object.entries(accountData.metadata?.meta ?? []).map(([key, value]) => ({ key, value })),
    });

    return accountData;
  }

  /**
   * Updates an account with information
   *
   * @param {string} tx The transaction for setting the account
   * @param {string} metadata The account metadata
   * @returns {Promise<string>} The transaction hash
   */
  setInfo(tx: string, metadata: string): Promise<string> {
    invariant(this.url, 'No URL set');
    return AccountAPI.setInfo(this.url, tx, metadata).then((response) => response.txHash);
  }

  async signTransaction(tx: Uint8Array, walletOrSigner: Wallet | Signer): Promise<string> {
    invariant(this.chainService, 'No chain service set');
    return this.chainService
      .fetchChainData()
      .then((chainData) => AccountCore.signTransaction(tx, chainData.chainId, walletOrSigner));
  }
}

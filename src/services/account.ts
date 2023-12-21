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
  sik?: string;
  account: Account;
};

export type ArchivedAccountData = Pick<AccountData, 'address' | 'account'>;

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
  async fetchAccountInfo(address: string): Promise<AccountData | ArchivedAccountData> {
    invariant(this.url, 'No URL set');
    return AccountAPI.info(this.url, address)
      .then((accountInfo) => ({
        account: Account.build({
          languages: accountInfo.metadata?.languages,
          name: accountInfo.metadata?.name,
          description: accountInfo.metadata?.description,
          feed: accountInfo.metadata?.newsFeed,
          header: accountInfo.metadata?.media?.header,
          avatar: accountInfo.metadata?.media?.avatar,
          logo: accountInfo.metadata?.media?.logo,
          meta: Object.entries(accountInfo.metadata?.meta ?? []).map(([key, value]) => ({ key, value })),
        }),
        ...accountInfo,
      }))
      .catch(() =>
        AccountAPI.metadata(this.url, address).then((metadata) => ({
          address,
          account: Account.build({
            languages: metadata?.languages,
            name: metadata?.name,
            description: metadata?.description,
            feed: metadata?.newsFeed,
            header: metadata?.media?.header,
            avatar: metadata?.media?.avatar,
            logo: metadata?.media?.logo,
            meta: Object.entries(metadata?.meta ?? []).map(([key, value]) => ({ key, value })),
          }),
        }))
      );
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

  async signTransaction(tx: Uint8Array, message: string, walletOrSigner: Wallet | Signer): Promise<string> {
    invariant(this.chainService, 'No chain service set');
    return this.chainService.fetchChainData().then((chainData) => {
      const payload = message
        .replace('{hash}', AccountCore.hashTransaction(tx))
        .replace('{chainId}', chainData.chainId);
      return AccountCore.signTransaction(tx, payload, walletOrSigner);
    });
  }
}

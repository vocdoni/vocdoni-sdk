import Hash from 'ipfs-only-hash';
import { AccountData } from '../client';
import { CollectFaucetTx, SetAccountTx, Tx, TxType } from '../dvote-protobuf/build/ts/vochain/vochain';
import { Account, AccountMetadata, AccountMetadataTemplate, checkValidAccountMetadata } from '../types';
import { TransactionCore } from './transaction';

export abstract class AccountCore extends TransactionCore {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  public static generateSetAccountTransaction(
    address: string,
    account: Account,
    faucetPackage
  ): Promise<{ tx: Uint8Array; metadata: string }> {
    return this.prepareSetAccountData(address, account, faucetPackage).then((txData) => {
      const setAccount = SetAccountTx.fromPartial({
        ...txData.accountData,
      });
      return {
        tx: Tx.encode({
          payload: { $case: 'setAccount', setAccount },
        }).finish(),
        metadata: txData.metadata,
      };
    });
  }

  public static generateCollectFaucetTransaction(accountData: AccountData, faucetPackage): Uint8Array {
    const txData = this.prepareCollectFaucetData(accountData, faucetPackage);
    const collectFaucet = CollectFaucetTx.fromPartial(txData);
    return Tx.encode({
      payload: { $case: 'collectFaucet', collectFaucet },
    }).finish();
  }

  private static async prepareSetAccountData(
    address: string,
    account: Account,
    faucetPackage
  ): Promise<{ metadata: string; accountData: object }> {
    return this.generateMetadata(account).then((metadata) => {
      return {
        metadata: Buffer.from(JSON.stringify(metadata.metadata), 'binary').toString('base64'),
        accountData: {
          txtype: TxType.CREATE_ACCOUNT,
          account: Uint8Array.from(Buffer.from(address)),
          infoURI: 'ipfs://' + metadata.id,
          faucetPackage: faucetPackage
            ? {
                payload: Uint8Array.from(Buffer.from(faucetPackage.payload, 'base64')),
                signature: Uint8Array.from(Buffer.from(faucetPackage.signature, 'hex')),
              }
            : null,
        },
      };
    });
  }

  private static async generateMetadata(account: Account): Promise<{ id: string; metadata: AccountMetadata }> {
    const metadata = AccountMetadataTemplate;

    metadata.languages = account.languages;
    metadata.name = account.name;
    metadata.description = account.description;
    metadata.newsFeed = account.feed;
    metadata.media = {
      avatar: account.avatar,
      header: account.header,
      logo: account.logo,
    };
    metadata.meta = account.meta.reduce((a, v) => ({ ...a, [v.key]: v.value }), {});

    checkValidAccountMetadata(metadata);

    return Hash.of(JSON.stringify(metadata)).then((id) => {
      return { id, metadata };
    });
  }

  private static prepareCollectFaucetData(accountData: AccountData, faucetPackage) {
    return {
      nonce: accountData.nonce,
      faucetPackage: {
        payload: Uint8Array.from(Buffer.from(faucetPackage.payload, 'base64')),
        signature: Uint8Array.from(Buffer.from(faucetPackage.signature, 'hex')),
      },
    };
  }
}

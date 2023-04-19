import { CollectFaucetTx, SetAccountTx, Tx, TxType } from '@vocdoni/proto/vochain';
import { Buffer } from 'buffer';
import { AccountData, FaucetPackage } from '../client';
import { Account, AccountMetadata } from '../types';
import { TransactionCore } from './transaction';
import { strip0x } from '../util/common';

export abstract class AccountCore extends TransactionCore {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  public static generateCreateAccountTransaction(
    address: string,
    account: Account,
    cid: string,
    faucetPackage: FaucetPackage
  ): { tx: Uint8Array; metadata: string } {
    const txData = this.prepareSetAccountData(address, account.generateMetadata(), cid, faucetPackage);
    return this.generateSetAccountTransaction(txData);
  }

  public static generateUpdateAccountTransaction(
    address: string,
    account: Account,
    cid: string
  ): { tx: Uint8Array; metadata: string } {
    const txData = this.prepareSetAccountData(address, account.generateMetadata(), cid, null, false);
    return this.generateSetAccountTransaction(txData);
  }

  private static generateSetAccountTransaction(txData: { metadata: string; accountData: object }): {
    tx: Uint8Array;
    metadata: string;
  } {
    const setAccount = SetAccountTx.fromPartial({
      ...txData.accountData,
    });
    return {
      tx: Tx.encode({
        payload: { $case: 'setAccount', setAccount },
      }).finish(),
      metadata: txData.metadata,
    };
  }

  public static generateCollectFaucetTransaction(accountData: AccountData, faucetPackage: FaucetPackage): Uint8Array {
    const txData = this.prepareCollectFaucetData(accountData, faucetPackage);
    const collectFaucet = CollectFaucetTx.fromPartial(txData);
    return Tx.encode({
      payload: { $case: 'collectFaucet', collectFaucet },
    }).finish();
  }

  private static prepareSetAccountData(
    address: string,
    metadata: AccountMetadata,
    cid: string,
    faucetPackage: FaucetPackage,
    create: boolean = true
  ): { metadata: string; accountData: object } {
    return {
      metadata: Buffer.from(JSON.stringify(metadata), 'utf8').toString('base64'),
      accountData: {
        txtype: create ? TxType.CREATE_ACCOUNT : TxType.SET_ACCOUNT_INFO_URI,
        account: new Uint8Array(Buffer.from(strip0x(address), 'hex')),
        infoURI: cid,
        faucetPackage: faucetPackage ? this.prepareFaucetPackage(faucetPackage) : null,
      },
    };
  }

  private static prepareCollectFaucetData(accountData: AccountData, faucetPackage: FaucetPackage) {
    return {
      nonce: accountData.nonce,
      faucetPackage: this.prepareFaucetPackage(faucetPackage),
    };
  }

  private static prepareFaucetPackage(faucetPackage: FaucetPackage) {
    return {
      payload: Uint8Array.from(Buffer.from(faucetPackage.payload, 'base64')),
      signature: Uint8Array.from(Buffer.from(faucetPackage.signature, 'base64')),
    };
  }
}

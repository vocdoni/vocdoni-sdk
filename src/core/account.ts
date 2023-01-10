import { AccountData, FaucetPackage } from '../client';
import { CollectFaucetTx, SetAccountTx, Tx, TxType } from '../dvote-protobuf/build/ts/vochain/vochain';
import { Account, AccountMetadata } from '../types';
import { TransactionCore } from './transaction';
import { Buffer } from 'buffer';

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
    cid: string,
    faucetPackage: FaucetPackage
  ): { tx: Uint8Array; metadata: string } {
    const txData = this.prepareSetAccountData(address, account.generateMetadata(), cid, faucetPackage);
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
    faucetPackage: FaucetPackage
  ): { metadata: string; accountData: object } {
    return {
      metadata: Buffer.from(JSON.stringify(metadata), 'binary').toString('base64'),
      accountData: {
        txtype: TxType.CREATE_ACCOUNT,
        account: Uint8Array.from(Buffer.from(address)),
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

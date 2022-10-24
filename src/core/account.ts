import { CollectFaucetTx, SetAccountInfoTx, Tx } from '../dvote-protobuf/build/ts/vochain/vochain';
import { TransactionCore } from './transaction';
import { AccountData } from '../client';

export abstract class AccountCore extends TransactionCore {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  public static generateSetAccountTransaction(address: string, faucetPackage): Uint8Array {
    const txData = this.prepareSetAccountData(address, faucetPackage);
    const setAccountInfo = SetAccountInfoTx.fromPartial(txData);
    return Tx.encode({
      payload: { $case: 'setAccountInfo', setAccountInfo },
    }).finish();
  }

  public static generateCollectFaucetTransaction(accountData: AccountData, faucetPackage): Uint8Array {
    const txData = this.prepareCollectFaucetData(accountData, faucetPackage);
    const collectFaucet = CollectFaucetTx.fromPartial(txData);
    return Tx.encode({
      payload: { $case: 'collectFaucet', collectFaucet },
    }).finish();
  }

  private static prepareSetAccountData(address: string, faucetPackage) {
    return {
      account: Uint8Array.from(Buffer.from(address)),
      infoURI: 'ipfs://xyz', // TODO
      faucetPackage: {
        payload: Uint8Array.from(Buffer.from(faucetPackage.payload, 'base64')),
        signature: Uint8Array.from(Buffer.from(faucetPackage.signature, 'hex')),
      },
    };
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

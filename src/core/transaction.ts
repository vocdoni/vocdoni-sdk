import { strip0x } from '../util/common';
import { Signing } from '../util/signing';
import { Wallet } from '@ethersproject/wallet';
import { SignedTx } from '../dvote-protobuf/build/ts/vochain/vochain';
import { Signer } from '@ethersproject/abstract-signer';
import { Buffer } from 'buffer';

export abstract class TransactionCore {
  /**
   * Cannot be constructed.
   */
  protected constructor() {}

  public static async signTransaction(
    tx: Uint8Array,
    chainId: string,
    walletOrSigner: Wallet | Signer
  ): Promise<string> {
    return Signing.signTransaction(tx, chainId, walletOrSigner).then((hexSignature) => {
      const signature = new Uint8Array(Buffer.from(strip0x(hexSignature), 'hex'));
      const signedTx = SignedTx.encode({ tx, signature }).finish();
      return Buffer.from(signedTx).toString('base64');
    });
  }
}

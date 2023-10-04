import { Signer } from '@ethersproject/abstract-signer';
import { Wallet } from '@ethersproject/wallet';
import { SignedTx } from '@vocdoni/proto/vochain';
import { Buffer } from 'buffer';
import { strip0x } from '../util/common';
import { Signing } from '../util/signing';
import { keccak256 } from '@ethersproject/keccak256';

export abstract class TransactionCore {
  /**
   * Cannot be constructed.
   */
  protected constructor() {}

  public static async signTransaction(
    tx: Uint8Array,
    payload: string,
    walletOrSigner: Wallet | Signer
  ): Promise<string> {
    return Signing.signTransaction(payload, walletOrSigner).then((hexSignature) => {
      const signature = new Uint8Array(Buffer.from(strip0x(hexSignature), 'hex'));
      const signedTx = SignedTx.encode({ tx, signature }).finish();
      return Buffer.from(signedTx).toString('base64');
    });
  }

  public static hashTransaction(tx: Uint8Array): string {
    return strip0x(keccak256(tx));
  }
}

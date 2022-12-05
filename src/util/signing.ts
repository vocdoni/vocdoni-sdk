import { Wallet } from '@ethersproject/wallet';
import { strip0x } from './common';
import { keccak256 } from '@ethersproject/keccak256';
import { Signer } from '@ethersproject/abstract-signer';
import { JsonRpcSigner } from '@ethersproject/providers';

export function isWallet(wallet: Wallet | Signer) {
  // @ts-ignore
  return typeof wallet.publicKey !== undefined && typeof wallet.publicKey === 'string' && wallet.publicKey.length > 0;
}

export class Signing {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  /**
   * Prefix and Sign a binary payload using the given Ethers wallet or signer.
   * @param messageBytes
   * @param chainId The ID of the Vocdoni blockchain deployment for which the message is intended to
   * @param walletOrSigner
   */
  static signTransaction(messageBytes: Uint8Array, chainId: string, walletOrSigner: Wallet | Signer): Promise<string> {
    if (!walletOrSigner) throw new Error('Invalid wallet/signer');
    const digestedMessage = this.digestVocdoniTransaction(messageBytes, chainId);

    return this.signRaw(digestedMessage, walletOrSigner);
  }

  static digestVocdoniTransaction(payload: string | Uint8Array, chainId: string): Uint8Array {
    const prefix = 'Vocdoni signed transaction:\n' + chainId + '\n';

    return this.digestVocdoniPayload(payload, prefix);
  }

  static digestVocdoniPayload(payload: string | Uint8Array, prefix: string): Uint8Array {
    const encoder = new TextEncoder();

    const payloadBytes = typeof payload === 'string' ? encoder.encode(payload) : payload;
    const digestedPayload = strip0x(keccak256(payloadBytes));

    return encoder.encode(prefix + digestedPayload);
  }

  /**
   * Sign a binary payload using the given Ethers wallet or signer.
   * @param request
   * @param walletOrSigner
   */
  static signRaw(request: Uint8Array, walletOrSigner: Wallet | Signer): Promise<string> {
    if (!walletOrSigner) throw new Error('Invalid wallet/signer');

    if (walletOrSigner instanceof Wallet) {
      return walletOrSigner.signMessage(request);
    } else if (!(walletOrSigner instanceof JsonRpcSigner)) {
      // Unexpected case, try to sign with eth_sign, even if we would prefer `personal_sign`
      return walletOrSigner.signMessage(request);
    }

    // Some providers will use eth_sign without prepending the Ethereum prefix.
    // This will break signatures in some cases (Wallet Connect, Ledger, Trezor, etc).
    // Using personal_sign instead
    return walletOrSigner
      .getAddress()
      .then((address) =>
        walletOrSigner.provider.send('personal_sign', [this.uint8ArrayToArray(request), address.toLowerCase()])
      );
  }

  static uint8ArrayToArray(buff: Uint8Array): number[] {
    const result = [];
    for (let i = 0; i < buff.length; ++i) {
      result.push(buff[i]);
    }
    return result;
  }
}

import { Buffer } from 'buffer';
import { strip0x } from './common';
var tweetnacl = require('tweetnacl');
tweetnacl.sealedbox = require('tweetnacl-sealedbox-js');

export class Asymmetric {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  /**
   * Encrypts the given buffer with NaCl SealedBox using the given hex public key.
   * Returns a buffer with the encrypted payload.
   * @param messageBytes The payload to encrypt
   * @param hexPublicKey 32 byte public key in hex format
   */
  static encryptRaw(messageBytes: Uint8Array | Buffer, hexPublicKey: string): Buffer {
    if (!(messageBytes instanceof Uint8Array))
      throw new Error("Please, use a Uint8Array or Buffer instance from require('buffer/') to pass the messageBytes");
    else if (typeof hexPublicKey != 'string') throw new Error('Invalid public key');

    const pubKeyBytes = Buffer.from(strip0x(hexPublicKey), 'hex');

    const sealed = tweetnacl.sealedbox.seal(messageBytes, pubKeyBytes);
    return Buffer.from(sealed);
  }
}

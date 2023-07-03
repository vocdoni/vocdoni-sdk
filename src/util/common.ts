import { keccak256 } from '@ethersproject/keccak256';
import { formatUnits as ethersFormatUnits } from '@ethersproject/units';
import nacl from 'tweetnacl';
import { BigNumber } from '@ethersproject/bignumber';

export const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export function strip0x(value: string): string {
  return value.startsWith('0x') ? value.substring(2) : value;
}

export function ensure0x(value: string): string {
  return value.startsWith('0x') ? value : '0x' + value;
}

export function getBytes(count: number): Uint8Array {
  return nacl.randomBytes(count);
}

/**
 * Generates a random seed and returns a 32 byte keccak256 hash of it (starting with "0x")
 */
export function getHex(): string {
  const bytes = getBytes(32);
  return keccak256(bytes);
}

/**
 * Compares two hex strings checking if they're the same. It ensures both
 * have hex prefix and are lowercase.
 *
 * @param {string} hex1
 * @param {string} hex2
 * @returns {boolean}
 */
export function areEqualHexStrings(hex1?: string, hex2?: string) {
  if (!hex1 || !hex2) return false;

  return ensure0x(hex1.toLowerCase()) === ensure0x(hex2.toLowerCase());
}

/**
 * Returns a string representation of value formatted with decimals digits
 *
 * @param {bigint} value The value in native BigInt
 * @param {number} decimals The number of decimals
 * @returns {string} The formatted string
 */
export function formatUnits(value: bigint, decimals: number = 18): string {
  return ethersFormatUnits(BigNumber.from(value), decimals);
}

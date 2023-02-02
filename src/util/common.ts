import { keccak256 } from '@ethersproject/keccak256';
import nacl from 'tweetnacl';

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

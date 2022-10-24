import { keccak256 } from '@ethersproject/keccak256';

export const delay = ms => new Promise(res => setTimeout(res, ms));

export function strip0x(value: string): string {
  return value.startsWith('0x') ? value.substring(2) : value;
}

export declare type MultiLanguage<T> = {
  default: T;
  [lang: string]: T;
};

export function getBytes(count: number): Buffer {
  if (typeof window != 'undefined' && typeof window?.crypto?.getRandomValues === 'function') {
    // browser
    const buff = new Uint8Array(count);
    window.crypto.getRandomValues(buff);
    return Buffer.from(buff);
  }

  // other environments (fallback)
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const val = (Math.random() * 256) | 0;
    result.push(val);
  }
  return Buffer.from(result);
}

/**
 * Generates a random seed and returns a 32 byte keccak256 hash of it (starting with "0x")
 */
export function getHex(): string {
  const bytes = getBytes(32);
  return keccak256(bytes);
}

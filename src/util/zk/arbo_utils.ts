import { toArrayBuffer, fromArrayBuffer } from './hex';

export function toBigInt(str: string): bigint {
  const strBuff = toArrayBuffer(str);
  const hexArbo = fromArrayBuffer(strBuff.reverse());
  return BigInt('0x' + hexArbo);
}

export async function toHash(input: string): Promise<string[]> {
  const inputBuff = toArrayBuffer(input);
  const inputHashArray = await crypto.subtle.digest('SHA-256', inputBuff);
  const inputHashBuff = new Uint8Array(inputHashArray);

  const splitArboInput = [
    fromArrayBuffer(inputHashBuff.subarray(0, 16).reverse()),
    fromArrayBuffer(inputHashBuff.subarray(16, 32).reverse()),
  ];

  return [BigInt('0x' + splitArboInput[0]).toString(), BigInt('0x' + splitArboInput[1]).toString()];
}

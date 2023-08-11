import { strip0x } from '../common';

const q: bigint = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

export function bigIntToFF(bi: bigint): bigint {
  if (bi == q) {
    return BigInt(0);
  } else if (bi < q && bi != BigInt(0)) {
    return bi;
  }
  return bi % q;
}

export function hexToFFBigInt(hexStr: string): bigint {
  hexStr = strip0x(hexStr);
  if (hexStr.length % 2) {
    hexStr = '0' + hexStr;
  }
  const bi = BigInt('0x' + hexStr);
  return bigIntToFF(bi);
}

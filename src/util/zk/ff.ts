const q: bigint = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

export function bigIntToFF(bi: bigint): bigint {
  if (bi == q) {
    return 0n;
  } else if (bi < q && bi != 0n) {
    return bi;
  }
  return bi % q;
}

export function hexToFFBigInt(hexStr: string): bigint {
  if (hexStr.length % 2) {
    hexStr = '0' + hexStr;
  }
  const bi = BigInt('0x' + hexStr);
  return bigIntToFF(bi);
}

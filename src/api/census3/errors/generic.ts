export class ErrInitializingWeb3 extends Error {
  static readonly code: number = 5019;
  constructor(message?: string) {
    super(message ? message : 'error initialising web3 client');
  }
}

export class ErrCantGetLastBlockNumber extends Error {
  static readonly code: number = 5021;
  constructor(message?: string) {
    super(message ? message : 'error getting last block number from web3 endpoint');
  }
}

export class ErrTransactionNotFound extends Error {
  constructor(message?: string) {
    super(message ? message : 'transaction not found');
  }
}

export class ErrBlockNotFound extends Error {
  constructor(message?: string) {
    super(message ? message : 'block not found');
  }
}

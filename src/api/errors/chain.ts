export class ErrTransactionNotFound extends Error {
  constructor(message?: string) {
    super(message ? message : 'transaction not found');
  }
}

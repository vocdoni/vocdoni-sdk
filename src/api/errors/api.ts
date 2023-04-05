export class ErrAPI extends Error {
  constructor(message?: string) {
    super(message ? message : 'api error');
  }
}

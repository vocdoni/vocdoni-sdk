export class ErrElectionNotStarted extends Error {
  constructor(message?: string) {
    super(message ? message : 'election not started');
  }
}

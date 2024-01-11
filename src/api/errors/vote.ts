export class ErrElectionNotStarted extends Error {
  constructor(message?: string) {
    super(message ? message : 'election not started');
  }
}

export class ErrElectionFinished extends Error {
  constructor(message?: string) {
    super(message ? message : 'election finished');
  }
}

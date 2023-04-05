export class ErrElectionNotFound extends Error {
  constructor(message?: string) {
    super(message ? message : 'election not found');
  }
}

export class ErrCantParseElectionID extends Error {
  constructor(message?: string) {
    super(message ? message : 'cannot parse electionID');
  }
}

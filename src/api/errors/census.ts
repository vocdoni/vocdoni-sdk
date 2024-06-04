export class CensusStillNotPublished extends Error {
  constructor(message?: string) {
    super(message ? message : 'census still not published');
  }
}

export class ErrCantParsePayloadAsJSON extends Error {
  constructor(message?: string) {
    super(message ? message : 'cannot parse payload as JSON');
  }
}

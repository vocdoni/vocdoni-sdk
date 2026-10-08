import { AccountAPI, ErrElectionFinished, ErrElectionMetadataChanged, ErrVochainSendTxFailed } from '../../../src';

// isApiError is protected: reach it through a concrete API subclass
const isApiError = (code: number, message: string) =>
  (AccountAPI as unknown as { isApiError: (error: unknown) => never }).isApiError({
    isAxiosError: true,
    response: { status: 500, data: { code, error: message } },
  });

describe('API error mapping', () => {
  const METADATA_MISMATCH = 'vote metadata hash aaaa does not match the election metadata hash bbbb';

  it('should map a vote rejected for a changed metadata hash', () => {
    expect(() => isApiError(5001, METADATA_MISMATCH)).toThrow(ErrElectionMetadataChanged);
    expect(() => isApiError(5003, METADATA_MISMATCH)).toThrow(ErrElectionMetadataChanged);
  });
  it('should keep mapping other vochain errors', () => {
    expect(() => isApiError(5001, 'process current state: ENDED')).toThrow(ErrElectionFinished);
    expect(() => isApiError(5001, 'some other error')).toThrow(ErrVochainSendTxFailed);
  });
});

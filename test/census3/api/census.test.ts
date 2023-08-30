// @ts-ignore
import { URL } from './util/client.params';
import { Census3CensusAPI, ErrMalformedCensusID, ErrNotFoundCensus } from '../../../src';

describe('Census3 census API tests', () => {
  it('should throw when fetching a non existent census', async () => {
    await expect(async () => {
      await Census3CensusAPI.census(URL, 999999);
    }).rejects.toThrow(ErrNotFoundCensus);
  }, 5000);
  it('should throw when fetching a malformed census', async () => {
    await expect(async () => {
      await Census3CensusAPI.census(URL, 'bad' as any);
    }).rejects.toThrow(ErrMalformedCensusID);
  }, 5000);
});

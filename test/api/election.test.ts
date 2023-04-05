import { ElectionAPI, ErrCantParseElectionID, ErrElectionNotFound } from '../../src';
// @ts-ignore
import { URL } from './util/client.params';

describe('Election API tests', () => {
  it('should throw when asking for an invalid election', async () => {
    await expect(async () => {
      await ElectionAPI.info(URL, '0xReallyBad');
    }).rejects.toThrow(ErrCantParseElectionID);
  }, 5000);
  it('should throw when asking for a non existent election', async () => {
    await expect(async () => {
      await ElectionAPI.info(URL, '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFdeadbeef');
    }).rejects.toThrow(ErrElectionNotFound);
  }, 5000);
});

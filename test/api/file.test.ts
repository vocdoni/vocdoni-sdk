import { ErrCantParsePayloadAsJSON, FileAPI } from '../../src';
// @ts-ignore
import { URL } from './util/client.params';

describe('File API tests', () => {
  it('should throw when sending an invalid JSON', async () => {
    await expect(async () => {
      await FileAPI.cid(URL, Buffer.from('BAD_JSON', 'utf8').toString('base64'));
    }).rejects.toThrow(ErrCantParsePayloadAsJSON);
  }, 5000);
});

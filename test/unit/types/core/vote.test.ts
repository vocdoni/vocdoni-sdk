import { CAbundle } from '@vocdoni/proto/vochain';
import { VoteCore } from '../../../../src/core/vote';

const ELECTION_ID = '934234098f1c8d4b7d0c73f2f6b0d2b3a2f7b0e1c2d3e4f5a6b7c8d9e0f1a2b3';
const ADDRESS = '0x0000000000000000000000000000000000000001';

describe('Vote core tests', () => {
  describe('encodeVoteWeight', () => {
    it('should encode the weight as fixed 8-byte big-endian', () => {
      expect(VoteCore.encodeVoteWeight(1n)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]));
      expect(VoteCore.encodeVoteWeight(10n)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 10]));
      expect(VoteCore.encodeVoteWeight(256n)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 1, 0]));
      expect(VoteCore.encodeVoteWeight(0xffffffffffffffffn)).toEqual(
        new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255])
      );
    });
    it('should throw when the weight does not fit in an unsigned 64 bit integer', () => {
      expect(() => VoteCore.encodeVoteWeight(0xffffffffffffffffn + 1n)).toThrow(
        'Vote weight must fit in an unsigned 64 bit integer'
      );
      expect(() => VoteCore.encodeVoteWeight(-1n)).toThrow('Vote weight must fit in an unsigned 64 bit integer');
    });
    it('should throw when the weight is not a bigint', () => {
      expect(() => VoteCore.encodeVoteWeight(1.5 as unknown as bigint)).toThrow(
        'Vote weight must fit in an unsigned 64 bit integer'
      );
    });
  });

  describe('cspCaBundle', () => {
    it('should build a bundle without weight when none is given', () => {
      const bundle = VoteCore.cspCaBundle(ELECTION_ID, ADDRESS);
      expect(Buffer.from(bundle.processId).toString('hex')).toEqual(ELECTION_ID);
      expect(Buffer.from(bundle.address).toString('hex')).toEqual(ADDRESS.slice(2));
      expect(bundle.voteWeight).toBeUndefined();
      const decoded = CAbundle.decode(VoteCore.encodeCspCaBundle(bundle));
      expect(decoded.voteWeight).toBeUndefined();
    });
    it('should include the canonical weight encoding in the bundle', () => {
      const bundle = VoteCore.cspCaBundle(ELECTION_ID, ADDRESS, 42n);
      expect(bundle.voteWeight).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 42]));
    });
    it('should encode an explicit zero weight as 8 zero bytes rather than omitting it', () => {
      const bundle = VoteCore.cspCaBundle(ELECTION_ID, ADDRESS, 0n);
      expect(bundle.voteWeight).toEqual(new Uint8Array(8));
      const decoded = CAbundle.decode(VoteCore.encodeCspCaBundle(bundle));
      expect(Buffer.from(decoded.voteWeight).toString('hex')).toEqual('0000000000000000');
    });
    it('should round trip through the protobuf encoding', () => {
      const bundle = VoteCore.cspCaBundle(ELECTION_ID, ADDRESS, 42n);
      const decoded = CAbundle.decode(VoteCore.encodeCspCaBundle(bundle));
      expect(Buffer.from(decoded.processId).toString('hex')).toEqual(Buffer.from(bundle.processId).toString('hex'));
      expect(Buffer.from(decoded.address).toString('hex')).toEqual(Buffer.from(bundle.address).toString('hex'));
      expect(Buffer.from(decoded.voteWeight).toString('hex')).toEqual('000000000000002a');
    });
    it('should encode weighted and unweighted bundles differently', () => {
      const unweighted = VoteCore.encodeCspCaBundle(VoteCore.cspCaBundle(ELECTION_ID, ADDRESS));
      const weighted = VoteCore.encodeCspCaBundle(VoteCore.cspCaBundle(ELECTION_ID, ADDRESS, 1n));
      expect(Buffer.from(weighted).toString('hex')).not.toEqual(Buffer.from(unweighted).toString('hex'));
    });
  });
});

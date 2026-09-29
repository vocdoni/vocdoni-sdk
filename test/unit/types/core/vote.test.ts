import { CAbundle } from '@vocdoni/proto/vochain';
import { VoteCore } from '../../../../src/core/vote';

const ELECTION_ID = '934234098f1c8d4b7d0c73f2f6b0d2b3a2f7b0e1c2d3e4f5a6b7c8d9e0f1a2b3';
const ADDRESS = '0x0000000000000000000000000000000000000001';

describe('Vote core tests', () => {
  describe('encodeVoteWeight', () => {
    const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
    const RANGE_ERROR = 'Vote weight must be an integer in the range [1, 2^160)';

    it('should encode the weight as minimal big-endian bytes, like Go big.Int.Bytes()', () => {
      expect(hex(VoteCore.encodeVoteWeight(1n))).toEqual('01');
      expect(hex(VoteCore.encodeVoteWeight(10n))).toEqual('0a');
      expect(hex(VoteCore.encodeVoteWeight(256n))).toEqual('0100');
    });
    it('should accept token-scale weights that exceed 64 bits', () => {
      // 20 tokens at 18 decimals: above 2^64-1, well inside the chain's 2^160 bound
      expect(hex(VoteCore.encodeVoteWeight(20_000000000000000000n))).toEqual('01158e460913d00000');
    });
    it('should encode the largest weight the chain accepts', () => {
      const max = (1n << 160n) - 1n;
      expect(hex(VoteCore.encodeVoteWeight(max))).toEqual('ff'.repeat(20));
    });
    it('should accept safe integers given as number', () => {
      expect(hex(VoteCore.encodeVoteWeight(5 as unknown as bigint))).toEqual('05');
    });
    it('should throw when the weight is out of the range the chain accepts', () => {
      expect(() => VoteCore.encodeVoteWeight(1n << 160n)).toThrow(RANGE_ERROR);
      expect(() => VoteCore.encodeVoteWeight(-1n)).toThrow(RANGE_ERROR);
    });
    it('should reject a zero weight instead of encoding it', () => {
      expect(() => VoteCore.encodeVoteWeight(0n)).toThrow(RANGE_ERROR);
    });
    it('should throw when the weight is not an integer', () => {
      expect(() => VoteCore.encodeVoteWeight(1.5 as unknown as bigint)).toThrow(RANGE_ERROR);
      expect(() => VoteCore.encodeVoteWeight('0x5' as unknown as bigint)).toThrow(RANGE_ERROR);
      expect(() => VoteCore.encodeVoteWeight('1.5' as unknown as bigint)).toThrow(RANGE_ERROR);
    });
    it('should accept decimal strings, as produced by serializing a bigint weight', () => {
      expect(hex(VoteCore.encodeVoteWeight('256' as unknown as bigint))).toEqual('0100');
      expect(hex(VoteCore.encodeVoteWeight('20000000000000000000' as unknown as bigint))).toEqual('01158e460913d00000');
    });
    it('should point to bigint or string for numbers that lost precision', () => {
      expect(() => VoteCore.encodeVoteWeight(2e19 as unknown as bigint)).toThrow(
        'Vote weight is above 2^53 and has lost precision as a number; pass it as a bigint or string'
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
    it('should include the minimal weight encoding in the bundle', () => {
      const bundle = VoteCore.cspCaBundle(ELECTION_ID, ADDRESS, 42n);
      expect(Buffer.from(bundle.voteWeight).toString('hex')).toEqual('2a');
    });
    it('should treat a null weight as no weight', () => {
      const bundle = VoteCore.cspCaBundle(ELECTION_ID, ADDRESS, null);
      expect(bundle.voteWeight).toBeUndefined();
    });
    it('should round trip through the protobuf encoding', () => {
      const bundle = VoteCore.cspCaBundle(ELECTION_ID, ADDRESS, 42n);
      const decoded = CAbundle.decode(VoteCore.encodeCspCaBundle(bundle));
      expect(Buffer.from(decoded.processId).toString('hex')).toEqual(Buffer.from(bundle.processId).toString('hex'));
      expect(Buffer.from(decoded.address).toString('hex')).toEqual(Buffer.from(bundle.address).toString('hex'));
      expect(Buffer.from(decoded.voteWeight).toString('hex')).toEqual('2a');
    });
    it('should encode weighted and unweighted bundles differently', () => {
      const unweighted = VoteCore.encodeCspCaBundle(VoteCore.cspCaBundle(ELECTION_ID, ADDRESS));
      const weighted = VoteCore.encodeCspCaBundle(VoteCore.cspCaBundle(ELECTION_ID, ADDRESS, 1n));
      expect(Buffer.from(weighted).toString('hex')).not.toEqual(Buffer.from(unweighted).toString('hex'));
    });
  });
});

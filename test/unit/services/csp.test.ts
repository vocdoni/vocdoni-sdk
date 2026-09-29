import { CspProofType, CspService, EnvOptions, ICspInfoResponse, Vote, VocdoniSDKClient } from '../../../src';
import { CspAPI } from '../../../src/api/csp';
import { getBlindedPayload } from '../../../src/util/blind-signing';

const ELECTION_ID = '934234098f1c8d4b7d0c73f2f6b0d2b3a2f7b0e1c2d3e4f5a6b7c8d9e0f1a2b3';
const ADDRESS = '0x0000000000000000000000000000000000000001';
const OTHER_ADDRESS = '0x0000000000000000000000000000000000000002';

const CSP_INFO: ICspInfoResponse = {
  title: 'test',
  signatureType: ['ecdsa_blind_pidsalted'],
  authType: 'auth',
  authSteps: [],
};

// the unblinded signature is derived from the voter address, so each voter gets a distinct signature
jest.mock('../../../src/util/blind-signing', () => ({
  getBlindedPayload: jest.fn((_electionId, _token, address) => ({ hexBlinded: 'deadbeef', userSecretData: address })),
  CensusBlind: { unblind: jest.fn((_signature, address) => `unblinded-${address}`) },
}));

jest.mock('../../../src/api/csp', () => ({
  CspAPI: { sign: jest.fn(() => Promise.resolve({ signature: 'blinded-signature' })) },
}));

const mockedSign = jest.mocked(CspAPI.sign);
const mockedGetBlindedPayload = jest.mocked(getBlindedPayload);

const buildService = () => new CspService({ url: 'https://csp.example', info: CSP_INFO });

describe('Csp service unit tests', () => {
  describe('CspService.cspVote (static)', () => {
    it('should forward an explicit weight into the resulting CspVote', () => {
      const vote = CspService.cspVote(new Vote([1]), 'signature', CspProofType.ECDSA_BLIND_PIDSALTED, 42n);
      expect(vote.weight).toEqual(42n);
    });
    it('should leave the weight undefined when none is given', () => {
      const vote = CspService.cspVote(new Vote([1]), 'signature', CspProofType.ECDSA_BLIND_PIDSALTED);
      expect(vote.weight).toBeUndefined();
    });
    it('should convert a safe integer number weight to bigint', () => {
      const vote = CspService.cspVote(new Vote([1]), 'signature', undefined, 5 as unknown as bigint);
      expect(vote.weight).toEqual(5n);
    });
    it('should reject an invalid weight when the vote is built', () => {
      expect(() => CspService.cspVote(new Vote([1]), 'signature', undefined, 0n)).toThrow(
        'Vote weight must be an integer in the range [1, 2^160)'
      );
      expect(() => CspService.cspVote(new Vote([1]), 'signature', undefined, 1.5 as unknown as bigint)).toThrow(
        'Vote weight must be an integer in the range [1, 2^160)'
      );
    });
  });

  describe('CspService.cspSign', () => {
    it('should return the signature together with the signed weight', async () => {
      const signed = await buildService().cspSign(ELECTION_ID, ADDRESS, 'token', 42n);
      expect(signed).toEqual({ signature: `unblinded-${ADDRESS}`, weight: 42n });
    });

    it('should return an undefined weight when signing unweighted', async () => {
      const signed = await buildService().cspSign(ELECTION_ID, ADDRESS, 'token');
      expect(signed).toEqual({ signature: `unblinded-${ADDRESS}`, weight: undefined });
    });

    it('should normalize a number weight once and blind the same value it returns', async () => {
      const signed = await buildService().cspSign(ELECTION_ID, ADDRESS, 'token', 42 as unknown as bigint);
      expect(signed.weight).toEqual(42n);
      expect(mockedGetBlindedPayload).toHaveBeenLastCalledWith(ELECTION_ID, 'token', ADDRESS, 42n);
    });

    it('should reject an invalid weight before contacting the CSP', async () => {
      mockedSign.mockClear();
      await expect(buildService().cspSign(ELECTION_ID, ADDRESS, 'token', 0n)).rejects.toThrow(
        'Vote weight must be an integer in the range [1, 2^160)'
      );
      expect(mockedSign).not.toHaveBeenCalled();
    });
  });

  describe('CspService.cspVote with a CspSignature', () => {
    it('should forward an explicit weight with a plain signature string', () => {
      const vote = buildService().cspVote(new Vote([1]), 'signature', CspProofType.ECDSA_BLIND_PIDSALTED, 7n);
      expect(vote.weight).toEqual(7n);
    });

    it('should reuse the weight carried by the signature returned by cspSign', async () => {
      const service = buildService();
      const signed = await service.cspSign(ELECTION_ID, ADDRESS, 'token', 42n);
      const vote = service.cspVote(new Vote([1]), signed);
      expect(vote.signature).toEqual(`unblinded-${ADDRESS}`);
      expect(vote.weight).toEqual(42n);
    });

    it('should reuse the signed weight on another instance or through the static builder', async () => {
      const signed = await buildService().cspSign(ELECTION_ID, ADDRESS, 'token', 42n);
      expect(buildService().cspVote(new Vote([1]), signed).weight).toEqual(42n);
      expect(CspService.cspVote(new Vote([1]), signed).weight).toEqual(42n);
    });

    it('should accept an explicit weight that matches the signed one, as bigint or number', async () => {
      const signed = await buildService().cspSign(ELECTION_ID, ADDRESS, 'token', 42n);
      expect(CspService.cspVote(new Vote([1]), signed, undefined, 42n).weight).toEqual(42n);
      expect(CspService.cspVote(new Vote([1]), signed, undefined, 42 as unknown as bigint).weight).toEqual(42n);
    });

    it('should throw when the explicit weight conflicts with the signed one', async () => {
      const signed = await buildService().cspSign(ELECTION_ID, ADDRESS, 'token', 42n);
      expect(() => CspService.cspVote(new Vote([1]), signed, undefined, 43n)).toThrow(/42.*43|43.*42/);
    });

    it('should throw when the signature was signed unweighted but a weight is given', async () => {
      const signed = await buildService().cspSign(ELECTION_ID, ADDRESS, 'token');
      expect(() => CspService.cspVote(new Vote([1]), signed, undefined, 5n)).toThrow();
    });

    it('should treat a null weight like an omitted one', async () => {
      const signed = await buildService().cspSign(ELECTION_ID, ADDRESS, 'token');
      expect(CspService.cspVote(new Vote([1]), signed, undefined, null).weight).toBeUndefined();
    });

    it('should accept a CspSignature that went through JSON with the weight as a string', async () => {
      const signed = await buildService().cspSign(ELECTION_ID, ADDRESS, 'token', 42n);
      const restored = JSON.parse(JSON.stringify({ ...signed, weight: signed.weight.toString() }));
      expect(CspService.cspVote(new Vote([1]), restored).weight).toEqual(42n);
      expect(CspService.cspVote(new Vote([1]), restored, undefined, 42n).weight).toEqual(42n);
    });

    it('should normalize a number weight carried by the signature before comparing', () => {
      const signed = { signature: 'signature', weight: 42 as unknown as bigint };
      expect(CspService.cspVote(new Vote([1]), signed, undefined, 42n).weight).toEqual(42n);
      expect(() => CspService.cspVote(new Vote([1]), signed, undefined, 43n)).toThrow(/42.*43|43.*42/);
    });

    it('should keep each weight with its signature when voters sign concurrently', async () => {
      const service = buildService();
      const [signedA, signedB] = await Promise.all([
        service.cspSign(ELECTION_ID, ADDRESS, 'tokenA', 1n),
        service.cspSign(ELECTION_ID, OTHER_ADDRESS, 'tokenB', 2n),
      ]);
      expect(service.cspVote(new Vote([1]), signedA).weight).toEqual(1n);
      expect(service.cspVote(new Vote([1]), signedB).weight).toEqual(2n);
    });
  });

  describe('VocdoniSDKClient.cspVote', () => {
    it('should forward the weight to the underlying CspService', () => {
      const client = new VocdoniSDKClient({ env: EnvOptions.DEV });
      const vote = client.cspVote(new Vote([1]), 'signature', CspProofType.ECDSA_BLIND_PIDSALTED, 42n);
      expect(vote.weight).toEqual(42n);
    });

    it('should leave the weight undefined when none is passed', () => {
      const client = new VocdoniSDKClient({ env: EnvOptions.DEV });
      const vote = client.cspVote(new Vote([1]), 'signature');
      expect(vote.weight).toBeUndefined();
    });
  });
});

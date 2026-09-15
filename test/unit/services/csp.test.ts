import { CspProofType, CspService, EnvOptions, ICspInfoResponse, Vote, VocdoniSDKClient } from '../../../src';

const ELECTION_ID = '934234098f1c8d4b7d0c73f2f6b0d2b3a2f7b0e1c2d3e4f5a6b7c8d9e0f1a2b3';
const ADDRESS = '0x0000000000000000000000000000000000000001';

const CSP_INFO: ICspInfoResponse = {
  title: 'test',
  signatureType: ['ecdsa_blind_pidsalted'],
  authType: 'auth',
  authSteps: [],
};

jest.mock('../../../src/util/blind-signing', () => ({
  getBlindedPayload: jest.fn(() => ({ hexBlinded: 'deadbeef', userSecretData: {} })),
  CensusBlind: { unblind: jest.fn(() => 'unblinded-signature') },
}));

jest.mock('../../../src/api/csp', () => ({
  CspAPI: { sign: jest.fn(() => Promise.resolve({ signature: 'blinded-signature' })) },
}));

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
  });

  describe('CspService.cspVote (instance)', () => {
    it('should forward an explicit weight when cspSign was not called on the instance', () => {
      const service = buildService();
      const vote = service.cspVote(new Vote([1]), 'signature', CspProofType.ECDSA_BLIND_PIDSALTED, 7n);
      expect(vote.weight).toEqual(7n);
    });

    it('should leave the weight undefined when neither cspSign nor an explicit weight is given', () => {
      const service = buildService();
      const vote = service.cspVote(new Vote([1]), 'signature');
      expect(vote.weight).toBeUndefined();
    });

    it('should reuse the weight remembered from a preceding cspSign call', async () => {
      const service = buildService();
      await service.cspSign(ELECTION_ID, ADDRESS, 'token', 42n);
      const vote = service.cspVote(new Vote([1]), 'signature');
      expect(vote.weight).toEqual(42n);
    });

    it('should accept an explicit weight that matches the one remembered from cspSign', async () => {
      const service = buildService();
      await service.cspSign(ELECTION_ID, ADDRESS, 'token', 42n);
      const vote = service.cspVote(new Vote([1]), 'signature', undefined, 42n);
      expect(vote.weight).toEqual(42n);
    });

    it('should throw when the explicit weight conflicts with the one remembered from cspSign', async () => {
      const service = buildService();
      await service.cspSign(ELECTION_ID, ADDRESS, 'token', 42n);
      expect(() => service.cspVote(new Vote([1]), 'signature', undefined, 43n)).toThrow(/42.*43|43.*42/);
    });

    it('should throw when cspSign signed unweighted but cspVote is given an explicit weight', async () => {
      const service = buildService();
      await service.cspSign(ELECTION_ID, ADDRESS, 'token');
      expect(() => service.cspVote(new Vote([1]), 'signature', undefined, 5n)).toThrow();
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

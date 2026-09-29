import { keccak256 } from '@ethersproject/keccak256';
import { hexlify, hexZeroPad } from '@ethersproject/bytes';
import { BigInteger, blindSign, newKeyPair, newRequestParameters, pointToHex } from 'blindsecp256k1';
import { CensusBlind, getBlindedPayload } from '../../../src/util/blind-signing';
import { VoteCore } from '../../../src/core/vote';
import { ensure0x, strip0x } from '../../../src/util/common';

const ELECTION_ID = '934234098f1c8d4b7d0c73f2f6b0d2b3a2f7b0e1c2d3e4f5a6b7c8d9e0f1a2b3';
const ADDRESS = '0x8f6d3b2a1c0e9f8d7c6b5a4938271605f4e3d2c1';

// The message the chain verifies the CSP signature against: keccak256 of the submitted bundle
const bundleHash = (weight?: bigint): string =>
  strip0x(keccak256(hexlify(VoteCore.encodeCspCaBundle(VoteCore.cspCaBundle(ELECTION_ID, ADDRESS, weight)))));

// Emulates the CSP side: blind-sign the payload with the given key pair and request parameters
const cspBlindSign = (sk: BigInteger, k: BigInteger, hexBlinded: string): string =>
  hexZeroPad(ensure0x(blindSign(sk, BigInteger.fromHex(hexBlinded), k).toString(16)), 32).slice(2);

describe('Blind signing tests', () => {
  it('should produce an unweighted signature verifiable against the submitted bundle', () => {
    const { sk, pk } = newKeyPair();
    const { k, signerR } = newRequestParameters();

    const { hexBlinded, userSecretData } = getBlindedPayload(ELECTION_ID, pointToHex(signerR), ADDRESS);
    const signature = CensusBlind.unblind(cspBlindSign(sk, k, hexBlinded), userSecretData);

    expect(CensusBlind.verify(bundleHash(), signature, pk)).toBeTruthy();
  });

  it('should produce a weighted signature verifiable against the submitted weighted bundle', () => {
    const weight = 42n;
    const { sk, pk } = newKeyPair();
    const { k, signerR } = newRequestParameters();

    const { hexBlinded, userSecretData } = getBlindedPayload(ELECTION_ID, pointToHex(signerR), ADDRESS, weight);
    const signature = CensusBlind.unblind(cspBlindSign(sk, k, hexBlinded), userSecretData);

    // The blinded payload and the submitted bundle are built from the same CAbundle (incl. voteWeight),
    // so the unblinded signature verifies against the hash of the bundle submitted in the ProofCA
    expect(CensusBlind.verify(bundleHash(weight), signature, pk)).toBeTruthy();
    // Regression: it must NOT verify against the weightless bundle the payload was built from before
    expect(CensusBlind.verify(bundleHash(), signature, pk)).toBeFalsy();
  });

  it('should not verify a weighted signature against a different weight', () => {
    const { sk, pk } = newKeyPair();
    const { k, signerR } = newRequestParameters();

    const { hexBlinded, userSecretData } = getBlindedPayload(ELECTION_ID, pointToHex(signerR), ADDRESS, 42n);
    const signature = CensusBlind.unblind(cspBlindSign(sk, k, hexBlinded), userSecretData);

    expect(CensusBlind.verify(bundleHash(43n), signature, pk)).toBeFalsy();
  });
});

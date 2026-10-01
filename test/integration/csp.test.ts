import {
  CspCensus,
  CspProofType,
  Election,
  ICspFinalStepResponse,
  ICspIntermediateStepResponse,
  VocdoniSDKClient,
  Vote,
} from '../../src';
import { CspAPI } from '../../src/api/csp';
import { Wallet } from '@ethersproject/wallet';
import { keccak256 } from '@ethersproject/keccak256';
import { arrayify, concat, hexZeroPad } from '@ethersproject/bytes';
import { CAbundle } from '@vocdoni/proto/vochain';
import { BigInteger, blindSign, newRequestParameters, pointToHex } from 'blindsecp256k1';
// @ts-ignore
import { clientParams, setFaucetURL } from './util/client.params';
// @ts-ignore
import { waitForElectionReady } from './util/client.utils';
// @ts-ignore
import { requireEnv } from '../util/env';

const CSP_URL = requireEnv('BLINDCSP_URL');
const CSP_PUBKEY = requireEnv('BLINDCSP_PUBKEY');
const CSP_PRIVKEY = requireEnv('BLINDCSP_PRIVKEY');

// secp256k1 group order
const CURVE_N = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');

const createCspElection = async (client: VocdoniSDKClient, maxCensusSize: number): Promise<string> => {
  const election = Election.from({
    title: 'Election title',
    description: 'Election description',
    header: 'https://source.unsplash.com/random',
    streamUri: 'https://source.unsplash.com/random',
    endDate: new Date().getTime() + 60 * 60 * 1000,
    census: new CspCensus(CSP_PUBKEY, CSP_URL),
    maxCensusSize,
  });

  election.addQuestion('This is a title', 'This is a description', [
    {
      title: 'Option 1',
      value: 0,
    },
    {
      title: 'Option 2',
      value: 1,
    },
  ]);

  await client.createAccount();
  const electionId = await client.createElection(election);
  expect(electionId).toMatch(/^[0-9a-fA-F]{64}$/);
  client.setElectionId(electionId);
  await waitForElectionReady(client, electionId);
  return electionId;
};

// Big-endian bytes of the weight with no leading zeroes, as Go CSPs encode it with big.Int.Bytes().
// Deliberately not built with the SDK helpers, so the chain checks the SDK encoding against an independent one.
const goWeightBytes = (weight: bigint): Uint8Array => {
  const hex = weight.toString(16);
  return arrayify('0x' + (hex.length % 2 ? '0' : '') + hex);
};

// The CSP private key salted for one election and weight, as an OFF_CHAIN_CA_V2 CSP derives it
// (vocdoni-node crypto/saltedkey): salt = keccak256(processId || weight as 32 big-endian bytes)[:20],
// salted key = (key + salt) mod n
const saltedCspKey = (electionId: string, weight: bigint): string => {
  const salt = keccak256(concat(['0x' + electionId, hexZeroPad(goWeightBytes(weight), 32)])).slice(0, 2 + 40);
  const key = (BigInt('0x' + CSP_PRIVKEY) + BigInt(salt)) % CURVE_N;
  return hexZeroPad('0x' + key.toString(16), 32);
};

describe('CSP tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create an election with 4 participants and each of them should vote correctly', async () => {
    const numVotes = 4; // should be even number
    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());

    let client = new VocdoniSDKClient(clientParams(Wallet.createRandom()));
    client = setFaucetURL(client);

    const electionIdentifier = await createCspElection(client, numVotes);

    await Promise.all(
      participants.map(async (participant, index) => {
        const sdkParams = clientParams(participant);
        const pClient = new VocdoniSDKClient(sdkParams);
        pClient.setElectionId(electionIdentifier);
        const step0 = (await pClient.cspStep(0, ['Name test'])) as ICspIntermediateStepResponse;
        const step1 = (await pClient.cspStep(
          1,
          [step0.response.reduce((acc, v) => +acc + +v, 0).toString()],
          step0.authToken
        )) as ICspFinalStepResponse;
        const signature = await pClient.cspSign(participant.address, step1.token);
        const vote = pClient.cspVote(new Vote([index % 2]), signature, CspProofType.ECDSA_BLIND_PIDSALTED);
        return pClient.submitVote(vote);
      })
    );

    const election = await client.fetchElection();
    expect(election.id).toEqual(electionIdentifier);
    expect(election.title).toEqual(election.title);
    expect(election.voteCount).toEqual(numVotes);
    expect(election.results[0][0]).toEqual(election.results[0][1]);
    expect(election.census).toBeInstanceOf(CspCensus);
    expect(election.census.size).toBeUndefined();
    expect(election.census.weight).toBeUndefined();
    expect((election.raw as any).census.censusOrigin).toEqual('OFF_CHAIN_CA_V2');
  }, 285000);

  // The stack's blind-csp does not carry per-voter weights, so these votes are signed by the test acting as a
  // weight-aware CSP with the stack's CSP key. The chain then verifies them against the census root as usual.
  it('should count weighted votes signed by a weight-aware CSP', async () => {
    // multi-byte weights, so a wrong weight encoding cannot go unnoticed
    const blindWeight = 300n;
    const ecdsaWeight = 2n ** 64n + 5n;
    const blindVoter = Wallet.createRandom();
    const ecdsaVoter = Wallet.createRandom();

    let client = new VocdoniSDKClient(clientParams(Wallet.createRandom()));
    client = setFaucetURL(client);

    const electionId = await createCspElection(client, 2);

    // Blind flow: the real cspSign builds the blinded payload, and the CSP sign request it sends is answered here
    const { k, signerR } = newRequestParameters();
    const sign = jest.spyOn(CspAPI, 'sign').mockImplementation(async (_url, _electionId, _signatureType, payload) => {
      const sk = BigInteger.fromHex(saltedCspKey(electionId, blindWeight).slice(2));
      const signature = hexZeroPad('0x' + blindSign(sk, BigInteger.fromHex(payload), k).toString(16), 32).slice(2);
      return { signature };
    });

    const blindClient = new VocdoniSDKClient(clientParams(blindVoter));
    blindClient.setElectionId(electionId);
    await blindClient.cspUrl();
    await blindClient.cspInfo();
    const blindSignature = await blindClient.cspSign(blindVoter.address, pointToHex(signerR), blindWeight);
    expect(sign).toHaveBeenCalledTimes(1);
    await blindClient.submitVote(
      blindClient.cspVote(new Vote([0]), blindSignature, CspProofType.ECDSA_BLIND_PIDSALTED)
    );

    // Non-blind flow: the CSP builds and signs the bundle itself, so the SDK must submit the very same bytes
    const bundle = CAbundle.fromPartial({
      processId: arrayify('0x' + electionId),
      address: arrayify(ecdsaVoter.address),
      voteWeight: goWeightBytes(ecdsaWeight),
    });
    const ecdsaSignature = await new Wallet(saltedCspKey(electionId, ecdsaWeight)).signMessage(
      CAbundle.encode(bundle).finish()
    );

    const ecdsaClient = new VocdoniSDKClient(clientParams(ecdsaVoter));
    ecdsaClient.setElectionId(electionId);
    await ecdsaClient.submitVote(
      ecdsaClient.cspVote(new Vote([1]), ecdsaSignature, CspProofType.ECDSA_PIDSALTED, ecdsaWeight)
    );

    const election = await client.fetchElection();
    expect(election.voteCount).toEqual(2);
    expect(election.results[0].map(String)).toEqual([blindWeight.toString(), ecdsaWeight.toString()]);
  }, 285000);
});

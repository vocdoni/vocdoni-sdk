import { buildPoseidon } from 'circomlibjs';
import * as arbo from './arbo_utils';
import * as ff from './ff';
import * as hex from './hex';
import { VOCDONI_SIK_SIGNATURE_LENGTH } from '../constants';
import { strip0x } from '../common';

export function signatureToVocdoniSikSignature(personal_sign: string): string {
  // Discard the last byte of the personal_sign (used for recovery), different
  // that the same byte of a signature generated with go
  const buffSign = hex.toArrayBuffer(personal_sign);
  return hex.fromArrayBuffer(buffSign.slice(0, VOCDONI_SIK_SIGNATURE_LENGTH));
}

export async function calcSik(address: string, personal_sign: string, password: string = '0'): Promise<string> {
  const arboAddress = arbo.toBigInt(strip0x(address)).toString();
  const safeSignature = signatureToVocdoniSikSignature(strip0x(personal_sign));

  const ffsignature = ff.hexToFFBigInt(safeSignature).toString();
  const ffpassword = ff.hexToFFBigInt(password).toString();

  return buildPoseidon().then((poseidon) => {
    const hash = poseidon([arboAddress, ffpassword, ffsignature]);
    return arbo.toString(poseidon.F.toObject(hash));
  });
}

async function calcNullifier(ffsignature: string, ffpassword: string, arboElectionId: string[]): Promise<bigint> {
  const poseidon = await buildPoseidon();
  const hash = poseidon([ffsignature, ffpassword, arboElectionId[0], arboElectionId[1]]);
  return poseidon.F.toObject(hash);
}

export interface CircuitInputs {
  // public inputs
  electionId: string[];
  nullifier: string;
  availableWeight: string;
  voteHash: string[];
  sikRoot: string;
  censusRoot: string;
  // private inputs
  address: string;
  password: string;
  signature: string;
  voteWeight: string;
  sikSiblings: string[];
  censusSiblings: string[];
}

export async function prepareCircuitInputs(
  electionId: string,
  address: string,
  password: string,
  signature: string,
  voteWeight: string,
  availableWeight: string,
  sikRoot: string,
  sikSiblings: string[],
  censusRoot: string,
  censusSiblings: string[]
): Promise<CircuitInputs> {
  signature = signatureToVocdoniSikSignature(strip0x(signature));

  const arboElectionId = await arbo.toHash(electionId);
  const ffsignature = ff.hexToFFBigInt(strip0x(signature)).toString();
  const ffpassword = ff.hexToFFBigInt(password).toString();

  return Promise.all([
    calcNullifier(ffsignature, ffpassword, arboElectionId),
    arbo.toHash(hex.fromBigInt(BigInt(availableWeight))),
  ]).then((data) => ({
    electionId: arboElectionId,
    nullifier: data[0].toString(),
    availableWeight: arbo.toBigInt(availableWeight).toString(),
    voteHash: data[1],
    sikRoot: arbo.toBigInt(sikRoot).toString(),
    censusRoot: arbo.toBigInt(censusRoot).toString(),
    address: arbo.toBigInt(strip0x(address)).toString(),
    password: ffpassword,
    signature: ffsignature,
    voteWeight: arbo.toBigInt(voteWeight).toString(),
    sikSiblings,
    censusSiblings,
  }));
}

import { buildPoseidon } from 'circomlibjs';
import * as arbo from './arbo_utils';
import * as ff from './ff';
import * as hex from './hex';
import { VOCDONI_SIK_SIGNATURE_LENGTH } from '../constants';

function signatureToVocdoniSikSignature(personal_sign: string): string {
  // Discard the last byte of the personal_sign (used for recovery), different
  // that the same byte of a signature generated with go
  const buffSign = hex.toArrayBuffer(personal_sign);
  return hex.fromArrayBuffer(buffSign.slice(0, VOCDONI_SIK_SIGNATURE_LENGTH));
}

export async function calcSik(address, personal_sign: string, password: string = '0'): Promise<string> {
  const arboAddress = arbo.toBigInt(address).toString();
  const safeSignature = signatureToVocdoniSikSignature(personal_sign);

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
  cikRoot: string;
  censusRoot: string;
  // private inputs
  address: string;
  password: string;
  signature: string;
  voteWeight: string;
  cikSiblings: string[];
  censusSiblings: string[];
}

export async function prepareCircuitInputs(
  electionId: string,
  address: string,
  password: string,
  signature: string,
  voteWeight: string,
  availableWeight: string,
  cikRoot: string,
  cikSiblings: string[],
  censusRoot: string,
  censusSiblings: string[]
): Promise<CircuitInputs> {
  const arboElectionId = await arbo.toHash(electionId);
  const ffsignature = ff.hexToFFBigInt(signature).toString();
  const ffpassword = ff.hexToFFBigInt(password).toString();

  return Promise.all([
    calcNullifier(ffsignature, ffpassword, arboElectionId),
    arbo.toHash(hex.fromBigInt(BigInt(availableWeight))),
  ]).then((data) => ({
    // public inputs
    electionId: arboElectionId,
    nullifier: data[0].toString(),
    availableWeight,
    voteHash: data[1],
    cikRoot,
    censusRoot,
    // private inputs
    address: arbo.toBigInt(address).toString(),
    password: ffpassword,
    signature: ffsignature,
    voteWeight,
    cikSiblings,
    censusSiblings,
  }));
}

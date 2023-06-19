import { buildPoseidon } from 'circomlibjs';
import * as ff from './ff';
import * as arbo from './arbo_utils';
import * as hex from './hex';

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
  const nullifier = await calcNullifier(ffsignature, ffpassword, arboElectionId);
  return {
    // public inputs
    electionId: await arbo.toHash(electionId),
    nullifier: nullifier.toString(),
    availableWeight,
    voteHash: await arbo.toHash(hex.fromBigInt(BigInt(availableWeight))),
    cikRoot,
    censusRoot,
    // private inputs
    address: arbo.toBigInt(address).toString(),
    password: ffpassword,
    signature: ffsignature,
    voteWeight,
    cikSiblings,
    censusSiblings,
  };
}

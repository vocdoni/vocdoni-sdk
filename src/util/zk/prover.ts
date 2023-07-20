import { groth16 } from 'snarkjs';

import { CircuitInputs } from './inputs';

export type ZkProof = {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
};

export async function generateGroth16Proof(
  inputs: CircuitInputs,
  circuitPath: Uint8Array,
  provingKey: Uint8Array
): Promise<ZkProof> {
  return await groth16.fullProve(inputs, circuitPath, provingKey);
}

import { groth16 } from 'snarkjs';

import { CircuitInputs } from './inputs';

export async function generateGroth16Proof(
  inputs: CircuitInputs,
  circuitPath: Uint8Array,
  provingKey: Uint8Array
): Promise<any> {
  return await groth16.fullProve(inputs, circuitPath, provingKey);
}

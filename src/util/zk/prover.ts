import snarkjs from '../../util/snarkjs';

import { CircuitInputs } from './inputs';

export async function generateGroth16Proof(
  inputs: CircuitInputs,
  circuitPath: string,
  provingKey: string
): Promise<any> {
  return await snarkjs.groth16.fullProve(inputs, circuitPath, provingKey);
}

import { Service, ServiceProperties } from './service';
import { ChainAPI } from '../api';
import invariant from 'tiny-invariant';
import { ensure0x, strip0x } from '../util/common';
import { sha256 } from '@ethersproject/sha2';
import { groth16 } from 'snarkjs';
import { hexlify } from '@ethersproject/bytes';
import { toUtf8Bytes } from '@ethersproject/strings';
import { buildPoseidon } from 'circomlibjs';
import { VOCDONI_SIK_PAYLOAD, VOCDONI_SIK_SIGNATURE_LENGTH } from '../util/constants';
import { Buffer } from 'buffer';
import { ZkAPI } from '../api/zk';
import { Wallet } from '@ethersproject/wallet';
import { Signer } from '@ethersproject/abstract-signer';
import { Signing } from '../util/signing';

interface AnonymousServiceProperties {
  chainCircuits: ChainCircuits;
}

type AnonymousServiceParameters = ServiceProperties & AnonymousServiceProperties;

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

export type ChainCircuits = {
  zKeyData: Uint8Array;
  zKeyHash: string;
  zKeyURI: string;
  vKeyData: Uint8Array;
  vKeyHash: string;
  vKeyURI: string;
  wasmData: Uint8Array;
  wasmHash: string;
  wasmURI: string;
};

export class AnonymousService extends Service implements AnonymousServiceProperties {
  public chainCircuits: ChainCircuits;

  /**
   * Instantiate the anonymous service.
   *
   * @param {Partial<AnonymousServiceParameters>} params The service parameters
   */
  constructor(params: Partial<AnonymousServiceParameters>) {
    super();
    Object.assign(this, params);
  }

  async generateZkProof(inputs: CircuitInputs): Promise<ZkProof> {
    return this.fetchCircuits().then((circuits) =>
      AnonymousService.generateGroth16Proof(inputs, circuits.wasmData, circuits.zKeyData)
    );
  }

  async fetchAccountSIK(address: string) {
    invariant(this.url, 'No URL set');
    return ZkAPI.sik(this.url, address);
  }

  async fetchZKProof(address: string) {
    invariant(this.url, 'No URL set');
    return ZkAPI.proof(this.url, address);
  }

  async signSIKPayload(wallet: Wallet | Signer): Promise<string> {
    return Signing.signRaw(new Uint8Array(Buffer.from(VOCDONI_SIK_PAYLOAD)), wallet);
  }

  /**
   * Checks circuit hashes
   *
   * @returns {ChainCircuits} The checked circuit parameters
   */
  checkCircuitsHashes(): ChainCircuits {
    invariant(this.chainCircuits, 'Circuits not set');
    invariant(
      strip0x(sha256(this.chainCircuits.zKeyData)) === strip0x(this.chainCircuits.zKeyHash),
      'Invalid hash check for zKey'
    );
    invariant(
      strip0x(sha256(this.chainCircuits.vKeyData)) === strip0x(this.chainCircuits.vKeyHash),
      'Invalid hash check for vKey'
    );
    invariant(
      strip0x(sha256(this.chainCircuits.wasmData)) === strip0x(this.chainCircuits.wasmHash),
      'Invalid hash check for WASM'
    );

    return this.chainCircuits;
  }

  /**
   * Fetches circuits for anonymous voting
   *
   * @param {Omit<ChainCircuits, 'zKeyData' | 'vKeyData' | 'wasmData'>} circuits Additional options for custom circuits
   * @returns {Promise<ChainCircuits>}
   */
  fetchCircuits(circuits?: Omit<ChainCircuits, 'zKeyData' | 'vKeyData' | 'wasmData'>): Promise<ChainCircuits> {
    const empty = {
      zKeyData: new Uint8Array(),
      vKeyData: new Uint8Array(),
      wasmData: new Uint8Array(),
    };
    if (circuits) {
      this.chainCircuits = {
        ...circuits,
        ...empty,
      };
    } else {
      try {
        this.checkCircuitsHashes();
        return Promise.resolve(this.chainCircuits);
      } catch (e) {}
    }
    invariant(this.url, 'No URL set');

    const setCircuitInfo = this.chainCircuits
      ? Promise.resolve(this.chainCircuits)
      : ChainAPI.circuits(this.url).then((chainCircuits) => {
          this.chainCircuits = {
            zKeyHash: chainCircuits.zKeyHash,
            zKeyURI: chainCircuits.uri + '/' + chainCircuits.circuitPath + '/' + chainCircuits.zKeyFilename,
            vKeyHash: chainCircuits.vKeyHash,
            vKeyURI: chainCircuits.uri + '/' + chainCircuits.circuitPath + '/' + chainCircuits.vKeyFilename,
            wasmHash: chainCircuits.wasmHash,
            wasmURI: chainCircuits.uri + '/' + chainCircuits.circuitPath + '/' + chainCircuits.wasmFilename,
            ...empty,
          };
          return this.chainCircuits;
        });

    return setCircuitInfo
      .then(() =>
        Promise.all([
          ChainAPI.circuit(this.chainCircuits.zKeyURI),
          ChainAPI.circuit(this.chainCircuits.vKeyURI),
          ChainAPI.circuit(this.chainCircuits.wasmURI),
        ])
      )
      .then(([zKeyData, vKeyData, wasmData]) => {
        this.chainCircuits.zKeyData = zKeyData;
        this.chainCircuits.vKeyData = vKeyData;
        this.chainCircuits.wasmData = wasmData;
        return this.checkCircuitsHashes();
      });
  }

  /**
   * Sets circuits for anonymous voting
   *
   * @param {ChainCircuits} circuits Custom circuits
   * @returns {Promise<ChainCircuits>}
   */
  setCircuits(circuits: ChainCircuits): ChainCircuits {
    this.chainCircuits = circuits;
    return this.checkCircuitsHashes();
  }

  static async generateGroth16Proof(
    inputs: CircuitInputs,
    circuitPath: Uint8Array,
    provingKey: Uint8Array
  ): Promise<ZkProof> {
    return await groth16.fullProve(inputs, circuitPath, provingKey);
  }

  static async prepareCircuitInputs(
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
    signature = AnonymousService.signatureToVocdoniSikSignature(strip0x(signature));

    const arboElectionId = await AnonymousService.arbo_utils.toHash(electionId);
    const ffsignature = AnonymousService.ff_utils.hexToFFBigInt(strip0x(signature)).toString();
    const ffpassword = AnonymousService.ff_utils.hexToFFBigInt(hexlify(toUtf8Bytes(password))).toString();

    return Promise.all([
      AnonymousService.calcNullifier(ffsignature, ffpassword, arboElectionId),
      AnonymousService.arbo_utils.toHash(AnonymousService.hex_utils.fromBigInt(BigInt(ensure0x(availableWeight)))),
    ]).then((data) => ({
      electionId: arboElectionId,
      nullifier: data[0].toString(),
      availableWeight: AnonymousService.arbo_utils.toBigInt(availableWeight).toString(),
      voteHash: data[1],
      sikRoot: AnonymousService.arbo_utils.toBigInt(sikRoot).toString(),
      censusRoot: AnonymousService.arbo_utils.toBigInt(censusRoot).toString(),
      address: AnonymousService.arbo_utils.toBigInt(strip0x(address)).toString(),
      password: ffpassword,
      signature: ffsignature,
      voteWeight: AnonymousService.arbo_utils.toBigInt(voteWeight).toString(),
      sikSiblings,
      censusSiblings,
    }));
  }

  static async calcNullifier(ffsignature: string, ffpassword: string, arboElectionId: string[]): Promise<bigint> {
    const poseidon = await buildPoseidon();
    const hash = poseidon([ffsignature, ffpassword, arboElectionId[0], arboElectionId[1]]);
    return poseidon.F.toObject(hash);
  }

  static async calcSik(address: string, personal_sign: string, password: string = '0'): Promise<string> {
    const arboAddress = AnonymousService.arbo_utils.toBigInt(strip0x(address)).toString();
    const safeSignature = AnonymousService.signatureToVocdoniSikSignature(strip0x(personal_sign));

    const ffsignature = AnonymousService.ff_utils.hexToFFBigInt(safeSignature).toString();
    const ffpassword = AnonymousService.ff_utils.hexToFFBigInt(hexlify(toUtf8Bytes(password))).toString();

    return buildPoseidon().then((poseidon) => {
      const hash = poseidon([arboAddress, ffpassword, ffsignature]);
      return AnonymousService.arbo_utils.toString(poseidon.F.toObject(hash));
    });
  }

  static signatureToVocdoniSikSignature(personal_sign: string): string {
    // Discard the last byte of the personal_sign (used for recovery), different
    // that the same byte of a signature generated with go
    const buffSign = AnonymousService.hex_utils.toArrayBuffer(personal_sign);
    return AnonymousService.hex_utils.fromArrayBuffer(buffSign.slice(0, VOCDONI_SIK_SIGNATURE_LENGTH));
  }

  static arbo_utils = {
    toBigInt: (str: string): bigint => {
      const strBuff = AnonymousService.hex_utils.toArrayBuffer(str);
      const hexArbo = AnonymousService.hex_utils.fromArrayBuffer(strBuff.reverse());
      return BigInt('0x' + hexArbo);
    },

    toString: (n: bigint): string => {
      const nStr = AnonymousService.hex_utils.fromBigInt(n);
      const nBuff = AnonymousService.hex_utils.toArrayBuffer(nStr);
      return AnonymousService.hex_utils.fromArrayBuffer(nBuff.reverse());
    },

    toHash: async (input: string): Promise<string[]> => {
      const inputBuff = AnonymousService.hex_utils.toArrayBuffer(input);
      const inputHash = sha256(inputBuff);
      const inputHashBuff = new Uint8Array(Buffer.from(strip0x(inputHash), 'hex'));

      const splitArboInput = [
        AnonymousService.hex_utils.fromArrayBuffer(inputHashBuff.subarray(0, 16).reverse()),
        AnonymousService.hex_utils.fromArrayBuffer(inputHashBuff.subarray(16, 32).reverse()),
      ];

      return [BigInt('0x' + splitArboInput[0]).toString(), BigInt('0x' + splitArboInput[1]).toString()];
    },
  };

  static hex_utils = {
    fromBigInt: (bi: bigint): string => {
      const hex = bi.toString(16);
      return hex.length % 2 != 0 ? '0' + hex : hex;
    },

    fromArrayBuffer: (input: Uint8Array): string => {
      const res: string[] = [];
      input.forEach((i) => res.push(('0' + i.toString(16)).slice(-2)));
      return res.join('');
    },

    toArrayBuffer: (input: string): Uint8Array => {
      if (input.length % 2 !== 0) {
        input = input + '0';
      }

      const view = new Uint8Array(input.length / 2);
      for (let i = 0; i < input.length; i += 2) {
        view[i / 2] = parseInt(input.substring(i, i + 2), 16);
      }
      return view;
    },
  };

  static ff_utils = {
    q: BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617'),

    bigIntToFF: (bi: bigint): bigint => {
      if (bi == AnonymousService.ff_utils.q) {
        return BigInt(0);
      } else if (bi < AnonymousService.ff_utils.q && bi != BigInt(0)) {
        return bi;
      }
      return bi % AnonymousService.ff_utils.q;
    },

    hexToFFBigInt: (hexStr: string): bigint => {
      hexStr = strip0x(hexStr);
      if (hexStr.length % 2) {
        hexStr = '0' + hexStr;
      }
      const bi = BigInt('0x' + hexStr);
      return AnonymousService.ff_utils.bigIntToFF(bi);
    },
  };
}

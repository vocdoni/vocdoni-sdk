import { Wallet } from '@ethersproject/wallet';
import { TransactionCore } from '../../../../src/core/transaction';

describe('Transaction core tests', () => {
  it('should sign a transaction correctly', async () => {
    const tx = Uint8Array.from([
      74, 221, 1, 8, 23, 26, 68, 105, 112, 102, 115, 58, 47, 47, 98, 97, 103, 97, 97, 105, 101, 114, 97, 103, 52, 105,
      99, 121, 117, 107, 51, 106, 99, 98, 97, 98, 114, 105, 113, 114, 106, 105, 99, 111, 114, 105, 102, 112, 113, 101,
      101, 119, 106, 116, 98, 108, 121, 99, 100, 122, 103, 104, 115, 103, 104, 50, 122, 113, 107, 101, 107, 55, 109,
      120, 113, 34, 42, 48, 120, 65, 66, 49, 52, 67, 69, 102, 68, 102, 69, 54, 67, 66, 48, 49, 97, 100, 68, 48, 100, 54,
      54, 65, 49, 51, 48, 70, 56, 65, 66, 98, 55, 67, 50, 102, 48, 98, 53, 67, 55, 42, 103, 10, 34, 8, 133, 197, 197,
      128, 165, 158, 230, 238, 77, 18, 20, 171, 20, 206, 253, 254, 108, 176, 26, 221, 13, 102, 161, 48, 248, 171, 183,
      194, 240, 181, 199, 24, 50, 18, 65, 10, 78, 11, 210, 227, 23, 77, 63, 83, 189, 100, 10, 223, 50, 117, 67, 135,
      186, 0, 88, 7, 49, 200, 202, 221, 166, 217, 18, 232, 214, 134, 181, 17, 153, 212, 78, 57, 153, 32, 153, 93, 238,
      49, 164, 75, 211, 148, 4, 255, 246, 41, 172, 70, 180, 146, 112, 4, 137, 186, 55, 234, 79, 135, 195, 0,
    ]);
    const chainId = 'vocdoni-development-73';
    const wallet = new Wallet('0x91191310a963fef232b1055ec851af45532051de4bb50ebc89145726fda9352a');

    TransactionCore.signTransaction(tx, chainId, wallet).then((signedTx) => {
      expect(signedTx).toEqual(
        'CuABSt0BCBcaRGlwZnM6Ly9iYWdhYWllcmFnNGljeXVrM2pjYmFicmlxcmppY29yaWZwcWVld2p0Ymx5Y2R6Z2hzZ2gyenFrZWs3bXhxIioweEFCMTRDRWZEZkU2Q0IwMWFkRDBkNjZBMTMwRjhBQmI3QzJmMGI1QzcqZwoiCIXFxYClnubuTRIUqxTO/f5ssBrdDWahMPirt8LwtccYMhJBCk4L0uMXTT9TvWQK3zJ1Q4e6AFgHMcjK3abZEujWhrURmdROOZkgmV3uMaRL05QE//YprEa0knAEibo36k+HwwASQYHY8TucpZhrjYzVJI+U4PpBqThnPNFvkOBy4ksa2W9IB4veMkpF47yT+W0h6jwF1bPaCPT50o5m3yxTaVwo3JMc'
      );
    });
  });
});

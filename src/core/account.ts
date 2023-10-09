import {
  CollectFaucetTx,
  Proof,
  ProofArbo,
  ProofArbo_KeyType,
  ProofArbo_Type,
  RegisterSIKTx,
  SendTokensTx,
  SetAccountTx,
  Tx,
  TxType,
} from '@vocdoni/proto/vochain';
import { Buffer } from 'buffer';
import { Account, AccountMetadata } from '../types';
import { TransactionCore } from './transaction';
import { strip0x } from '../util/common';
import { AccountData, CensusProof, FaucetPackage } from '../services';
import { TxMessage } from '../util/constants';

export abstract class AccountCore extends TransactionCore {
  /**
   * Cannot be constructed.
   */
  private constructor() {
    super();
  }

  public static generateCreateAccountTransaction(
    address: string,
    account: Account,
    cid: string,
    faucetPackage: FaucetPackage,
    sik: string
  ): { tx: Uint8Array; metadata: string; message: string } {
    const message = TxMessage.CREATE_ACCOUNT.replace('{address}', strip0x(address).toLowerCase());
    const txData = this.prepareSetAccountData({
      address,
      nonce: 0,
      metadata: account.generateMetadata(),
      cid,
      faucetPackage,
      sik,
    });
    return {
      message,
      ...this.generateSetAccountTransaction(txData),
    };
  }

  public static generateUpdateAccountTransaction(
    accountData: AccountData,
    account: Account,
    cid: string
  ): { tx: Uint8Array; metadata: string; message: string } {
    const message = TxMessage.UPDATE_ACCOUNT.replace('{address}', strip0x(accountData.address).toLowerCase()).replace(
      '{uri}',
      cid
    );
    const txData = this.prepareSetAccountData(
      {
        address: accountData.address,
        nonce: accountData.nonce,
        metadata: account.generateMetadata(),
        cid,
      },
      false
    );
    return {
      message,
      ...this.generateSetAccountTransaction(txData),
    };
  }

  private static generateSetAccountTransaction(txData: { metadata: string; accountData: object }): {
    tx: Uint8Array;
    metadata: string;
  } {
    const setAccount = SetAccountTx.fromPartial({
      ...txData.accountData,
    });
    return {
      tx: Tx.encode({
        payload: { $case: 'setAccount', setAccount },
      }).finish(),
      metadata: txData.metadata,
    };
  }

  public static generateCollectFaucetTransaction(
    accountData: AccountData,
    faucetPackage: FaucetPackage
  ): { tx: Uint8Array; message: string } {
    const txData = this.prepareCollectFaucetData(accountData, faucetPackage);
    const message = TxMessage.COLLECT_FAUCET;
    const collectFaucet = CollectFaucetTx.fromPartial(txData);
    const tx = Tx.encode({
      payload: { $case: 'collectFaucet', collectFaucet },
    }).finish();

    return {
      message,
      tx,
    };
  }

  public static generateRegisterSIKTransaction(
    electionId: string,
    sik: string,
    proof: CensusProof
  ): { tx: Uint8Array; message: string } {
    const message = TxMessage.REGISTER_SIK.replace('{sik}', sik);
    const aProof = ProofArbo.fromPartial({
      siblings: Uint8Array.from(Buffer.from(proof.proof, 'hex')),
      type: ProofArbo_Type.POSEIDON,
      availableWeight: new Uint8Array(Buffer.from(proof.value, 'hex')),
      keyType: ProofArbo_KeyType.ADDRESS,
    });

    const registerSIK = RegisterSIKTx.fromPartial({
      electionId: new Uint8Array(Buffer.from(strip0x(electionId), 'hex')),
      SIK: new Uint8Array(Buffer.from(strip0x(sik), 'hex')),
      censusProof: Proof.fromPartial({
        payload: { $case: 'arbo', arbo: aProof },
      }),
    });

    const tx = Tx.encode({
      payload: { $case: 'registerSIK', registerSIK },
    }).finish();

    return {
      message,
      tx,
    };
  }

  public static generateTransferTransaction(
    nonce: number,
    from: string,
    to: string,
    amount: number
  ): { tx: Uint8Array; message: string } {
    const message = TxMessage.SEND_TOKENS.replace('{amount}', amount.toString()).replace(
      '{to}',
      strip0x(to).toLowerCase()
    );
    const sendTokens = SendTokensTx.fromPartial({
      txtype: TxType.SEND_TOKENS,
      nonce: nonce,
      from: new Uint8Array(Buffer.from(strip0x(from), 'hex')),
      to: new Uint8Array(Buffer.from(strip0x(to), 'hex')),
      value: amount,
    });

    const tx = Tx.encode({
      payload: { $case: 'sendTokens', sendTokens },
    }).finish();

    return { tx, message };
  }

  private static prepareSetAccountData(
    data: {
      address: string;
      nonce: number;
      metadata: AccountMetadata;
      cid: string;
      faucetPackage?: FaucetPackage;
      sik?: string;
    },
    create: boolean = true
  ): { metadata: string; accountData: object } {
    return {
      metadata: Buffer.from(JSON.stringify(data.metadata), 'utf8').toString('base64'),
      accountData: {
        txtype: create ? TxType.CREATE_ACCOUNT : TxType.SET_ACCOUNT_INFO_URI,
        nonce: data.nonce,
        account: new Uint8Array(Buffer.from(strip0x(data.address), 'hex')),
        infoURI: data.cid,
        faucetPackage: data.faucetPackage ? this.prepareFaucetPackage(data.faucetPackage) : null,
        SIK: data.sik ? new Uint8Array(Buffer.from(strip0x(data.sik), 'hex')) : null,
      },
    };
  }

  private static prepareCollectFaucetData(accountData: AccountData, faucetPackage: FaucetPackage) {
    return {
      nonce: accountData.nonce,
      faucetPackage: this.prepareFaucetPackage(faucetPackage),
    };
  }

  private static prepareFaucetPackage(faucetPackage: FaucetPackage) {
    return {
      payload: Uint8Array.from(Buffer.from(faucetPackage.payload, 'base64')),
      signature: Uint8Array.from(Buffer.from(faucetPackage.signature, 'base64')),
    };
  }
}

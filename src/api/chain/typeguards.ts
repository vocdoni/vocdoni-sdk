import {
  AdminTxType,
  ArboType,
  CAType,
  CollectFaucetTxType,
  EthereumAccountType,
  EthereumStorageType,
  GravitonType,
  Id3Type,
  MinimeStorageType,
  MintTokensTxType,
  NewProcessTxType,
  Proof,
  RegisterKeyTxType,
  SendTokensTxType,
  SetAccountTxType,
  SetProcessTxType,
  SetTransactionCostsTxType,
  TxTypes,
  VoteEnvelopeType,
  ZkSnarkType,
} from './transactions';
import { TransactionType } from '../chain';

export const isVoteEnvelopeType = (tx: TxTypes): tx is VoteEnvelopeType => {
  return TransactionType.VOTE_ENVELOPE in tx;
};

export const isNewProcessTxType = (tx: TxTypes): tx is NewProcessTxType => {
  return TransactionType.NEW_PROCESS_TX in tx;
};

export const isAdminTx = (tx: TxTypes): tx is AdminTxType => {
  return TransactionType.ADMIN_TX in tx;
};

export const isSetProcessTx = (tx: TxTypes): tx is SetProcessTxType => {
  return TransactionType.SET_PROCESS_TX in tx;
};

export const isRegisterKeyTx = (tx: TxTypes): tx is RegisterKeyTxType => {
  return TransactionType.REGISTER_KEY_TX in tx;
};

export const isMintTokensTx = (tx: TxTypes): tx is MintTokensTxType => {
  return TransactionType.MINT_TOKENS_TX in tx;
};

export const isSendTokensTx = (tx: TxTypes): tx is SendTokensTxType => {
  return TransactionType.SEND_TOKENS_TX in tx;
};

export const isSetTransactionCostTx = (tx: TxTypes): tx is SetTransactionCostsTxType => {
  return TransactionType.SET_TRANSACTION_COSTS_TX in tx;
};

export const isSetAccountTx = (tx: TxTypes): tx is SetAccountTxType => {
  return TransactionType.SET_ACCOUNT_TX in tx;
};

export const isCollectFaucetTx = (tx: TxTypes): tx is CollectFaucetTxType => {
  return TransactionType.COLLECT_FAUCET_TX in tx;
};

export const isGravitonType = (proof: Proof): proof is GravitonType => {
  return 'graviton' in proof;
};
export const isId3Type = (proof: Proof): proof is Id3Type => {
  return 'iden3' in proof;
};
export const isEthereumStorageType = (proof: Proof): proof is EthereumStorageType => {
  return 'ethereumStorage' in proof;
};
export const isEthereumAccountType = (proof: Proof): proof is EthereumAccountType => {
  return 'ethereumAccount' in proof;
};
export const isCAType = (proof: Proof): proof is CAType => {
  return 'ca' in proof;
};
export const isArboType = (proof: Proof): proof is ArboType => {
  return 'arbo' in proof;
};
export const isZkSnarkType = (proof: Proof): proof is ZkSnarkType => {
  return 'zkSnark' in proof;
};
export const isMinimeStorageType = (proof: Proof): proof is MinimeStorageType => {
  return 'minimeStorage' in proof;
};

import {
  AdminTxType,
  CollectFaucetTxType,
  MintTokensTxType,
  NewProcessTxType,
  RegisterKeyTxType,
  SendTokensTxType,
  SetAccountTxType,
  SetProcessTxType,
  SetTransactionCostsTxType,
  TxTypes,
  VoteEnvelopeType,
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

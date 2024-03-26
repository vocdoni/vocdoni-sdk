import { Wallet } from '@ethersproject/wallet';
import { Signer } from '@ethersproject/abstract-signer';
import { AccountData } from '../account';

export type WalletOption = { wallet: Wallet | Signer };
export type ElectionIdOption = { electionId: string };
export type VoteIdOption = { voteId: string };
export type AddressOption = { address: string };

export type FetchAccountOptions = Partial<AddressOption>;
export type CreateAccountOptions = Partial<WalletOption> & {
  data: AccountData;
  faucetPackage: string;
  setSecretIdentity: boolean;
  secretPayload: string;
  secretPassword: string;
};
export type SendTokensOptions = Partial<WalletOption> & { to: string; amount: number };
export type IsInCensusOptions = Partial<WalletOption & ElectionIdOption>;
export type HasAlreadyVotedOptions = Partial<WalletOption & ElectionIdOption & VoteIdOption>;
export type VotesLeftCountOptions = Partial<WalletOption & ElectionIdOption & VoteIdOption>;
export type IsAbleToVoteOptions = Partial<WalletOption & ElectionIdOption & VoteIdOption>;

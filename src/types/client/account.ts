import { Wallet } from '@ethersproject/wallet';
import { Signer } from '@ethersproject/abstract-signer';

export type WalletOption = { wallet: Wallet | Signer };
export type SendTokensOptions = Partial<WalletOption> & { to: string; amount: number };

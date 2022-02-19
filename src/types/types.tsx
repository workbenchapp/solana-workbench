/* eslint-disable no-console */
import * as sol from '@solana/web3.js';

export enum Net {
  Localhost = 'localhost',
  Dev = 'devnet',
  Test = 'testnet',
  MainnetBeta = 'mainnet-beta',
}

export const ACCOUNTS_NONE_KEY = 'none';
export const RANDOMART_W_CH = 17;
export const RANDOMART_H_CH = 10;
export const TOAST_HEIGHT = 270;
export const TOAST_WIDTH = TOAST_HEIGHT * (1.61 * 0.61);
export const TOAST_BOTTOM_OFFSET = TOAST_HEIGHT / 3.8; // kinda random but looks good
export const TOAST_HIDE_MS = 1200;
export const TOAST_PAUSE_MS = 1000;
export const BASE58_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const MAX_PROGRAM_CHANGES_DISPLAYED = 20;

export const netToURL = (net: Net): string => {
  switch (net) {
    case Net.Localhost:
      return 'http://127.0.0.1:8899';
    case Net.Dev:
      return 'https://api.devnet.solana.com';
    case Net.Test:
      return 'https://api.testnet.solana.com';
    case Net.MainnetBeta:
      return 'https://api.mainnet-beta.solana.com';
    default:
  }
  return '';
};

export enum ProgramID {
  SystemProgram = '11111111111111111111111111111111',
  SerumDEXV3 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  TokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}

export type WBAccount = {
  pubKey: string;
  humanName?: string;
  art?: string;
  solAmount?: number;
  hexDump?: string;
  exists?: boolean;
  executable?: boolean;
};

export type ValidatorStateRequest = {
  net: Net;
};

export type ValidatorLogsRequest = {
  filter: string;
};

export type GetAccountRequest = {
  net: Net;
  pubKey: string;
};

export type AccountsRequest = {
  net: Net;
};

export type UpdateAccountRequest = {
  net: Net;
  pubKey: string;
  humanName: string;
};

export type ImportAccountRequest = {
  net: Net;
  pubKey: string;
};

export type AccountsResponse = {
  rootKey: string;
  accounts: WBAccount[];
};

export type GetAccountResponse = {
  account?: WBAccount | null;
  err?: Error;
};

export type ProgramChangeResponse = {
  changes: ProgramAccountChange[];
  net: Net;
  uniqueAccounts: number;
};

export type SubscribeProgramChangesRequest = {
  net: Net;
  programID: string;
};

export type UnsubscribeProgramChangesRequest = {
  net: Net;
  subscriptionID: number;
  programID: string;
};

export type FetchAnchorIDLRequest = {
  programID: string;
};

export type ProgramAccountChange = {
  pubKey: string;
  net: Net;
  info: sol.KeyedAccountInfo;
  ctx: sol.Context;
  solAmount: number; // solAmount is the lamports from info in SOL
  count: number; // count tracks how often this account has been seen
  solDelta: number; // difference between last change amount and this one
  maxDelta: number; // maxDelta represents the max change in SOL seen during session
  programID: string;
};

export interface ChangeSubscriptionMap {
  [net: string]: {
    [programID: string]: {
      subscriptionID: number;
      solConn: sol.Connection;
    };
  };
}

export interface ImportedAccountMap {
  [pubKey: string]: boolean;
}

export interface ChangeLookupMap {
  [pubKey: string]: ProgramAccountChange;
}

export interface ChangeBatchSize {
  [net: string]: number;
}

export interface ValidatorState {
  net: Net;
  running: boolean;
  waitingForRun: boolean;
  loading: boolean;
}

export interface AccountsState {
  listedAccounts: WBAccount[];
  selectedAccount: string | undefined;
  hoveredAccount: string;
  editedAccount: string;
  rootKey: string;
}

export interface ToastProps {
  msg: string;
  variant?: string;
  hideAfter?: number;
  bottom?: number;
  toastKey?: string;
}

export interface ToastState {
  toasts: ToastProps[];
}

export interface ProgramChangesState {
  changes: ProgramAccountChange[];
  paused: boolean;
}

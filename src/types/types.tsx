/* eslint-disable no-console */
import * as sol from '@solana/web3.js';

export interface SolState {
  installed: boolean;
  running: boolean;
  keyId: string;
}

export enum Net {
  Localhost = 'localhost',
  Dev = 'devnet',
  Test = 'testnet',
  MainnetBeta = 'mainnet-beta',
}

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

export type WBAccount = {
  pubKey: string;
  humanName?: string;
  art?: string;
  solAmount?: number;
  hexDump?: string;
  solAccount?: sol.AccountInfo<Buffer> | null;
};

export type SolStateRequest = {
  net: Net;
};

export type ValidatorLogsRequest = {
  filter: string;
};

export type GetAccountRequest = {
  net: Net;
  pk: string;
};

export type AccountsRequest = {
  net: Net;
};

export type UpdateAccountRequest = {
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

export type SubscribeProgramChangesRequest = {
  net: Net;
};

export type UnsubscribeProgramChangesRequest = {
  net: Net;
  subscriptionID: number;
};

export type ProgramAccountChange = {
  pubKey: string;
  net: Net;
  info: sol.KeyedAccountInfo;
  ctx: sol.Context;
  solAmount: number; // solAmount is the lamports from info in SOL
  count: number; // count tracks how often this account has been seen
  solDelta: number; // difference between last change amount and this one
  maxDelta: number;
  maxSol: number; // maxSOL represents the max SOL seen during subscription
};

export interface ChangeSubscriptionMap {
  [net: string]: {
    subscriptionID: number;
    solConn: sol.Connection;
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

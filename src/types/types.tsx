import * as sol from '@solana/web3.js';

export interface SolState {
  installed: boolean;
  running: boolean;
  keyId: string;
}

export enum Net {
  Localhost = 'localhost',
  Dev = 'dev',
  Test = 'test',
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

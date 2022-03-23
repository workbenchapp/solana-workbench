/* eslint-disable no-console */
import * as sol from '@solana/web3.js';

export enum Net {
  Localhost = 'localhost',
  Dev = 'devnet',
  Test = 'testnet',
  MainnetBeta = 'mainnet-beta',
}
export enum NetStatus {
  Unknown = 'unknown',
  Running = 'running',
  Unavailable = 'unavailable',
  Starting = 'starting',
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

export enum ProgramID {
  SystemProgram = '11111111111111111111111111111111',
  SerumDEXV3 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  TokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}

export enum ConfigKey {
  AnalyticsEnabled = 'analytics_enabled',
}

export enum ConfigAction {
  Get = 'get',
  Set = 'set',
}

export type WBAccount = {
  net: Net | undefined;
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

export type ValidatorNetworkInfoRequest = {
  net: Net;
};


export type ImportAccountResponse = {
  net: Net;
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

export type WBConfigRequest = {
  key: string;
  val?: string;
  action: string;
};

export type WBConfigResponse = {
  values: ConfigMap;
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

export interface LogSubscriptionMap {
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

export interface ValidatorState {
  net: Net;
  status: NetStatus;
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

export interface ConfigMap {
  [key: string]: string;
}

export interface ConfigState {
  loading: boolean;
  values: ConfigMap;
}
export type vCount = {
  version: string
  count: number
}
export type ValidatorNetworkInfoResponse = {
  version: string
  nodes: sol.ContactInfo[]
  versionCount: vCount[]
}
// https://docs.solana.com/developing/clients/jsonrpc-api#getclusternodes
export type NodeInfo = {
  pubkey: string; // - Node public key, as base-58 encoded string
  gossip: string | null; // - Gossip network address for the node
  tpu?: string | null; // - TPU network address for the node
  rpc?: string | null; // - JSON RPC network address for the node, or null if the JSON RPC service is not enabled
  version?: string | null; // - The software version of the node, or null if the version information is not available
  featureSet?: number | null; // - The unique identifier of the node's feature set
  shredVersion?: number | null; // - The shred version the node has been configured to use
};

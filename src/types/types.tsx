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

export const BASE58_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const MAX_PROGRAM_CHANGES_DISPLAYED = 20;

export enum ProgramID {
  SystemProgram = '11111111111111111111111111111111',
  SerumDEXV3 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  TokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}

export enum ConfigAction {
  Get = 'get',
  Set = 'set',
}

export type ValidatorLogsRequest = {
  filter: string;
  net: Net;
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

export interface AccountMap {
  [pubKey: string]: boolean;
}

export interface ConfigMap {
  [key: string]: string | undefined;
}

export interface ConfigState {
  loading: boolean;
  values: ConfigMap;
}

export type VCount = {
  version: string;
  count: number;
};

export type ValidatorNetworkInfoResponse = {
  version: string;
  nodes: sol.ContactInfo[];
  versionCount: VCount[];
};

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

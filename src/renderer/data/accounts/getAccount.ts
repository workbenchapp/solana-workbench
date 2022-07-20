import * as sol from '@solana/web3.js';
import hexdump from 'hexdump-nodejs';
import * as metaplex from '@metaplex/js';

import { LRUCache } from 'typescript-lru-cache';
import { useQuery } from 'react-query';
import { logger, commitmentLevel } from '../../common/globals';
import { Net, netToURL } from '../ValidatorNetwork/validatorNetworkState';
import { AccountInfo } from './accountInfo';
import { AccountMetaValues } from './accountState';

export const BASE58_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const HEXDUMP_BYTES = 512;

// TODO: make a global state of "current slot number"
//       and then use that to use the accountsCache if that is sufficiently up to date
//       Also use that to decide if we need to do a validator is available check or not - if we're watching changes, then we already know...

const cache = new LRUCache<string, AccountInfo>({
  maxSize: 2000,
  entryExpirationTimeInMS: 60000,
});

export const updateCache = (account: AccountInfo) => {
  cache.set(`${account.net}_${account.pubKey}`, account);
};

export function peekAccount(net: Net, pubKey: string): AccountInfo | null {
  return cache.peek(`${net}_${pubKey}`);
}

export function forceRequestAccount(net: Net, pubKey: string) {
  cache.delete(`${net}_${pubKey}`);
}

/// //////////////////////////////////////////////////////////////////////
// TODO: consider extracting...
// This gets the JSON parsed version of the data for AccountView
export async function getParsedAccount(
  net: Net,
  pubKey: string
): Promise<sol.AccountInfo<sol.ParsedAccountData> | undefined> {
  const solConn = new sol.Connection(netToURL(net), commitmentLevel);

  const key = new sol.PublicKey(pubKey);

  const solAccount = await solConn.getParsedAccountInfo(key);

  const response: AccountInfo = {
    accountId: key,
    accountInfo: solAccount.value,
    pubKey,
    net,
    count: 0,
    solDelta: 0,
    maxDelta: 0,
    // programID: '', // solAccount?.owner?.toString(),
  };
  cache.set(`${net}_${pubKey}`, response);
  return response;
}
// react-query support
// TODO: if i understood right, re-querying will make a non-blocking request, so caould be used to update on action?
export type ParsedAccountParams = {
  queryKey: [string, { net: Net; pubKey: string }];
};
export async function queryParsedAccount(params: ParsedAccountParams) {
  const [, { net, pubKey }] = params.queryKey;

  const accountInfo = await getParsedAccount(net, pubKey);
  if (!accountInfo) {
    throw Error(`${pubKey} Not found`);
  }

  return accountInfo;
}
export function useParsedAccount(
  net: Net,
  pubKey: string | undefined,
  queryOption
) {
  const {
    status: loadStatus,
    error,
    data: accountData,
  } = useQuery<sol.AccountInfo<sol.ParsedAccountData>, Error>(
    ['parsed-account', { net, pubKey }],
    queryParsedAccount,
    queryOption || {}
  );
  const account = accountData;
  // logger.silly(
  //   `queryParsedAccount(${pubKey}): ${loadStatus} - error: ${error}: ${JSON.stringify(
  //     account
  //   )}`
  // );
  return { loadStatus, account, error };
}
/// ///////////////////////////////////////////////////////////////////

// This will always use, and update the lastUsed time any account in the cache.
// if you absoluetly need to current latest, don't use this function :)
// it is written to avoid RPC requests if at all possible, and is used in conjunction with the programChanges subscriptions
export function getAccount(net: Net, pubKey: string): AccountInfo | undefined {
  // logger.silly('getAccountInfo ', pubKey);

  const cachedResponse = cache.get(`${net}_${pubKey}`);
  if (cachedResponse) {
    return cachedResponse;
  }
  // logger.silly('getAccountInfo cache miss', pubKey, pubKey.toString());

  const response: AccountInfo = {
    accountId: new sol.PublicKey(pubKey),
    accountInfo: {
      executable: false,
      lamports: 0,
      owner: sol.SystemProgram.programId,
      data: undefined,
    },
    pubKey: pubKey.toString(),
    net,
    count: 0,
    solDelta: 0,
    maxDelta: 0,
    // programID: '', // solAccount?.owner?.toString(),
  };
  cache.set(`${net}_${pubKey}`, response);
  return response;
}

/// ///////////////////////////////////////////////////////////
// token array
export type TokenAccountArray = Array<{
  pubkey: sol.PublicKey;
  account: sol.AccountInfo<sol.ParsedAccountData>;
}>;

export async function getTokenAccounts(
  net: Net,
  pubKey: string
): Promise<sol.RpcResponseAndContext<TokenAccountArray>> {
  const solConn = new sol.Connection(netToURL(net), commitmentLevel);
  const key = new sol.PublicKey(pubKey);
  const filter: sol.TokenAccountsFilter = {
    programId: new sol.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  };
  const tokenAccounts = await solConn.getParsedTokenAccountsByOwner(
    key,
    filter
  );

  return tokenAccounts;
}
// react-query support
// TODO: if i understood right, re-querying will make a non-blocking request, so caould be used to update on action?
export type TokenAccountsParams = {
  queryKey: [string, { net: Net; pubKey: string }];
};
export async function queryTokenAccounts(params: ParsedAccountParams) {
  const [, { net, pubKey }] = params.queryKey;

  const tokenAccounts = await getTokenAccounts(net, pubKey);
  if (!tokenAccounts) {
    throw Error(`tokenAccounts for ${pubKey} Not found`);
  }

  return tokenAccounts;
}
/// ///////////////////////////////////////////////////////////////////

/// ///////////////////////////////////////////////////////////
// token metadata
export async function getTokenMetadata(
  net: Net,
  tokenPublicKey: string
): Promise<metaplex.programs.metadata.Metadata> {
  const conn = new metaplex.Connection(netToURL(net), commitmentLevel);
  try {
    // TODO: this console.logs "metadata load Error: Unable to find account: HKCjVqNU35H3zsXAVetgo743qCDMu7ssGnET1yvN4RSJ"
    const meta = await metaplex.programs.metadata.Metadata.findByMint(
      conn,
      tokenPublicKey
    );

    // const meta = metaplex.programs.metadata.Metadata.load(conn, tokenPublicKey);
    return meta;
  } catch (e) {
    logger.error('metadata load', e);
  }
  const fake: metaplex.programs.metadata.Metadata = {};
  return fake;
}
// react-query support
// TODO: if i understood right, re-querying will make a non-blocking request, so caould be used to update on action?
export type TokenMetadataParams = {
  queryKey: [string, { net: Net; pubKey: string }];
};
export async function queryTokenMetadata(
  params: ParsedAccountParams
): Promise<metaplex.programs.metadata.Metadata | undefined> {
  const [, { net, pubKey }] = params.queryKey;

  try {
    const meta = await getTokenMetadata(net, pubKey);
    return meta;
  } catch (e) {
    logger.warn(e);
  }
  // if (!meta) {
  //   throw Error(`tokenmetadata for ${pubKey} Not found`);
  // }
  return undefined;
}
/// ///////////////////////////////////////////////////////////////////

export const truncateSolAmount = (solAmount: number | undefined) => {
  if (solAmount === undefined) {
    return '';
  }
  if (solAmount > 999) {
    return solAmount.toFixed(0);
  }
  if (solAmount < 0.001) {
    return solAmount.toPrecision(6); // This is probably redundant
  }
  return solAmount.toPrecision(9);
};

// Rendering functions - maybe we should wrap the getAccount response in a class

export const truncateLamportAmount = (account: AccountInfo | undefined) => {
  if (account === undefined || account.accountInfo === undefined) {
    return '';
  }

  if (account.accountInfo?.lamports === undefined) {
    return '';
  }
  return truncateSolAmount(account.accountInfo.lamports / sol.LAMPORTS_PER_SOL);
};

export const renderRawData = (account: AccountInfo | undefined) => {
  if (account === undefined || account.accountInfo === undefined) {
    return '';
  }

  if (account.accountInfo?.data === undefined) {
    return '';
  }
  if ('subarray' in account.accountInfo.data) {
    return hexdump(account.accountInfo.data.subarray(0, HEXDUMP_BYTES));
  }
  return JSON.stringify(account.accountInfo.data, null, 2);
};

// TODO: this should look up a persistent key: string map
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getHumanName = (meta: AccountMetaValues | undefined) => {
  if (meta && meta.humanname) {
    return meta.humanname;
  }
  return '';
};

export async function refreshAccountInfos(net: Net, keys: string[]) {
  const solConn = new sol.Connection(netToURL(net), commitmentLevel);
  const pubKeys = keys.map((k) => new sol.PublicKey(k));
  const accountInfos = await solConn.getMultipleAccountsInfo(pubKeys);

  accountInfos.forEach((info, i) => {
    const cachedAccount = cache.get(`${net}_${keys[i]}`);
    if (!cachedAccount) {
      // logger.silly('cache miss', `${net}_${keys[i]}`);
      return;
    }
    cachedAccount.accountInfo = info;
    cache.set(`${net}_${keys[i]}`, cachedAccount);
  });
}

// Please note, yes, this is the shittest way to do sorting, but that's not the primary bottleneck
export function getTopAccounts(
  net: Net,
  count: number,
  sortFunction: (a: AccountInfo, b: AccountInfo) => number
): string[] {
  const top: string[] = [];
  const keys: AccountInfo[] = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const key of cache.keys()) {
    if (key.startsWith(net)) {
      // eslint-disable-next-line no-await-in-loop
      const account = cache.peek(key);
      if (account && account.accountInfo && account.accountInfo?.lamports > 0) {
        keys.push(account);
      }
    }
  }

  keys.sort(sortFunction);

  // eslint-disable-next-line no-restricted-syntax
  for (const account of keys.slice(0, count - 1)) {
    top.push(account.pubKey);
  }

  return top;
}

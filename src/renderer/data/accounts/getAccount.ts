import * as sol from '@solana/web3.js';
import { LRUCache } from 'typescript-lru-cache';

import { AccountInfo } from './accountInfo';

import { Net, netToURL } from '../ValidatorNetwork/validatorNetworkState';
import { AccountMetaValues } from './accountState';

const logger = window.electron.log;

const hexdump = require('hexdump-nodejs');

export const BASE58_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const HEXDUMP_BYTES = 512;

// TODO: make a global state of "current slot number"
//       and then use that to use the accountsCache if that is sufficiently up to date
//       Also use that to decide if we need to do a validator is available check or not - if we're watching changes, then we already know...

const cache = new LRUCache<string, AccountInfo>({
  maxSize: 500,
  entryExpirationTimeInMS: 60000,
});

export const getAllAccounts = (): AccountInfo[] => {
  const list: AccountInfo[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const v of cache.values()) {
    list.push(v);
  }
  return list;
};

export const updateCache = (account: AccountInfo) => {
  cache.set(`${account.net}_${account.pubKey}`, account);
};

export function peekAccount(net: Net, pubKey: string): AccountInfo | null {
  return cache.peek(`${net}_${pubKey}`);
}

// This will always use, and update the lastUsed time any account in the cache.
// if you absoluetly need to current latest, don't use this function :)
// it is written to avoid RPC requests if at all possible, and is used in conjunction with the programChanges subscriptions
export async function getAccount(
  net: Net,
  pubKey: string
): Promise<AccountInfo | undefined> {
  // logger.silly('getAccount', { pubKey });
  const cachedResponse = cache.get(`${net}_${pubKey}`);
  if (cachedResponse) {
    return cachedResponse;
  }

  const solConn = new sol.Connection(netToURL(net));
  const key = new sol.PublicKey(pubKey);
  const solAccount = await solConn.getAccountInfo(key);

  logger.silly('getAccountInfo cache miss', pubKey, solAccount);
  // TODO: these should not be made individually, instead, toss them on a list, and make getMultipleAccounts call once every 333mS or something
  //  if (solAccount) {
  const response: AccountInfo = {
    accountId: key,
    accountInfo: solAccount,
    pubKey: key.toString(),
    net,
    count: 0,
    solDelta: 0,
    maxDelta: 0,
    programID: '',
  };
  cache.set(`${net}_${pubKey}`, response);
  return response;
  // }

  // return undefined;
}

export type TokenAccountArray = Array<{
  pubkey: sol.PublicKey;
  account: sol.AccountInfo<sol.ParsedAccountData>;
}>;

export async function getTokenAccounts(
  net: Net,
  pubKey: string
): Promise<sol.RpcResponseAndContext<TokenAccountArray>> {
  // logger.silly('getTokenAccounts', { pubKey });
  // const cachedResponse = cache.peek(`${net}_${pubKey}_getTokenAccounts`);
  // if (cachedResponse) {
  //   return cachedResponse;
  // }

  const solConn = new sol.Connection(netToURL(net));
  const key = new sol.PublicKey(pubKey);
  const filter: sol.TokenAccountsFilter = {
    programId: new sol.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  };
  const tokenAccounts = await solConn.getParsedTokenAccountsByOwner(
    key,
    filter
  );

  logger.silly('getTokenAccounts cache miss', tokenAccounts);

  // cache.set(`${net}_${pubKey}_getTokenAccounts`, tokenAccounts);
  return tokenAccounts;

  // return undefined;
}

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
export const renderData = (account: AccountInfo | undefined) => {
  if (account === undefined || account.accountInfo === undefined) {
    return '';
  }

  if (account.accountInfo?.data === undefined) {
    return '';
  }
  return hexdump(account.accountInfo.data.subarray(0, HEXDUMP_BYTES));
};

// TODO: this should look up a persistent key: string map
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getHumanName = (meta: AccountMetaValues | undefined) => {
  if (meta && meta.humanname) {
    return meta.humanname;
  }
  return '';
};

export function getAccountNoWait(
  net: Net,
  pubKey: string
): AccountInfo | undefined {
  // logger.silly('getAccount', { pubKey });
  const cachedResponse = cache.peek(`${net}_${pubKey}`);
  if (cachedResponse) {
    return cachedResponse;
  }
  return undefined;
}

// Please note, yes, this is the shittest way to do sorting, but that's not the primary bottleneck
export function GetTopAccounts(
  net: Net,
  count: number,
  sortFunction: (a: AccountInfo, b: AccountInfo) => number
): string[] {
  const top: string[] = [];

  // top.push('9u5DkG65FkxkjzP84JyuhfA7PhZB2SVxMKev4yVLjAd7');
  // 8FjV5PXabcMVuWnCtwrwiaSZHEix6FNrR48AU1zWbxjZ

  // logger.info('cached size', cache.size);

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
  // logger.info('sorting cached accounts', keys.length);
  keys.sort(sortFunction);
  // eslint-disable-next-line no-restricted-syntax
  for (const account of keys.slice(0, count - 1)) {
    // logger.info('push', account.pubKey);

    top.push(account.pubKey);
  }

  return top;
}

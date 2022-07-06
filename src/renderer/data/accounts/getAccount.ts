import * as sol from '@solana/web3.js';
import hexdump from 'hexdump-nodejs';
import { LRUCache } from 'typescript-lru-cache';
import { logger } from '@/common/globals';
import { Net, netToURL } from '../ValidatorNetwork/validatorNetworkState';
import { AccountInfo } from './accountInfo';
import { AccountMetaValues } from './accountState';

export const BASE58_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const HEXDUMP_BYTES = 512;

// TODO: make a global state of "current slot number"
//       and then use that to use the accountsCache if that is sufficiently up to date
//       Also use that to decide if we need to do a validator is available check or not - if we're watching changes, then we already know...

const cache = new LRUCache<string, AccountInfo>({
  maxSize: 500,
  entryExpirationTimeInMS: 60000,
});

export const updateCache = (account: AccountInfo) => {
  cache.set(`${account.net}_${account.pubKey}`, account);
};

export function peekAccount(net: Net, pubKey: string): AccountInfo | null {
  return cache.peek(`${net}_${pubKey}`);
}

// This will always use, and update the lastUsed time any account in the cache.
// if you absoluetly need to current latest, don't use this function :)
// it is written to avoid RPC requests if at all possible, and is used in conjunction with the programChanges subscriptions
export function getAccount(net: Net, pubKey: string): AccountInfo | undefined {
  const cachedResponse = cache.get(`${net}_${pubKey}`);
  if (cachedResponse) {
    return cachedResponse;
  }

  logger.silly('getAccountInfo cache miss', pubKey, pubKey.toString());

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
    programID: '',
  };
  cache.set(`${net}_${pubKey}`, response);
  return response;
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

export const renderRawData = (account: AccountInfo | undefined) => {
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

export async function refreshAccountInfos(net: Net, keys: string[]) {
  const solConn = new sol.Connection(netToURL(net));
  const pubKeys = keys.map((k) => new sol.PublicKey(k));
  const accountInfos = await solConn.getMultipleAccountsInfo(pubKeys);
  accountInfos.forEach((info, i) => {
    const cachedAccount = cache.get(`${net}_${keys[i]}`);
    if (!cachedAccount) {
      logger.silly('cache miss', `${net}_${keys[i]}`);
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

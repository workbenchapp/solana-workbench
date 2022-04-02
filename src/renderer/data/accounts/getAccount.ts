import * as sol from '@solana/web3.js';
import { LRUCache } from 'typescript-lru-cache';

import { AccountInfo } from './accountInfo';

import { Net, netToURL } from '../ValidatorNetwork/validatorNetworkState';

const hexdump = require('hexdump-nodejs');

export const BASE58_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const HEXDUMP_BYTES = 512;

// TODO: make a global state of "current slot number"
//       and then use that to use the accountsCache if that is sufficiently up to date
//       Also use that to decide if we need to do a validator is available check or not - if we're watching changes, then we already know...

const cache = new LRUCache<string, AccountInfo>({
  maxSize: 100,
  entryExpirationTimeInMS: 1000,
});

export const updateCache = (account: AccountInfo) => {
  cache.set(`${account.net}_${account.pubKey}`, account);
};

export async function getAccount(
  net: Net,
  pubKey: string
): Promise<AccountInfo | undefined> {
  // logger.info("getAccount", {pubKey});
  const cachedResponse = cache.peek(`${net}_${pubKey}`);
  if (cachedResponse) {
    return cachedResponse;
  }

  const solConn = new sol.Connection(netToURL(net));
  const key = new sol.PublicKey(pubKey);
  const solAccount = await solConn.getAccountInfo(key);

  if (solAccount) {
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
  }

  return undefined;
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

  if (account.accountInfo.lamports === undefined) {
    return '';
  }
  return truncateSolAmount(account.accountInfo.lamports / sol.LAMPORTS_PER_SOL);
};
export const renderData = (account: AccountInfo | undefined) => {
  if (account === undefined || account.accountInfo === undefined) {
    return '';
  }

  if (account.accountInfo.data === undefined) {
    return '';
  }
  return hexdump(account.accountInfo.data.subarray(0, HEXDUMP_BYTES));
};

// TODO: this should look up a persistent key: string map
export const getHumanName = (key: AccountInfo | sol.PublicKey) => {
  return '';
};

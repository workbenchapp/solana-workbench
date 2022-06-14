import * as sol from '@solana/web3.js';
import { Net } from '../ValidatorNetwork/validatorNetworkState';

// from https://react-redux.js.org/tutorials/typescript-quick-start

export const ACCOUNTS_NONE_KEY = 'none';
// TO store Net in the getAccount object, we also need to abstract that into a UID
// An expanded sol.KeyedAccountInfo
export interface AccountInfo {
  accountInfo: sol.AccountInfo<Buffer | sol.ParsedAccountData> | null;
  accountId: sol.PublicKey;
  pubKey: string;
  net?: Net;
  // updatedSlot: number // this should be used to update old account info

  // info from program Changes
  count: number; // count tracks how often this account has been seen
  solDelta: number; // difference between last change amount and this one
  maxDelta: number; // maxDelta represents the max change in SOL seen during session
}

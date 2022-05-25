import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useEffect } from 'react';
import * as sol from '@solana/web3.js';
import { useAppDispatch, useAppSelector } from '../../hooks';

// https://redux.js.org/usage/usage-with-typescript#define-slice-state-and-action-types
// eslint-disable-next-line import/no-cycle
import { RootState } from '../../store';

const logger = window.electron.log;

export interface AccountMetaValues {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
export interface AccountMeta {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [publickey: string]: AccountMetaValues;
}
export interface AccountsState {
  loading: boolean;
  accounts: AccountMeta;
}

const initialState: AccountsState = {
  accounts: {},
  loading: true,
};

export const accountSlice = createSlice({
  name: 'account',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    // TODO - this needs a better name - its a bulk, over-write from server/main
    setAccount: (state, action: PayloadAction<AccountsState>) => {
      state.accounts = action.payload.accounts;
      state.loading = action.payload.loading;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setAccountValues: (
      state,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      action: PayloadAction<{ key: string; value: any }>
    ) => {
      if (!action.payload.key || action.payload.key === '') {
        return;
      }
      if (state.accounts) {
        logger.info(
          `renderer ACCOUNT-Set: overwriting meta for ${
            action.payload.key
          } with ${JSON.stringify(action.payload.value)}`
        );
        // TODO: need to merge existing key:value with incoming (and define how to delete a key..)
        state.accounts[action.payload.key] = action.payload.value;
        window.promiseIpc
          .send('ACCOUNT-Set', action.payload.key, action.payload.value)
          .catch(logger.error);
      }
    },
    reloadFromMain: (state) => {
      logger.info('triggerReload accounts from main (setting loading = true)');

      state.loading = true;
    },
  },
});

export const accountActions = accountSlice.actions;
export const { setAccountValues, reloadFromMain } = accountSlice.actions;

export const selectAccountsState = (state: RootState) => state.account;

export default accountSlice.reducer;

const { setAccount } = accountSlice.actions;
// get all accounts...
export function useAccountsState() {
  const account = useAppSelector(selectAccountsState);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (account.loading) {
      window.promiseIpc
        .send('ACCOUNT-GetAll')
        .then((ret: AccountMeta) => {
          logger.info('LOADING accounts from main');
          dispatch(
            setAccount({
              accounts: ret,
              loading: false,
            })
          );
          return `return ${ret}`;
        })
        .catch((e: Error) => logger.error(e));
    }
  }, [dispatch, account.loading, account.accounts]);

  return account;
}

// get a specific account
export function useAccountMeta(key: string | undefined) {
  const account = useAccountsState();

  if (!key || !account || account.loading || !account.accounts) {
    return undefined;
  }
  // exists to cater for the possibility that we need to do a round trip
  // for now, I'm just going to use the existing state
  return account.accounts[key];
}

// get a specific account
export function useKeypair(key: string | undefined) {
  const account = useAccountMeta(key);

  if (
    !key ||
    !account ||
    account.loading ||
    !account.accounts ||
    !account.accounts[key]
  ) {
    return undefined;
  }
  const pk = new Uint8Array({ length: 64 });
  // TODO: so i wanted a for loop, but somehow, all the magic TS stuff said nope.
  let i = 0;
  while (i < 64) {
    const index = i.toString();
    const value = account.accounts[key].privatekey[index];
    pk[i] = value;
    i += 1;
  }
  // const pk = account.accounts[key].privatekey as Uint8Array;
  try {
    return sol.Keypair.fromSecretKey(pk);
  } catch (e) {
    logger.error('useKeypair: ', e);
  }
  return undefined;
}

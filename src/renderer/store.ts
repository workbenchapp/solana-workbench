import { configureStore } from '@reduxjs/toolkit';
import throttle from 'lodash/throttle';

// https://redux.js.org/usage/usage-with-typescript#define-slice-state-and-action-types
// eslint-disable-next-line import/no-cycle
import ValidatorReducer from './data/ValidatorNetwork/validatorNetworkState';
// https://redux.js.org/usage/usage-with-typescript#define-slice-state-and-action-types
// eslint-disable-next-line import/no-cycle
import SelectedAccountsListReducer from './data/SelectedAccountsList/selectedAccountsState';
// https://redux.js.org/usage/usage-with-typescript#define-slice-state-and-action-types
// eslint-disable-next-line import/no-cycle
import ConfigReducer from './data/Config/configState';
// https://redux.js.org/usage/usage-with-typescript#define-slice-state-and-action-types
// eslint-disable-next-line import/no-cycle
import AccountReducer from './data/accounts/accountState';

import { saveState } from './data/localstorage';

const store = configureStore({
  reducer: {
    validatornetwork: ValidatorReducer,
    selectedaccounts: SelectedAccountsListReducer,
    config: ConfigReducer,
    account: AccountReducer,
  },
});

// TODO: this is a really bad way to save a subset of redux - as its triggered any time anything changes
// I think middleware is supposed to do it better
store.subscribe(
  throttle(() => {
    saveState('selectedaccounts', store.getState().selectedaccounts);
    saveState('config', store.getState().config);
    saveState('account', store.getState().account);
  }, 1000)
);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

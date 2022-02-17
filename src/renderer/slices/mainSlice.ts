import { combineReducers, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ValidatorState,
  AccountsState,
  WBAccount,
  ACCOUNTS_NONE_KEY,
} from 'types/types';

const validatorState: ValidatorState = {
  running: false,
  waitingForRun: false,
  loading: false,
};

export const validatorSlice = createSlice({
  name: 'validator',
  initialState: validatorState,
  reducers: {
    setValidatorRunning: (state, action: PayloadAction<boolean>) => {
      state.running = action.payload;
    },
    setValidatorWaitingForRun: (state, action: PayloadAction<boolean>) => {
      state.waitingForRun = action.payload;
    },
    setValidatorLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

const accountsState: AccountsState = {
  selectedAccount: undefined,
  listedAccounts: [],
  selected: '',
  hovered: '',
  edited: '',
  rootKey: '',
};

export const accountsSlice = createSlice({
  name: 'accounts',
  initialState: accountsState,
  reducers: {
    setListedAccounts: (state, action: PayloadAction<WBAccount[]>) => {
      state.listedAccounts = action.payload;
    },
    setAccountsRootKey: (state, action: PayloadAction<string>) => {
      state.rootKey = action.payload;
    },
    addAccount: (state, action: PayloadAction<string>) => {
      let pubKey = action.payload;
      if (!pubKey) {
        pubKey = ACCOUNTS_NONE_KEY;
      }
      state.listedAccounts.splice(0, 0, {
        pubKey,
        humanName: '',
      });
      state.selected = '';
      state.hovered = '';
      state.edited = ACCOUNTS_NONE_KEY;
    },
    shiftAccount: (state) => {
      state.listedAccounts.shift();
    },
    unshiftAccount: (state, action: PayloadAction<WBAccount>) => {
      if (state.listedAccounts[0].pubKey === ACCOUNTS_NONE_KEY) {
        state.listedAccounts[0] = action.payload;
      } else {
        state.listedAccounts.unshift(action.payload);
      }
    },
    rmAccount: (state, action: PayloadAction<string>) => {
      state.listedAccounts = state.listedAccounts.filter(
        (a) => a.pubKey !== action.payload
      );
    },
    setEdited: (state, action: PayloadAction<string>) => {
      state.edited = action.payload;
    },
    setHovered: (state, action: PayloadAction<string>) => {
      state.hovered = action.payload;
    },
    setSelected: (state, action: PayloadAction<string>) => {
      state.selected = action.payload;
    },
  },
});

const mainReducer = combineReducers({
  validator: validatorSlice.reducer,
  accounts: accountsSlice.reducer,
});

export type RootState = ReturnType<typeof mainReducer>;
export const {
  setValidatorRunning,
  setValidatorWaitingForRun,
  setValidatorLoading,
} = validatorSlice.actions;
export const {
  setListedAccounts,
  setAccountsRootKey,
  addAccount,
  shiftAccount,
  unshiftAccount,
  rmAccount,
  setEdited,
  setHovered,
  setSelected,
} = accountsSlice.actions;
export default mainReducer;

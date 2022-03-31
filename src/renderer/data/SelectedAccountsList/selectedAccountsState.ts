import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// https://redux.js.org/usage/usage-with-typescript#define-slice-state-and-action-types
// eslint-disable-next-line import/no-cycle
import { RootState } from '../../store';
import { loadState } from '../localstorage';
import { AccountInfo } from '../accounts/accountInfo';

export interface SelectedAccountsList {
  pinnedAccounts: string[]; // list of pubKeys (TODO: should really add net...)
  selectedAccount: string;
  hoveredAccount: string;
  editedAccount: string;
  rootKey: string;
}

// Define the initial state using that type
let initialState: SelectedAccountsList = {
  pinnedAccounts: [],
  selectedAccount: '',
  hoveredAccount: '',
  editedAccount: '',
  rootKey: '',
};
const loaded = loadState('selectedaccounts');
if (loaded) {
  // work out the schema change (30mar2022)
  if (loaded.listedAccounts) {
    loaded.pinnedAccounts = loaded.listedAccounts;
    delete loaded.listedAccounts;
  }
  if (loaded.pinnedAccounts) {
    for (let i = 0; i < initialState.pinnedAccounts.length; i += 1) {
      let val = loaded.pinnedAccounts[i];
      if (val instanceof Object) {
        val = val.pubKey;
        if (val) {
          loaded.pinnedAccounts[i] = val;
        }
      }
    }
    // ensure any listedAccount is only in the list once
    loaded.pinnedAccounts = Array.from(new Set(loaded.pinnedAccounts));
  }
  initialState = loaded;
}

export const selectedAccountsListSlice = createSlice({
  name: 'selectedaccounts',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    setAccounts: (state, action: PayloadAction<string[]>) => {
      state.pinnedAccounts = action.payload;
    },
    setRootKey: (state, action: PayloadAction<string>) => {
      state.rootKey = action.payload;
    },
    shift: (state) => {
      state.pinnedAccounts.shift();
    },
    unshift: (state, action: PayloadAction<AccountInfo>) => {
      state.pinnedAccounts.unshift(action.payload.pubKey);
    },
    rm: (state, action: PayloadAction<string>) => {
      state.pinnedAccounts = state.pinnedAccounts.filter(
        (a) => a !== action.payload
      );
    },
    setEdited: (state, action: PayloadAction<string>) => {
      state.editedAccount = action.payload;
    },
    setHovered: (state, action: PayloadAction<string>) => {
      state.hoveredAccount = action.payload;
    },
    setSelected: (state, action: PayloadAction<string>) => {
      state.selectedAccount = action.payload;
    },
  },
});

export const accountsActions = selectedAccountsListSlice.actions;
export const {
  setAccounts,
  setRootKey,
  shift,
  unshift,
  rm,
  setEdited,
  setHovered,
  setSelected,
} = selectedAccountsListSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectAccountsListState = (state: RootState) =>
  state.selectedaccounts;

export default selectedAccountsListSlice.reducer;

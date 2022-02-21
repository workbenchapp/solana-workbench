import { combineReducers, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import {
  ValidatorState,
  AccountsState,
  WBAccount,
  ACCOUNTS_NONE_KEY,
  ToastState,
  TOAST_BOTTOM_OFFSET,
  ToastProps,
  Net,
} from 'types/types';

const validatorState: ValidatorState = {
  net: Net.Localhost,
  running: false,
  waitingForRun: false,
  loading: false,
};

const toastState: ToastState = {
  toasts: [],
};

export const toastSlice = createSlice({
  name: 'toast',
  initialState: toastState,
  reducers: {
    rmToast: (state, action: PayloadAction<string | undefined>) => {
      state.toasts = state.toasts.filter((t) => {
        return t.toastKey !== action.payload;
      });
    },
    pushToast: (state, action: PayloadAction<ToastProps>) => {
      const newToast = action.payload;
      newToast.bottom = TOAST_BOTTOM_OFFSET * state.toasts.length + 1;
      newToast.toastKey = uuidv4();
      state.toasts.push(newToast);
    },
  },
});

export const validatorSlice = createSlice({
  name: 'validator',
  initialState: validatorState,
  reducers: {
    setNet: (state, action: PayloadAction<Net>) => {
      state.net = action.payload;
    },
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
  listedAccounts: [],
  selectedAccount: '',
  hoveredAccount: '',
  editedAccount: '',
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
    addAccount: (state, action: PayloadAction<string | undefined>) => {
      let pubKey = action.payload;
      if (!pubKey) {
        pubKey = ACCOUNTS_NONE_KEY;
      }

      // todo: this is stupid, net should be defined
      // (thread net through)
      state.listedAccounts.splice(0, 0, {
        net: undefined,
        pubKey,
        humanName: '',
      });
      state.selectedAccount = '';
      state.hoveredAccount = '';
      state.editedAccount = ACCOUNTS_NONE_KEY;
    },
    shiftAccount: (state) => {
      state.listedAccounts.shift();
    },
    unshiftAccount: (state, action: PayloadAction<WBAccount>) => {
      if (
        state.listedAccounts.length > 0 &&
        state.listedAccounts[0].pubKey === ACCOUNTS_NONE_KEY
      ) {
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

const mainReducer = combineReducers({
  toast: toastSlice.reducer,
  validator: validatorSlice.reducer,
  accounts: accountsSlice.reducer,
});

export type RootState = ReturnType<typeof mainReducer>;
export const { rmToast, pushToast } = toastSlice.actions;
export const {
  setValidatorRunning,
  setValidatorWaitingForRun,
  setValidatorLoading,
  setNet,
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

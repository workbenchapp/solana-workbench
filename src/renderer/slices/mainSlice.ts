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
  NetStatus,
  ConfigState,
} from 'types/types';

const validatorState: ValidatorState = {
  net: Net.Localhost,
  status: NetStatus.Unknown,
};

const toastState: ToastState = {
  toasts: [],
};

export const toastSlice = createSlice({
  name: 'toast',
  initialState: toastState,
  reducers: {
    rm: (state, action: PayloadAction<string | undefined>) => {
      state.toasts = state.toasts.filter((t) => {
        return t.toastKey !== action.payload;
      });
    },
    push: (state, action: PayloadAction<ToastProps>) => {
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
    setState: (state, action: PayloadAction<NetStatus>) => {
      state.status = action.payload;
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
    setAccounts: (state, action: PayloadAction<WBAccount[]>) => {
      state.listedAccounts = action.payload;
    },
    setRootKey: (state, action: PayloadAction<string>) => {
      state.rootKey = action.payload;
    },
    init: (state, action: PayloadAction<string | undefined>) => {
      // TODO: seems this method is only called once and undefined
      // is always passed in, do we need the arg any more?
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
    shift: (state) => {
      state.listedAccounts.shift();
    },
    unshift: (state, action: PayloadAction<WBAccount>) => {
      if (
        state.listedAccounts.length > 0 &&
        state.listedAccounts[0].pubKey === ACCOUNTS_NONE_KEY
      ) {
        state.listedAccounts[0] = action.payload;
      } else {
        state.listedAccounts.unshift(action.payload);
      }
    },
    rm: (state, action: PayloadAction<string>) => {
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

const configState: ConfigState = {
  loading: true,
  values: {},
};

export const configSlice = createSlice({
  name: 'config',
  initialState: configState,
  reducers: {
    set: (state, action: PayloadAction<ConfigState>) => {
      state.loading = action.payload.loading;
      state.values = action.payload.values;
    },
  },
});

const mainReducer = combineReducers({
  toast: toastSlice.reducer,
  validator: validatorSlice.reducer,
  accounts: accountsSlice.reducer,
  config: configSlice.reducer,
});

export type RootState = ReturnType<typeof mainReducer>;
const [toastActions, accountsActions, validatorActions, configActions] = [
  toastSlice.actions,
  accountsSlice.actions,
  validatorSlice.actions,
  configSlice.actions,
];
export {
  toastActions,
  accountsActions,
  validatorActions,
  configActions,
  mainReducer,
};

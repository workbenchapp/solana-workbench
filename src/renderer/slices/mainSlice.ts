import { combineReducers, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ValidatorState, AccountsState } from 'types/types';

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
};

export const accountsSlice = createSlice({
  name: 'accounts',
  initialState: accountsState,
  reducers: {},
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
export default mainReducer;

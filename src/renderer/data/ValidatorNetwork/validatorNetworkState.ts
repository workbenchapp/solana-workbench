import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// https://redux.js.org/usage/usage-with-typescript#define-slice-state-and-action-types
// eslint-disable-next-line import/no-cycle
import type { RootState } from '../../store';

// from https://react-redux.js.org/tutorials/typescript-quick-start

export enum Net {
  Localhost = 'localhost',
  Dev = 'devnet',
  Test = 'testnet',
  MainnetBeta = 'mainnet-beta',
}
export enum NetStatus {
  Unknown = 'unknown',
  Running = 'running',
  Unavailable = 'unavailable',
  Starting = 'starting',
}

export const netToURL = (net: Net): string => {
  switch (net) {
    case Net.Localhost:
      return 'http://127.0.0.1:8899';
    case Net.Dev:
      return 'https://api.devnet.solana.com';
    case Net.Test:
      return 'https://api.testnet.solana.com';
    case Net.MainnetBeta:
      return 'https://api.mainnet-beta.solana.com';
    default:
  }
  return '';
};

export interface ValidatorState {
  net: Net;
  status: NetStatus;
}

// Define the initial state using that type
const initialState: ValidatorState = {
  net: Net.Localhost,
  status: NetStatus.Unknown,
};

export const validatorNetworkSlice = createSlice({
  name: 'validatornetwork',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    setNet: (state, action: PayloadAction<Net>) => {
      state.net = action.payload;
    },
    setState: (state, action: PayloadAction<NetStatus>) => {
      state.status = action.payload;
    },
  },
});

export const accountsActions = validatorNetworkSlice.actions;
export const { setNet, setState } = validatorNetworkSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectValidatorNetworkState = (state: RootState) =>
  state.validatornetwork;

export default validatorNetworkSlice.reducer;

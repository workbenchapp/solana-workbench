import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// https://redux.js.org/usage/usage-with-typescript#define-slice-state-and-action-types
// eslint-disable-next-line import/no-cycle
import { RootState } from '../../store';
import { loadState } from '../localstorage';

export enum ConfigKey {
  AnalyticsEnabled = 'analytics_enabled',
}

export interface ConfigValues {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
const initialState: ConfigValues = {};
const loaded = loadState('config');
if (loaded) {
  Object.keys(loaded).forEach((element: string) => {
    initialState[element] = loaded[element];
  });
}

export const configSlice = createSlice({
  name: 'config',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setConfigValue: (
      state,
      action: PayloadAction<{ key: string; value: any }>
    ) => {
      state[action.payload.key] = action.payload.value;
    },
  },
});

export const configActions = configSlice.actions;
export const { setConfigValue } = configSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectConfigState = (state: RootState) => state.config;

export default configSlice.reducer;

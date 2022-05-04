import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// https://redux.js.org/usage/usage-with-typescript#define-slice-state-and-action-types
// eslint-disable-next-line import/no-cycle
import { RootState } from '../../store';

export enum ConfigKey {
  AnalyticsEnabled = 'analytics_enabled',
}

export interface ConfigValues {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
export interface ConfigState {
  loading: boolean;
  values: ConfigValues | undefined;
}

const initialState: ConfigState = {
  values: undefined,
  loading: true,
};

export const configSlice = createSlice({
  name: 'config',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<ConfigState>) => {
      state.values = action.payload.values;
      state.loading = action.payload.loading;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setConfigValue: (
      state,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      action: PayloadAction<{ key: string; value: any }>
    ) => {
      if (state.values) {
        state.values[action.payload.key] = action.payload.value;
      }
    },
  },
});

export const configActions = configSlice.actions;
export const { setConfig, setConfigValue } = configSlice.actions;

export const selectConfigState = (state: RootState) => state.config;

export default configSlice.reducer;

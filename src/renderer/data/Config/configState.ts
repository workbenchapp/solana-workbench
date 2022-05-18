import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ConfigMap } from 'types/types';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';

// https://redux.js.org/usage/usage-with-typescript#define-slice-state-and-action-types
// eslint-disable-next-line import/no-cycle
import { RootState } from '../../store';

const logger = window.electron.log;

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

export function useConfigState() {
  const config = useAppSelector(selectConfigState);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (config.loading) {
      window.promiseIpc
        .send('CONFIG-GetAll')
        .then((ret: ConfigMap) => {
          logger.info(`CONFIG-GetAll => ConfigMap ${JSON.stringify(ret)}`);
          dispatch(
            setConfig({
              values: ret,
              loading: false,
            })
          );
          return `return ${ret}`;
        })
        .catch((e) => logger.error(e));
    }
  }, [dispatch, config.loading]);

  return config;
}

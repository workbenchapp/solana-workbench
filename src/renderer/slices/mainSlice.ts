import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ValidatorState } from 'types/types';

const validatorState: ValidatorState = {
  running: false,
  waitingForRun: false,
  loading: false,
};

export const mainSlice = createSlice({
  name: 'main',
  initialState: {
    validatorState,
  },
  reducers: {
    setValidatorState: (state, action: PayloadAction<ValidatorState>) => {
      console.log('setting validator state', state, action);
      state.validatorState = action.payload;
    },
    setValidatorWaitingForRun: (state, action: PayloadAction<boolean>) => {
      state.validatorState.waitingForRun = action.payload;
    },
    setValidatorStateLoading: (state, action: PayloadAction<boolean>) => {
      state.validatorState.loading = action.payload;
    },
  },
});

export type RootState = ReturnType<typeof mainSlice.reducer>;
export const {
  setValidatorState,
  setValidatorWaitingForRun,
  setValidatorStateLoading,
} = mainSlice.actions;
export default mainSlice.reducer;

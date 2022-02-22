import { configureStore } from '@reduxjs/toolkit';
import { mainReducer } from './slices/mainSlice';

export default configureStore({
  reducer: mainReducer,
});

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AppState {
  isInitialized: boolean;
  theme: 'light' | 'dark' | 'system';
}

const initialState: AppState = {
  isInitialized: true,
  theme: 'system',
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
  },
});

export const { setInitialized, setTheme } = appSlice.actions;
export default appSlice.reducer;

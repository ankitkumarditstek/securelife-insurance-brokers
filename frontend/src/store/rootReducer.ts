import { combineReducers } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import chatReducer from '../features/chat/chatSlice';
import crmReducer from '../features/crm/crmSlice';
import documentsReducer from '../features/documents/documentsSlice';

export const rootReducer = combineReducers({
  app: appReducer,
  chat: chatReducer,
  crm: crmReducer,
  documents: documentsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ChatMessage, UIAction } from '../../types';

export interface ChatState {
  sessionToken: string | null;
  leadId: string | null;
  conversationId: string | null;
  messages: ChatMessage[];
  isAssistantTyping: boolean;
  conversationStatus: 'idle' | 'active' | 'complete' | 'ended' | 'error';
  leadStatus: string;
  uiAction: UIAction | null;
  capturedSlots: Record<string, unknown>;
  error: string | null;
}

const initialState: ChatState = {
  sessionToken: null,
  leadId: null,
  conversationId: null,
  messages: [],
  isAssistantTyping: false,
  conversationStatus: 'idle',
  leadStatus: 'new',
  uiAction: null,
  capturedSlots: {},
  error: null,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    startSession: (state) => {
      state.isAssistantTyping = true;
      state.error = null;
    },
    startSessionSuccess: (
      state,
      action: PayloadAction<{
        sessionToken: string;
        conversationId: string;
        leadId: string;
        messages: ChatMessage[];
      }>
    ) => {
      state.sessionToken = action.payload.sessionToken;
      state.conversationId = action.payload.conversationId;
      state.leadId = action.payload.leadId;
      state.messages = action.payload.messages;
      state.isAssistantTyping = false;
      state.conversationStatus = 'active';
      state.leadStatus = 'in_conversation';
    },
    startSessionFailure: (state, action: PayloadAction<string>) => {
      state.isAssistantTyping = false;
      state.conversationStatus = 'error';
      state.error = action.payload;
    },

    sendMessage: (state, action: PayloadAction<string>) => {
      void action;
      state.isAssistantTyping = true;
      state.error = null;
    },
    sendMessageOptimistic: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    sendMessageSuccess: (
      state,
      action: PayloadAction<{
        message: ChatMessage;
        captured: Record<string, unknown>;
        conversationStatus: string;
        leadStatus: string;
        uiActions: UIAction[];
      }>
    ) => {
      state.isAssistantTyping = false;
      state.messages.push(action.payload.message);
      state.capturedSlots = { ...state.capturedSlots, ...action.payload.captured };
      state.conversationStatus = action.payload
        .conversationStatus as ChatState['conversationStatus'];
      state.leadStatus = action.payload.leadStatus;
      if (action.payload.uiActions && action.payload.uiActions.length > 0) {
        state.uiAction = action.payload.uiActions[0];
      }
    },
    sendMessageFailure: (state, action: PayloadAction<{ tempId: string; error: string }>) => {
      state.isAssistantTyping = false;
      state.error = action.payload.error;
      const targetMsg = state.messages.find((m) => m.id === action.payload.tempId);
      if (targetMsg) {
        targetMsg.status = 'error';
      }
    },

    resumeSession: (state, action: PayloadAction<string>) => {
      void action;
      state.isAssistantTyping = true;
      state.error = null;
    },
    resumeSessionSuccess: (
      state,
      action: PayloadAction<{
        sessionToken: string;
        conversationId: string;
        leadId: string;
        conversationStatus: string;
        leadStatus: string;
        messages: ChatMessage[];
        capturedSlots: Record<string, unknown>;
        uiActions: UIAction[];
      }>
    ) => {
      state.isAssistantTyping = false;
      state.sessionToken = action.payload.sessionToken;
      state.conversationId = action.payload.conversationId;
      state.leadId = action.payload.leadId;
      state.conversationStatus = action.payload
        .conversationStatus as ChatState['conversationStatus'];
      state.leadStatus = action.payload.leadStatus;
      state.messages = action.payload.messages;
      state.capturedSlots = action.payload.capturedSlots;
      if (action.payload.uiActions && action.payload.uiActions.length > 0) {
        state.uiAction = action.payload.uiActions[0];
      }
    },
    resumeSessionFailure: (state, action: PayloadAction<string>) => {
      state.isAssistantTyping = false;
      state.error = action.payload;
    },

    dismissUIAction: (state) => {
      state.uiAction = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetChat: () => initialState,
  },
});

export const {
  startSession,
  startSessionSuccess,
  startSessionFailure,
  sendMessage,
  sendMessageOptimistic,
  sendMessageSuccess,
  sendMessageFailure,
  resumeSession,
  resumeSessionSuccess,
  resumeSessionFailure,
  dismissUIAction,
  clearError,
  resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;

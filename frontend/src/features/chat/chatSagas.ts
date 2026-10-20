import { call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import type {
  ChatMessage,
  CreateSessionApiResponse,
  ResumeSessionApiResponse,
  SendMessageApiResponse,
} from '../../types';
import {
  resumeSession,
  resumeSessionFailure,
  resumeSessionSuccess,
  sendMessage,
  sendMessageFailure,
  sendMessageOptimistic,
  sendMessageSuccess,
  startSession,
  startSessionFailure,
  startSessionSuccess,
} from './chatSlice';
import type { RootState } from '../../store/rootReducer';

const TOKEN_STORAGE_KEY = 'securelife_chat_token';

function* handleStartSession(): Generator<unknown, void, { data: CreateSessionApiResponse }> {
  try {
    const response = yield call(apiClient.post, '/chat/sessions');
    const data = response.data;

    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, data.session_token);
    } catch {
      // localStorage may be disabled in private mode
    }

    const messages: ChatMessage[] = data.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
      status: 'sent',
      metadata: m.metadata,
    }));

    yield put(
      startSessionSuccess({
        sessionToken: data.session_token,
        conversationId: data.conversation_id,
        leadId: data.lead_id,
        messages,
      })
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to connect to chat assistant';
    yield put(startSessionFailure(errorMsg));
  }
}

function* handleSendMessage(action: PayloadAction<string>): Generator<unknown, void, unknown> {
  const content = action.payload;
  const tempId = `temp-${Date.now()}`;

  const optimisticMsg: ChatMessage = {
    id: tempId,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  yield put(sendMessageOptimistic(optimisticMsg));

  const state = (yield select()) as RootState;
  const sessionToken = state.chat.sessionToken;

  if (!sessionToken) {
    yield put(
      sendMessageFailure({
        tempId,
        error: 'No active chat session found.',
      })
    );
    return;
  }

  try {
    const response = (yield call(apiClient.post, `/chat/sessions/${sessionToken}/messages`, {
      content,
    })) as { data: SendMessageApiResponse };

    const data = response.data;

    const assistantMsg: ChatMessage = {
      id: data.message.id,
      role: data.message.role,
      content: data.message.content,
      createdAt: data.message.created_at,
      status: 'sent',
      metadata: data.message.metadata,
    };

    yield put(
      sendMessageSuccess({
        message: assistantMsg,
        captured: data.captured,
        conversationStatus: data.conversation_status,
        leadStatus: data.lead_status,
        uiActions: data.ui_actions,
      })
    );
  } catch (error: unknown) {
    let errorMsg = 'Failed to send message. Please retry.';
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const axiosErr = error as {
        response?: {
          data?: {
            detail?: string | { error?: { message?: string }; message?: string };
          };
        };
      };
      const detail = axiosErr.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (detail?.error?.message) {
        errorMsg = detail.error.message;
      } else if (detail?.message) {
        errorMsg = detail.message;
      }
    } else if (error instanceof Error) {
      errorMsg = error.message;
    }
    yield put(sendMessageFailure({ tempId, error: errorMsg }));
  }
}

function* handleResumeSession(
  action: PayloadAction<string>
): Generator<unknown, void, { data: ResumeSessionApiResponse }> {
  const token = action.payload || localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  if (!token) {
    yield put(resumeSessionFailure('No session token available'));
    return;
  }

  try {
    const response = yield call(apiClient.get, `/chat/sessions/${token}`);
    const data = response.data;

    const messages: ChatMessage[] = data.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
      status: 'sent',
      metadata: m.metadata,
    }));

    yield put(
      resumeSessionSuccess({
        sessionToken: data.session_token,
        conversationId: data.conversation_id,
        leadId: data.lead_id,
        conversationStatus: data.conversation_status,
        leadStatus: data.lead_status,
        messages,
        capturedSlots: data.captured_slots,
        uiActions: data.ui_actions,
      })
    );
  } catch (error: unknown) {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
    const errorMsg = error instanceof Error ? error.message : 'Could not resume session';
    yield put(resumeSessionFailure(errorMsg));
    yield put(startSession());
  }
}

export function* chatSaga() {
  yield takeLatest(startSession.type, handleStartSession);
  yield takeEvery(sendMessage.type, handleSendMessage);
  yield takeLatest(resumeSession.type, handleResumeSession);
}

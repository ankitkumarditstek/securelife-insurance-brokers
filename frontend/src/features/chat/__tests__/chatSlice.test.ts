import { describe, it, expect } from 'vitest';
import chatReducer, {
  startSession,
  startSessionSuccess,
  startSessionFailure,
  sendMessageOptimistic,
  sendMessageSuccess,
  dismissUIAction,
  resetChat,
  type ChatState,
} from '../chatSlice';

describe('chatSlice', () => {
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

  it('handles startSession', () => {
    const nextState = chatReducer(initialState, startSession());
    expect(nextState.isAssistantTyping).toBe(true);
    expect(nextState.error).toBeNull();
  });

  it('handles startSessionSuccess', () => {
    const action = startSessionSuccess({
      sessionToken: 'test-token',
      conversationId: 'conv-123',
      leadId: 'lead-456',
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Hello!',
          createdAt: '2026-10-14T00:00:00Z',
          status: 'sent',
        },
      ],
    });
    const nextState = chatReducer(initialState, action);
    expect(nextState.sessionToken).toBe('test-token');
    expect(nextState.conversationStatus).toBe('active');
    expect(nextState.messages).toHaveLength(1);
    expect(nextState.isAssistantTyping).toBe(false);
  });

  it('handles startSessionFailure', () => {
    const nextState = chatReducer(initialState, startSessionFailure('Network error'));
    expect(nextState.conversationStatus).toBe('error');
    expect(nextState.error).toBe('Network error');
    expect(nextState.isAssistantTyping).toBe(false);
  });

  it('handles optimistic user message and success response with UI actions', () => {
    let state = chatReducer(
      initialState,
      sendMessageOptimistic({
        id: 'temp-1',
        role: 'user',
        content: 'I need health insurance',
        createdAt: '2026-10-14T00:00:01Z',
        status: 'pending',
      })
    );
    expect(state.messages).toHaveLength(1);

    state = chatReducer(
      state,
      sendMessageSuccess({
        message: {
          id: 'msg-2',
          role: 'assistant',
          content: 'Got it, looking at health plans.',
          createdAt: '2026-10-14T00:00:02Z',
          status: 'sent',
        },
        captured: { insurance_interest: ['health'] },
        conversationStatus: 'complete',
        leadStatus: 'qualified',
        uiActions: [{ type: 'show_upload', leadId: 'lead-456' }],
      })
    );
    expect(state.messages).toHaveLength(2);
    expect(state.capturedSlots.insurance_interest).toEqual(['health']);
    expect(state.leadStatus).toBe('qualified');
    expect(state.uiAction?.type).toBe('show_upload');

    // Dismiss UI action
    state = chatReducer(state, dismissUIAction());
    expect(state.uiAction).toBeNull();
  });

  it('handles resetChat', () => {
    const modifiedState: ChatState = {
      ...initialState,
      sessionToken: 'token',
      messages: [{ id: '1', role: 'user', content: 'hi', createdAt: '', status: 'sent' }],
    };
    const nextState = chatReducer(modifiedState, resetChat());
    expect(nextState.sessionToken).toBeNull();
    expect(nextState.messages).toHaveLength(0);
  });
});

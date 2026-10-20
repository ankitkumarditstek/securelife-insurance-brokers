import React, { useEffect, useRef } from 'react';
import { ShieldCheck, RefreshCw, Headphones, Info, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { startSession, sendMessage, resumeSession, dismissUIAction, resetChat } from '../chatSlice';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { QuickReplyChips } from './QuickReplyChips';
import { ChatInput } from './ChatInput';
import { UploadPromptCard } from './UploadPromptCard';

export const ChatWindow: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    messages,
    isAssistantTyping,
    conversationStatus,
    leadStatus,
    uiAction,
    error,
  } = useAppSelector((state) => state.chat);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  // Auto-scroll on new messages or typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAssistantTyping]);

  // Mount logic: resume existing session if token found, else start fresh
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const savedToken = localStorage.getItem('securelife_chat_token');
    if (savedToken) {
      dispatch(resumeSession(savedToken));
    } else {
      dispatch(startSession());
    }
  }, [dispatch]);

  const handleSend = (text: string) => {
    dispatch(sendMessage(text));
  };

  const handleRestart = () => {
    try {
      localStorage.removeItem('securelife_chat_token');
    } catch {
      // ignore
    }
    dispatch(resetChat());
    dispatch(startSession());
  };

  return (
    <div className="flex flex-col h-[750px] max-h-[90vh] w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-white">
                SecureLife Advisor
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Intelligent Lead Qualification & Coverage Assessment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleSend("I'd like to speak with a human broker, please.")}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Talk to a human broker"
          >
            <Headphones className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Consent Notice Banner */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span>
          Licensed broker decision support · Your inputs help match personalized coverage options.
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSend('Retry')}
            className="text-xs font-semibold text-rose-600 underline hover:text-rose-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isAssistantTyping && <TypingIndicator />}

        {/* Dynamic UI Actions Card (e.g. Upload card on qualification) */}
        {uiAction && uiAction.type === 'show_upload' && (
          <UploadPromptCard uiAction={uiAction} onDismiss={() => dispatch(dismissUIAction())} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Footer Area */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shrink-0">
        <QuickReplyChips
          onSelect={handleSend}
          disabled={isAssistantTyping || conversationStatus === 'ended'}
        />
        <ChatInput
          onSendMessage={handleSend}
          disabled={isAssistantTyping || conversationStatus === 'ended'}
        />
        <div className="px-2 py-1 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            Status:{' '}
            <strong className="font-semibold text-slate-600 dark:text-slate-300 capitalize">
              {leadStatus.replace('_', ' ')}
            </strong>
          </span>
          <span>Encrypted & Confidential</span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Bot, User, AlertCircle, Check } from 'lucide-react';
import type { ChatMessage } from '../../../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex items-start gap-3 my-3 group transition-all duration-200 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${
          isUser
            ? 'bg-blue-600 text-white border-blue-700'
            : 'bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble Body */}
      <div className={`max-w-[78%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl shadow-xs text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-xs'
              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-tl-xs'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Footer timestamp and status indicator */}
        <div className="flex items-center gap-1.5 mt-1 px-1 text-[11px] text-slate-400 dark:text-slate-500">
          <span>{formattedTime}</span>
          {isUser && message.status === 'pending' && (
            <span className="text-amber-500 font-medium">Sending...</span>
          )}
          {isUser && message.status === 'sent' && (
            <Check className="w-3.5 h-3.5 text-blue-500 inline" />
          )}
          {isUser && message.status === 'error' && (
            <span className="flex items-center gap-0.5 text-rose-500 font-medium">
              <AlertCircle className="w-3 h-3" /> Failed
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

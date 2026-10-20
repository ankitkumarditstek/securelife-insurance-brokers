import React from 'react';
import { Bot } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-start gap-3 my-2 animate-fade-in" data-testid="typing-indicator">
      <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs inline-flex items-center gap-1.5 border border-slate-200/50 dark:border-slate-700/50">
        <span
          className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
};

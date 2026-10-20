import React from 'react';
import { MessageSquare, Bot, User, CheckCircle2 } from 'lucide-react';
import type { LeadMessageItem } from '../../../types/crm';

interface ConversationViewProps {
  messages: LeadMessageItem[];
  leadName?: string | null;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  leadName,
}) => {
  if (messages.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
        <h4 className="text-xs font-bold text-slate-300">No Chat Transcript Found</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          This lead was created manually or through an external channel without an interactive web session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span>Interactive Prospect Conversation Transcript</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Read-only record of qualification dialogue between SecureLife Assistant and {leadName || 'Prospect'}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800">
          {messages.length} Dialogue Turns
        </span>
      </div>

      {/* Message Stream */}
      <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-2">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs shadow-xs ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-cyan-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[78%] rounded-2xl p-3.5 space-y-1.5 text-xs shadow-sm ${
                  isUser
                    ? 'bg-blue-600/90 text-white border border-blue-500/40 rounded-tr-xs'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] opacity-75">
                  <span className="font-semibold">{isUser ? (leadName || 'Prospect') : 'SecureLife Assistant'}</span>
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                {/* Metadata / Slot Tag chips */}
                {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1">
                    {Object.entries(msg.metadata).map(([k, v]) => (
                      <span
                        key={k}
                        className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-black/20 border border-white/10 text-slate-300 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{k}: {String(v)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

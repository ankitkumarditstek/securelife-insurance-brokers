import React from 'react';
import {
  MessageSquare,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { LeadDetail, LeadMessageItem, LeadNoteItem, LeadStatusHistoryItem } from '../../../types/crm';
import { getStatusBadgeConfig } from '../../../utils/statusStyles';

interface JourneyTimelineProps {
  lead: LeadDetail;
  history: LeadStatusHistoryItem[];
  messages: LeadMessageItem[];
  notes: LeadNoteItem[];
  onSwitchTab?: (tabKey: 'journey' | 'conversation' | 'documents' | 'analysis' | 'activity') => void;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({
  lead,
  history,
  messages,
  notes,
  onSwitchTab,
}) => {
  // Aggregate events into chronological timeline
  interface TimelineEvent {
    id: string;
    type: 'created' | 'chat' | 'qualified' | 'document' | 'transition' | 'note';
    title: string;
    description: string;
    timestamp: string;
    icon: React.ElementType;
    iconColor: string;
    badge?: string;
    badgeColor?: string;
    actionTab?: 'conversation' | 'documents' | 'analysis' | 'activity';
  }

  const events: TimelineEvent[] = [];

  // 1. Created Event
  events.push({
    id: 'created',
    type: 'created',
    title: 'Lead Captured via Web Chat',
    description: `Initiated session through web assistant. Interest in ${lead.profile.insurance_interest?.join(', ') || 'Insurance'}.`,
    timestamp: lead.created_at,
    icon: User,
    iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  });

  // 2. Chat Conversation Event
  if (messages.length > 0) {
    events.push({
      id: 'chat_completed',
      type: 'chat',
      title: `Conversational Qualification (${messages.length} messages)`,
      description: `Qualified slot values captured: full_name, budget, existing policy status.`,
      timestamp: messages[messages.length - 1]?.created_at || lead.created_at,
      icon: MessageSquare,
      iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      badge: `${messages.length} turns`,
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      actionTab: 'conversation',
    });
  }

  // 3. Qualification Event
  if (lead.qualification.score !== null) {
    events.push({
      id: 'qualified',
      type: 'qualified',
      title: `Qualification Score: ${lead.qualification.score}/100 (${lead.qualification.tier?.toUpperCase()} Tier)`,
      description: 'Calculated using deterministic rule engine across intent, budget, timeline, and policy existence.',
      timestamp: lead.created_at,
      icon: ShieldCheck,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      badge: `${lead.qualification.tier?.toUpperCase()} TIER`,
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    });
  }

  // 4. Status Transition Events
  history.forEach((h, idx) => {
    const statusCfg = getStatusBadgeConfig(h.to_status);
    events.push({
      id: `history-${idx}`,
      type: 'transition',
      title: `Status Transition: ${statusCfg.label}`,
      description: h.reason ? `Reason: ${h.reason}` : `Pipeline status changed to ${statusCfg.label}`,
      timestamp: h.created_at,
      icon: ArrowRight,
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      badge: h.changed_by_type === 'user' ? 'Broker Action' : 'System Automation',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      actionTab: 'activity',
    });
  });

  // 5. Notes Events
  notes.forEach((n, idx) => {
    events.push({
      id: `note-${idx}`,
      type: 'note',
      title: `Note by ${n.author?.full_name || 'Broker'}`,
      description: n.body,
      timestamp: n.created_at,
      icon: FileText,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      actionTab: 'activity',
    });
  });

  // Sort events chronologically (oldest to newest)
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Complete Lead Journey & Milestone Audit</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            End-to-end timeline from anonymous chat interaction to underwriting and status governance
          </p>
        </div>
      </div>

      {/* Vertical Timeline Stack */}
      <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {events.map((ev) => {
          const Icon = ev.icon;
          return (
            <div key={ev.id} className="relative group">
              {/* Dot Icon Indicator */}
              <div
                className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${ev.iconColor}`}
              >
                <Icon className="w-3 h-3" />
              </div>

              {/* Event Content Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 transition-all space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{ev.title}</span>
                    {ev.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ev.badgeColor}`}>
                        {ev.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {new Date(ev.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{ev.description}</p>

                {ev.actionTab && onSwitchTab && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onSwitchTab(ev.actionTab!)}
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>View in {ev.actionTab} tab</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
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

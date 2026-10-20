import React from 'react';
import { AlertCircle, Flame, FileCheck, Clock, ArrowRight } from 'lucide-react';
import type { DashboardSummary, LeadListItem } from '../../../types/crm';

interface AttentionPanelProps {
  summary: DashboardSummary | null;
  leads: LeadListItem[];
  onSelectLead: (leadId: string) => void;
  onOpenReviewQueue: () => void;
}

export const AttentionPanel: React.FC<AttentionPanelProps> = ({
  summary,
  leads,
  onSelectLead,
  onOpenReviewQueue,
}) => {
  // Find unassigned hot leads
  const unassignedHotLeads = leads.filter(
    (l) => (l.qualification_tier === 'hot' || (l.qualification_score ?? 0) >= 80) && !l.assigned_to
  );

  const docsWaitingCount = summary?.documents_awaiting_review ?? 0;
  const hotLeadsCount = summary?.hot_leads_waiting ?? unassignedHotLeads.length;

  if (unassignedHotLeads.length === 0 && docsWaitingCount === 0) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">All priorities clear.</span>
          <span>No unassigned hot leads or bottlenecked documents awaiting review.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/90 border border-slate-800/80 backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Action Required & Priority Queue
            </h3>
            <p className="text-[11px] text-slate-400">
              Immediate tasks requiring broker triage and underwriting verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hotLeadsCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="w-3 h-3" />
              {hotLeadsCount} Hot Leads
            </span>
          )}
          {docsWaitingCount > 0 && (
            <button
              onClick={onOpenReviewQueue}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <FileCheck className="w-3 h-3" />
              {docsWaitingCount} Docs To Review
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {/* Unassigned Hot Leads */}
        {unassignedHotLeads.slice(0, 3).map((lead) => (
          <div
            key={lead.id}
            onClick={() => onSelectLead(lead.id)}
            className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                {lead.qualification_score ?? 85}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                  {lead.full_name || 'Anonymous Hot Prospect'}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span className="text-rose-400 font-medium">Unassigned Hot Lead</span>
                  <span>·</span>
                  <span>{lead.location || 'Location Pending'}</span>
                </div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>
        ))}

        {/* Documents Needing Review Card */}
        {docsWaitingCount > 0 && (
          <div
            onClick={onOpenReviewQueue}
            className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                  {docsWaitingCount} Policy Extractions Pending
                </div>
                <div className="text-[10px] text-slate-400">
                  Low confidence or missing fields require analyst verification
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-all">
              Review Queue →
            </span>
          </div>
        )}

        {/* Renewal timeframe alert */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-400 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-white font-medium block">Urgent 30-Day Renewals</span>
              <span className="text-[10px]">Auto-prioritizing leads nearing policy expiry</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

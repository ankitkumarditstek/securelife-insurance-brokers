import React from 'react';
import { Flame } from 'lucide-react';
import type { LeadListItem, PipelineStageGroup } from '../../../types/crm';

interface PipelineKanbanProps {
  stages: PipelineStageGroup[];
  leads?: LeadListItem[];
  onSelectLead: (leadId: string) => void;
  selectedLeadId?: string | null;
}

const STAGES: { key: string; label: string; dotColor: string }[] = [
  { key: 'new', label: 'New', dotColor: 'bg-slate-400' },
  { key: 'in_conversation', label: 'Chatting', dotColor: 'bg-blue-400 animate-pulse' },
  { key: 'qualified', label: 'Qualified', dotColor: 'bg-emerald-400' },
  { key: 'documents_pending', label: 'Docs Pending', dotColor: 'bg-amber-400' },
  { key: 'documents_processing', label: 'Processing', dotColor: 'bg-orange-400 animate-pulse' },
  { key: 'under_review', label: 'Under Review', dotColor: 'bg-purple-400' },
  { key: 'analysis_complete', label: 'Analysis Ready', dotColor: 'bg-indigo-400' },
  { key: 'closed_won', label: 'Won', dotColor: 'bg-teal-400' },
];

export const PipelineKanban: React.FC<PipelineKanbanProps> = ({
  stages,
  leads = [],
  onSelectLead,
  selectedLeadId,
}) => {
  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-3.5 min-w-[1280px]">
        {STAGES.map((col) => {
          const stageGroup = stages.find((s) => s.stage === col.key);
          const colLeads =
            stageGroup && stageGroup.leads && stageGroup.leads.length > 0
              ? stageGroup.leads
              : leads.filter((l) => l.status === col.key);
          const count = stageGroup ? stageGroup.count : colLeads.length;

          return (
            <div
              key={col.key}
              className="flex-1 min-w-[200px] max-w-[240px] bg-slate-900/60 rounded-2xl border border-slate-800/80 p-3 flex flex-col backdrop-blur-xs"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className="text-xs font-bold text-slate-200 tracking-tight">
                    {col.label}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                  {count}
                </span>
              </div>

              {/* Cards Column */}
              <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[520px] pr-0.5">
                {colLeads.length === 0 ? (
                  <div className="h-24 rounded-xl border border-dashed border-slate-800/80 flex items-center justify-center text-[11px] text-slate-600">
                    Empty Stage
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const isSelected = selectedLeadId === lead.id;
                    const isHot = lead.qualification_tier === 'hot';
                    return (
                      <div
                        key={lead.id}
                        onClick={() => onSelectLead(lead.id)}
                        className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 ${
                          isSelected
                            ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        {/* Lead Top Badges */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                            {lead.insurance_interest?.[0] || 'Coverage'}
                          </span>
                          {isHot && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                              <Flame className="w-2.5 h-2.5" />
                              HOT
                            </span>
                          )}
                        </div>

                        {/* Name & Contact */}
                        <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                          {lead.full_name || 'Anonymous Prospect'}
                        </h4>

                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {lead.location || lead.email || 'Web Chat Lead'}
                        </p>

                        {/* Card Footer Details */}
                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                          <div className="flex items-center gap-1">
                            {lead.qualification_score !== null && (
                              <span
                                className={`font-bold ${
                                  lead.qualification_score >= 80
                                    ? 'text-rose-400'
                                    : lead.qualification_score >= 50
                                      ? 'text-amber-400'
                                      : 'text-slate-400'
                                }`}
                              >
                                {lead.qualification_score} pts
                              </span>
                            )}
                          </div>
                          {lead.assigned_to ? (
                            <span className="truncate max-w-[80px] text-slate-400">
                              {lead.assigned_to.full_name.split(' ')[0]}
                            </span>
                          ) : (
                            <span className="text-amber-500/80">Unassigned</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

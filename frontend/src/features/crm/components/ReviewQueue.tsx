import React from 'react';
import { FileCheck, ArrowRight, Eye, CheckCircle2 } from 'lucide-react';
import type { LeadListItem } from '../../../types/crm';

interface ReviewQueueProps {
  leads: LeadListItem[];
  onSelectLeadForReview: (leadId: string) => void;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({
  leads,
  onSelectLeadForReview,
}) => {
  // Leads currently requiring document review or underwriting
  const reviewLeads = leads.filter(
    (l) => l.status === 'under_review' || l.status === 'documents_processing'
  );

  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2.5">
            <FileCheck className="w-5 h-5 text-amber-400" />
            <span>Document Extraction & Underwriting Review Queue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit extracted policy schedules, resolve missing core fields, and verify data before final client recommendation.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
            {reviewLeads.length} Leads in Review Stage
          </span>
        </div>
      </div>

      {/* Review Queue Items */}
      {reviewLeads.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Review Queue is Clear</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All extracted policy documents have been audited and verified by the underwriting team.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {reviewLeads.map((lead) => (
            <div
              key={lead.id}
              className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900 transition-all space-y-4 flex flex-col justify-between group shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Needs Broker Verification
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Score: {lead.qualification_score ?? '—'}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                    {lead.full_name || 'Anonymous Prospect'}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {lead.location || 'Location Pending'} · Contact: {lead.phone || lead.email || '—'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {lead.insurance_interest && lead.insurance_interest.map((item) => (
                    <span
                      key={item}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-1.5 text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Document Status:</span>
                    <span className="font-semibold text-purple-400 capitalize">
                      {lead.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Assigned Broker:</span>
                    <span className="text-white">
                      {lead.assigned_to ? lead.assigned_to.full_name : 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectLeadForReview(lead.id)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Launch Document Reviewer</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

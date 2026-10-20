import React from 'react';
import { Flame, Clock, TrendingUp, FileCheck2, Users } from 'lucide-react';
import type { DashboardSummary } from '../../../types/crm';

interface SummaryCardsProps {
  summary: DashboardSummary | null;
  onFilterStage?: (stage: string | null) => void;
  activeFilter?: string | null;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  onFilterStage,
  activeFilter,
}) => {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800" />
        ))}
      </div>
    );
  }

  const {
    avg_hours_to_analysis = 0,
    conversion_rate = 0,
    hot_leads_waiting = 0,
    documents_awaiting_review = 0,
  } = summary;

  const totals = summary.totals || {
    all: 0,
    new: 0,
    in_conversation: 0,
    qualified: 0,
    documents_pending: 0,
    documents_processing: 0,
    under_review: 0,
    analysis_complete: 0,
    closed_won: 0,
    closed_lost: 0,
    disqualified: 0,
  };

  const cards = [
    {
      title: 'Total Pipeline Leads',
      value: totals.all,
      subtitle: `${totals.qualified} Qualified`,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      stage: null,
    },
    {
      title: 'Hot Leads Waiting',
      value: hot_leads_waiting,
      subtitle: 'Immediate broker callback',
      icon: Flame,
      color: 'from-amber-500 to-rose-600',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      stage: 'qualified',
    },
    {
      title: 'Docs Under Review',
      value: documents_awaiting_review,
      subtitle: `${totals.under_review} in review stage`,
      icon: FileCheck2,
      color: 'from-emerald-500 to-teal-600',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      stage: 'under_review',
    },
    {
      title: 'Pipeline Conversion',
      value: `${Math.round(conversion_rate * 100)}%`,
      subtitle: `Avg. analysis: ${avg_hours_to_analysis}h`,
      icon: TrendingUp,
      color: 'from-violet-500 to-purple-600',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      stage: 'closed_won',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.stage;
        return (
          <div
            key={card.title}
            onClick={() => onFilterStage && onFilterStage(card.stage)}
            className={`relative overflow-hidden rounded-2xl p-4.5 bg-slate-900/90 border transition-all duration-300 cursor-pointer group hover:-translate-y-0.5 hover:shadow-lg ${
              isActive
                ? 'border-blue-500 ring-1 ring-blue-500/40 shadow-blue-500/10'
                : 'border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                {card.title}
              </span>
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-xs`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-white">{card.value}</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${card.badgeColor}`}
              >
                {card.subtitle}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Clock className="w-3 h-3" />
              <span>Realtime CRM telemetry</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

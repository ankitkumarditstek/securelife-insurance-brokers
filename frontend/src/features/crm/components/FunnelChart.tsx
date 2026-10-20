import React from 'react';
import { TrendingUp, Users, CheckCircle2, FileText, BrainCircuit, Trophy } from 'lucide-react';
import type { DashboardSummary } from '../../../types/crm';

interface FunnelChartProps {
  summary: DashboardSummary | null;
  onFilterStage?: (stage: string | null) => void;
  activeStage?: string | null;
}

export const FunnelChart: React.FC<FunnelChartProps> = ({
  summary,
  onFilterStage,
  activeStage,
}) => {
  const totals = summary?.totals || {
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

  const total = Math.max(1, totals.all);
  const qualifiedTotal = totals.qualified + totals.documents_pending + totals.documents_processing + totals.under_review + totals.analysis_complete + totals.closed_won;
  const docsTotal = totals.under_review + totals.analysis_complete + totals.closed_won;
  const analysisTotal = totals.analysis_complete + totals.closed_won;
  const wonTotal = totals.closed_won;

  const funnelSteps = [
    {
      key: 'all',
      stageName: 'Total Leads Captured',
      stageFilter: null,
      count: totals.all,
      percentage: 100,
      icon: Users,
      color: 'bg-blue-600',
      gradient: 'from-blue-600 to-indigo-600',
    },
    {
      key: 'qualified',
      stageName: 'Qualified Prospects',
      stageFilter: 'qualified',
      count: qualifiedTotal,
      percentage: Math.round((qualifiedTotal / total) * 100),
      icon: CheckCircle2,
      color: 'bg-emerald-500',
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      key: 'under_review',
      stageName: 'Documents Underwritten',
      stageFilter: 'under_review',
      count: docsTotal,
      percentage: Math.round((docsTotal / total) * 100),
      icon: FileText,
      color: 'bg-purple-500',
      gradient: 'from-purple-500 to-indigo-500',
    },
    {
      key: 'analysis_complete',
      stageName: 'Decision Support Generated',
      stageFilter: 'analysis_complete',
      count: analysisTotal,
      percentage: Math.round((analysisTotal / total) * 100),
      icon: BrainCircuit,
      color: 'bg-cyan-500',
      gradient: 'from-cyan-500 to-blue-500',
    },
    {
      key: 'closed_won',
      stageName: 'Policy Bound (Won)',
      stageFilter: 'closed_won',
      count: wonTotal,
      percentage: Math.round((wonTotal / total) * 100),
      icon: Trophy,
      color: 'bg-emerald-400',
      gradient: 'from-emerald-400 to-green-500',
    },
  ];

  return (
    <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Pipeline Conversion Funnel & Velocity</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            End-to-end conversion efficiency from prospect qualification to policy binding
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">Overall Win Rate:</span>
            <span className="font-bold text-emerald-400">
              {Math.round((wonTotal / total) * 100)}%
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">Avg Analysis Time:</span>
            <span className="font-bold text-blue-400">
              {summary?.avg_hours_to_analysis ?? 0.4}h
            </span>
          </div>
        </div>
      </div>

      {/* Funnel Visual Stack */}
      <div className="space-y-3.5">
        {funnelSteps.map((step, idx) => {
          const Icon = step.icon;
          const isSelected = activeStage === step.stageFilter;

          return (
            <div
              key={step.key}
              onClick={() => onFilterStage && onFilterStage(step.stageFilter)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-slate-800/90 border-blue-500 ring-1 ring-blue-500/40 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${step.gradient} text-white flex items-center justify-center shadow-xs`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {step.stageName}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-2">
                      Stage {idx + 1}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white">
                    {step.count}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">leads</span>
                  </span>
                  <span className="text-xs font-extrabold text-slate-300 w-10 text-right">
                    {step.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden relative">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${step.gradient} transition-all duration-500`}
                  style={{ width: `${Math.max(4, step.percentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

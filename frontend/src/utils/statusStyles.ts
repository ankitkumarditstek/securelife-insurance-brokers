/**
 * Central design tokens & badge styling map for CRM Lifecycle Statuses & Qualification Tiers.
 * Follows FRD-05 Design System guidelines.
 */

export interface StatusStyleConfig {
  key: string;
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
  glowColor?: string;
  description: string;
}

export interface TierStyleConfig {
  tier: 'hot' | 'warm' | 'cold' | 'unscored';
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
  ringColor: string;
  glowColor: string;
}

export const STATUS_STYLES: Record<string, StatusStyleConfig> = {
  new: {
    key: 'new',
    label: 'New Prospect',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/20',
    badgeText: 'text-blue-400',
    dotColor: 'bg-blue-400',
    description: 'Initial prospect captured via web chat widget',
  },
  in_conversation: {
    key: 'in_conversation',
    label: 'In Conversation',
    badgeBg: 'bg-cyan-500/10',
    badgeBorder: 'border-cyan-500/20',
    badgeText: 'text-cyan-400',
    dotColor: 'bg-cyan-400',
    description: 'Engaging with automated qualification chatbot',
  },
  qualified: {
    key: 'qualified',
    label: 'Qualified Lead',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/20',
    badgeText: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    glowColor: 'shadow-emerald-500/20',
    description: 'Lead score passed qualification threshold (>=50 pts)',
  },
  documents_pending: {
    key: 'documents_pending',
    label: 'Docs Pending',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/20',
    badgeText: 'text-amber-400',
    dotColor: 'bg-amber-400',
    description: 'Awaiting policy schedule or renewal documents from client',
  },
  documents_processing: {
    key: 'documents_processing',
    label: 'Docs Processing',
    badgeBg: 'bg-indigo-500/10',
    badgeBorder: 'border-indigo-500/20',
    badgeText: 'text-indigo-400',
    dotColor: 'bg-indigo-400',
    description: 'OCR rasterization & LLM schema extraction in progress',
  },
  under_review: {
    key: 'under_review',
    label: 'Under Review',
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/20',
    badgeText: 'text-purple-400',
    dotColor: 'bg-purple-400',
    glowColor: 'shadow-purple-500/20',
    description: 'Extracted policy data ready for broker underwriting & verification',
  },
  analysis_complete: {
    key: 'analysis_complete',
    label: 'Analysis Complete',
    badgeBg: 'bg-teal-500/10',
    badgeBorder: 'border-teal-500/20',
    badgeText: 'text-teal-400',
    dotColor: 'bg-teal-400',
    glowColor: 'shadow-teal-500/20',
    description: 'AI gap & savings decision support generated for broker',
  },
  closed_won: {
    key: 'closed_won',
    label: 'Closed Won',
    badgeBg: 'bg-emerald-600/20',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-300 font-bold',
    dotColor: 'bg-emerald-400',
    glowColor: 'shadow-emerald-500/30',
    description: 'Client accepted proposal and policy bound',
  },
  closed_lost: {
    key: 'closed_lost',
    label: 'Closed Lost',
    badgeBg: 'bg-slate-800/60',
    badgeBorder: 'border-slate-700/60',
    badgeText: 'text-slate-400',
    dotColor: 'bg-slate-500',
    description: 'Client declined recommendation or went with competitor',
  },
  disqualified: {
    key: 'disqualified',
    label: 'Disqualified',
    badgeBg: 'bg-rose-500/10',
    badgeBorder: 'border-rose-500/20',
    badgeText: 'text-rose-400',
    dotColor: 'bg-rose-400',
    description: 'Lead out of geographic or appetite underwriting guidelines',
  },
};

export const TIER_STYLES: Record<string, TierStyleConfig> = {
  hot: {
    tier: 'hot',
    label: 'Hot Lead',
    badgeBg: 'bg-gradient-to-r from-rose-500/20 to-orange-500/20',
    badgeBorder: 'border-rose-500/40',
    badgeText: 'text-rose-400 font-bold',
    dotColor: 'bg-rose-500',
    ringColor: 'stroke-rose-500',
    glowColor: 'shadow-rose-500/30',
  },
  warm: {
    tier: 'warm',
    label: 'Warm Lead',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400 font-semibold',
    dotColor: 'bg-amber-400',
    ringColor: 'stroke-amber-400',
    glowColor: 'shadow-amber-500/20',
  },
  cold: {
    tier: 'cold',
    label: 'Cold Lead',
    badgeBg: 'bg-slate-800/80',
    badgeBorder: 'border-slate-700/80',
    badgeText: 'text-slate-400',
    dotColor: 'bg-slate-400',
    ringColor: 'stroke-slate-500',
    glowColor: 'shadow-slate-500/10',
  },
  unscored: {
    tier: 'unscored',
    label: 'Unscored',
    badgeBg: 'bg-slate-900/60',
    badgeBorder: 'border-slate-800',
    badgeText: 'text-slate-500',
    dotColor: 'bg-slate-600',
    ringColor: 'stroke-slate-700',
    glowColor: '',
  },
};

export const getStatusBadgeConfig = (status: string): StatusStyleConfig => {
  return (
    STATUS_STYLES[status] || {
      key: status,
      label: status.replace(/_/g, ' '),
      badgeBg: 'bg-slate-800/60',
      badgeBorder: 'border-slate-700/60',
      badgeText: 'text-slate-300',
      dotColor: 'bg-slate-400',
      description: status,
    }
  );
};

export const getTierBadgeConfig = (
  tier?: string | null,
  score?: number | null
): TierStyleConfig => {
  if (tier && TIER_STYLES[tier]) {
    return TIER_STYLES[tier];
  }
  if (typeof score === 'number') {
    if (score >= 80) return TIER_STYLES.hot;
    if (score >= 50) return TIER_STYLES.warm;
    return TIER_STYLES.cold;
  }
  return TIER_STYLES.unscored;
};

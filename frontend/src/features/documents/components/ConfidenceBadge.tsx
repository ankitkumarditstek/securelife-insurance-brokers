import React from 'react';
import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react';

interface ConfidenceBadgeProps {
  score?: number | null;
  size?: 'sm' | 'md';
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score = 0,
  size = 'md',
}) => {
  const normalized = Math.round((score || 0) * 100);

  if (normalized >= 85) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border bg-emerald-950/40 text-emerald-400 border-emerald-500/30 ${
          size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-0.5'
        }`}
      >
        <ShieldCheck className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        {normalized}% High Conf.
      </span>
    );
  }

  if (normalized >= 70) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border bg-amber-950/40 text-amber-400 border-amber-500/30 ${
          size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-0.5'
        }`}
      >
        <Shield className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        {normalized}% Moderate
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border bg-rose-950/40 text-rose-400 border-rose-500/30 ${
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-0.5'
      }`}
    >
      <ShieldAlert className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {normalized}% Low Conf.
    </span>
  );
};

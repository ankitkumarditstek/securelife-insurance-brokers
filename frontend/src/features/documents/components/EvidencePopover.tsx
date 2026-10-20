import React, { useState } from 'react';
import { FileSearch, HelpCircle } from 'lucide-react';
import type { EvidenceItem } from '../../../types/document';

interface EvidencePopoverProps {
  evidence?: EvidenceItem | null;
  label?: string;
}

export const EvidencePopover: React.FC<EvidencePopoverProps> = ({
  evidence,
  label = 'Evidence',
}) => {
  const [open, setOpen] = useState(false);

  if (!evidence || !evidence.quote) {
    return null;
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 bg-blue-950/40 border border-blue-800/40 rounded-md px-1.5 py-0.5 transition-colors cursor-pointer"
        title="View extraction evidence quote"
      >
        <FileSearch className="w-3 h-3" />
        <span>P.{evidence.page}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 p-3 bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl backdrop-blur-md text-xs text-slate-300 font-sans animate-fade-in">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
            <span className="font-bold text-slate-200 flex items-center gap-1 text-[11px]">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              {label} (Page {evidence.page})
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white text-[10px]"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] italic bg-slate-950/60 p-2 rounded-xl border border-slate-800/70 text-slate-300 leading-relaxed break-words">
            "{evidence.quote}"
          </p>
        </div>
      )}
    </div>
  );
};

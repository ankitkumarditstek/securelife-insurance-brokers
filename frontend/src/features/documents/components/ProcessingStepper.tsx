import React from 'react';
import { CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';

interface ProcessingStepperProps {
  status: string;
  error?: string | null;
}

export const ProcessingStepper: React.FC<ProcessingStepperProps> = ({
  status,
  error,
}) => {
  const steps = [
    { key: 'uploaded', label: 'Uploaded' },
    { key: 'reading', label: 'Reading / OCR' },
    { key: 'extracting', label: 'LLM Extraction' },
    { key: 'ready', label: 'Review Ready' },
  ];

  let activeIndex = 0;
  if (status === 'queued') activeIndex = 0;
  else if (status === 'processing') activeIndex = 2;
  else if (status === 'extracted' || status === 'needs_review' || status === 'verified') activeIndex = 3;

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/40 text-xs text-rose-300">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <span className="font-semibold">Processing Failed:</span>
        <span className="truncate">{error || 'Could not parse document'}</span>
      </div>
    );
  }

  return (
    <div className="w-full py-1">
      <div className="flex items-center justify-between">
        {steps.map((s, idx) => {
          const isDone = activeIndex > idx || (activeIndex === 3 && idx === 3);
          const isCurrent = activeIndex === idx && status === 'processing';

          return (
            <React.Fragment key={s.key}>
              <div className="flex items-center gap-1.5 text-xs">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span
                  className={`text-[11px] font-medium ${
                    isDone
                      ? 'text-slate-200'
                      : isCurrent
                      ? 'text-blue-400 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full ${
                    activeIndex > idx ? 'bg-emerald-500/50' : 'bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

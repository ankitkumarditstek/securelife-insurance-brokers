import React from 'react';

interface QuickReplyChipsProps {
  onSelect: (value: string) => void;
  disabled?: boolean;
}

const COMMON_CHIPS = [
  'Yes, I agree',
  'Health Insurance',
  'Life Insurance',
  'Motor Insurance',
  'I have an existing policy',
  'New policy, no existing one',
  'Age 26-35',
  'Age 36-45',
  'Pune',
  'Mumbai',
];

export const QuickReplyChips: React.FC<QuickReplyChipsProps> = ({ onSelect, disabled }) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 no-scrollbar">
      {COMMON_CHIPS.map((chip) => (
        <button
          key={chip}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(chip)}
          className="whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {chip}
        </button>
      ))}
    </div>
  );
};

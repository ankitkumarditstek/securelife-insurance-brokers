import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Save,
  Split,
  FileText,
  Clock,
} from 'lucide-react';
import type { DocumentDetail, FieldCorrectionItem } from '../../../types/document';
import { ConfidenceBadge } from './ConfidenceBadge';
import { EvidencePopover } from './EvidencePopover';
import { PdfPreviewPane } from './PdfPreviewPane';

interface ExtractionViewerProps {
  document: DocumentDetail;
  onApplyCorrections: (changes: FieldCorrectionItem[]) => void;
  onVerify: () => void;
  isLoading?: boolean;
}

export const ExtractionViewer: React.FC<ExtractionViewerProps> = ({
  document,
  onApplyCorrections,
  onVerify,
  isLoading = false,
}) => {
  const ext = document.extraction;
  const [splitView, setSplitView] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  if (!ext) {
    return (
      <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 font-sans">
        <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2 animate-pulse" />
        <h4 className="text-sm font-bold text-white">Extraction in Progress</h4>
        <p className="text-xs text-slate-400 mt-1">
          Our AI pipeline is currently reading and extracting structured terms from this document. Please wait...
        </p>
      </div>
    );
  }

  const handleStartEdit = (path: string, initialValue: unknown) => {
    setEditingField(path);
    setEditValue(initialValue !== null && initialValue !== undefined ? String(initialValue) : '');
  };

  const handleSaveEdit = (path: string) => {
    let finalVal: unknown = editValue;
    if (path.includes('amount') || path.includes('limit') || path.includes('months')) {
      const num = parseFloat(editValue);
      if (!isNaN(num)) finalVal = num;
    }
    onApplyCorrections([{ path, value: finalVal }]);
    setEditingField(null);
  };

  const isVerified = document.review_status === 'verified';

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Top Action & Verification Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">Overall Confidence:</span>
            <ConfidenceBadge score={ext.overall_confidence} size="md" />
          </div>

          {document.review_status && (
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isVerified
                  ? 'bg-teal-950/40 text-teal-400 border-teal-800/40'
                  : document.review_status === 'corrected'
                  ? 'bg-purple-950/40 text-purple-300 border-purple-800/40'
                  : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
              }`}
            >
              {isVerified ? 'VERIFIED ✓' : document.review_status.toUpperCase()}
            </span>
          )}

          {document.reviewed_at && (
            <span className="text-[10px] text-slate-500">
              Verified {new Date(document.reviewed_at).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSplitView(!splitView)}
            className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              splitView
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-300 border-slate-750 hover:bg-slate-750'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>{splitView ? 'Exit Split View' : 'Side-by-Side PDF'}</span>
          </button>

          {!isVerified && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onVerify}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-teal-900/30 cursor-pointer disabled:opacity-50 transition-transform active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verify & Approve Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Missing Fields or Quality Warnings */}
      {ext.missing_fields && ext.missing_fields.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 space-y-1 text-amber-300">
          <div className="flex items-center gap-1.5 font-bold text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Missing Core Fields ({ext.missing_fields.length}):</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ext.missing_fields.map((f) => (
              <span
                key={f}
                className="px-2 py-0.5 rounded-md bg-amber-900/40 border border-amber-700/50 text-[10px] font-mono text-amber-200"
              >
                {f} (Not found in document)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Layout (Grid or Split) */}
      <div className={`grid gap-4 ${splitView ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Left / Main Section: Structured Policy Cards */}
        <div className="space-y-4">
          {/* Section 1: Provider & Basic Policy */}
          <div className="p-4.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h5 className="font-bold text-slate-200 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                Insurance Provider & Policy Header
              </h5>
              <div className="flex items-center gap-2">
                <EvidencePopover evidence={ext.field_evidence['provider.name']} label="Provider" />
                <ConfidenceBadge score={ext.field_confidence['provider.name']} size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 text-[11px]">Provider Name</span>
                {editingField === 'provider.name' ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-2 py-1 bg-slate-950 border border-blue-500 rounded text-xs text-white"
                    />
                    <button onClick={() => handleSaveEdit('provider.name')} className="text-emerald-400">
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="font-semibold text-slate-200 mt-0.5 flex items-center justify-between group">
                    <span>{ext.provider.name || '—'}</span>
                    <button
                      onClick={() => handleStartEdit('provider.name', ext.provider.name)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </p>
                )}
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">Policy Number</span>
                <p className="font-semibold text-slate-200 mt-0.5 flex items-center justify-between">
                  <span>{ext.policy.policy_number || '—'}</span>
                  <EvidencePopover evidence={ext.field_evidence['policy.policy_number']} label="Policy No" />
                </p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">Policy Type</span>
                <p className="font-semibold text-blue-400 capitalize mt-0.5">
                  {ext.policy.policy_type || 'health'}
                </p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">Plan Name</span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  {ext.policy.plan_name || 'Standard Plan'}
                </p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">Status</span>
                <span className="inline-block mt-0.5 font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                  {ext.policy.status || 'Active'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">Renewal Date</span>
                <p className="font-semibold text-amber-400 mt-0.5 flex items-center justify-between">
                  <span>{ext.policy.renewal_date || ext.policy.end_date || '—'}</span>
                  <EvidencePopover evidence={ext.field_evidence['policy.end_date']} label="Renewal Date" />
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Coverage & Sum Insured */}
          <div className="p-4.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h5 className="font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Coverage Benefits & Sum Insured
              </h5>
              <div className="flex items-center gap-2">
                <EvidencePopover evidence={ext.field_evidence['coverage.sum_insured']} label="Sum Insured" />
                <ConfidenceBadge score={ext.field_confidence['coverage.sum_insured']} size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 text-[11px]">Basic Sum Insured</span>
                {editingField === 'coverage.sum_insured.amount' ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-2 py-1 bg-slate-950 border border-blue-500 rounded text-xs text-white"
                    />
                    <button onClick={() => handleSaveEdit('coverage.sum_insured.amount')} className="text-emerald-400">
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-extrabold text-emerald-400 mt-0.5 flex items-center justify-between group">
                    <span>
                      {ext.coverage.sum_insured.currency || 'INR'}{' '}
                      {ext.coverage.sum_insured.amount !== null
                        ? Number(ext.coverage.sum_insured.amount).toLocaleString()
                        : 'Not Stated'}
                    </span>
                    <button
                      onClick={() => handleStartEdit('coverage.sum_insured.amount', ext.coverage.sum_insured.amount)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </p>
                )}
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">Copay / Deductible</span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  Copay: {ext.coverage.deductible_or_copay.copay_percent ?? 0}% · Ded: INR{' '}
                  {ext.coverage.deductible_or_copay.deductible ?? 0}
                </p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">Network Territory</span>
                <p className="font-semibold text-slate-200 mt-0.5 truncate">
                  {ext.coverage.network_or_geography || 'Pan-India'}
                </p>
              </div>
            </div>

            {/* Coverage Items List */}
            {ext.coverage.coverage_items.length > 0 && (
              <div className="pt-2">
                <span className="text-slate-500 text-[11px] font-semibold">Covered Benefits:</span>
                <div className="space-y-1.5 mt-1.5">
                  {ext.coverage.coverage_items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px]"
                    >
                      <span className="text-slate-300 font-medium">{item.name}</span>
                      <span className="text-emerald-400 font-semibold">
                        {item.limit ? `Up to INR ${Number(item.limit).toLocaleString()}` : 'Full Cover'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Premium Schedule */}
          <div className="p-4.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h5 className="font-bold text-slate-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                Premium Amount & Payment Schedule
              </h5>
              <div className="flex items-center gap-2">
                <EvidencePopover evidence={ext.field_evidence['premium.amount']} label="Premium" />
                <ConfidenceBadge score={ext.field_confidence['premium.amount']} size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 text-[11px]">Net Premium</span>
                {editingField === 'premium.amount' ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-2 py-1 bg-slate-950 border border-blue-500 rounded text-xs text-white"
                    />
                    <button onClick={() => handleSaveEdit('premium.amount')} className="text-emerald-400">
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-purple-300 mt-0.5 flex items-center justify-between group">
                    <span>
                      {ext.premium.currency || 'INR'}{' '}
                      {ext.premium.amount !== null
                        ? Number(ext.premium.amount).toLocaleString()
                        : '—'}
                    </span>
                    <button
                      onClick={() => handleStartEdit('premium.amount', ext.premium.amount)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </p>
                )}
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">Taxes / GST</span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  INR {ext.premium.taxes !== null ? Number(ext.premium.taxes).toLocaleString() : '—'}
                </p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">Total Payable</span>
                <p className="font-semibold text-emerald-400 mt-0.5">
                  INR {ext.premium.total_payable !== null ? Number(ext.premium.total_payable).toLocaleString() : '—'}
                </p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">Frequency</span>
                <p className="font-semibold text-slate-200 capitalize mt-0.5">
                  {ext.premium.frequency || 'Annual'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Exclusions & Waiting Periods */}
          <div className="p-4.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h5 className="font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Exclusions & Waiting Periods
              </h5>
              <EvidencePopover evidence={ext.field_evidence['exclusions']} label="Exclusions" />
            </div>

            <div className="space-y-2">
              {ext.waiting_periods.map((wp, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-amber-950/20 border border-amber-900/30 text-[11px]"
                >
                  <span className="text-amber-200 font-medium">{wp.item}</span>
                  <span className="font-bold text-amber-400">{wp.months} Months Waiting</span>
                </div>
              ))}

              {ext.exclusions.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-300"
                >
                  {ex.description}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section in Split View: PDF / Document Preview Pane */}
        {splitView && (
          <div className="sticky top-4">
            <PdfPreviewPane
              documentId={document.id}
              filename={document.original_filename}
              mimeType={document.mime_type}
            />
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import {
  FileText,
  RotateCw,
  Eye,
  Download,
  ScanText,
} from 'lucide-react';
import type { DocumentSummary } from '../../../types/document';
import { ProcessingStepper } from './ProcessingStepper';

interface DocumentListProps {
  documents: DocumentSummary[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onReprocess: (id: string) => void;
}

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  uploaded: { label: 'Uploaded', bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
  queued: { label: 'Queued', bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/40' },
  processing: { label: 'Processing...', bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-800/40' },
  extracted: { label: 'Extracted', bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/40' },
  needs_review: { label: 'Needs Review', bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/40' },
  verified: { label: 'Verified ✓', bg: 'bg-teal-950/40', text: 'text-teal-400', border: 'border-teal-800/40' },
  failed: { label: 'Failed', bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-800/40' },
};

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onReprocess,
}) => {
  if (documents.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
        <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-300">No documents uploaded yet</p>
        <p className="text-[11px] text-slate-500 mt-1">
          Upload insurance policies, claim letters, or renewals above to start AI extraction.
        </p>
      </div>
    );
  }

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

  return (
    <div className="space-y-3 font-sans">
      {documents.map((doc) => {
        const isSelected = selectedDocumentId === doc.id;
        const statusConfig = STATUS_BADGES[doc.processing_status] || STATUS_BADGES.uploaded;

        return (
          <div
            key={doc.id}
            onClick={() => onSelectDocument(doc.id)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              isSelected
                ? 'bg-blue-950/25 border-blue-500/50 shadow-lg shadow-blue-950/30 ring-1 ring-blue-500/30'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850/60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 truncate">
                <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-white truncate">
                      {doc.original_filename}
                    </h5>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                    >
                      {statusConfig.label}
                    </span>
                    {doc.is_scanned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-950/40 text-purple-300 border border-purple-800/40">
                        <ScanText className="w-3 h-3" /> OCR Scanned
                      </span>
                    )}
                    {doc.duplicate && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                        Duplicate
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {doc.doc_type.toUpperCase()} · {doc.page_count} page{doc.page_count > 1 ? 's' : ''} · {(doc.size_bytes / 1024).toFixed(0)} KB · Uploaded by {doc.uploaded_by}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <a
                  href={`${baseUrl}/documents/${doc.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  title="Download / View Original File"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => onSelectDocument(doc.id)}
                  title="View Extraction"
                  className={`p-1.5 rounded-lg transition-colors ${
                    isSelected ? 'text-blue-400 bg-blue-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                </button>

                {['failed', 'extracted', 'needs_review'].includes(doc.processing_status) && (
                  <button
                    type="button"
                    onClick={() => onReprocess(doc.id)}
                    title="Reprocess Document"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Lifecycle Stepper */}
            <div className="mt-3 pt-3 border-t border-slate-800/60">
              <ProcessingStepper status={doc.processing_status} error={doc.processing_error} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

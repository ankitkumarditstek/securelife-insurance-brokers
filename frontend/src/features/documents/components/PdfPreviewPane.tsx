import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';

interface PdfPreviewPaneProps {
  documentId: string;
  filename: string;
  mimeType: string;
}

export const PdfPreviewPane: React.FC<PdfPreviewPaneProps> = ({
  documentId,
  filename,
  mimeType,
}) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const fileUrl = `${baseUrl}/documents/${documentId}/file`;
  const isImage = mimeType.startsWith('image/');

  return (
    <div className="w-full h-full min-h-[420px] max-h-[75vh] flex flex-col rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden font-sans">
      {/* Pane Header */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-semibold text-white truncate">{filename}</span>
        </div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-950/40 border border-blue-800/40 rounded-lg px-2 py-1 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Full Tab</span>
        </a>
      </div>

      {/* Pane Content */}
      <div className="flex-1 w-full h-full bg-slate-925 flex items-center justify-center overflow-auto p-2">
        {isImage ? (
          <img
            src={fileUrl}
            alt={filename}
            className="max-w-full max-h-[600px] object-contain rounded-lg border border-slate-800 shadow-md"
          />
        ) : (
          <iframe
            src={`${fileUrl}#toolbar=0`}
            title={filename}
            className="w-full h-full min-h-[500px] rounded-lg border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, FileText, Loader2, Sparkles } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../store/rootReducer';
import type { UIAction } from '../../../types';
import { uploadDocumentsRequest } from '../../documents/documentsSlice';

interface UploadPromptCardProps {
  uiAction: UIAction;
  onDismiss: () => void;
}

export const UploadPromptCard: React.FC<UploadPromptCardProps> = ({ uiAction, onDismiss }) => {
  const dispatch = useDispatch();
  const sessionToken = useSelector((state: RootState) => state.chat.sessionToken);
  const isUploading = useSelector((state: RootState) => state.documents.loading);
  const [uploadedCount, setUploadedCount] = useState(0);

  const message =
    typeof uiAction.payload?.message === 'string'
      ? uiAction.payload.message
      : 'You are pre-qualified! Upload your existing policy document or statement photo to unlock automated gap analysis.';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setUploadedCount(filesArray.length);
      dispatch(
        uploadDocumentsRequest({
          sessionToken: sessionToken || undefined,
          leadId: uiAction.leadId,
          files: filesArray,
        })
      );
    }
  };

  return (
    <div className="mx-4 my-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/30 shadow-xl transition-all duration-300 animate-slide-up font-sans">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-950 shrink-0">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Insurance Qualification Verified</span>
          </div>
          <p className="mt-1 text-xs text-slate-200 leading-relaxed">{message}</p>

          {uploadedCount > 0 ? (
            <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
              <span className="flex items-center gap-2">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                )}
                <span>
                  {isUploading
                    ? `Uploading ${uploadedCount} document(s) & queuing OCR extraction...`
                    : `Successfully submitted ${uploadedCount} document(s) for broker analysis!`}
                </span>
              </span>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-transform active:scale-95 cursor-pointer">
                <FileText className="w-3.5 h-3.5" />
                <span>Upload Policy PDF or Photo</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={onDismiss}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface DocumentUploaderProps {
  onUpload: (files: File[]) => void;
  isLoading?: boolean;
  maxFiles?: number;
  maxSizeMb?: number;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onUpload,
  isLoading = false,
  maxFiles = 5,
  maxSizeMb = 20,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndAddFiles = (incoming: FileList | File[]) => {
    setErrorMsg(null);
    const newFiles: File[] = [];
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];

    for (let i = 0; i < incoming.length; i++) {
      const f = incoming[i];
      if (!allowedTypes.includes(f.type) && !f.name.match(/\.(pdf|png|jpe?g)$/i)) {
        setErrorMsg(`"${f.name}" is not a supported file type. Allowed: PDF, PNG, JPG.`);
        return;
      }
      if (f.size > maxSizeBytes) {
        setErrorMsg(`"${f.name}" exceeds the ${maxSizeMb} MB limit.`);
        return;
      }
      newFiles.push(f);
    }

    const combined = [...selectedFiles, ...newFiles];
    if (combined.length > maxFiles) {
      setErrorMsg(`Maximum ${maxFiles} files allowed per upload.`);
      return;
    }

    setSelectedFiles(combined);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  const handleUploadSubmit = () => {
    if (selectedFiles.length === 0) return;
    onUpload(selectedFiles);
    setSelectedFiles([]);
  };

  const removeFile = (idx: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3 font-sans">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-950/30'
            : 'border-slate-750 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-850/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-2xl bg-blue-600/15 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>

        <h4 className="text-sm font-semibold text-slate-200">
          Upload Existing Insurance Policies
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Drag & drop your policy PDF, schedule, or scanned photo here, or click to browse (max {maxFiles} files, up to {maxSizeMb} MB each).
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-slate-850/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
            <span>Selected Files ({selectedFiles.length}/{maxFiles})</span>
            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              Clear
            </button>
          </div>

          <div className="space-y-1.5">
            {selectedFiles.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
              >
                <div className="flex items-center gap-2 truncate">
                  <File className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="text-slate-400 hover:text-rose-400 p-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleUploadSubmit}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading & Starting Analysis...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Submit {selectedFiles.length} Document{selectedFiles.length > 1 ? 's' : ''} for Extraction</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

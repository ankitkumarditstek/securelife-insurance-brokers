import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  DocumentDetail,
  DocumentSummary,
  ExtractionResult,
  FieldCorrectionItem,
} from '../../types/document';

export interface DocumentsState {
  byLeadId: Record<string, DocumentSummary[]>;
  documentDetails: Record<string, DocumentDetail>;
  uploads: Record<
    string,
    {
      fileName: string;
      progress: number;
      status: 'uploading' | 'queued' | 'error';
      error?: string;
    }
  >;
  selectedDocumentId: string | null;
  pollingDocumentIds: string[];
  loading: boolean;
  error: string | null;
}

const initialState: DocumentsState = {
  byLeadId: {},
  documentDetails: {},
  uploads: {},
  selectedDocumentId: null,
  pollingDocumentIds: [],
  loading: false,
  error: null,
};

export const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    fetchLeadDocumentsRequest: (
      state,
      action: PayloadAction<{ leadId: string }>
    ) => {
      void action;
      state.loading = true;
      state.error = null;
    },
    fetchLeadDocumentsSuccess: (
      state,
      action: PayloadAction<{ leadId: string; documents: DocumentSummary[] }>
    ) => {
      state.loading = false;
      state.byLeadId[action.payload.leadId] = action.payload.documents;
    },
    fetchLeadDocumentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    uploadDocumentsRequest: (
      state,
      action: PayloadAction<{
        leadId?: string;
        files: File[];
        sessionToken?: string;
      }>
    ) => {
      void action;
      state.loading = true;
      state.error = null;
    },
    setUploadProgress: (
      state,
      action: PayloadAction<{
        uploadId: string;
        fileName: string;
        progress: number;
        status: 'uploading' | 'queued' | 'error';
        error?: string;
      }>
    ) => {
      state.uploads[action.payload.uploadId] = {
        fileName: action.payload.fileName,
        progress: action.payload.progress,
        status: action.payload.status,
        error: action.payload.error,
      };
    },
    uploadDocumentsSuccess: (
      state,
      action: PayloadAction<{
        leadId?: string;
        documents: DocumentSummary[];
      }>
    ) => {
      state.loading = false;
      if (action.payload.leadId) {
        const currentList = state.byLeadId[action.payload.leadId] || [];
        const existingIds = new Set(currentList.map((d) => d.id));
        const newDocs = action.payload.documents.filter(
          (d) => !existingIds.has(d.id)
        );
        state.byLeadId[action.payload.leadId] = [...newDocs, ...currentList];
      }
    },
    uploadDocumentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    selectDocument: (state, action: PayloadAction<string | null>) => {
      state.selectedDocumentId = action.payload;
    },

    fetchDocumentDetailRequest: (
      state,
      action: PayloadAction<{ documentId: string }>
    ) => {
      void action;
      state.loading = true;
      state.error = null;
    },
    fetchDocumentDetailSuccess: (
      state,
      action: PayloadAction<DocumentDetail>
    ) => {
      state.loading = false;
      state.documentDetails[action.payload.id] = action.payload;

      // Also update entry in byLeadId if exists
      const leadDocs = state.byLeadId[action.payload.lead_id];
      if (leadDocs) {
        const idx = leadDocs.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) {
          leadDocs[idx] = {
            ...leadDocs[idx],
            processing_status: action.payload.processing_status,
            page_count: action.payload.page_count,
            doc_type: action.payload.doc_type,
            is_scanned: action.payload.is_scanned,
            processing_error: action.payload.processing_error,
          };
        }
      }
    },
    fetchDocumentDetailFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    startPollingDocument: (state, action: PayloadAction<string>) => {
      if (!state.pollingDocumentIds.includes(action.payload)) {
        state.pollingDocumentIds.push(action.payload);
      }
    },
    stopPollingDocument: (state, action: PayloadAction<string>) => {
      state.pollingDocumentIds = state.pollingDocumentIds.filter(
        (id) => id !== action.payload
      );
    },

    applyCorrectionsRequest: (
      state,
      action: PayloadAction<{
        documentId: string;
        changes: FieldCorrectionItem[];
      }>
    ) => {
      void action;
      state.loading = true;
      state.error = null;
    },
    applyCorrectionsSuccess: (
      state,
      action: PayloadAction<{
        documentId: string;
        extraction: ExtractionResult;
      }>
    ) => {
      state.loading = false;
      const doc = state.documentDetails[action.payload.documentId];
      if (doc) {
        doc.extraction = action.payload.extraction;
        doc.review_status = 'corrected';
      }
    },
    applyCorrectionsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    verifyExtractionRequest: (
      state,
      action: PayloadAction<{ documentId: string }>
    ) => {
      void action;
      state.loading = true;
      state.error = null;
    },
    verifyExtractionSuccess: (
      state,
      action: PayloadAction<{
        documentId: string;
        reviewedAt: string;
        reviewedBy?: string | null;
      }>
    ) => {
      state.loading = false;
      const doc = state.documentDetails[action.payload.documentId];
      if (doc) {
        doc.review_status = 'verified';
        doc.reviewed_at = action.payload.reviewedAt;
        doc.reviewed_by = action.payload.reviewedBy;
        doc.processing_status = 'verified';
      }
      // Also update in list
      if (doc && state.byLeadId[doc.lead_id]) {
        const item = state.byLeadId[doc.lead_id].find(
          (d) => d.id === action.payload.documentId
        );
        if (item) {
          item.processing_status = 'verified';
        }
      }
    },
    verifyExtractionFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    reprocessDocumentRequest: (
      state,
      action: PayloadAction<{ documentId: string }>
    ) => {
      void action;
      state.loading = true;
      state.error = null;
    },
    reprocessDocumentSuccess: (
      state,
      action: PayloadAction<DocumentSummary>
    ) => {
      state.loading = false;
      const doc = state.documentDetails[action.payload.id];
      if (doc) {
        doc.processing_status = action.payload.processing_status;
        doc.processing_error = null;
      }
      if (!state.pollingDocumentIds.includes(action.payload.id)) {
        state.pollingDocumentIds.push(action.payload.id);
      }
    },
  },
});

export const {
  fetchLeadDocumentsRequest,
  fetchLeadDocumentsSuccess,
  fetchLeadDocumentsFailure,
  uploadDocumentsRequest,
  setUploadProgress,
  uploadDocumentsSuccess,
  uploadDocumentsFailure,
  selectDocument,
  fetchDocumentDetailRequest,
  fetchDocumentDetailSuccess,
  fetchDocumentDetailFailure,
  startPollingDocument,
  stopPollingDocument,
  applyCorrectionsRequest,
  applyCorrectionsSuccess,
  applyCorrectionsFailure,
  verifyExtractionRequest,
  verifyExtractionSuccess,
  verifyExtractionFailure,
  reprocessDocumentRequest,
  reprocessDocumentSuccess,
} = documentsSlice.actions;

export default documentsSlice.reducer;

import { call, delay, put, race, take, takeEvery, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
import type { DocumentDetail, DocumentSummary, ExtractionResult, FieldCorrectionItem } from '../../types/document';
import {
  applyCorrectionsFailure,
  applyCorrectionsRequest,
  applyCorrectionsSuccess,
  fetchDocumentDetailFailure,
  fetchDocumentDetailRequest,
  fetchDocumentDetailSuccess,
  fetchLeadDocumentsFailure,
  fetchLeadDocumentsRequest,
  fetchLeadDocumentsSuccess,
  reprocessDocumentRequest,
  reprocessDocumentSuccess,
  setUploadProgress,
  startPollingDocument,
  stopPollingDocument,
  uploadDocumentsFailure,
  uploadDocumentsRequest,
  uploadDocumentsSuccess,
  verifyExtractionFailure,
  verifyExtractionRequest,
  verifyExtractionSuccess,
} from './documentsSlice';
import { fetchDashboardData } from '../crm/crmSlice';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const errorObj = err as {
      response?: { data?: { detail?: { error?: { message?: string } } } };
      message?: string;
    };
    return errorObj.response?.data?.detail?.error?.message || errorObj.message || fallback;
  }
  return fallback;
}

function* handleFetchLeadDocuments(action: PayloadAction<{ leadId: string }>) {
  try {
    const res: { data: DocumentSummary[] } = yield call(
      apiClient.get,
      `/leads/${action.payload.leadId}/documents`
    );
    yield put(
      fetchLeadDocumentsSuccess({
        leadId: action.payload.leadId,
        documents: res.data,
      })
    );
  } catch (err: unknown) {
    yield put(fetchLeadDocumentsFailure(getErrorMessage(err, 'Failed to fetch documents')));
  }
}

function* handleUploadDocuments(
  action: PayloadAction<{
    leadId?: string;
    files: File[];
    sessionToken?: string;
  }>
) {
  const { leadId, files, sessionToken } = action.payload;
  const uploadId = `up_${Date.now()}`;

  try {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    yield put(
      setUploadProgress({
        uploadId,
        fileName: files.map((f) => f.name).join(', '),
        progress: 10,
        status: 'uploading',
      })
    );

    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    };
    let endpoint = '/documents/upload';
    if (leadId) {
      endpoint = `/leads/${leadId}/documents`;
    } else if (sessionToken) {
      headers['X-Session-Token'] = sessionToken;
    }

    const res: { data: { documents: DocumentSummary[] } } = yield call(
      apiClient.post,
      endpoint,
      formData,
      {
        headers,
      }
    );

    yield put(
      setUploadProgress({
        uploadId,
        fileName: files.map((f) => f.name).join(', '),
        progress: 100,
        status: 'queued',
      })
    );

    yield put(
      uploadDocumentsSuccess({
        leadId,
        documents: res.data.documents,
      })
    );

    // Auto-poll each queued document
    for (const doc of res.data.documents) {
      if (['uploaded', 'queued', 'processing'].includes(doc.processing_status)) {
        yield put(startPollingDocument(doc.id));
      }
    }
  } catch (err: unknown) {
    const msg = getErrorMessage(err, 'Upload failed');
    yield put(
      setUploadProgress({
        uploadId,
        fileName: files.map((f) => f.name).join(', '),
        progress: 0,
        status: 'error',
        error: msg,
      })
    );
    yield put(uploadDocumentsFailure(msg));
  }
}

function* pollSingleDocument(documentId: string) {
  while (true) {
    try {
      const res: { data: DocumentDetail } = yield call(
        apiClient.get,
        `/documents/${documentId}`
      );
      yield put(fetchDocumentDetailSuccess(res.data));

      if (['extracted', 'needs_review', 'verified', 'failed'].includes(res.data.processing_status)) {
        yield put(stopPollingDocument(documentId));
        // Refresh crm dashboard/pipeline to update lead status badges
        yield put(fetchDashboardData());
        break;
      }
    } catch {
      yield put(stopPollingDocument(documentId));
      break;
    }

    // Wait 2.5 seconds between polling intervals (FRD-03 §6)
    yield delay(2500);
  }
}

function* handlePollDocumentStatus(action: PayloadAction<string>) {
  const documentId = action.payload;
  yield race({
    poll: call(pollSingleDocument, documentId),
    stop: take((a: { type?: string; payload?: string }) => a?.type === stopPollingDocument.type && a?.payload === documentId),
  });
}

function* handleFetchDocumentDetail(action: PayloadAction<{ documentId: string }>) {
  try {
    const res: { data: DocumentDetail } = yield call(
      apiClient.get,
      `/documents/${action.payload.documentId}`
    );
    yield put(fetchDocumentDetailSuccess(res.data));
  } catch (err: unknown) {
    yield put(fetchDocumentDetailFailure(getErrorMessage(err, 'Failed to fetch document')));
  }
}

function* handleApplyCorrections(
  action: PayloadAction<{
    documentId: string;
    changes: FieldCorrectionItem[];
  }>
) {
  try {
    const res: { data: ExtractionResult } = yield call(
      apiClient.patch,
      `/documents/${action.payload.documentId}/extraction`,
      { changes: action.payload.changes }
    );
    yield put(
      applyCorrectionsSuccess({
        documentId: action.payload.documentId,
        extraction: res.data,
      })
    );
  } catch (err: unknown) {
    yield put(applyCorrectionsFailure(getErrorMessage(err, 'Failed to apply corrections')));
  }
}

function* handleVerifyExtraction(action: PayloadAction<{ documentId: string }>) {
  try {
    const res: { data: { status: string; reviewed_at: string; reviewed_by?: string } } = yield call(
      apiClient.post,
      `/documents/${action.payload.documentId}/extraction/verify`
    );
    yield put(
      verifyExtractionSuccess({
        documentId: action.payload.documentId,
        reviewedAt: res.data.reviewed_at,
        reviewedBy: res.data.reviewed_by,
      })
    );
    // Refresh pipeline status
    yield put(fetchDashboardData());
  } catch (err: unknown) {
    yield put(verifyExtractionFailure(getErrorMessage(err, 'Verification failed')));
  }
}

function* handleReprocessDocument(action: PayloadAction<{ documentId: string }>) {
  try {
    const res: { data: DocumentSummary } = yield call(
      apiClient.post,
      `/documents/${action.payload.documentId}/reprocess`
    );
    yield put(reprocessDocumentSuccess(res.data));
  } catch (err: unknown) {
    yield put(fetchDocumentDetailFailure(getErrorMessage(err, 'Reprocess failed')));
  }
}

export function* documentsSagas() {
  yield takeLatest(fetchLeadDocumentsRequest.type, handleFetchLeadDocuments);
  yield takeLatest(uploadDocumentsRequest.type, handleUploadDocuments);
  yield takeEvery(startPollingDocument.type, handlePollDocumentStatus);
  yield takeLatest(fetchDocumentDetailRequest.type, handleFetchDocumentDetail);
  yield takeLatest(applyCorrectionsRequest.type, handleApplyCorrections);
  yield takeLatest(verifyExtractionRequest.type, handleVerifyExtraction);
  yield takeLatest(reprocessDocumentRequest.type, handleReprocessDocument);
}

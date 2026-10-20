import { describe, it, expect } from 'vitest';
import documentsReducer, {
  fetchLeadDocumentsSuccess,
  setUploadProgress,
  uploadDocumentsSuccess,
  selectDocument,
  fetchDocumentDetailSuccess,
  startPollingDocument,
  stopPollingDocument,
  applyCorrectionsSuccess,
  verifyExtractionSuccess,
  reprocessDocumentSuccess,
  type DocumentsState,
} from '../documentsSlice';
import type { DocumentDetail, DocumentSummary, ExtractionResult } from '../../../types/document';

const createMockExtraction = (providerName: string, overallConfidence = 0.85): ExtractionResult => ({
  schema_version: '1.0',
  doc_type: 'policy_schedule',
  provider: {
    name: providerName,
    address: 'Mumbai, India',
    contact: '+91-22-12345678',
    irdai_or_license_no: 'IRDAI/123',
  },
  policy: {
    policy_number: 'POL-12345',
    policy_type: 'health_comprehensive',
    plan_name: 'Super Health Care',
    status: 'active',
    policy_holder: { name: 'Rajesh Sharma' },
    insured_members: [],
    nominees: [],
  },
  coverage: {
    sum_insured: { amount: 500000, currency: 'INR' },
    coverage_items: [],
    deductible_or_copay: {},
    riders_addons: [],
  },
  premium: {
    amount: 15000,
    currency: 'INR',
    frequency: 'annual',
  },
  exclusions: [],
  waiting_periods: [],
  claims_history: [],
  no_claim_bonus: {},
  other_notes: [],
  field_confidence: { 'provider.name': overallConfidence },
  field_evidence: {},
  missing_fields: [],
  warnings: [],
  overall_confidence: overallConfidence,
});

describe('documentsSlice', () => {
  const initialState: DocumentsState = {
    byLeadId: {},
    documentDetails: {},
    uploads: {},
    selectedDocumentId: null,
    pollingDocumentIds: [],
    loading: false,
    error: null,
  };

  it('handles fetchLeadDocumentsSuccess', () => {
    const docs: DocumentSummary[] = [
      {
        id: 'doc-1',
        lead_id: 'lead-1',
        original_filename: 'policy.pdf',
        size_bytes: 1024,
        mime_type: 'application/pdf',
        doc_type: 'policy_schedule',
        page_count: 3,
        is_scanned: false,
        processing_status: 'extracted',
        uploaded_by: 'broker@securelife.com',
        created_at: '2026-10-14T00:00:00Z',
      },
    ];

    const state = documentsReducer(
      initialState,
      fetchLeadDocumentsSuccess({ leadId: 'lead-1', documents: docs })
    );

    expect(state.byLeadId['lead-1']).toEqual(docs);
    expect(state.loading).toBe(false);
  });

  it('handles setUploadProgress and uploadDocumentsSuccess', () => {
    let state = documentsReducer(
      initialState,
      setUploadProgress({
        uploadId: 'up-1',
        fileName: 'policy.pdf',
        progress: 65,
        status: 'uploading',
      })
    );

    expect(state.uploads['up-1']).toEqual({
      fileName: 'policy.pdf',
      progress: 65,
      status: 'uploading',
      error: undefined,
    });

    const newDocs: DocumentSummary[] = [
      {
        id: 'doc-2',
        lead_id: 'lead-1',
        original_filename: 'renewal.pdf',
        size_bytes: 2048,
        mime_type: 'application/pdf',
        doc_type: 'renewal_notice',
        page_count: 2,
        is_scanned: true,
        processing_status: 'queued',
        uploaded_by: 'broker@securelife.com',
        created_at: '2026-10-14T01:00:00Z',
      },
    ];

    state = documentsReducer(
      state,
      uploadDocumentsSuccess({ leadId: 'lead-1', documents: newDocs })
    );

    expect(state.byLeadId['lead-1']).toHaveLength(1);
    expect(state.byLeadId['lead-1'][0].id).toBe('doc-2');
  });

  it('handles selectDocument and polling actions', () => {
    let state = documentsReducer(initialState, selectDocument('doc-100'));
    expect(state.selectedDocumentId).toBe('doc-100');

    state = documentsReducer(state, startPollingDocument('doc-100'));
    expect(state.pollingDocumentIds).toContain('doc-100');

    // Does not duplicate in polling list
    state = documentsReducer(state, startPollingDocument('doc-100'));
    expect(state.pollingDocumentIds).toHaveLength(1);

    state = documentsReducer(state, stopPollingDocument('doc-100'));
    expect(state.pollingDocumentIds).not.toContain('doc-100');
  });

  it('handles fetchDocumentDetailSuccess and syncs to lead summary list', () => {
    const initialWithSummary: DocumentsState = {
      ...initialState,
      byLeadId: {
        'lead-1': [
          {
            id: 'doc-1',
            lead_id: 'lead-1',
            original_filename: 'test.pdf',
            size_bytes: 500,
            mime_type: 'application/pdf',
            doc_type: 'unknown',
            page_count: 1,
            is_scanned: false,
            processing_status: 'queued',
            uploaded_by: 'broker@securelife.com',
            created_at: '2026-10-14T00:00:00Z',
          },
        ],
      },
    };

    const detail: DocumentDetail = {
      id: 'doc-1',
      lead_id: 'lead-1',
      original_filename: 'test.pdf',
      size_bytes: 500,
      mime_type: 'application/pdf',
      doc_type: 'policy_schedule',
      page_count: 2,
      is_scanned: false,
      processing_status: 'extracted',
      processing_error: null,
      uploaded_by: 'broker@securelife.com',
      created_at: '2026-10-14T00:00:00Z',
      pages: [],
      extraction: null,
      review_status: 'pending_review',
      reviewed_by: null,
      reviewed_at: null,
      corrections: [],
    };

    const state = documentsReducer(initialWithSummary, fetchDocumentDetailSuccess(detail));
    expect(state.documentDetails['doc-1']).toEqual(detail);
    expect(state.byLeadId['lead-1'][0].processing_status).toBe('extracted');
    expect(state.byLeadId['lead-1'][0].doc_type).toBe('policy_schedule');
  });

  it('handles applyCorrectionsSuccess, verifyExtractionSuccess, and reprocessDocumentSuccess', () => {
    const existingDetail: DocumentDetail = {
      id: 'doc-1',
      lead_id: 'lead-1',
      original_filename: 'test.pdf',
      size_bytes: 500,
      mime_type: 'application/pdf',
      doc_type: 'policy_schedule',
      page_count: 2,
      is_scanned: false,
      processing_status: 'extracted',
      processing_error: null,
      uploaded_by: 'broker@securelife.com',
      created_at: '2026-10-14T00:00:00Z',
      pages: [],
      extraction: createMockExtraction('Old Provider', 0.8),
      review_status: 'pending_review',
      reviewed_by: null,
      reviewed_at: null,
      corrections: [],
    };

    let state: DocumentsState = {
      ...initialState,
      documentDetails: { 'doc-1': existingDetail },
      byLeadId: {
        'lead-1': [
          {
            id: 'doc-1',
            lead_id: 'lead-1',
            original_filename: 'test.pdf',
            size_bytes: 500,
            mime_type: 'application/pdf',
            doc_type: 'policy_schedule',
            page_count: 2,
            is_scanned: false,
            processing_status: 'extracted',
            uploaded_by: 'broker@securelife.com',
            created_at: '2026-10-14T00:00:00Z',
          },
        ],
      },
    };

    const updatedExtraction = createMockExtraction('Star Health & Allied Insurance', 0.98);

    // Apply correction
    state = documentsReducer(
      state,
      applyCorrectionsSuccess({ documentId: 'doc-1', extraction: updatedExtraction })
    );
    expect(state.documentDetails['doc-1'].extraction?.provider?.name).toBe('Star Health & Allied Insurance');
    expect(state.documentDetails['doc-1'].review_status).toBe('corrected');

    // Verify extraction
    state = documentsReducer(
      state,
      verifyExtractionSuccess({
        documentId: 'doc-1',
        reviewedAt: '2026-10-14T02:00:00Z',
        reviewedBy: 'Rajesh Broker',
      })
    );
    expect(state.documentDetails['doc-1'].review_status).toBe('verified');
    expect(state.documentDetails['doc-1'].reviewed_by).toBe('Rajesh Broker');
    expect(state.byLeadId['lead-1'][0].processing_status).toBe('verified');

    // Reprocess document
    state = documentsReducer(
      state,
      reprocessDocumentSuccess({
        ...state.byLeadId['lead-1'][0],
        processing_status: 'queued',
      })
    );
    expect(state.documentDetails['doc-1'].processing_status).toBe('queued');
    expect(state.pollingDocumentIds).toContain('doc-1');
  });
});

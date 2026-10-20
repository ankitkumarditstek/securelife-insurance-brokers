export interface DocumentSummary {
  id: string;
  lead_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  page_count: number;
  doc_type: string;
  is_scanned: boolean;
  processing_status:
    | 'uploaded'
    | 'queued'
    | 'processing'
    | 'extracted'
    | 'needs_review'
    | 'verified'
    | 'failed';
  processing_error?: string | null;
  uploaded_by: string;
  created_at: string;
  duplicate?: boolean;
}

export interface EvidenceItem {
  page: number;
  quote: string;
}

export interface ExtractionResult {
  schema_version: string;
  doc_type: string;
  provider: {
    name: string;
    address?: string | null;
    contact?: string | null;
    irdai_or_license_no?: string | null;
  };
  policy: {
    policy_number?: string | null;
    policy_type: string;
    plan_name?: string | null;
    status: string;
    start_date?: string | null;
    end_date?: string | null;
    renewal_date?: string | null;
    policy_holder: {
      name?: string | null;
      dob?: string | null;
      address?: string | null;
    };
    insured_members: Array<{
      name?: string | null;
      relationship?: string | null;
      age?: number | null;
    }>;
    nominees: Array<{
      name?: string | null;
      relationship?: string | null;
    }>;
  };
  coverage: {
    sum_insured: {
      amount?: number | null;
      currency?: string | null;
    };
    coverage_items: Array<{
      name: string;
      limit?: number | null;
      sub_limit_notes?: string | null;
      waiting_period_months?: number | null;
    }>;
    deductible_or_copay: {
      deductible?: number | null;
      copay_percent?: number | null;
    };
    riders_addons: Array<{
      name?: string | null;
      amount?: number | null;
    }>;
    network_or_geography?: string | null;
  };
  premium: {
    amount?: number | null;
    currency?: string | null;
    frequency: string;
    taxes?: number | null;
    total_payable?: number | null;
    payment_mode?: string | null;
    next_due_date?: string | null;
  };
  exclusions: Array<{
    description: string;
    category?: string | null;
  }>;
  waiting_periods: Array<{
    item: string;
    months: number;
  }>;
  claims_history: Array<{
    claim_id?: string | null;
    date?: string | null;
    type?: string | null;
    amount_claimed?: number | null;
    amount_settled?: number | null;
    status: string;
    reason?: string | null;
  }>;
  no_claim_bonus: {
    percent?: number | null;
    accumulated_amount?: number | null;
  };
  other_notes: string[];
  field_confidence: Record<string, number>;
  field_evidence: Record<string, EvidenceItem>;
  missing_fields: string[];
  warnings: string[];
  overall_confidence: number;
}

export interface DocumentPageSummary {
  page_number: number;
  text_length: number;
  extraction_method: string;
  ocr_confidence?: number | null;
}

export interface DocumentDetail extends DocumentSummary {
  pages: DocumentPageSummary[];
  extraction?: ExtractionResult | null;
  review_status?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  corrections?: Array<{
    path: string;
    old: unknown;
    new: unknown;
    by: string;
    at: string;
  }>;
}

export interface FieldCorrectionItem {
  path: string;
  value: unknown;
}

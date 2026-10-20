/**
 * CRM Data Types for FRD-02 Leads, Pipeline, and Analytics.
 */

export type LeadStatus =
  | 'new'
  | 'in_conversation'
  | 'qualified'
  | 'documents_pending'
  | 'documents_processing'
  | 'under_review'
  | 'analysis_complete'
  | 'closed_won'
  | 'closed_lost'
  | 'disqualified';

export type QualificationTier = 'hot' | 'warm' | 'cold';

export interface UserSummary {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface LeadListItem {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source: string;
  qualification_score: number | null;
  qualification_tier: QualificationTier | null;
  location: string | null;
  insurance_interest: string[] | null;
  assigned_to: UserSummary | null;
  has_documents: boolean;
  needs_human: boolean;
  created_at: string;
  last_activity_at: string;
}

export interface LeadDetail {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source: string;
  qualification: {
    score: number | null;
    tier: QualificationTier | null;
    breakdown?: Record<string, { points: number; reason: string }>;
  };
  profile: {
    insurance_interest: string[] | null;
    has_existing_policy: boolean | null;
    current_provider: string | null;
    age_range: string | null;
    location: string | null;
    household_size: number | null;
    employment_status: string | null;
    approx_annual_premium: number | null;
    premium_currency: string;
    renewal_timeframe: string | null;
    main_concern: string | null;
    budget_range: string | null;
  };
  assigned_to: UserSummary | null;
  counts: {
    messages: number;
    documents: number;
    analyses: number;
    notes: number;
  };
  summary: string | null;
  needs_human: boolean;
  consent_given: boolean;
  consent_at: string | null;
  created_at: string;
  last_activity_at: string;
}

export interface DashboardSummary {
  totals: {
    all: number;
    new: number;
    in_conversation: number;
    qualified: number;
    documents_pending: number;
    documents_processing: number;
    under_review: number;
    analysis_complete: number;
    closed_won: number;
    closed_lost: number;
    disqualified: number;
  };
  avg_hours_to_analysis: number;
  conversion_rate: number;
  hot_leads_waiting: number;
  documents_awaiting_review: number;
}

export interface PipelineStageGroup {
  stage: LeadStatus;
  count: number;
  leads: LeadListItem[];
}

export interface LeadNoteItem {
  id: string;
  lead_id: string;
  body: string;
  created_at: string;
  author: UserSummary | null;
}

export interface LeadStatusHistoryItem {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by_type: string;
  reason: string | null;
  created_at: string;
}

export interface LeadMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface AttentionItem {
  id: string;
  type: 'unassigned_hot' | 'docs_review' | 'urgent_renewal';
  lead_id: string;
  lead_name: string;
  description: string;
  badge: string;
  priority: 'critical' | 'high' | 'medium';
}

export interface LeadFilters {
  status?: string | null;
  tier?: string | null;
  assigned_to?: string | null;
  has_documents?: boolean | null;
  q?: string;
  page?: number;
  page_size?: number;
}

import { createSlice, createAction, type PayloadAction } from '@reduxjs/toolkit';
import type {
  DashboardSummary,
  LeadDetail,
  LeadListItem,
  LeadMessageItem,
  LeadNoteItem,
  LeadStatusHistoryItem,
  PipelineStageGroup,
  UserSummary,
} from '../../types/crm';

export type CrmActiveView = 'dashboard' | 'leads' | 'review';
export type PipelineViewMode = 'kanban' | 'funnel' | 'list';

interface CrmState {
  activeView: CrmActiveView;
  pipelineViewMode: PipelineViewMode;
  summary: DashboardSummary | null;
  pipelineStages: PipelineStageGroup[];
  leads: LeadListItem[];
  totalLeads: number;
  page: number;
  pageSize: number;
  totalPages: number;
  selectedLead: LeadDetail | null;
  isLoading: boolean;
  isActionLoading: boolean;
  filterStatus: string | null;
  tierFilter: string | null;
  assignedFilter: string | null;
  hasDocsFilter: boolean | null;
  searchQuery: string;
  teamUsers: UserSummary[];
  leadConversation: LeadMessageItem[];
  leadHistory: LeadStatusHistoryItem[];
  leadNotes: LeadNoteItem[];
  error: string | null;
  isAuthenticated: boolean;
  currentUser: { email: string; full_name: string; role: string } | null;
}

const getSavedUser = (): { email: string; full_name: string; role: string } | null => {
  try {
    const raw = localStorage.getItem('securelife_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialState: CrmState = {
  activeView: 'dashboard',
  pipelineViewMode: 'kanban',
  summary: null,
  pipelineStages: [],
  leads: [],
  totalLeads: 0,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  selectedLead: null,
  isLoading: false,
  isActionLoading: false,
  filterStatus: null,
  tierFilter: null,
  assignedFilter: null,
  hasDocsFilter: null,
  searchQuery: '',
  teamUsers: [],
  leadConversation: [],
  leadHistory: [],
  leadNotes: [],
  error: null,
  isAuthenticated: Boolean(localStorage.getItem('securelife_auth_token')),
  currentUser: getSavedUser(),
};

// Sagas trigger actions
export const fetchDashboardData = createAction('crm/fetchDashboardData');
export const fetchLeads = createAction<{
  status?: string;
  tier?: string;
  assigned_to?: string;
  has_documents?: boolean;
  q?: string;
  page?: number;
  page_size?: number;
}>('crm/fetchLeads');
export const fetchLeadDetail = createAction<string>('crm/fetchLeadDetail');
export const fetchLeadConversation = createAction<string>('crm/fetchLeadConversation');
export const fetchLeadHistory = createAction<string>('crm/fetchLeadHistory');
export const fetchTeamUsers = createAction('crm/fetchTeamUsers');
export const assignLead = createAction<{ leadId: string; userId: string | null }>('crm/assignLead');
export const transitionLeadStatus = createAction<{
  leadId: string;
  toStatus: string;
  reason?: string;
}>('crm/transitionLeadStatus');
export const addLeadNote = createAction<{ leadId: string; body: string }>('crm/addLeadNote');
export const loginUser = createAction<{ email: string; password: string }>('crm/loginUser');

export const crmSlice = createSlice({
  name: 'crm',
  initialState,
  reducers: {
    setActiveView: (state, action: PayloadAction<CrmActiveView>) => {
      state.activeView = action.payload;
    },
    setPipelineViewMode: (state, action: PayloadAction<PipelineViewMode>) => {
      state.pipelineViewMode = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setActionLoading: (state, action: PayloadAction<boolean>) => {
      state.isActionLoading = action.payload;
    },
    setSummary: (state, action: PayloadAction<DashboardSummary>) => {
      state.summary = action.payload;
    },
    setPipelineStages: (state, action: PayloadAction<PipelineStageGroup[]>) => {
      state.pipelineStages = action.payload;
    },
    setLeads: (
      state,
      action: PayloadAction<{ items: LeadListItem[]; total: number; page?: number; total_pages?: number }>
    ) => {
      state.leads = action.payload.items;
      state.totalLeads = action.payload.total;
      if (action.payload.page) state.page = action.payload.page;
      if (action.payload.total_pages) state.totalPages = action.payload.total_pages;
    },
    setSelectedLead: (state, action: PayloadAction<LeadDetail | null>) => {
      state.selectedLead = action.payload;
    },
    setFilterStatus: (state, action: PayloadAction<string | null>) => {
      state.filterStatus = action.payload;
    },
    setTierFilter: (state, action: PayloadAction<string | null>) => {
      state.tierFilter = action.payload;
    },
    setAssignedFilter: (state, action: PayloadAction<string | null>) => {
      state.assignedFilter = action.payload;
    },
    setHasDocsFilter: (state, action: PayloadAction<boolean | null>) => {
      state.hasDocsFilter = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setPagination: (state, action: PayloadAction<{ page: number; pageSize?: number }>) => {
      state.page = action.payload.page;
      if (action.payload.pageSize) state.pageSize = action.payload.pageSize;
    },
    setTeamUsers: (state, action: PayloadAction<UserSummary[]>) => {
      state.teamUsers = action.payload;
    },
    setLeadConversation: (state, action: PayloadAction<LeadMessageItem[]>) => {
      state.leadConversation = action.payload;
    },
    setLeadHistory: (state, action: PayloadAction<LeadStatusHistoryItem[]>) => {
      state.leadHistory = action.payload;
    },
    setLeadNotes: (state, action: PayloadAction<LeadNoteItem[]>) => {
      state.leadNotes = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setAuthUser: (
      state,
      action: PayloadAction<{
        user: { email: string; full_name: string; role: string };
        token: string;
      }>
    ) => {
      state.isAuthenticated = true;
      state.currentUser = action.payload.user;
      localStorage.setItem('securelife_auth_token', action.payload.token);
      localStorage.setItem('securelife_user', JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.currentUser = null;
      state.selectedLead = null;
      state.leadConversation = [];
      state.leadHistory = [];
      state.leadNotes = [];
      localStorage.removeItem('securelife_auth_token');
      localStorage.removeItem('securelife_user');
    },
  },
});

export const {
  setActiveView,
  setPipelineViewMode,
  setLoading,
  setActionLoading,
  setSummary,
  setPipelineStages,
  setLeads,
  setSelectedLead,
  setFilterStatus,
  setTierFilter,
  setAssignedFilter,
  setHasDocsFilter,
  setSearchQuery,
  setPagination,
  setTeamUsers,
  setLeadConversation,
  setLeadHistory,
  setLeadNotes,
  setError,
  setAuthUser,
  logout,
} = crmSlice.actions;

export default crmSlice.reducer;

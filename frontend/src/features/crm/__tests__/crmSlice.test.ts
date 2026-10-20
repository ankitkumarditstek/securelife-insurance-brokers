import { describe, it, expect, beforeEach } from 'vitest';
import type { LeadListItem, UserSummary, LeadMessageItem, LeadStatusHistoryItem, LeadNoteItem } from '../../../types/crm';
import crmReducer, {
  setActiveView,
  setPipelineViewMode,
  setPagination,
  setTierFilter,
  setAssignedFilter,
  setHasDocsFilter,
  setSearchQuery,
  setLeads,
  setTeamUsers,
  setLeadConversation,
  setLeadHistory,
  setLeadNotes,
  logout,
} from '../crmSlice';

describe('crmSlice reducers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const getInitialState = () => crmReducer(undefined, { type: '@@INIT' });

  it('handles setActiveView for switching between dashboard, leads, and review tabs', () => {
    let state = getInitialState();
    expect(state.activeView).toBe('dashboard');

    state = crmReducer(state, setActiveView('leads'));
    expect(state.activeView).toBe('leads');

    state = crmReducer(state, setActiveView('review'));
    expect(state.activeView).toBe('review');
  });

  it('handles setPipelineViewMode for kanban, funnel, and list modes', () => {
    let state = getInitialState();
    expect(state.pipelineViewMode).toBe('kanban');

    state = crmReducer(state, setPipelineViewMode('funnel'));
    expect(state.pipelineViewMode).toBe('funnel');

    state = crmReducer(state, setPipelineViewMode('list'));
    expect(state.pipelineViewMode).toBe('list');
  });

  it('handles setPagination with page and optional pageSize', () => {
    let state = getInitialState();
    state = crmReducer(state, setPagination({ page: 3, pageSize: 50 }));
    expect(state.page).toBe(3);
    expect(state.pageSize).toBe(50);

    state = crmReducer(state, setPagination({ page: 4 }));
    expect(state.page).toBe(4);
    expect(state.pageSize).toBe(50); // Preserved
  });

  it('handles tier, assigned, and hasDocs filters', () => {
    let state = getInitialState();
    state = crmReducer(state, setTierFilter('hot'));
    expect(state.tierFilter).toBe('hot');

    state = crmReducer(state, setAssignedFilter('u123'));
    expect(state.assignedFilter).toBe('u123');

    state = crmReducer(state, setHasDocsFilter(true));
    expect(state.hasDocsFilter).toBe(true);

    state = crmReducer(state, setSearchQuery('Sharma'));
    expect(state.searchQuery).toBe('Sharma');
  });

  it('handles setLeads and updates totalPages and current page when provided', () => {
    let state = getInitialState();
    const mockLead: LeadListItem = {
      id: 'lead-1',
      source: 'web_chat',
      status: 'qualified',
      full_name: 'Amit Patel',
      email: 'amit@example.com',
      phone: '+91 98765 43210',
      qualification_score: 85,
      qualification_tier: 'hot',
      assigned_to: null,
      insurance_interest: ['term_life'],
      location: 'Mumbai, MH',
      has_documents: false,
      needs_human: false,
      created_at: '2026-10-14T10:00:00Z',
      last_activity_at: '2026-10-14T10:00:00Z',
    };

    state = crmReducer(
      state,
      setLeads({
        items: [mockLead],
        total: 25,
        page: 2,
        total_pages: 3,
      })
    );

    expect(state.leads).toHaveLength(1);
    expect(state.totalLeads).toBe(25);
    expect(state.page).toBe(2);
    expect(state.totalPages).toBe(3);
  });

  it('handles setting team users, conversation, history, and notes', () => {
    let state = getInitialState();
    const mockUser: UserSummary = {
      id: 'u1',
      email: 'rajesh@securelife.com',
      full_name: 'Rajesh Sharma',
      role: 'broker',
      is_active: true,
    };

    state = crmReducer(state, setTeamUsers([mockUser]));
    expect(state.teamUsers).toHaveLength(1);

    const mockMessage: LeadMessageItem = {
      id: 'm1',
      role: 'user',
      content: 'Hello, I need term insurance.',
      created_at: '2026-10-14T10:00:00Z',
    };
    state = crmReducer(state, setLeadConversation([mockMessage]));
    expect(state.leadConversation).toHaveLength(1);

    const mockHistory: LeadStatusHistoryItem = {
      id: 'h1',
      from_status: 'new',
      to_status: 'in_conversation',
      changed_by_type: 'system',
      reason: 'Initial chat turn',
      created_at: '2026-10-14T10:00:00Z',
    };
    state = crmReducer(state, setLeadHistory([mockHistory]));
    expect(state.leadHistory).toHaveLength(1);

    const mockNote: LeadNoteItem = {
      id: 'n1',
      lead_id: 'l1',
      author: mockUser,
      body: 'Spoke with client, requested medical records.',
      created_at: '2026-10-14T10:05:00Z',
    };
    state = crmReducer(state, setLeadNotes([mockNote]));
    expect(state.leadNotes).toHaveLength(1);
  });

  it('clears lead detail data on logout', () => {
    let state = getInitialState();
    const mockMessage: LeadMessageItem = {
      id: 'm1',
      role: 'user',
      content: 'test',
      created_at: '',
    };
    state = crmReducer(state, setLeadConversation([mockMessage]));
    expect(state.leadConversation).toHaveLength(1);

    state = crmReducer(state, logout());
    expect(state.leadConversation).toHaveLength(0);
    expect(state.selectedLead).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { renderWithProviders } from '../test/test-utils';
import { apiClient } from '../services/apiClient';

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    localStorage.clear();
    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url === '/dashboard/summary') {
        return Promise.resolve({
          data: {
            totals: {
              all: 10,
              new: 2,
              in_conversation: 0,
              qualified: 3,
              documents_pending: 1,
              documents_processing: 0,
              under_review: 2,
              analysis_complete: 1,
              closed_won: 1,
              closed_lost: 0,
              disqualified: 0,
            },
            hot_leads_waiting: 1,
            documents_awaiting_review: 2,
            conversion_rate: 0.3,
            avg_hours_to_analysis: 2.5,
          },
        });
      }
      if (url === '/dashboard/pipeline') {
        return Promise.resolve({
          data: {
            stages: [
              { stage: 'new', label: 'New', count: 2, leads: [] },
              { stage: 'qualified', label: 'Qualified', count: 1, leads: [] },
            ],
          },
        });
      }
      if (url.startsWith('/leads')) {
        return Promise.resolve({
          data: {
            items: [],
            total: 0,
          },
        });
      }
      if (url === '/users') {
        return Promise.resolve({
          data: [
            { id: 'u1', email: 'broker@securelife.com', full_name: 'Rajesh Sharma', role: 'broker' },
          ],
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  const defaultCrmState = {
    activeView: 'dashboard' as const,
    pipelineViewMode: 'kanban' as const,
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
    isAuthenticated: false,
    currentUser: null,
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders SecureLife application header and chat window', () => {
    renderWithProviders(<App />);
    expect(screen.getAllByText(/SecureLife/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/SecureLife Advisor/i)).toBeInTheDocument();
    expect(screen.getByText(/Conversational Lead Qualification/i)).toBeInTheDocument();
  });

  it('displays Broker Portal login gate when clicking Broker Sign In unauthenticated', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, {
      preloadedState: {
        crm: {
          ...defaultCrmState,
          isAuthenticated: false,
          currentUser: null,
        },
      },
    });

    const signInBtn = screen.getByRole('button', { name: /Broker Sign In/i });
    await user.click(signInBtn);

    expect(screen.getByText(/SecureLife Broker Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Corporate Work Email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Broker Portal/i })).toBeInTheDocument();
  });

  it('displays Broker Pipeline CRM dashboard when navigating to dashboard while authenticated', async () => {
    localStorage.setItem('securelife_auth_token', 'mock_jwt_token');
    const user = userEvent.setup();
    renderWithProviders(<App />, {
      preloadedState: {
        crm: {
          ...defaultCrmState,
          isAuthenticated: true,
          currentUser: {
            email: 'broker@securelife.com',
            full_name: 'Rajesh Sharma',
            role: 'broker',
          },
        },
      },
    });

    const dashboardBtn = screen.getByRole('button', { name: /Broker Dashboard/i });
    await user.click(dashboardBtn);

    expect(await screen.findByText(/Broker Pipeline & CRM/i)).toBeInTheDocument();

    const publicSiteBtn = screen.getByRole('button', { name: /Public Site/i });
    await user.click(publicSiteBtn);

    expect(await screen.findByText(/SecureLife Advisor/i)).toBeInTheDocument();
  });

  it('allows authenticated user in dashboard to sign out and returns to public landing page', async () => {
    localStorage.setItem('securelife_auth_token', 'mock_jwt_token');
    const user = userEvent.setup();
    renderWithProviders(<App />, {
      preloadedState: {
        crm: {
          ...defaultCrmState,
          isAuthenticated: true,
          currentUser: {
            email: 'broker@securelife.com',
            full_name: 'Rajesh Sharma',
            role: 'broker',
          },
        },
      },
    });

    const dashboardBtn = screen.getByRole('button', { name: /Broker Dashboard/i });
    await user.click(dashboardBtn);

    expect(screen.getByText(/Broker Pipeline & CRM/i)).toBeInTheDocument();

    const signOutBtn = screen.getAllByRole('button', { name: /Sign Out/i })[0];
    await user.click(signOutBtn);

    expect(screen.getByText(/SecureLife Advisor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Broker Sign In/i })).toBeInTheDocument();
  });
});

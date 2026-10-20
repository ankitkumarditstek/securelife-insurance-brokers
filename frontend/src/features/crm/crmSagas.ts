import axios from 'axios';
import { call, put, takeLatest, takeEvery } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/apiClient';
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
import {
  addLeadNote,
  assignLead,
  fetchDashboardData,
  fetchLeadConversation,
  fetchLeadDetail,
  fetchLeadHistory,
  fetchLeads,
  fetchTeamUsers,
  loginUser,
  logout,
  setActionLoading,
  setAuthUser,
  setError,
  setLeadConversation,
  setLeadHistory,
  setLeadNotes,
  setLeads,
  setLoading,
  setPipelineStages,
  setSelectedLead,
  setSummary,
  setTeamUsers,
  transitionLeadStatus,
} from './crmSlice';

function* handleFetchDashboardData() {
  const token = localStorage.getItem('securelife_auth_token');
  if (!token) {
    yield put(logout());
    return;
  }
  yield put(setLoading(true));
  yield put(setError(null));
  try {
    const [summaryRes, pipelineRes, leadsRes, usersRes]: [
      { data: DashboardSummary },
      { data: { stages: PipelineStageGroup[] } },
      { data: { items: LeadListItem[]; total: number; page?: number; total_pages?: number } },
      { data: UserSummary[] },
    ] = yield Promise.all([
      apiClient.get('/dashboard/summary'),
      apiClient.get('/dashboard/pipeline'),
      apiClient.get('/leads?page=1&page_size=50'),
      apiClient.get('/users'),
    ]);

    yield put(setSummary(summaryRes.data));
    yield put(setPipelineStages(pipelineRes.data.stages));
    yield put(
      setLeads({
        items: leadsRes.data.items,
        total: leadsRes.data.total,
        page: leadsRes.data.page || 1,
        total_pages: leadsRes.data.total_pages || 1,
      })
    );
    yield put(setTeamUsers(usersRes.data));
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      yield put(logout());
      yield put(setError('Session expired or unauthorized. Please sign in to access the CRM.'));
    } else {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      yield put(setError(errorMsg));
    }
  } finally {
    yield put(setLoading(false));
  }
}

function* handleFetchLeads(
  action: PayloadAction<{
    status?: string;
    tier?: string;
    assigned_to?: string;
    has_documents?: boolean;
    q?: string;
    page?: number;
    page_size?: number;
  }>
) {
  yield put(setLoading(true));
  try {
    const params = new URLSearchParams();
    if (action.payload.status) params.append('status', action.payload.status);
    if (action.payload.tier) params.append('tier', action.payload.tier);
    if (action.payload.assigned_to) params.append('assigned_to', action.payload.assigned_to);
    if (typeof action.payload.has_documents === 'boolean') {
      params.append('has_documents', String(action.payload.has_documents));
    }
    if (action.payload.q) params.append('q', action.payload.q);
    if (action.payload.page) params.append('page', String(action.payload.page));
    if (action.payload.page_size) params.append('page_size', String(action.payload.page_size));

    const res: {
      data: {
        items: LeadListItem[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      };
    } = yield call(apiClient.get, `/leads?${params.toString()}`);

    yield put(
      setLeads({
        items: res.data.items,
        total: res.data.total,
        page: res.data.page,
        total_pages: res.data.total_pages,
      })
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch leads';
    yield put(setError(errorMsg));
  } finally {
    yield put(setLoading(false));
  }
}

function* handleFetchLeadDetail(action: PayloadAction<string>) {
  yield put(setActionLoading(true));
  try {
    const [detailRes, convRes, historyRes, notesRes]: [
      { data: LeadDetail },
      { data: LeadMessageItem[] },
      { data: LeadStatusHistoryItem[] },
      { data: LeadNoteItem[] },
    ] = yield Promise.all([
      apiClient.get(`/leads/${action.payload}`),
      apiClient.get(`/leads/${action.payload}/conversation`).catch(() => ({ data: [] })),
      apiClient.get(`/leads/${action.payload}/history`).catch(() => ({ data: [] })),
      apiClient.get(`/leads/${action.payload}/notes`).catch(() => ({ data: [] })),
    ]);

    yield put(setSelectedLead(detailRes.data));
    yield put(setLeadConversation(convRes.data || []));
    yield put(setLeadHistory(historyRes.data || []));
    yield put(setLeadNotes(notesRes.data || []));
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch lead detail';
    yield put(setError(errorMsg));
  } finally {
    yield put(setActionLoading(false));
  }
}

function* handleFetchLeadConversation(action: PayloadAction<string>) {
  try {
    const res: { data: LeadMessageItem[] } = yield call(
      apiClient.get,
      `/leads/${action.payload}/conversation`
    );
    yield put(setLeadConversation(res.data));
  } catch (err: unknown) {
    console.error('Failed to fetch lead conversation:', err);
  }
}

function* handleFetchLeadHistory(action: PayloadAction<string>) {
  try {
    const res: { data: LeadStatusHistoryItem[] } = yield call(
      apiClient.get,
      `/leads/${action.payload}/history`
    );
    yield put(setLeadHistory(res.data));
  } catch (err: unknown) {
    console.error('Failed to fetch lead history:', err);
  }
}

function* handleFetchTeamUsers() {
  try {
    const res: { data: UserSummary[] } = yield call(apiClient.get, '/users');
    yield put(setTeamUsers(res.data));
  } catch (err: unknown) {
    console.error('Failed to fetch team users:', err);
  }
}

function* handleAssignLead(
  action: PayloadAction<{ leadId: string; userId: string | null }>
) {
  yield put(setActionLoading(true));
  try {
    const res: { data: LeadDetail } = yield call(
      apiClient.post,
      `/leads/${action.payload.leadId}/assign`,
      { user_id: action.payload.userId }
    );
    yield put(setSelectedLead(res.data));
    yield put(fetchDashboardData());
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to assign lead';
    yield put(setError(errorMsg));
  } finally {
    yield put(setActionLoading(false));
  }
}

function* handleTransitionStatus(
  action: PayloadAction<{ leadId: string; toStatus: string; reason?: string }>
) {
  yield put(setActionLoading(true));
  try {
    const res: { data: LeadDetail } = yield call(
      apiClient.post,
      `/leads/${action.payload.leadId}/status`,
      {
        to_status: action.payload.toStatus,
        reason: action.payload.reason,
      }
    );
    yield put(setSelectedLead(res.data));
    yield put(fetchDashboardData());
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to transition lead status';
    yield put(setError(errorMsg));
  } finally {
    yield put(setActionLoading(false));
  }
}

function* handleAddLeadNote(action: PayloadAction<{ leadId: string; body: string }>) {
  yield put(setActionLoading(true));
  try {
    yield call(apiClient.post, `/leads/${action.payload.leadId}/notes`, {
      body: action.payload.body,
    });
    // Refresh notes and lead detail
    const notesRes: { data: LeadNoteItem[] } = yield call(
      apiClient.get,
      `/leads/${action.payload.leadId}/notes`
    );
    yield put(setLeadNotes(notesRes.data));
    yield put(fetchLeadDetail(action.payload.leadId));
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to add note';
    yield put(setError(errorMsg));
  } finally {
    yield put(setActionLoading(false));
  }
}

function* handleLoginUser(action: PayloadAction<{ email: string; password: string }>) {
  yield put(setLoading(true));
  yield put(setError(null));
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: { data: any } = yield call(apiClient.post, '/auth/login', action.payload);
    yield put(
      setAuthUser({
        token: res.data.access_token,
        user: res.data.user,
      })
    );
    yield put(fetchDashboardData());
  } catch (err: unknown) {
    let errorMsg = 'Login failed';
    if (axios.isAxiosError(err) && err.response?.data?.detail) {
      const detail = err.response.data.detail;
      if (typeof detail === 'object' && detail.error?.message) {
        errorMsg = detail.error.message;
      } else if (typeof detail === 'string') {
        errorMsg = detail;
      }
    } else if (err instanceof Error) {
      errorMsg = err.message;
    }
    yield put(setError(errorMsg));
  } finally {
    yield put(setLoading(false));
  }
}

export function* crmSagas() {
  yield takeLatest(fetchDashboardData.type, handleFetchDashboardData);
  yield takeLatest(fetchLeads.type, handleFetchLeads);
  yield takeLatest(fetchLeadDetail.type, handleFetchLeadDetail);
  yield takeLatest(fetchLeadConversation.type, handleFetchLeadConversation);
  yield takeLatest(fetchLeadHistory.type, handleFetchLeadHistory);
  yield takeLatest(fetchTeamUsers.type, handleFetchTeamUsers);
  yield takeEvery(assignLead.type, handleAssignLead);
  yield takeLatest(transitionLeadStatus.type, handleTransitionStatus);
  yield takeLatest(addLeadNote.type, handleAddLeadNote);
  yield takeLatest(loginUser.type, handleLoginUser);
}

import React, { useEffect } from 'react';
import {
  RefreshCw,
  LayoutGrid,
  TrendingUp,
  Table as TableIcon,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  addLeadNote,
  fetchDashboardData,
  fetchLeadDetail,
  fetchLeads,
  logout,
  setActiveView,
  setAssignedFilter,
  setFilterStatus,
  setHasDocsFilter,
  setPagination,
  setPipelineViewMode,
  setSearchQuery,
  setSelectedLead,
  setTierFilter,
  transitionLeadStatus,
} from '../crmSlice';
import { Sidebar } from './Sidebar';
import { AttentionPanel } from './AttentionPanel';
import { SummaryCards } from './SummaryCards';
import { PipelineKanban } from './PipelineKanban';
import { FunnelChart } from './FunnelChart';
import { LeadsTable } from './LeadsTable';
import { ReviewQueue } from './ReviewQueue';
import { LeadDetailModal } from './LeadDetailModal';

interface CrmDashboardProps {
  onNavigatePublic?: () => void;
  onSignOut?: () => void;
}

export const CrmDashboard: React.FC<CrmDashboardProps> = ({
  onNavigatePublic,
  onSignOut,
}) => {
  const dispatch = useAppDispatch();
  const {
    activeView,
    pipelineViewMode,
    summary,
    leads,
    totalLeads,
    page,
    pageSize,
    totalPages,
    pipelineStages,
    selectedLead,
    isLoading,
    isActionLoading,
    filterStatus,
    tierFilter,
    assignedFilter,
    hasDocsFilter,
    searchQuery,
    teamUsers,
    currentUser,
  } = useAppSelector((state) => state.crm);

  useEffect(() => {
    dispatch(fetchDashboardData());
  }, [dispatch]);

  const handleSearchChange = (val: string) => {
    dispatch(setSearchQuery(val));
    dispatch(
      fetchLeads({
        status: filterStatus || undefined,
        tier: tierFilter || undefined,
        assigned_to: assignedFilter || undefined,
        has_documents: typeof hasDocsFilter === 'boolean' ? hasDocsFilter : undefined,
        q: val || undefined,
        page: 1,
        page_size: pageSize,
      })
    );
  };

  const handleFilterStage = (stage: string | null) => {
    dispatch(setFilterStatus(stage));
    dispatch(
      fetchLeads({
        status: stage || undefined,
        tier: tierFilter || undefined,
        assigned_to: assignedFilter || undefined,
        has_documents: typeof hasDocsFilter === 'boolean' ? hasDocsFilter : undefined,
        q: searchQuery || undefined,
        page: 1,
        page_size: pageSize,
      })
    );
  };

  const handleFilterTier = (tier: string | null) => {
    dispatch(setTierFilter(tier));
    dispatch(
      fetchLeads({
        status: filterStatus || undefined,
        tier: tier || undefined,
        assigned_to: assignedFilter || undefined,
        has_documents: typeof hasDocsFilter === 'boolean' ? hasDocsFilter : undefined,
        q: searchQuery || undefined,
        page: 1,
        page_size: pageSize,
      })
    );
  };

  const handleFilterAssigned = (userId: string | null) => {
    dispatch(setAssignedFilter(userId));
    dispatch(
      fetchLeads({
        status: filterStatus || undefined,
        tier: tierFilter || undefined,
        assigned_to: userId || undefined,
        has_documents: typeof hasDocsFilter === 'boolean' ? hasDocsFilter : undefined,
        q: searchQuery || undefined,
        page: 1,
        page_size: pageSize,
      })
    );
  };

  const handleFilterHasDocs = (hasDocs: boolean | null) => {
    dispatch(setHasDocsFilter(hasDocs));
    dispatch(
      fetchLeads({
        status: filterStatus || undefined,
        tier: tierFilter || undefined,
        assigned_to: assignedFilter || undefined,
        has_documents: typeof hasDocs === 'boolean' ? hasDocs : undefined,
        q: searchQuery || undefined,
        page: 1,
        page_size: pageSize,
      })
    );
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setPagination({ page: newPage }));
    dispatch(
      fetchLeads({
        status: filterStatus || undefined,
        tier: tierFilter || undefined,
        assigned_to: assignedFilter || undefined,
        has_documents: typeof hasDocsFilter === 'boolean' ? hasDocsFilter : undefined,
        q: searchQuery || undefined,
        page: newPage,
        page_size: pageSize,
      })
    );
  };

  const handlePageSizeChange = (newPageSize: number) => {
    dispatch(setPagination({ page: 1, pageSize: newPageSize }));
    dispatch(
      fetchLeads({
        status: filterStatus || undefined,
        tier: tierFilter || undefined,
        assigned_to: assignedFilter || undefined,
        has_documents: typeof hasDocsFilter === 'boolean' ? hasDocsFilter : undefined,
        q: searchQuery || undefined,
        page: 1,
        page_size: newPageSize,
      })
    );
  };

  const handleSelectLead = (leadId: string) => {
    dispatch(fetchLeadDetail(leadId));
  };

  const unreviewedDocsCount = summary?.documents_awaiting_review ?? 0;

  return (
    <div className="w-full flex flex-col md:flex-row min-h-[calc(100vh-6rem)] gap-6 font-sans">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={(view) => dispatch(setActiveView(view))}
        unreviewedDocsCount={unreviewedDocsCount}
        currentUser={currentUser}
        onViewPublicSite={onNavigatePublic || (() => window.location.assign('/'))}
        onSignOut={onSignOut || (() => dispatch(logout()))}
      />

      {/* Main Workspace Content Area */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Top Control Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md">
          <div>
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Broker Pipeline & CRM</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enterprise lead lifecycle governance, deterministic scoring breakdown, and document audit records.
            </p>
          </div>

          {/* Search, View Modes & Refresh */}
          <div className="flex items-center gap-2.5">
            {activeView === 'dashboard' && (
              <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => dispatch(setPipelineViewMode('kanban'))}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    pipelineViewMode === 'kanban'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Kanban Board View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kanban</span>
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(setPipelineViewMode('funnel'))}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    pipelineViewMode === 'funnel'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Funnel Conversion View"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Funnel</span>
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(setPipelineViewMode('list'))}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    pipelineViewMode === 'list'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Table List View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => dispatch(fetchDashboardData())}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 cursor-pointer"
              title="Refresh Pipeline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* View Switcher: Dashboard vs Leads vs Review Queue */}
        {activeView === 'dashboard' ? (
          <>
            {/* Action Required Attention Panel */}
            <AttentionPanel
              summary={summary}
              leads={leads}
              onSelectLead={handleSelectLead}
              onOpenReviewQueue={() => dispatch(setActiveView('review'))}
            />

            {/* Aggregate Metrics Cards */}
            <SummaryCards
              summary={summary}
              onFilterStage={handleFilterStage}
              activeFilter={filterStatus}
            />

            {/* Pipeline Visual Workspace */}
            {pipelineViewMode === 'kanban' ? (
              <PipelineKanban
                stages={pipelineStages}
                leads={leads}
                onSelectLead={handleSelectLead}
                selectedLeadId={selectedLead?.id}
              />
            ) : pipelineViewMode === 'funnel' ? (
              <FunnelChart
                summary={summary}
                onFilterStage={handleFilterStage}
                activeStage={filterStatus}
              />
            ) : (
              <LeadsTable
                leads={leads}
                totalLeads={totalLeads}
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                isLoading={isLoading}
                searchQuery={searchQuery}
                filterStatus={filterStatus}
                tierFilter={tierFilter}
                assignedFilter={assignedFilter}
                hasDocsFilter={hasDocsFilter}
                teamUsers={teamUsers}
                onSearchChange={handleSearchChange}
                onFilterStatus={handleFilterStage}
                onFilterTier={handleFilterTier}
                onFilterAssigned={handleFilterAssigned}
                onFilterHasDocs={handleFilterHasDocs}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onSelectLead={handleSelectLead}
              />
            )}
          </>
        ) : activeView === 'leads' ? (
          /* Dedicated Leads Directory View */
          <LeadsTable
            leads={leads}
            totalLeads={totalLeads}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            isLoading={isLoading}
            searchQuery={searchQuery}
            filterStatus={filterStatus}
            tierFilter={tierFilter}
            assignedFilter={assignedFilter}
            hasDocsFilter={hasDocsFilter}
            teamUsers={teamUsers}
            onSearchChange={handleSearchChange}
            onFilterStatus={handleFilterStage}
            onFilterTier={handleFilterTier}
            onFilterAssigned={handleFilterAssigned}
            onFilterHasDocs={handleFilterHasDocs}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSelectLead={handleSelectLead}
          />
        ) : (
          /* Dedicated Review Queue Workspace */
          <ReviewQueue
            leads={leads}
            onSelectLeadForReview={handleSelectLead}
          />
        )}
      </div>

      {/* Selected Lead Modal Detail View */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => dispatch(setSelectedLead(null))}
          onTransitionStatus={(toStatus, reason) =>
            dispatch(transitionLeadStatus({ leadId: selectedLead.id, toStatus, reason }))
          }
          onAddNote={(body) => dispatch(addLeadNote({ leadId: selectedLead.id, body }))}
          isActionLoading={isActionLoading}
        />
      )}
    </div>
  );
};

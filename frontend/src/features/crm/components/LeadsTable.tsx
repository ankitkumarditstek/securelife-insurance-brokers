import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Flame,
  FileCheck2,
  UserCheck,
  Phone,
  Mail,
  Filter,
} from 'lucide-react';
import type { LeadListItem, UserSummary } from '../../../types/crm';
import { getStatusBadgeConfig, getTierBadgeConfig } from '../../../utils/statusStyles';

interface LeadsTableProps {
  leads: LeadListItem[];
  totalLeads: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  searchQuery: string;
  filterStatus: string | null;
  tierFilter: string | null;
  assignedFilter: string | null;
  hasDocsFilter: boolean | null;
  teamUsers: UserSummary[];
  onSearchChange: (q: string) => void;
  onFilterStatus: (status: string | null) => void;
  onFilterTier: (tier: string | null) => void;
  onFilterAssigned: (userId: string | null) => void;
  onFilterHasDocs: (hasDocs: boolean | null) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelectLead: (leadId: string) => void;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  totalLeads,
  page,
  pageSize,
  totalPages,
  isLoading,
  searchQuery,
  filterStatus,
  tierFilter,
  assignedFilter,
  hasDocsFilter,
  teamUsers,
  onSearchChange,
  onFilterStatus,
  onFilterTier,
  onFilterAssigned,
  onFilterHasDocs,
  onPageChange,
  onPageSizeChange,
  onSelectLead,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // 300ms debounce for search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearchChange]);

  const statuses = [
    { key: null, label: 'All Statuses' },
    { key: 'new', label: 'New' },
    { key: 'in_conversation', label: 'In Conversation' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'documents_pending', label: 'Docs Pending' },
    { key: 'documents_processing', label: 'Docs Processing' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'analysis_complete', label: 'Analysis Complete' },
    { key: 'closed_won', label: 'Closed Won' },
    { key: 'closed_lost', label: 'Closed Lost' },
  ];

  const tiers = [
    { key: null, label: 'All Tiers' },
    { key: 'hot', label: 'Hot', icon: Flame },
    { key: 'warm', label: 'Warm' },
    { key: 'cold', label: 'Cold' },
  ];

  return (
    <div className="space-y-4 font-sans">
      {/* Top Filter and Controls Bar */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by name, email, phone, location..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={filterStatus || ''}
              onChange={(e) => onFilterStatus(e.target.value || null)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              {statuses.map((s) => (
                <option key={s.label} value={s.key || ''}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tier Buttons */}
          <div className="flex items-center rounded-xl bg-slate-950 p-0.5 border border-slate-800">
            {tiers.map((t) => (
              <button
                key={t.label}
                onClick={() => onFilterTier(t.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  tierFilter === t.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Assignee Filter */}
          {teamUsers.length > 0 && (
            <select
              value={assignedFilter || ''}
              onChange={(e) => onFilterAssigned(e.target.value || null)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned Only</option>
              {teamUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role})
                </option>
              ))}
            </select>
          )}

          {/* Has Documents Toggle */}
          <button
            onClick={() => onFilterHasDocs(hasDocsFilter ? null : true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
              hasDocsFilter
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Has Docs</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Prospect</th>
                <th className="py-3.5 px-5">Contact Details</th>
                <th className="py-3.5 px-5">Interest</th>
                <th className="py-3.5 px-5">Lifecycle Stage</th>
                <th className="py-3.5 px-5">Score & Tier</th>
                <th className="py-3.5 px-5">Assigned Broker</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                /* Skeleton Rows */
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-5">
                      <div className="h-4 w-32 bg-slate-800 rounded-md" />
                      <div className="h-3 w-20 bg-slate-850 rounded-md mt-1.5" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-3.5 w-36 bg-slate-800 rounded-md" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 w-24 bg-slate-800 rounded-full" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-5 w-24 bg-slate-800 rounded-full" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-5 w-16 bg-slate-800 rounded-full" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 w-24 bg-slate-800 rounded-md" />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="h-4 w-16 bg-slate-800 rounded-md ml-auto" />
                    </td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Filter className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                      <p className="text-sm font-semibold text-slate-300">No leads found</p>
                      <p className="text-xs text-slate-500">
                        Try modifying your search keywords or resetting active filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const statusConfig = getStatusBadgeConfig(lead.status);
                  const tierConfig = getTierBadgeConfig(
                    lead.qualification_tier,
                    lead.qualification_score
                  );

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      {/* Name & Source */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-white text-xs group-hover:text-blue-400 transition-colors">
                          {lead.full_name || 'Anonymous Prospect'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {lead.location || 'Location Pending'} · Source: {lead.source}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[180px]">{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                          {!lead.email && !lead.phone && (
                            <span className="text-slate-600 italic">No contact provided</span>
                          )}
                        </div>
                      </td>

                      {/* Interest Chips */}
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1">
                          {lead.insurance_interest && lead.insurance_interest.length > 0 ? (
                            lead.insurance_interest.map((interest) => (
                              <span
                                key={interest}
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 capitalize"
                              >
                                {interest}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </div>
                      </td>

                      {/* Lifecycle Status */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusConfig.badgeBg} ${statusConfig.badgeBorder} ${statusConfig.badgeText}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                          <span>{statusConfig.label}</span>
                        </span>
                      </td>

                      {/* Score & Tier */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierConfig.badgeBg} ${tierConfig.badgeBorder} ${tierConfig.badgeText}`}
                          >
                            {tierConfig.label}
                          </span>
                          <span className="font-extrabold text-white text-xs">
                            {lead.qualification_score ?? '—'}
                          </span>
                        </div>
                      </td>

                      {/* Assigned Broker */}
                      <td className="py-4 px-5">
                        {lead.assigned_to ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold">
                              {lead.assigned_to.full_name[0]}
                            </div>
                            <span className="text-xs text-white font-medium">
                              {lead.assigned_to.full_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 opacity-40" />
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Row Action */}
                      <td className="py-4 px-5 text-right font-medium text-blue-400 group-hover:translate-x-1 transition-all">
                        <span>View Journey →</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination Bar */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, totalLeads)} of {totalLeads} leads
            </span>
            <div className="flex items-center gap-1.5 ml-4">
              <span>Per page:</span>
              {[10, 20, 50].map((sz) => (
                <button
                  key={sz}
                  onClick={() => onPageSizeChange(sz)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                    pageSize === sz
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-white">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

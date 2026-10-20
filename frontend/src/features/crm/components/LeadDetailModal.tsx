import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  X,
  Flame,
  FileText,
  ArrowRight,
  ShieldCheck,
  Plus,
  FolderDown,
  UserCheck,
  Phone,
  Mail,
  Copy,
  Check,
  Clock,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import type { RootState } from '../../../store/rootReducer';
import type { LeadDetail } from '../../../types/crm';
import type { FieldCorrectionItem } from '../../../types/document';
import {
  applyCorrectionsRequest,
  fetchDocumentDetailRequest,
  fetchLeadDocumentsRequest,
  reprocessDocumentRequest,
  selectDocument,
  uploadDocumentsRequest,
  verifyExtractionRequest,
} from '../../documents/documentsSlice';
import { assignLead } from '../crmSlice';
import { DocumentList } from '../../documents/components/DocumentList';
import { DocumentUploader } from '../../documents/components/DocumentUploader';
import { ExtractionViewer } from '../../documents/components/ExtractionViewer';
import { JourneyTimeline } from './JourneyTimeline';
import { ConversationView } from './ConversationView';
import { getStatusBadgeConfig, getTierBadgeConfig } from '../../../utils/statusStyles';

interface LeadDetailModalProps {
  lead: LeadDetail;
  onClose: () => void;
  onTransitionStatus: (toStatus: string, reason?: string) => void;
  onAddNote: (body: string) => void;
  isActionLoading: boolean;
}

const NEXT_STATUS_OPTIONS: Record<string, { key: string; label: string; color: string }[]> = {
  new: [
    { key: 'in_conversation', label: 'Begin Chat Turn', color: 'bg-blue-600' },
    { key: 'disqualified', label: 'Disqualify', color: 'bg-rose-600' },
  ],
  in_conversation: [
    { key: 'qualified', label: 'Mark Qualified', color: 'bg-emerald-600' },
    { key: 'disqualified', label: 'Disqualify', color: 'bg-rose-600' },
  ],
  qualified: [
    { key: 'documents_pending', label: 'Request Documents', color: 'bg-amber-600' },
    { key: 'closed_lost', label: 'Mark Lost', color: 'bg-slate-700' },
  ],
  documents_pending: [
    { key: 'documents_processing', label: 'Start Processing', color: 'bg-purple-600' },
    { key: 'closed_lost', label: 'Mark Lost', color: 'bg-slate-700' },
  ],
  documents_processing: [
    { key: 'under_review', label: 'Submit for Broker Review', color: 'bg-indigo-600' },
  ],
  under_review: [
    { key: 'analysis_complete', label: 'Approve & Finalize Analysis', color: 'bg-teal-600' },
  ],
  analysis_complete: [
    { key: 'closed_won', label: 'Close as WON', color: 'bg-emerald-600' },
    { key: 'closed_lost', label: 'Close as Lost', color: 'bg-rose-700' },
  ],
  disqualified: [{ key: 'qualified', label: 'Broker Override to Qualified', color: 'bg-blue-600' }],
};

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  onClose,
  onTransitionStatus,
  onAddNote,
  isActionLoading,
}) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'journey' | 'conversation' | 'documents' | 'overview'>('journey');
  const [noteText, setNoteText] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const allowedTransitions = NEXT_STATUS_OPTIONS[lead.status] || [];

  const leadDocuments = useSelector(
    (state: RootState) => state.documents.byLeadId[lead.id] || []
  );
  const selectedDocumentId = useSelector(
    (state: RootState) => state.documents.selectedDocumentId
  );
  const documentDetails = useSelector(
    (state: RootState) => state.documents.documentDetails
  );
  const isDocLoading = useSelector(
    (state: RootState) => state.documents.loading
  );
  const leadConversation = useSelector(
    (state: RootState) => state.crm.leadConversation
  );
  const leadHistory = useSelector(
    (state: RootState) => state.crm.leadHistory
  );
  const leadNotes = useSelector(
    (state: RootState) => state.crm.leadNotes
  );
  const teamUsers = useSelector(
    (state: RootState) => state.crm.teamUsers
  );

  useEffect(() => {
    dispatch(fetchLeadDocumentsRequest({ leadId: lead.id }));
  }, [dispatch, lead.id]);

  const handleSelectDocument = (id: string) => {
    dispatch(selectDocument(id));
    dispatch(fetchDocumentDetailRequest({ documentId: id }));
  };

  const handleUploadFiles = (files: File[]) => {
    dispatch(uploadDocumentsRequest({ leadId: lead.id, files }));
  };

  const handleApplyCorrections = (changes: FieldCorrectionItem[]) => {
    if (selectedDocumentId) {
      dispatch(applyCorrectionsRequest({ documentId: selectedDocumentId, changes }));
    }
  };

  const handleVerifyExtraction = () => {
    if (selectedDocumentId) {
      dispatch(verifyExtractionRequest({ documentId: selectedDocumentId }));
    }
  };

  const handleReprocess = (id: string) => {
    dispatch(reprocessDocumentRequest({ documentId: id }));
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote(noteText.trim());
    setNoteText('');
  };

  const handleCopyContact = (text: string, type: 'email' | 'phone') => {
    navigator.clipboard.writeText(text);
    setCopiedField(type);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAssigneeChange = (userId: string) => {
    dispatch(assignLead({ leadId: lead.id, userId: userId ? userId : null }));
  };

  const selectedDetail = selectedDocumentId
    ? documentDetails[selectedDocumentId]
    : leadDocuments.length > 0 && documentDetails[leadDocuments[0].id]
    ? documentDetails[leadDocuments[0].id]
    : null;

  const statusConfig = getStatusBadgeConfig(lead.status);
  const tierConfig = getTierBadgeConfig(lead.qualification.tier, lead.qualification.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-lg shadow-blue-500/20 shrink-0">
              {lead.full_name ? lead.full_name.charAt(0) : 'L'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  {lead.full_name || 'Prospect Lead Details'}
                </h3>
                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.badgeBg} ${statusConfig.badgeBorder} ${statusConfig.badgeText}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                  <span>{statusConfig.label}</span>
                </span>
                {/* Tier Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tierConfig.badgeBg} ${tierConfig.badgeBorder} ${tierConfig.badgeText}`}
                >
                  {lead.qualification.tier === 'hot' && <Flame className="w-3 h-3 text-rose-500" />}
                  <span>{tierConfig.label}</span>
                  {lead.qualification.score !== null && (
                    <span className="opacity-80">({lead.qualification.score} pts)</span>
                  )}
                </span>
              </div>

              {/* Contact actions & ID */}
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                {lead.email && (
                  <button
                    onClick={() => handleCopyContact(lead.email!, 'email')}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
                    title="Click to copy email"
                  >
                    <Mail className="w-3 h-3 text-slate-500 group-hover:text-blue-400" />
                    <span>{lead.email}</span>
                    {copiedField === 'email' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
                    )}
                  </button>
                )}
                {lead.phone && (
                  <button
                    onClick={() => handleCopyContact(lead.phone!, 'phone')}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
                    title="Click to copy phone"
                  >
                    <Phone className="w-3 h-3 text-slate-500 group-hover:text-blue-400" />
                    <span>{lead.phone}</span>
                    {copiedField === 'phone' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
                    )}
                  </button>
                )}
                <span className="text-slate-600">·</span>
                <span className="text-[11px] text-slate-500">
                  Created {new Date(lead.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Controls: Assignee Dropdown, Tab Switcher, Close */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Assignee Dropdown */}
            {teamUsers.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <select
                  value={lead.assigned_to?.id || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 focus:outline-hidden cursor-pointer"
                >
                  <option value="" className="bg-slate-900">Unassigned</option>
                  {teamUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900">
                      {u.full_name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Main Tabs Navigation */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('journey')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'journey'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Journey</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('conversation')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'conversation'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Conversation</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'documents'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderDown className="w-3.5 h-3.5" />
                <span>Documents</span>
                {leadDocuments.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-bold">
                    {leadDocuments.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Profile & Notes</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Needs Human Warning Banner */}
        {lead.needs_human && (
          <div className="px-6 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold">Priority Broker Callback Needed:</span>
              <span>Prospect exhibits high purchase intent and requested immediate advisory follow-up.</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300">
              Immediate Attention
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'journey' ? (
            /* Journey Timeline Tab */
            <JourneyTimeline
              lead={lead}
              history={leadHistory}
              messages={leadConversation}
              notes={leadNotes}
              onSwitchTab={(tabKey) => {
                if (tabKey === 'conversation') setActiveTab('conversation');
                else if (tabKey === 'documents') setActiveTab('documents');
                else if (tabKey === 'activity') setActiveTab('overview');
              }}
            />
          ) : activeTab === 'conversation' ? (
            /* Full Conversation Transcript Tab */
            <ConversationView
              messages={leadConversation}
              leadName={lead.full_name}
            />
          ) : activeTab === 'documents' ? (
            /* Documents & Extraction Tab (FRD-03) */
            <div className="space-y-6">
              {/* Uploader Section */}
              <DocumentUploader
                onUpload={handleUploadFiles}
                isLoading={isDocLoading}
                maxFiles={5}
                maxSizeMb={20}
              />

              {/* Uploaded Documents List */}
              <DocumentList
                documents={leadDocuments}
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={handleSelectDocument}
                onReprocess={handleReprocess}
              />

              {/* Side-by-Side Extraction Viewer & Inline Correction */}
              {selectedDetail && (
                <div className="mt-6 border-t border-slate-800 pt-6">
                  <ExtractionViewer
                    document={selectedDetail}
                    onApplyCorrections={handleApplyCorrections}
                    onVerify={handleVerifyExtraction}
                    isLoading={isDocLoading}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Overview & Notes Tab */
            <>
              {/* Qualification Breakdown & Profile Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Captured Profile Fields Card */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    Insurance Profile & Risk Attributes
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Interest:</span>
                      <span className="font-semibold text-white capitalize">
                        {lead.profile.insurance_interest?.join(', ') || 'General'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Location:</span>
                      <span className="font-semibold text-white">
                        {lead.profile.location || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Age Bracket:</span>
                      <span className="font-semibold text-white">
                        {lead.profile.age_range || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Household Size:</span>
                      <span className="font-semibold text-white">
                        {lead.profile.household_size ? `${lead.profile.household_size} members` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Existing Policy:</span>
                      <span className="font-semibold text-white">
                        {lead.profile.has_existing_policy ? `Yes (${lead.profile.current_provider || 'Provider'})` : 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Annual Premium:</span>
                      <span className="font-semibold text-emerald-400">
                        {lead.profile.approx_annual_premium
                          ? `${lead.profile.premium_currency} ${lead.profile.approx_annual_premium.toLocaleString()}`
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Budget Target:</span>
                      <span className="font-semibold text-white">
                        {lead.profile.budget_range || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Renewal Window:</span>
                      <span className="font-semibold text-amber-400">
                        {lead.profile.renewal_timeframe || '—'}
                      </span>
                    </div>
                  </div>

                  {lead.profile.main_concern && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-[11px] text-slate-400 font-medium block mb-1">
                        Client Main Concern:
                      </span>
                      <p className="text-slate-200 italic">"{lead.profile.main_concern}"</p>
                    </div>
                  )}
                </div>

                {/* Score Breakdown & AI Summary */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold tracking-wider uppercase text-slate-300">
                      Qualification Factor Breakdown
                    </h4>
                    <span className="text-sm font-black text-emerald-400">
                      {lead.qualification.score ?? 0} / 100
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {lead.qualification.breakdown &&
                      Object.entries(lead.qualification.breakdown).map(([factor, item]) => (
                        <div key={factor} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-300 capitalize font-medium">{factor}</span>
                            <span className="text-emerald-400 font-bold">+{item.points} pts</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, item.points * 4)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 block">{item.reason}</span>
                        </div>
                      ))}
                  </div>

                  {lead.summary && (
                    <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/30 text-xs text-blue-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                        Assistant Qualification Summary
                      </span>
                      <p className="leading-relaxed">{lead.summary}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Transition Action Bar */}
              {allowedTransitions.length > 0 && (
                <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-900/40 space-y-3">
                  <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4 text-blue-400" />
                    Pipeline Stage Transitions
                  </span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <input
                      type="text"
                      placeholder="Optional transition reason..."
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 flex-1 min-w-[200px]"
                    />
                    {allowedTransitions.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => onTransitionStatus(t.key, statusReason || undefined)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50 ${t.color}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Broker Notes Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Broker & Team Notes ({leadNotes.length || lead.counts.notes})
                </h4>

                {leadNotes.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {leadNotes.map((note) => (
                      <div key={note.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-semibold text-white">{note.author?.full_name || 'Team Member'}</span>
                          <span>{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-300">{note.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add internal note for brokers..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!noteText.trim() || isActionLoading}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Note</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>SecureLife Broker Suite</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileCheck2,
  ExternalLink,
  Shield,
  LogOut,
  UserCheck,
} from 'lucide-react';
import type { CrmActiveView } from '../crmSlice';

interface SidebarProps {
  activeView: CrmActiveView;
  onViewChange: (view: CrmActiveView) => void;
  unreviewedDocsCount: number;
  currentUser: { email: string; full_name: string; role: string } | null;
  onViewPublicSite: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  unreviewedDocsCount,
  currentUser,
  onViewPublicSite,
  onSignOut,
}) => {
  const navItems = [
    {
      key: 'dashboard' as CrmActiveView,
      label: 'Pipeline Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      key: 'leads' as CrmActiveView,
      label: 'Leads Directory',
      icon: Users,
      badge: null,
    },
    {
      key: 'review' as CrmActiveView,
      label: 'Review Queue',
      icon: FileCheck2,
      badge: unreviewedDocsCount > 0 ? unreviewedDocsCount : null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 backdrop-blur-xl flex flex-col justify-between shrink-0 font-sans z-20">
      <div className="p-5 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-white tracking-tight">SecureLife</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                CRM
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Brokerage Decision Engine</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onViewChange(item.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 ring-1 ring-blue-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Public Site Link */}
        <div className="pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={onViewPublicSite}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 border border-slate-800/80 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
              <span>Public Chat Assistant</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">/chat</span>
          </button>
        </div>
      </div>

      {/* User Footer Area */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
        {currentUser && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{currentUser.full_name}</div>
              <div className="text-[10px] text-blue-400 capitalize font-medium">{currentUser.role}</div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

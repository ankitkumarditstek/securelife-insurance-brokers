import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ShieldAlert,
  UserCheck,
  KeyRound,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { loginUser } from '../crmSlice';

interface BrokerLoginViewProps {
  onBackToChat?: () => void;
}

const PRESET_ACCOUNTS = [
  {
    role: 'broker',
    name: 'Rajesh Sharma',
    email: 'broker@securelife.com',
    pass: 'broker123',
    badge: 'Senior Broker',
    desc: 'Pipeline lead lifecycle & broker notes',
    color: 'from-blue-600 to-indigo-600 border-blue-500/30',
  },
  {
    role: 'agent',
    name: 'Pooja Verma',
    email: 'agent@securelife.com',
    pass: 'agent123',
    badge: 'Insurance Agent',
    desc: 'Assigned lead triage & client follow-ups',
    color: 'from-emerald-600 to-teal-600 border-emerald-500/30',
  },
  {
    role: 'admin',
    name: 'Vikram Mehta',
    email: 'admin@securelife.com',
    pass: 'admin123',
    badge: 'Platform Admin',
    desc: 'Full administrative control & team management',
    color: 'from-purple-600 to-pink-600 border-purple-500/30',
  },
];

export const BrokerLoginView: React.FC<BrokerLoginViewProps> = ({ onBackToChat }) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.crm);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(loginUser({ email, password }));
  };

  const handleQuickLogin = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    dispatch(loginUser({ email: presetEmail, password: presetPass }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 flex flex-col items-center">
      {/* Top Advisory Notice */}
      <div className="w-full max-w-lg mb-6 flex items-center justify-between text-xs text-slate-400">
        {onBackToChat && (
          <button
            type="button"
            onClick={onBackToChat}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Prospect Chatbot</span>
          </button>
        )}
        <div className="flex items-center gap-1.5 ml-auto text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-[11px] font-medium">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Restricted Enterprise Portal</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

        {/* Portal Header */}
        <div className="text-center mb-8 relative">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-400 flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            SecureLife Broker Portal
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Corporate authentication is required to access the lead pipeline, underwriting queues,
            and policy telemetry.
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Manual Sign-In Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Corporate Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="broker@securelife.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold text-xs text-white shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validating Session...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Sign In to Broker Portal</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-6">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold absolute">
            1-Click Demo Accounts
          </span>
        </div>

        {/* 1-Click Fast Demo Logins */}
        <div className="space-y-2">
          {PRESET_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => handleQuickLogin(acc.email, acc.pass)}
              disabled={isLoading}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all text-left cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${acc.color} flex items-center justify-center text-white text-xs font-bold shadow-xs`}
                >
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                    <span>{acc.name}</span>
                    <span className="text-[10px] font-medium text-slate-400">({acc.email})</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{acc.desc}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-slate-300">
                {acc.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Security Compliance Footnote */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Bcrypt + JWT HS256 Token Protection</span>
          </div>
          <span>IRDAI Compliant</span>
        </div>
      </div>
    </div>
  );
};

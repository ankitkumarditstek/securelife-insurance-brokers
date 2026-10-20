import React, { useEffect, useState } from 'react';
import {
  Shield,
  UserCheck,
  LogIn,
  LogOut,
  LayoutDashboard,
  ExternalLink,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { logout } from './features/crm/crmSlice';
import { ChatWindow } from './features/chat/components/ChatWindow';
import { CrmDashboard } from './features/crm/components/CrmDashboard';
import { BrokerLoginView } from './features/crm/components/BrokerLoginView';

type AppRoute = 'home' | 'login' | 'dashboard';

const getInitialRoute = (): AppRoute => {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.toLowerCase();
  if (path === '/login') return 'login';
  if (path === '/dashboard') return 'dashboard';
  return 'home';
};

export const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute);
  const { isAuthenticated, currentUser } = useAppSelector((state) => state.crm);

  const navigate = (to: AppRoute) => {
    setCurrentRoute(to);
    const path = to === 'home' ? '/' : `/${to}`;
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getInitialRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Route protection & auto-redirects
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (currentRoute === 'dashboard' && !isAuthenticated) {
      timer = setTimeout(() => navigate('login'), 0);
    } else if (currentRoute === 'login' && isAuthenticated) {
      timer = setTimeout(() => navigate('dashboard'), 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentRoute, isAuthenticated]);

  const handleSignOut = () => {
    navigate('home');
    dispatch(logout());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Application Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            onClick={() => navigate('home')}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white cursor-pointer"
          >
            <Shield className="w-5 h-5" />
          </div>
          <div onClick={() => navigate('home')} className="cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                SecureLife
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {currentRoute === 'dashboard' ? 'Broker Portal' : 'AI Brokerage'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {currentRoute === 'dashboard'
                ? 'Internal CRM Pipeline & Underwriting'
                : 'Intelligent Lead Pipeline & Decision Support'}
            </p>
          </div>
        </div>

        {/* Navbar Action Area */}
        <div className="flex items-center gap-3">
          {currentRoute === 'dashboard' ? (
            /* Dashboard authenticated toolbar: Profile + View Public Site + Sign Out */
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('home')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-400 hover:text-white transition-all cursor-pointer"
                title="View Public Landing Page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Public Site</span>
              </button>

              {currentUser && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/70 text-xs font-medium">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-semibold text-white leading-tight">
                      {currentUser.full_name}
                    </div>
                    <div className="text-[10px] text-blue-400 font-medium capitalize">
                      {currentUser.role}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-rose-500/10 border border-slate-700/60 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-medium transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Sign Out</span>
              </button>
            </div>
          ) : isAuthenticated ? (
            /* On public page or login, but already signed in: Go to Dashboard */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('dashboard')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Broker Dashboard</span>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : currentRoute === 'login' ? (
            /* On /login page: link to return to public chat */
            <button
              type="button"
              onClick={() => navigate('home')}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>Back to Public Chatbot</span>
            </button>
          ) : (
            /* On public landing page unauthenticated: Broker Login link */
            <button
              type="button"
              onClick={() => navigate('login')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 text-xs font-medium transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-200">Broker Sign In</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center">
        {currentRoute === 'dashboard' ? (
          <CrmDashboard />
        ) : currentRoute === 'login' ? (
          <BrokerLoginView onBackToChat={() => navigate('home')} />
        ) : (
          /* Public Landing Page with Prospect Chatbot */
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-6 max-w-xl">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Conversational Lead Qualification
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-2">
                Get personalized insurance recommendations, explore coverage options, and qualify for tailored policies in minutes.
              </p>
            </div>
            <ChatWindow />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500">
        © 2026 SecureLife Insurance Brokers · Intelligent Lead Pipeline MVP
      </footer>
    </div>
  );
};

export default App;

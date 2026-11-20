import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Mic,
  AlertCircle,
  BarChart3,
  FlaskConical,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { ADMIN_ROLE_LABELS } from '../../domain/adminGovernanceEngine';

interface LearnerShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function LearnerShell({ title, subtitle, children }: LearnerShellProps) {
  const { lang, t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/app', label: t.learnerNav.home, icon: Home, end: true },
    { to: '/app/learn', label: t.learnerNav.learn, icon: BookOpen, end: false },
    { to: '/app/speak', label: t.learnerNav.speak, icon: Mic, end: false },
    { to: '/app/improve', label: t.learnerNav.improve, icon: AlertCircle, end: false },
    { to: '/app/progress', label: t.learnerNav.progress, icon: BarChart3, end: false },
    { to: '/app/transfer-lab', label: t.learnerNav.transferLab, icon: FlaskConical, end: false },
    { to: '/app/settings', label: t.learnerNav.settings, icon: Settings, end: false },
  ];

  // Primary 5 items in mobile bottom bar to keep touch targets >= 44px and avoid crowding.
  // Transfer Lab and Settings remain 1-tap accessible in the mobile top header.
  const mobileBottomItems = navItems.slice(0, 5);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-100">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-[#0D1322] lg:flex">
          <div>
            <div className="flex h-16 items-center border-b border-slate-800 px-6">
              <NavLink
                to="/app"
                className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white whitespace-nowrap"
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3B82F6] text-xs font-bold text-white"
                >
                  LV
                </span>
                <span>{t.brand}</span>
              </NavLink>
            </div>

            <nav aria-label="Learner navigation" className="space-y-1 p-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-[#3B82F6]/15 text-white'
                          : 'text-slate-400 hover:bg-[#111827] hover:text-slate-100'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-slate-800 p-4 space-y-1.5">
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#8B5CF6]/20 text-violet-200'
                    : 'text-slate-400 hover:bg-[#111827] hover:text-slate-100'
                }`
              }
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#8B5CF6]" aria-hidden="true" />
                <span className="truncate">
                  {lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল' : 'Admin Control'}
                </span>
              </span>
              <span
                data-testid="sidebar-role-indicator"
                className="shrink-0 font-mono text-[10px] text-[#8B5CF6]"
              >
                {lang === 'bn'
                  ? ADMIN_ROLE_LABELS[user?.role ?? 'learner'].bn
                  : ADMIN_ROLE_LABELS[user?.role ?? 'learner'].en}
              </span>
            </NavLink>
            <div className="px-2 pt-2 pb-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-[#111827] hover:text-rose-300 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.nav.logout}</span>
            </button>
          </div>
        </aside>

        {/* Main Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar (Compact on mobile to stay well within 15% sticky height cap) */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-800 bg-[#0A0F1C]/95 px-4 backdrop-blur-md sm:px-6 lg:h-16 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <NavLink
                to="/app"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#3B82F6] text-xs font-bold text-white lg:hidden"
                aria-label={t.brand}
              >
                LV
              </NavLink>
              <h1 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <LanguageToggle compact />
              <NavLink
                to="/app/transfer-lab"
                aria-label={t.learnerNav.transferLab}
                className={({ isActive }) =>
                  `inline-flex h-9 w-9 items-center justify-center rounded-lg border lg:hidden ${
                    isActive
                      ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-white'
                      : 'border-slate-800 bg-[#111827] text-slate-300'
                  }`
                }
              >
                <FlaskConical className="h-4 w-4" aria-hidden="true" />
              </NavLink>
              <NavLink
                to="/app/settings"
                aria-label={t.learnerNav.settings}
                className={({ isActive }) =>
                  `inline-flex h-9 w-9 items-center justify-center rounded-lg border lg:hidden ${
                    isActive
                      ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-white'
                      : 'border-slate-800 bg-[#111827] text-slate-300'
                  }`
                }
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </NavLink>
            </div>
          </header>

          {/* Main Workspace Content */}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            {subtitle && (
              <p className="mb-6 max-w-3xl text-sm leading-relaxed text-slate-400">{subtitle}</p>
            )}
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile learner navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-[#0D1322]/95 backdrop-blur-md lg:hidden"
      >
        <div className="grid h-14 grid-cols-5">
          {mobileBottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                    isActive ? 'text-[#3B82F6]' : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="truncate max-w-[64px]">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

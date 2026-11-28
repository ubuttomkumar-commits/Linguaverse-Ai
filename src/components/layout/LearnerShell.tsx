import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  CreditCard,
  AlertTriangle,
  FlaskConical,
  GraduationCap,
  HelpCircle,
  History,
  Home,
  Layers,
  LogOut,
  Menu,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ADMIN_ROLE_LABELS } from '../../domain/adminGovernanceEngine';
import { getAllLessons } from '../../domain/curriculumData';
import {
  buildLearnerNotifications,
  searchWorkspaceResources,
} from '../../domain/dashboardIntelligence';
import {
  clearPrd61ClientCache,
  fetchLearnerNotifications,
  fetchPublicSystemStatus,
  invalidateNotificationsCache,
  invalidateSystemStatusCache,
  markNotificationAsRead,
} from '../../services/prd61Api';
import { runOptimisticMutation } from '../../services/queryCache';
import { prefetchRouteChunk } from '../../utils/routePrefetch';
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents';
import type { PersistedUserNotification } from '../../domain/notificationsEngine';

interface LearnerShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function getNotificationStorageKey(userId: string | undefined): string {
  return `lv_notif_read_v1:${userId ?? 'guest'}`;
}

function loadReadNotificationIds(userId: string | undefined): string[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(getNotificationStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveReadNotificationIds(userId: string | undefined, ids: string[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(getNotificationStorageKey(userId), JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors
  }
}

function getInitials(name: string | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'lv_sidebar_collapsed_v1';

function loadSidebarCollapsed(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function LearnerShell({ title, subtitle, children }: LearnerShellProps) {
  const { lang, t } = useLanguage();
  const { user, profile, latestDiagnostic, lessonMastery, mistakes, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(loadSidebarCollapsed);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [activePopover, setActivePopover] = useState<'notifications' | 'help' | 'user' | null>(
    null
  );
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() =>
    loadReadNotificationIds(user?.id)
  );
  const [serverNotifications, setServerNotifications] = useState<PersistedUserNotification[]>([]);
  const [maintenanceNotice, setMaintenanceNotice] = useState<{
    active: boolean;
    en: string;
    bn: string;
  }>({ active: false, en: '', bn: '' });

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const topActionsRef = useRef<HTMLDivElement | null>(null);

  const toggleSidebarCollapsed = (next: boolean) => {
    setSidebarCollapsed(next);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      }
    } catch {
      // Ignore storage quota errors
    }
  };

  useEffect(() => {
    setReadNotifIds(loadReadNotificationIds(user?.id));
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    fetchPublicSystemStatus()
      .then((res) => {
        if (!active) return;
        setMaintenanceNotice({
          active: Boolean(res.maintenanceMode),
          en: res.maintenanceBannerEn || 'Scheduled platform maintenance is active. Some write actions may be paused.',
          bn: res.maintenanceBannerBn || 'প্ল্যাটফর্ম রক্ষণাবেক্ষণ চালু আছে। কিছু ফিচার সাময়িকভাবে সীমিত থাকতে পারে।',
        });
      })
      .catch(() => {});

    if (user) {
      fetchLearnerNotifications()
        .then((res) => {
          if (active && Array.isArray(res.notifications)) {
            setServerNotifications(res.notifications);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [user?.id]);

  useRealtimeEvents({
    enabled: Boolean(user?.id),
    onEvent: (event) => {
      if (event.type === 'notification.created') {
        const payload = event.payload as unknown as Partial<PersistedUserNotification>;
        if (typeof payload.id === 'string' && typeof payload.titleEn === 'string') {
          invalidateNotificationsCache();
          setServerNotifications((prev) => {
            if (prev.some((n) => n.id === payload.id)) return prev;
            return [
              {
                id: payload.id!,
                userId: typeof payload.userId === 'string' ? payload.userId : '*',
                type:
                  (payload.type as PersistedUserNotification['type']) || 'system_broadcast',
                titleEn: payload.titleEn!,
                titleBn: typeof payload.titleBn === 'string' ? payload.titleBn : payload.titleEn!,
                bodyEn: typeof payload.bodyEn === 'string' ? payload.bodyEn : '',
                bodyBn: typeof payload.bodyBn === 'string' ? payload.bodyBn : '',
                actionRoute:
                  typeof payload.actionRoute === 'string' ? payload.actionRoute : undefined,
                readAt: null,
                createdAt:
                  typeof payload.createdAt === 'string'
                    ? payload.createdAt
                    : new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 50);
          });
        }
      } else if (event.type === 'system.status_updated') {
        invalidateSystemStatusCache();
        const payload = event.payload as {
          maintenanceMode?: boolean;
          maintenanceBannerEn?: string;
          maintenanceBannerBn?: string;
        };
        setMaintenanceNotice({
          active: Boolean(payload.maintenanceMode),
          en:
            payload.maintenanceBannerEn ||
            'Scheduled platform maintenance is active. Some write actions may be paused.',
          bn:
            payload.maintenanceBannerBn ||
            'প্ল্যাটফর্ম রক্ষণাবেক্ষণ চালু আছে। কিছু ফিচার সাময়িকভাবে সীমিত থাকতে পারে।',
        });
      }
    },
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActivePopover(null);
        setSearchOpen(true);
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (e.key === 'Escape') {
        setActivePopover(null);
        setSearchOpen(false);
        setMobileDrawerOpen(false);
      }
    };
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (topActionsRef.current && !topActionsRef.current.contains(target)) {
        setActivePopover(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const allLessons = useMemo(() => getAllLessons(), []);

  const notifications = useMemo(() => {
    const derived = buildLearnerNotifications({
      profile,
      latestDiagnostic,
      lessonMastery,
      mistakes,
      allLessons,
    });
    const persisted = serverNotifications.map((n) => ({
      id: n.id,
      titleEn: n.titleEn,
      titleBn: n.titleBn,
      bodyEn: n.bodyEn,
      bodyBn: n.bodyBn,
      to: n.actionRoute || '/app/settings',
      serverRead: Boolean(n.readAt),
      isServer: true,
    }));
    return [
      ...persisted,
      ...derived.map((d) => ({ ...d, serverRead: false, isServer: false })),
    ];
  }, [profile, latestDiagnostic, lessonMastery, mistakes, allLessons, serverNotifications]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.serverRead && !readNotifIds.includes(n.id)),
    [notifications, readNotifIds]
  );

  const searchResults = useMemo(
    () =>
      searchWorkspaceResources({
        query: searchQuery,
        lessons: allLessons,
        mistakes,
      }),
    [searchQuery, allLessons, mistakes]
  );

  const markNotificationRead = (id: string) => {
    const isServerNotif = serverNotifications.some((n) => n.id === id);
    const previousReadIds = readNotifIds;

    const applyLocalRead = () => {
      setReadNotifIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        saveReadNotificationIds(user?.id, next);
        return next;
      });
    };

    if (!isServerNotif) {
      applyLocalRead();
      return;
    }

    void runOptimisticMutation({
      applyOptimistic: applyLocalRead,
      rollback: () => {
        setReadNotifIds(previousReadIds);
        saveReadNotificationIds(user?.id, previousReadIds);
      },
      commit: () => markNotificationAsRead(id),
    });
  };

  const markAllNotificationsRead = () => {
    const previousReadIds = readNotifIds;
    const allIds = Array.from(new Set([...readNotifIds, ...notifications.map((n) => n.id)]));
    const unreadServer = serverNotifications.filter((n) => !n.readAt);

    if (unreadServer.length === 0) {
      setReadNotifIds(allIds);
      saveReadNotificationIds(user?.id, allIds);
      return;
    }

    void runOptimisticMutation({
      applyOptimistic: () => {
        setReadNotifIds(allIds);
        saveReadNotificationIds(user?.id, allIds);
      },
      rollback: () => {
        setReadNotifIds(previousReadIds);
        saveReadNotificationIds(user?.id, previousReadIds);
      },
      commit: () => Promise.all(unreadServer.map((n) => markNotificationAsRead(n.id))),
    });
  };

  const primaryNavItems = [
    { to: '/app', label: lang === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard', icon: Home, end: true },
    { to: '/app/learn', label: lang === 'bn' ? 'আমার শিক্ষা' : 'My Learning', icon: BookOpen, end: false },
    { to: '/app/speak', label: t.learnerNav.speak, icon: Mic, end: false },
    { to: '/app/improve', label: t.learnerNav.improve, icon: AlertCircle, end: false },
    { to: '/app/transfer-lab', label: t.learnerNav.transferLab, icon: FlaskConical, end: false },
    {
      to: '/app/replay',
      label: lang === 'bn' ? 'রিপ্লে লাইব্রেরি' : 'Replay',
      icon: History,
      end: false,
    },
    {
      to: '/app/progress',
      label: lang === 'bn' ? 'DNA ও অগ্রগতি' : 'DNA & Progress',
      icon: BarChart3,
      end: false,
    },
    { to: '/app/settings', label: t.learnerNav.settings, icon: Settings, end: false },
  ];

  const secondaryNavItems = [
    {
      to: '/app/ielts',
      label: lang === 'bn' ? 'IELTS ও পরীক্ষা' : 'IELTS & Exams',
      icon: GraduationCap,
      end: false,
    },
    {
      to: '/app/writing',
      label: lang === 'bn' ? 'রাইটিং ও ল্যাব' : 'Writing & Labs',
      icon: PenTool,
      end: false,
    },
    {
      to: '/app/vocabulary',
      label: lang === 'bn' ? 'ভোকাবুলারি ডেক' : 'Vocabulary',
      icon: Layers,
      end: false,
    },
    {
      to: '/app/community',
      label: lang === 'bn' ? 'কমিউনিটি' : 'Community',
      icon: Users,
      end: false,
    },
    {
      to: '/app/achievements',
      label: lang === 'bn' ? 'অর্জন ও চ্যালেঞ্জ' : 'Achievements',
      icon: Trophy,
      end: false,
    },
    {
      to: '/app/subscription',
      label: lang === 'bn' ? 'সাবস্ক্রিপশন' : 'Subscription',
      icon: CreditCard,
      end: false,
    },
  ];

  // Primary 5 items in mobile bottom bar (concise labels so zero ellipsis on 390px screens)
  const mobileBottomItems = [
    { to: '/app', label: lang === 'bn' ? 'হোম' : 'Home', icon: Home, end: true },
    { to: '/app/learn', label: lang === 'bn' ? 'শিখুন' : 'Learn', icon: BookOpen, end: false },
    { to: '/app/speak', label: lang === 'bn' ? 'স্পিক' : 'Speak', icon: Mic, end: false },
    { to: '/app/improve', label: lang === 'bn' ? 'ভুল' : 'Improve', icon: AlertCircle, end: false },
    { to: '/app/progress', label: lang === 'bn' ? 'অগ্রগতি' : 'Progress', icon: BarChart3, end: false },
  ];

  const handleLogout = async () => {
    clearPrd61ClientCache();
    await logout();
    navigate('/', { replace: true });
  };

  const renderSidebarNav = (collapsed: boolean, onItemClick?: () => void) => (
    <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
      <div className="space-y-6">
        <nav aria-label="Learner navigation" className="space-y-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onMouseEnter={() => prefetchRouteChunk(item.to)}
                onFocus={() => prefetchRouteChunk(item.to)}
                onTouchStart={() => prefetchRouteChunk(item.to)}
                onClick={onItemClick}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                    collapsed ? 'justify-center px-2' : ''
                  } ${
                    isActive
                      ? 'border border-cyan-400/35 bg-[linear-gradient(90deg,rgba(0,217,255,0.16)_0%,rgba(124,58,237,0.16)_100%)] text-white shadow-[0_0_20px_rgba(0,217,255,0.12)]'
                      : 'border border-transparent text-slate-400 hover:bg-[#101A3E]/80 hover:text-slate-100'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Practice & Ecosystem Modules */}
        <div className="border-t border-slate-800/80 pt-4">
          {!collapsed && (
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {lang === 'bn' ? 'অতিরিক্ত মডিউল' : 'Workspace'}
            </p>
          )}
          <nav aria-label="Workspace modules" className="space-y-1">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onMouseEnter={() => prefetchRouteChunk(item.to)}
                  onFocus={() => prefetchRouteChunk(item.to)}
                  onTouchStart={() => prefetchRouteChunk(item.to)}
                  onClick={onItemClick}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                      collapsed ? 'justify-center px-2' : ''
                    } ${
                      isActive
                        ? 'border border-cyan-400/35 bg-[linear-gradient(90deg,rgba(0,217,255,0.16)_0%,rgba(124,58,237,0.16)_100%)] text-white shadow-[0_0_20px_rgba(0,217,255,0.12)]'
                        : 'border border-transparent text-slate-400 hover:bg-[#101A3E]/80 hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Profile + Admin Control + Sign Out */}
      <div className="mt-6 space-y-1.5 border-t border-slate-800/80 pt-4">
        <NavLink
          to="/admin"
          onClick={onItemClick}
          title={collapsed ? (lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল' : 'Admin Control') : undefined}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              collapsed ? 'justify-center px-2' : ''
            } ${
              isActive
                ? 'bg-[#8B5CF6]/20 text-violet-200'
                : 'text-slate-400 hover:bg-[#101A3E]/80 hover:text-slate-100'
            }`
          }
        >
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#8B5CF6]" aria-hidden="true" />
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-slate-200">
                {lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল' : 'Admin Control'}
              </span>
              <span
                data-testid="sidebar-role-indicator"
                className="block truncate font-mono text-[10px] font-normal text-[#A78BFA]"
              >
                {lang === 'bn'
                  ? ADMIN_ROLE_LABELS[user?.role ?? 'learner'].bn
                  : ADMIN_ROLE_LABELS[user?.role ?? 'learner'].en}
              </span>
            </span>
          )}
        </NavLink>

        {!collapsed && (
          <div className="px-3 pt-2 pb-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? t.nav.logout : undefined}
          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-[#101A3E]/80 hover:text-rose-300 transition-colors cursor-pointer ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span>{t.nav.logout}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05091F] text-slate-100">
      <a
        href="#learner-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:border focus:border-cyan-400 focus:bg-[#09112B] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white focus:shadow-lg"
      >
        {lang === 'bn' ? 'মূল বিষয়বস্তুতে যান' : 'Skip to main content'}
      </a>
      <div className="flex min-h-screen">
        {/* Desktop Collapsible Sticky Sidebar */}
        <aside
          className={`hidden shrink-0 flex-col border-r border-cyan-400/15 bg-[#070D24]/95 transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen ${
            sidebarCollapsed ? 'w-[76px]' : 'w-64'
          }`}
        >
          <div
            className={`flex h-16 items-center border-b border-slate-800/80 ${
              sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
            }`}
          >
            <NavLink
              to="/app"
              className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white whitespace-nowrap"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#00D9FF] via-[#3B82F6] to-[#8B5CF6] text-xs font-extrabold text-white shadow-[0_0_16px_rgba(0,217,255,0.35)]"
              >
                LV
              </span>
              {!sidebarCollapsed && <span className="font-portal">{t.brand}</span>}
            </NavLink>

            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={() => toggleSidebarCollapsed(true)}
                aria-label={lang === 'bn' ? 'সাইডবার সংকুচিত করুন' : 'Collapse sidebar'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-[#101A3E] hover:text-white transition-colors cursor-pointer"
              >
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {sidebarCollapsed && (
            <div className="flex justify-center border-b border-slate-800/80 py-2">
              <button
                type="button"
                onClick={() => toggleSidebarCollapsed(false)}
                aria-label={lang === 'bn' ? 'সাইডবার প্রসারিত করুন' : 'Expand sidebar'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-[#101A3E] hover:text-white transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {renderSidebarNav(sidebarCollapsed)}
        </aside>

        {/* Tablet & Mobile Slide-Over Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Workspace navigation">
            <div
              className="fixed inset-0 bg-[#020512]/75 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative z-10 flex w-72 max-w-[84vw] flex-col border-r border-cyan-400/20 bg-[#070D24] shadow-2xl">
              <div className="flex h-14 items-center justify-between border-b border-slate-800/80 px-4">
                <NavLink
                  to="/app"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2.5 text-base font-bold text-white"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#00D9FF] via-[#3B82F6] to-[#8B5CF6] text-xs font-extrabold text-white"
                  >
                    LV
                  </span>
                  <span className="font-portal">{t.brand}</span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label={lang === 'bn' ? 'মেনু বন্ধ করুন' : 'Close navigation menu'}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-[#101A3E] cursor-pointer"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {renderSidebarNav(false, () => setMobileDrawerOpen(false))}
            </div>
          </div>
        )}

        {/* Main Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Navigation Bar (Compact 56px on mobile to honor <= 15% sticky height) */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-cyan-400/15 bg-[#060B22]/90 px-4 backdrop-blur-xl sm:px-6 lg:h-16 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label={lang === 'bn' ? 'নেভিগেশন মেনু খুলুন' : 'Open navigation menu'}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-[#0B122C] text-slate-200 hover:border-cyan-400/40 lg:hidden cursor-pointer"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
              <h1 className="font-portal truncate text-base font-bold text-white sm:text-lg">
                {title}
              </h1>
            </div>

            {/* Live Workspace Quick-Switcher Search (md+, Ctrl/Cmd+K) */}
            <div ref={searchContainerRef} className="relative hidden max-w-md flex-1 md:block">
              <label htmlFor="workspace-command-search" className="sr-only">
                {lang === 'bn'
                  ? 'লেসন, সিনারিও বা ভুল খুঁজুন'
                  : 'Search lessons, scenarios, or mistakes'}
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  id="workspace-command-search"
                  type="search"
                  value={searchQuery}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveSearchIndex(0);
                    setSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (!searchOpen || searchResults.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActiveSearchIndex((i) => (i + 1) % searchResults.length);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActiveSearchIndex((i) => (i - 1 + searchResults.length) % searchResults.length);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const picked = searchResults[activeSearchIndex] ?? searchResults[0];
                      if (picked) {
                        setSearchOpen(false);
                        setSearchQuery('');
                        navigate(picked.to);
                      }
                    }
                  }}
                  placeholder={
                    lang === 'bn'
                      ? 'লেসন, সিনারিও, ভুল খুঁজুন...'
                      : 'Search lessons, scenarios, mistakes...'
                  }
                  className="lv-auth-input w-full rounded-xl py-2 pl-9 pr-14 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
                <kbd
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-700/80 bg-[#0A1334] px-1.5 py-0.5 font-mono text-[10px] text-slate-400"
                >
                  Ctrl+K
                </kbd>
              </div>

              {searchOpen && searchQuery.trim().length > 0 && (
                <div
                  role="region"
                  aria-label="Search results"
                  className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-cyan-400/25 bg-[#09112B] shadow-[0_20px_50px_rgba(2,5,20,0.85)]"
                >
                  {searchResults.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-400">
                      {lang === 'bn'
                        ? `"${searchQuery}" এর জন্য কোনো লেসন বা সিনারিও পাওয়া যায়নি।`
                        : `No matching lessons, scenarios, or mistakes for "${searchQuery}".`}
                    </p>
                  ) : (
                    <ul className="max-h-72 divide-y divide-slate-800/80 overflow-y-auto">
                      {searchResults.map((res, idx) => (
                        <li key={res.id}>
                          <button
                            type="button"
                            onMouseEnter={() => {
                              setActiveSearchIndex(idx);
                              prefetchRouteChunk(res.to);
                            }}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery('');
                              navigate(res.to);
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                              idx === activeSearchIndex ? 'bg-[#111E47]' : 'hover:bg-[#111E47]'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-white">
                                {lang === 'bn' ? res.titleBn : res.titleEn}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                                {lang === 'bn' ? res.metaBn : res.metaEn}
                              </p>
                            </div>
                            <ArrowRight
                              className="h-3.5 w-3.5 shrink-0 text-cyan-400"
                              aria-hidden="true"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Right Utility Controls */}
            <div ref={topActionsRef} className="relative flex items-center gap-2 shrink-0">
              <PWAInstallButton />
              <LanguageToggle compact />

              {/* Real Notification Center */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActivePopover((prev) => (prev === 'notifications' ? null : 'notifications'))
                  }
                  aria-label={
                    unreadNotifications.length > 0
                      ? `${lang === 'bn' ? 'নোটিফিকেশন' : 'Notifications'} (${unreadNotifications.length} unread)`
                      : lang === 'bn'
                        ? 'নোটিফিকেশন'
                        : 'Notifications'
                  }
                  aria-expanded={activePopover === 'notifications'}
                  aria-haspopup="dialog"
                  data-testid="top-notifications-btn"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-[#0B122C] text-slate-300 hover:border-cyan-400/40 hover:text-white transition-colors cursor-pointer"
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {unreadNotifications.length > 0 && (
                    <span
                      data-testid="unread-notification-count"
                      className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#00D9FF] px-1 font-mono text-[10px] font-bold text-[#05091F] tabular-nums"
                    >
                      {unreadNotifications.length}
                    </span>
                  )}
                </button>

                {activePopover === 'notifications' && (
                  <div
                    role="dialog"
                    aria-label={lang === 'bn' ? 'নোটিফিকেশন সেন্টার' : 'Notification Center'}
                    className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[90vw] rounded-2xl border border-cyan-400/25 bg-[#09112B] p-4 shadow-[0_24px_60px_rgba(2,5,20,0.9)]"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <p className="text-xs font-bold text-white">
                        {lang === 'bn' ? 'নোটিফিকেশন' : 'Notifications'}
                      </p>
                      {unreadNotifications.length > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="text-[11px] font-semibold text-[#00D9FF] hover:text-cyan-200 cursor-pointer"
                        >
                          {lang === 'bn' ? 'সব পঠিত করুন' : 'Mark all read'}
                        </button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <p className="py-5 text-center text-xs text-slate-400">
                        {lang === 'bn'
                          ? 'এই মুহূর্তে কোনো নতুন নোটিফিকেশন নেই।'
                          : 'You are all caught up — no pending alerts.'}
                      </p>
                    ) : (
                      <ul className="mt-2.5 max-h-72 space-y-2 overflow-y-auto">
                        {notifications.map((notif) => {
                          const isRead = readNotifIds.includes(notif.id);
                          return (
                            <li
                              key={notif.id}
                              className={`rounded-xl border p-3 text-xs transition-colors ${
                                isRead
                                  ? 'border-slate-800/80 bg-[#060C22]/70 text-slate-400'
                                  : 'border-cyan-400/25 bg-[#0E1A42]/80 text-slate-100'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-white">
                                  {lang === 'bn' ? notif.titleBn : notif.titleEn}
                                </p>
                                {!isRead && (
                                  <button
                                    type="button"
                                    onClick={() => markNotificationRead(notif.id)}
                                    aria-label={lang === 'bn' ? 'পঠিত হিসেবে চিহ্নিত করুন' : 'Mark as read'}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 hover:text-cyan-100 whitespace-nowrap cursor-pointer"
                                  >
                                    <Check className="h-3 w-3" aria-hidden="true" />
                                    <span>{lang === 'bn' ? 'পঠিত' : 'Read'}</span>
                                  </button>
                                )}
                              </div>
                              <p className="mt-1 leading-relaxed text-slate-400">
                                {lang === 'bn' ? notif.bodyBn : notif.bodyEn}
                              </p>
                              <Link
                                to={notif.to}
                                onClick={() => {
                                  markNotificationRead(notif.id);
                                  setActivePopover(null);
                                }}
                                className="mt-2 inline-flex items-center gap-1 font-semibold text-[#00D9FF] hover:text-cyan-200"
                              >
                                <span>{lang === 'bn' ? 'খুলুন' : 'Open'}</span>
                                <ArrowRight className="h-3 w-3" aria-hidden="true" />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Help Popover */}
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setActivePopover((prev) => (prev === 'help' ? null : 'help'))}
                  aria-label={lang === 'bn' ? 'সহায়তা' : 'Help and guide'}
                  aria-expanded={activePopover === 'help'}
                  aria-haspopup="dialog"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-[#0B122C] text-slate-300 hover:border-cyan-400/40 hover:text-white transition-colors cursor-pointer"
                >
                  <HelpCircle className="h-4 w-4" aria-hidden="true" />
                </button>

                {activePopover === 'help' && (
                  <div
                    role="dialog"
                    aria-label={lang === 'bn' ? 'সহায়তা গাইড' : 'Quick help'}
                    className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-cyan-400/25 bg-[#09112B] p-4 text-xs shadow-[0_24px_60px_rgba(2,5,20,0.9)]"
                  >
                    <p className="font-bold text-white">
                      {lang === 'bn' ? 'কমান্ড সেন্টার গাইড' : 'How Your Command Center Works'}
                    </p>
                    <p className="mt-2 leading-relaxed text-slate-400">
                      {lang === 'bn'
                        ? 'প্রতিটি স্কোর, স্ট্রিক ও XP শুধুমাত্র আপনার বাস্তব মূল্যায়ন, একাডেমি লেসন, স্পিকিং স্টুডিও এবং ট্রান্সফার ল্যাব থেকে গণনা করা হয়।'
                        : 'Every score, streak, and XP figure is computed strictly from your real assessments, Academy lessons, Speaking Studio turns, and Transfer Lab attempts.'}
                    </p>
                    <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-800 pt-3">
                      <Link
                        to="/diagnostic"
                        onClick={() => setActivePopover(null)}
                        className="font-semibold text-[#00D9FF] hover:text-cyan-200"
                      >
                        {lang === 'bn'
                          ? '→ ৫-দক্ষতা প্রাথমিক মূল্যায়ন দিন'
                          : '→ Take / Retake 5-Skill Assessment'}
                      </Link>
                      <Link
                        to="/app/settings"
                        onClick={() => setActivePopover(null)}
                        className="font-semibold text-slate-300 hover:text-white"
                      >
                        {lang === 'bn' ? '→ শেখার পছন্দ পরিবর্তন করুন' : '→ Update Learning Preferences'}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActivePopover((prev) => (prev === 'user' ? null : 'user'))}
                  aria-label={lang === 'bn' ? 'অ্যাকাউন্ট মেনু' : 'Account menu'}
                  aria-expanded={activePopover === 'user'}
                  aria-haspopup="menu"
                  data-testid="top-user-menu-btn"
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-400/25 bg-[#0B122C] px-2 text-xs font-semibold text-white hover:border-cyan-400/50 transition-colors cursor-pointer"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#00D9FF] to-[#7C3AED] font-mono text-[11px] font-bold text-white">
                    {getInitials(user?.name)}
                  </span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" aria-hidden="true" />
                </button>

                {activePopover === 'user' && (
                  <div
                    role="menu"
                    aria-label={lang === 'bn' ? 'ব্যবহারকারী মেনু' : 'User account menu'}
                    className="absolute right-0 top-full z-40 mt-2 w-60 rounded-2xl border border-cyan-400/25 bg-[#09112B] p-2 text-xs shadow-[0_24px_60px_rgba(2,5,20,0.9)]"
                  >
                    <div className="border-b border-slate-800 px-3 py-2.5">
                      <p className="truncate font-semibold text-white">{user?.name}</p>
                      <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <Link
                        role="menuitem"
                        to="/app/settings"
                        onClick={() => setActivePopover(null)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-200 hover:bg-[#111E47] hover:text-white"
                      >
                        <Settings className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        <span>{t.learnerNav.settings}</span>
                      </Link>
                      <Link
                        role="menuitem"
                        to="/diagnostic"
                        onClick={() => setActivePopover(null)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-200 hover:bg-[#111E47] hover:text-white"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                        <span>
                          {lang === 'bn' ? 'প্রাথমিক মূল্যায়ন' : '5-Skill Assessment'}
                        </span>
                      </Link>
                      <Link
                        role="menuitem"
                        to="/admin"
                        onClick={() => setActivePopover(null)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-200 hover:bg-[#111E47] hover:text-white"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
                        <span>{lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল' : 'Admin Control'}</span>
                      </Link>
                      <button
                        role="menuitem"
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.nav.logout}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Workspace Content */}
          <main
            id="learner-main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-5 focus:outline-none sm:px-6 lg:px-8 lg:pb-12 lg:pt-7"
          >
            {maintenanceNotice.active && (
              <div
                role="status"
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs text-amber-100"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                <span>{lang === 'bn' ? maintenanceNotice.bn : maintenanceNotice.en}</span>
              </div>
            )}
            {subtitle && (
              <p className="mb-6 max-w-3xl text-sm leading-relaxed text-slate-400">{subtitle}</p>
            )}
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (compact 56px + safe-area inset, 5 core touch targets >= 44px) */}
      <nav
        aria-label="Mobile learner navigation"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-cyan-400/15 bg-[#070D24]/95 backdrop-blur-md lg:hidden"
      >
        <div className="grid h-14 grid-cols-5">
          {mobileBottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onTouchStart={() => prefetchRouteChunk(item.to)}
                onFocus={() => prefetchRouteChunk(item.to)}
                className={({ isActive }) =>
                  `flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                    isActive ? 'text-[#00D9FF]' : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="max-w-[68px] truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Compass,
  DollarSign,
  ExternalLink,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  MessageSquareQuote,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useCms } from '../../context/CmsContext';
import {
  canAdminRoleEditCms,
  reorderItems,
  type CmsAnalyticsSummary,
  type CmsConfig,
  type CmsFaqItem,
  type CmsFeatureItem,
  type CmsLanguageItem,
  type CmsTestimonialItem,
} from '../../domain/cmsEngine';
import {
  deleteAdminMedia,
  fetchAdminCmsBundle,
  publishAdminCms,
  saveAdminCmsDraft,
  uploadAdminMedia,
  type ServerAuditEntry,
} from '../../services/cmsApi';

export type CmsSubModule =
  | 'landing'
  | 'navigation'
  | 'features'
  | 'languages'
  | 'pricing'
  | 'testimonials'
  | 'faqs'
  | 'community'
  | 'media'
  | 'seo'
  | 'analytics'
  | 'settings';

interface AdminCmsWorkspaceProps {
  activeModule: CmsSubModule;
  onSelectModule: (mod: CmsSubModule) => void;
  actorEmail: string;
  actorRole: string;
  onServerAuditRefresh?: (logs: ServerAuditEntry[]) => void;
}

const CMS_MODULES: Array<{ id: CmsSubModule; label: string; icon: typeof Layers }> = [
  { id: 'landing', label: 'Landing Page CMS', icon: Layers },
  { id: 'navigation', label: 'Navigation', icon: Compass },
  { id: 'features', label: 'Features', icon: Sparkles },
  { id: 'languages', label: 'Languages', icon: Globe },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { id: 'faqs', label: 'FAQs', icon: HelpCircle },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'media', label: 'Media Library', icon: ImageIcon },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'System Settings', icon: Settings },
];

export function AdminCmsWorkspace({
  activeModule,
  onSelectModule,
  actorEmail,
  actorRole,
  onServerAuditRefresh,
}: AdminCmsWorkspaceProps) {
  const { config: publicConfig, applyPublishedConfig } = useCms();
  const canEdit = canAdminRoleEditCms(actorRole);

  const [draft, setDraft] = useState<CmsConfig>(() => structuredClone(publicConfig));
  const [publishedVersion, setPublishedVersion] = useState<number>(publicConfig.version);
  const [analytics, setAnalytics] = useState<CmsAnalyticsSummary>({
    totalPageViews: 0,
    heroCtaClicks: 0,
    watchDemoClicks: 0,
    pricingClicks: 0,
    liveDemoSubmissions: 0,
    upgradeModalOpens: 0,
    recentEvents: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick-add forms state
  const [newTestimonial, setNewTestimonial] = useState({
    authorName: '',
    authorRole: '',
    quoteEn: '',
    rating: 5,
  });
  const [newFaq, setNewFaq] = useState({
    questionEn: '',
    questionBn: '',
    answerEn: '',
    answerBn: '',
    category: 'General',
  });
  const [newLang, setNewLang] = useState({
    code: '',
    name: '',
    nativeLabel: '',
    status: 'coming_soon' as 'live' | 'coming_soon',
  });
  const [newNav, setNewNav] = useState({
    labelEn: '',
    labelBn: '',
    href: '#features',
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const loadFromServer = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const bundle = await fetchAdminCmsBundle({ email: actorEmail, role: actorRole });
      setDraft(bundle.draft);
      setPublishedVersion(bundle.published.version);
      setAnalytics(bundle.analytics);
      onServerAuditRefresh?.(bundle.auditLogs);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load CMS data.');
    } finally {
      setLoading(false);
    }
  }, [actorEmail, actorRole, onServerAuditRefresh]);

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  const handleSaveDraft = async (summary?: string) => {
    if (!canEdit) return;
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await saveAdminCmsDraft(
        { email: actorEmail, role: actorRole },
        draft,
        summary || `Saved draft updates in ${activeModule} module.`
      );
      setDraft(res.draft);
      setStatusMessage('Draft saved securely to backend database (not yet published live).');
      await loadFromServer();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishLive = async () => {
    if (!canEdit) return;
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await publishAdminCms({ email: actorEmail, role: actorRole }, draft);
      setDraft(res.draft);
      setPublishedVersion(res.published.version);
      applyPublishedConfig(res.published);
      setStatusMessage(
        `Published CMS v${res.published.version} live to the public landing page!`
      );
      await loadFromServer();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to publish live.');
    } finally {
      setSaving(false);
    }
  };

  const handleMediaFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;
    setUploadingMedia(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read selected file.'));
        reader.readAsDataURL(file);
      });
      const asset = await uploadAdminMedia(
        { email: actorEmail, role: actorRole },
        {
          filename: file.name,
          mimeType: file.type,
          dataBase64: base64,
          altText: file.name,
        }
      );
      setDraft((prev) => ({ ...prev, media: [asset, ...prev.media] }));
      setStatusMessage(`Uploaded "${asset.filename}" (${Math.round(asset.sizeBytes / 1024)} KB).`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!canEdit) return;
    try {
      await deleteAdminMedia({ email: actorEmail, role: actorRole }, mediaId);
      setDraft((prev) => ({
        ...prev,
        media: prev.media.filter((m) => m.id !== mediaId),
      }));
      setStatusMessage('Media asset deleted.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top CMS Action Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#0D152B] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#00D9FF]">
            Website & Platform CMS · Live Revision v{publishedVersion}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Edit any module below, save draft, then click{' '}
            <strong className="text-white">Publish Live</strong> to update `/` immediately.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadFromServer()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#080F24] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#080F24] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-[#00D9FF] hover:text-white"
          >
            <span>View Public Site</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            disabled={!canEdit || saving}
            onClick={() => void handleSaveDraft()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/45 bg-blue-500/15 px-3.5 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/25 disabled:opacity-45 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={!canEdit || saving}
            onClick={() => void handlePublishLive()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#00D9FF] via-[#087BFF] to-[#873BFF] px-4 py-2 text-xs font-bold text-white shadow-[0_0_18px_rgba(8,123,255,0.4)] hover:opacity-95 disabled:opacity-45 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{saving ? 'Publishing...' : 'Publish Live'}</span>
          </button>
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          Read-only view: your current role ({actorRole}) cannot edit or publish CMS changes. Switch
          to Admin, Super Admin, or Content Manager to publish.
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-200"
        >
          {errorMessage}
        </div>
      )}

      {/* Sub-Module Navigation Pills */}
      <div className="flex flex-wrap gap-1.5">
        {CMS_MODULES.map((mod) => {
          const Icon = mod.icon;
          const active = activeModule === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onSelectModule(mod.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? 'border-[#00D9FF] bg-[#087BFF]/25 text-white'
                  : 'border-slate-800 bg-[#0B1226] text-slate-300 hover:border-slate-600 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{mod.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODULE 1: LANDING PAGE CMS */}
      {activeModule === 'landing' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
            <h3 className="text-sm font-bold text-white">Hero Section Copy (EN)</h3>
            <label className="block text-xs text-slate-300">
              Top Badge
              <input
                type="text"
                value={draft.hero.badgeEn}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, hero: { ...p.hero, badgeEn: e.target.value } }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs text-slate-300">
                Headline Line 1
                <input
                  type="text"
                  value={draft.hero.headlineLine1En}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      hero: { ...p.hero, headlineLine1En: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="block text-xs text-slate-300">
                Headline Line 2 (Gradient)
                <input
                  type="text"
                  value={draft.hero.headlineLine2En}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      hero: { ...p.hero, headlineLine2En: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
                />
              </label>
            </div>
            <label className="block text-xs text-slate-300">
              Subheadline
              <input
                type="text"
                value={draft.hero.subheadlineEn}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, hero: { ...p.hero, subheadlineEn: e.target.value } }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Description
              <textarea
                rows={2}
                value={draft.hero.descriptionEn}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, hero: { ...p.hero, descriptionEn: e.target.value } }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-slate-300">
                Primary CTA Label
                <input
                  type="text"
                  value={draft.hero.primaryCtaEn}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, hero: { ...p.hero, primaryCtaEn: e.target.value } }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="block text-xs text-slate-300">
                Secondary CTA Label
                <input
                  type="text"
                  value={draft.hero.secondaryCtaEn}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      hero: { ...p.hero, secondaryCtaEn: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
                />
              </label>
            </div>
            <label className="block text-xs text-slate-300">
              Trust Strip Copy (Keep Factual & Honest)
              <input
                type="text"
                value={draft.hero.trustTextEn}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, hero: { ...p.hero, trustTextEn: e.target.value } }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
            <h3 className="text-sm font-bold text-white">Section Order & Visibility</h3>
            <div className="space-y-2">
              {[...draft.sections]
                .sort((a, b) => a.order - b.order)
                .map((sec, idx, arr) => (
                  <div
                    key={sec.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#060C1E] px-3 py-2"
                  >
                    <label className="flex items-center gap-2.5 text-xs font-medium text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            sections: p.sections.map((s) =>
                              s.id === sec.id ? { ...s, enabled: e.target.checked } : s
                            ),
                          }))
                        }
                      />
                      <span>
                        {idx + 1}. {sec.label}
                      </span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            sections: reorderItems(p.sections, sec.id, 'up'),
                          }))
                        }
                        aria-label={`Move ${sec.label} up`}
                        className="rounded border border-slate-700 p-1 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            sections: reorderItems(p.sections, sec.id, 'down'),
                          }))
                        }
                        aria-label={`Move ${sec.label} down`}
                        className="rounded border border-slate-700 p-1 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-white">Final CTA Banner Copy</h4>
              <input
                type="text"
                value={draft.finalCta.titleEn}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    finalCta: { ...p.finalCta, titleEn: e.target.value },
                  }))
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: NAVIGATION MANAGER */}
      {activeModule === 'navigation' && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
          <h3 className="text-sm font-bold text-white">Navbar Links Manager</h3>
          <div className="space-y-2">
            {[...draft.navigation]
              .sort((a, b) => a.order - b.order)
              .map((item, idx, arr) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-800 bg-[#060C1E] p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <input
                    type="text"
                    value={item.labelEn}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        navigation: p.navigation.map((n) =>
                          n.id === item.id ? { ...n, labelEn: e.target.value } : n
                        ),
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={item.labelBn}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        navigation: p.navigation.map((n) =>
                          n.id === item.id ? { ...n, labelBn: e.target.value } : n
                        ),
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={item.href}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        navigation: p.navigation.map((n) =>
                          n.id === item.id ? { ...n, href: e.target.value } : n
                        ),
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 font-mono text-xs text-slate-200"
                  />
                  <div className="flex items-center gap-1.5">
                    <label className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            navigation: p.navigation.map((n) =>
                              n.id === item.id ? { ...n, enabled: e.target.checked } : n
                            ),
                          }))
                        }
                      />
                      On
                    </label>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          navigation: reorderItems(p.navigation, item.id, 'up'),
                        }))
                      }
                      className="rounded border border-slate-700 p-1 text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === arr.length - 1}
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          navigation: reorderItems(p.navigation, item.id, 'down'),
                        }))
                      }
                      className="rounded border border-slate-700 p-1 text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          navigation: p.navigation.filter((n) => n.id !== item.id),
                        }))
                      }
                      className="rounded border border-rose-500/40 p-1 text-rose-300 hover:bg-rose-500/15 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="grid grid-cols-1 gap-2 border-t border-slate-800 pt-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Label (EN)"
              value={newNav.labelEn}
              onChange={(e) => setNewNav((p) => ({ ...p, labelEn: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Label (বাংলা)"
              value={newNav.labelBn}
              onChange={(e) => setNewNav((p) => ({ ...p, labelBn: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="#section or /route"
              value={newNav.href}
              onChange={(e) => setNewNav((p) => ({ ...p, href: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (!newNav.labelEn.trim()) return;
                setDraft((p) => ({
                  ...p,
                  navigation: [
                    ...p.navigation,
                    {
                      id: `nav_${Date.now()}`,
                      labelEn: newNav.labelEn.trim(),
                      labelBn: newNav.labelBn.trim() || newNav.labelEn.trim(),
                      href: newNav.href.trim() || '#home',
                      type: newNav.href.startsWith('/') ? 'route' : 'anchor',
                      enabled: true,
                      order: p.navigation.length + 1,
                    },
                  ],
                }));
                setNewNav({ labelEn: '', labelBn: '', href: '#features' });
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#087BFF] px-3 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Nav Item</span>
            </button>
          </div>
        </div>
      )}

      {/* MODULE 3: FEATURES MANAGER */}
      {activeModule === 'features' && (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
          <h3 className="text-sm font-bold text-white">Six Powerful Features Cards</h3>
          {[...draft.features]
            .sort((a, b) => a.order - b.order)
            .map((feat, idx, arr) => (
              <div
                key={feat.id}
                className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-800 bg-[#060C1E] p-3 lg:grid-cols-[1.1fr_1.5fr_0.9fr_auto]"
              >
                <input
                  type="text"
                  value={feat.titleEn}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      features: p.features.map((f) =>
                        f.id === feat.id ? { ...f, titleEn: e.target.value } : f
                      ),
                    }))
                  }
                  className="rounded-lg border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 text-xs font-semibold text-white"
                />
                <input
                  type="text"
                  value={feat.summaryEn}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      features: p.features.map((f) =>
                        f.id === feat.id ? { ...f, summaryEn: e.target.value } : f
                      ),
                    }))
                  }
                  className="rounded-lg border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 text-xs text-slate-200"
                />
                <input
                  type="text"
                  value={feat.targetRoute}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      features: p.features.map((f) =>
                        f.id === feat.id ? { ...f, targetRoute: e.target.value } : f
                      ),
                    }))
                  }
                  className="rounded-lg border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 font-mono text-xs text-slate-300"
                />
                <div className="flex items-center gap-1.5">
                  <label className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={feat.enabled}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          features: p.features.map((f) =>
                            f.id === feat.id ? { ...f, enabled: e.target.checked } : f
                          ),
                        }))
                      }
                    />
                    Live
                  </label>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        features: reorderItems(p.features, feat.id, 'up'),
                      }))
                    }
                    className="rounded border border-slate-700 p-1 text-slate-300 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === arr.length - 1}
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        features: reorderItems(p.features, feat.id, 'down'),
                      }))
                    }
                    className="rounded border border-slate-700 p-1 text-slate-300 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* MODULE 4: LANGUAGES MANAGER */}
      {activeModule === 'languages' && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
          <h3 className="text-sm font-bold text-white">
            Supported Languages (Honest Live vs. Coming Soon Controls)
          </h3>
          <div className="space-y-2">
            {[...draft.languages]
              .sort((a, b) => a.order - b.order)
              .map((item, idx, arr) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-800 bg-[#060C1E] p-3 sm:grid-cols-[0.6fr_1fr_1fr_1fr_auto]"
                >
                  <span className="font-mono text-xs font-bold uppercase text-[#00D9FF]">
                    {item.code}
                  </span>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        languages: p.languages.map((l) =>
                          l.id === item.id ? { ...l, name: e.target.value } : l
                        ),
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={item.nativeLabel}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        languages: p.languages.map((l) =>
                          l.id === item.id ? { ...l, nativeLabel: e.target.value } : l
                        ),
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 text-xs text-white"
                  />
                  <select
                    value={item.status}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        languages: p.languages.map((l) =>
                          l.id === item.id
                            ? { ...l, status: e.target.value as CmsLanguageItem['status'] }
                            : l
                        ),
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="live">Live Now</option>
                    <option value="coming_soon">Coming Soon</option>
                  </select>
                  <div className="flex items-center gap-1.5">
                    <label className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            languages: p.languages.map((l) =>
                              l.id === item.id ? { ...l, enabled: e.target.checked } : l
                            ),
                          }))
                        }
                      />
                      Show
                    </label>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          languages: reorderItems(p.languages, item.id, 'up'),
                        }))
                      }
                      className="rounded border border-slate-700 p-1 text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === arr.length - 1}
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          languages: reorderItems(p.languages, item.id, 'down'),
                        }))
                      }
                      className="rounded border border-slate-700 p-1 text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="grid grid-cols-1 gap-2 border-t border-slate-800 pt-4 sm:grid-cols-5">
            <input
              type="text"
              placeholder="Code (e.g. ar)"
              value={newLang.code}
              onChange={(e) => setNewLang((p) => ({ ...p, code: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Name (e.g. Arabic)"
              value={newLang.name}
              onChange={(e) => setNewLang((p) => ({ ...p, name: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Native label"
              value={newLang.nativeLabel}
              onChange={(e) => setNewLang((p) => ({ ...p, nativeLabel: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
            />
            <select
              value={newLang.status}
              onChange={(e) =>
                setNewLang((p) => ({ ...p, status: e.target.value as 'live' | 'coming_soon' }))
              }
              className="rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
            >
              <option value="coming_soon">Coming Soon</option>
              <option value="live">Live Now</option>
            </select>
            <button
              type="button"
              onClick={() => {
                if (!newLang.code.trim() || !newLang.name.trim()) return;
                setDraft((p) => ({
                  ...p,
                  languages: [
                    ...p.languages,
                    {
                      id: `lang_${Date.now()}`,
                      code: newLang.code.trim().toLowerCase(),
                      name: newLang.name.trim(),
                      nativeLabel: newLang.nativeLabel.trim() || newLang.name.trim(),
                      flagKey: 'global',
                      status: newLang.status,
                      enabled: true,
                      order: p.languages.length + 1,
                    },
                  ],
                }));
                setNewLang({ code: '', name: '', nativeLabel: '', status: 'coming_soon' });
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#087BFF] px-3 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Language</span>
            </button>
          </div>
        </div>
      )}

      {/* MODULE 5: PRICING MANAGER */}
      {activeModule === 'pricing' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {draft.pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className="space-y-3 rounded-xl border border-slate-800 bg-[#0D152B] p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{plan.nameEn}</h3>
                <label className="inline-flex items-center gap-1.5 text-xs text-amber-300">
                  <input
                    type="checkbox"
                    checked={plan.isPopular}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        pricingPlans: p.pricingPlans.map((pl) =>
                          pl.id === plan.id ? { ...pl, isPopular: e.target.checked } : pl
                        ),
                      }))
                    }
                  />
                  Most Popular Badge
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs text-slate-300">
                  Currency
                  <input
                    type="text"
                    value={plan.currency}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        pricingPlans: p.pricingPlans.map((pl) =>
                          pl.id === plan.id ? { ...pl, currency: e.target.value } : pl
                        ),
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-2.5 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-xs text-slate-300">
                  Monthly Price
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plan.monthlyPrice}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        pricingPlans: p.pricingPlans.map((pl) =>
                          pl.id === plan.id
                            ? { ...pl, monthlyPrice: Number(e.target.value) || 0 }
                            : pl
                        ),
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-2.5 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-xs text-slate-300">
                  Yearly/Mo Price
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plan.yearlyMonthlyPrice}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        pricingPlans: p.pricingPlans.map((pl) =>
                          pl.id === plan.id
                            ? { ...pl, yearlyMonthlyPrice: Number(e.target.value) || 0 }
                            : pl
                        ),
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-2.5 py-1.5 text-xs text-white"
                  />
                </label>
              </div>
              <label className="block text-xs text-slate-300">
                Features (one per line)
                <textarea
                  rows={3}
                  value={plan.featuresEn.join('\n')}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      pricingPlans: p.pricingPlans.map((pl) =>
                        pl.id === plan.id
                          ? {
                              ...pl,
                              featuresEn: e.target.value
                                .split('\n')
                                .map((line) => line.trim())
                                .filter(Boolean),
                            }
                          : pl
                      ),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
                />
              </label>
              <label className="block text-xs text-slate-300">
                Fair-Use Policy Note
                <input
                  type="text"
                  value={plan.fairUseNoteEn || ''}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      pricingPlans: p.pricingPlans.map((pl) =>
                        pl.id === plan.id ? { ...pl, fairUseNoteEn: e.target.value } : pl
                      ),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-1.5 text-xs text-white"
                />
              </label>
            </div>
          ))}
        </div>
      )}

      {/* MODULE 6: TESTIMONIALS MODERATION */}
      {activeModule === 'testimonials' && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
          <div>
            <h3 className="text-sm font-bold text-white">
              Verified Testimonials Moderation (Zero Fake Reviews by Default)
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Only testimonials marked <strong className="text-emerald-300">Approved</strong> appear
              on the public landing page after clicking Publish Live.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-800 bg-[#060C1E] p-3.5 md:grid-cols-4">
            <input
              type="text"
              placeholder="Author Name (e.g. Rahid Hasan)"
              value={newTestimonial.authorName}
              onChange={(e) => setNewTestimonial((p) => ({ ...p, authorName: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-[#0B1226] px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Role (e.g. University Student)"
              value={newTestimonial.authorRole}
              onChange={(e) => setNewTestimonial((p) => ({ ...p, authorRole: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-[#0B1226] px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Verified learner quote"
              value={newTestimonial.quoteEn}
              onChange={(e) => setNewTestimonial((p) => ({ ...p, quoteEn: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-[#0B1226] px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (!newTestimonial.authorName.trim() || !newTestimonial.quoteEn.trim()) return;
                const entry: CmsTestimonialItem = {
                  id: `test_${Date.now()}`,
                  authorName: newTestimonial.authorName.trim(),
                  authorRole: newTestimonial.authorRole.trim() || 'Verified Learner',
                  quoteEn: newTestimonial.quoteEn.trim(),
                  rating: newTestimonial.rating,
                  status: 'pending',
                  order: draft.testimonials.length + 1,
                  createdAt: new Date().toISOString(),
                };
                setDraft((p) => ({ ...p, testimonials: [...p.testimonials, entry] }));
                setNewTestimonial({ authorName: '', authorRole: '', quoteEn: '', rating: 5 });
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#087BFF] px-3 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add (Pending)</span>
            </button>
          </div>

          {draft.testimonials.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
              No learner testimonials stored yet. Add a verified submission above and approve it to
              display on the public site.
            </p>
          ) : (
            <div className="space-y-2">
              {draft.testimonials.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-slate-800 bg-[#060C1E] p-3.5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{t.authorName}</span>
                      <span className="text-[11px] text-slate-400">· {t.authorRole}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          t.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : t.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">&ldquo;{t.quoteEn}&rdquo;</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          testimonials: p.testimonials.map((x) =>
                            x.id === t.id ? { ...x, status: 'approved' } : x
                          ),
                        }))
                      }
                      className="rounded-lg border border-emerald-500/45 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          testimonials: p.testimonials.map((x) =>
                            x.id === t.id ? { ...x, status: 'rejected' } : x
                          ),
                        }))
                      }
                      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          testimonials: p.testimonials.filter((x) => x.id !== t.id),
                        }))
                      }
                      className="rounded-lg border border-rose-500/40 p-1.5 text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODULE 7: FAQ MANAGER */}
      {activeModule === 'faqs' && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
          <h3 className="text-sm font-bold text-white">FAQ Management</h3>
          <div className="space-y-2">
            {[...draft.faqs]
              .sort((a, b) => a.order - b.order)
              .map((faq, idx, arr) => (
                <div
                  key={faq.id}
                  className="space-y-2 rounded-lg border border-slate-800 bg-[#060C1E] p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={faq.questionEn}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          faqs: p.faqs.map((f) =>
                            f.id === faq.id ? { ...f, questionEn: e.target.value } : f
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 text-xs font-semibold text-white"
                    />
                    <div className="flex shrink-0 items-center gap-1.5">
                      <label className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                        <input
                          type="checkbox"
                          checked={faq.published}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              faqs: p.faqs.map((f) =>
                                f.id === faq.id ? { ...f, published: e.target.checked } : f
                              ),
                            }))
                          }
                        />
                        Published
                      </label>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() =>
                          setDraft((p) => ({ ...p, faqs: reorderItems(p.faqs, faq.id, 'up') }))
                        }
                        className="rounded border border-slate-700 p-1 text-slate-300 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() =>
                          setDraft((p) => ({ ...p, faqs: reorderItems(p.faqs, faq.id, 'down') }))
                        }
                        className="rounded border border-slate-700 p-1 text-slate-300 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            faqs: p.faqs.filter((f) => f.id !== faq.id),
                          }))
                        }
                        className="rounded border border-rose-500/40 p-1 text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={faq.answerEn}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        faqs: p.faqs.map((f) =>
                          f.id === faq.id ? { ...f, answerEn: e.target.value } : f
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
              ))}
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-4">
            <h4 className="text-xs font-bold text-white">Add New FAQ</h4>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                type="text"
                placeholder="Question (EN)"
                value={newFaq.questionEn}
                onChange={(e) => setNewFaq((p) => ({ ...p, questionEn: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Answer (EN)"
                value={newFaq.answerEn}
                onChange={(e) => setNewFaq((p) => ({ ...p, answerEn: e.target.value }))}
                className="rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newFaq.questionEn.trim() || !newFaq.answerEn.trim()) return;
                const created: CmsFaqItem = {
                  id: `faq_${Date.now()}`,
                  questionEn: newFaq.questionEn.trim(),
                  questionBn: newFaq.questionBn.trim() || newFaq.questionEn.trim(),
                  answerEn: newFaq.answerEn.trim(),
                  answerBn: newFaq.answerBn.trim() || newFaq.answerEn.trim(),
                  category: newFaq.category,
                  published: true,
                  order: draft.faqs.length + 1,
                };
                setDraft((p) => ({ ...p, faqs: [...p.faqs, created] }));
                setNewFaq({ questionEn: '', questionBn: '', answerEn: '', answerBn: '', category: 'General' });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#087BFF] px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add FAQ</span>
            </button>
          </div>
        </div>
      )}

      {/* MODULE 8: COMMUNITY MANAGER */}
      {activeModule === 'community' && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
          <h3 className="text-sm font-bold text-white">Global Community Copy & Links</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-300">
              Community Title
              <input
                type="text"
                value={draft.community.titleEn}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    community: { ...p.community, titleEn: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="text-xs text-slate-300">
              Community Subtitle
              <input
                type="text"
                value={draft.community.subtitleEn}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    community: { ...p.community, subtitleEn: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
          </div>
          <div className="space-y-2">
            {draft.community.announcements.map((ann) => (
              <div key={ann.id} className="rounded-lg border border-slate-800 bg-[#060C1E] p-3">
                <input
                  type="text"
                  value={ann.title}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      community: {
                        ...p.community,
                        announcements: p.community.announcements.map((a) =>
                          a.id === ann.id ? { ...a, title: e.target.value } : a
                        ),
                      },
                    }))
                  }
                  className="w-full rounded border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 text-xs font-bold text-white"
                />
                <textarea
                  rows={2}
                  value={ann.body}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      community: {
                        ...p.community,
                        announcements: p.community.announcements.map((a) =>
                          a.id === ann.id ? { ...a, body: e.target.value } : a
                        ),
                      },
                    }))
                  }
                  className="mt-2 w-full rounded border border-slate-700 bg-[#0B1226] px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 9: MEDIA LIBRARY */}
      {activeModule === 'media' && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Media Library</h3>
              <p className="text-xs text-slate-400">
                Validated raster uploads (PNG, JPEG, WebP up to 2 MB). Verified by signature on backend.
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#087BFF] px-3.5 py-2 text-xs font-bold text-white cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              <span>{uploadingMedia ? 'Uploading...' : 'Upload Image'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleMediaFileSelect}
                disabled={!canEdit || uploadingMedia}
                className="hidden"
              />
            </label>
          </div>

          {draft.media.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
              No uploaded media assets yet. Upload an image above to use in SEO OG cards or
              testimonials.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {draft.media.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-lg border border-slate-800 bg-[#060C1E] p-3"
                >
                  <img
                    src={asset.url}
                    alt={asset.altText}
                    className="h-28 w-full rounded object-cover bg-slate-950"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{asset.filename}</p>
                      <p className="truncate font-mono text-[10px] text-slate-400">{asset.url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteMedia(asset.id)}
                      className="rounded border border-rose-500/40 p-1.5 text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODULE 10: SEO MANAGER */}
      {activeModule === 'seo' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
            <h3 className="text-sm font-bold text-white">SEO, Open Graph & Canonical Settings</h3>
            <label className="block text-xs text-slate-300">
              Meta Title
              <input
                type="text"
                value={draft.seo.metaTitle}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, seo: { ...p.seo, metaTitle: e.target.value } }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Meta Description
              <textarea
                rows={3}
                value={draft.seo.metaDescription}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, seo: { ...p.seo, metaDescription: e.target.value } }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Canonical URL
              <input
                type="url"
                value={draft.seo.canonicalUrl}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, seo: { ...p.seo, canonicalUrl: e.target.value } }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="block text-xs text-slate-300">
              OG Social Share Image URL
              <input
                type="text"
                placeholder="/api/v1/media/..."
                value={draft.seo.ogImageUrl}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, seo: { ...p.seo, ogImageUrl: e.target.value } }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0D152B] p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Search Snippet Preview
            </h4>
            <div className="mt-3 rounded-xl border border-slate-800 bg-[#060C1E] p-4">
              <p className="text-xs text-emerald-400">{draft.seo.canonicalUrl}</p>
              <p className="mt-1 text-base font-semibold text-blue-400">{draft.seo.metaTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {draft.seo.metaDescription}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 11: REAL ANALYTICS */}
      {activeModule === 'analytics' && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
          <div>
            <h3 className="text-sm font-bold text-white">
              Real Tracked Platform Analytics (Zero Fabricated Numbers)
            </h3>
            <p className="text-xs text-slate-400">
              Counts reflect actual events recorded by POST /api/v1/analytics/event.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Landing Views', value: analytics.totalPageViews },
              { label: 'Hero CTA Clicks', value: analytics.heroCtaClicks },
              { label: 'Watch Demo Clicks', value: analytics.watchDemoClicks },
              { label: 'Pricing Clicks', value: analytics.pricingClicks },
              { label: 'Live Demo Tests', value: analytics.liveDemoSubmissions },
              { label: 'Upgrade Intents', value: analytics.upgradeModalOpens },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-slate-800 bg-[#060C1E] p-3.5"
              >
                <p className="text-[11px] text-slate-400">{kpi.label}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#060C1E] p-3.5">
            <h4 className="text-xs font-bold text-slate-200">Recent Recorded Events</h4>
            {analytics.recentEvents.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                No public analytics events recorded yet. Visit `/` or click a CTA to populate real
                telemetry.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-800/80 text-xs">
                {analytics.recentEvents.slice(0, 10).map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between py-2">
                    <span className="font-mono text-[#00D9FF]">{ev.eventType}</span>
                    <span className="text-slate-400">{ev.path}</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* MODULE 12: SYSTEM SETTINGS */}
      {activeModule === 'settings' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
            <h3 className="text-sm font-bold text-white">Brand, Contact & Social Links</h3>
            <label className="block text-xs text-slate-300">
              Brand Name
              <input
                type="text"
                value={draft.settings.brandName}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    settings: { ...p.settings, brandName: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Tagline (EN)
              <input
                type="text"
                value={draft.settings.taglineEn}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    settings: { ...p.settings, taglineEn: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Support Email
              <input
                type="email"
                value={draft.settings.supportEmail}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    settings: { ...p.settings, supportEmail: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Copyright Line
              <input
                type="text"
                value={draft.settings.copyrightText}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    settings: { ...p.settings, copyrightText: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-[#0D152B] p-5">
            <h3 className="text-sm font-bold text-white">Feature Flags & Maintenance Notice</h3>
            <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.settings.featureFlags.showThreeGlobe}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    settings: {
                      ...p.settings,
                      featureFlags: {
                        ...p.settings.featureFlags,
                        showThreeGlobe: e.target.checked,
                      },
                    },
                  }))
                }
              />
              <span>Enable 3D Three.js Earth Globe in Hero</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.settings.featureFlags.showLiveDemo}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    settings: {
                      ...p.settings,
                      featureFlags: {
                        ...p.settings.featureFlags,
                        showLiveDemo: e.target.checked,
                      },
                    },
                  }))
                }
              />
              <span>Show Interactive Live AI Sample Workbench on Landing Page</span>
            </label>
            <label className="block text-xs text-slate-300">
              Top Maintenance / Announcement Banner (leave blank to hide)
              <input
                type="text"
                value={draft.settings.featureFlags.maintenanceNotice}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    settings: {
                      ...p.settings,
                      featureFlags: {
                        ...p.settings.featureFlags,
                        maintenanceNotice: e.target.value,
                      },
                    },
                  }))
                }
                placeholder="Optional site-wide notice..."
                className="mt-1 w-full rounded-lg border border-slate-700 bg-[#060C1E] px-3 py-2 text-xs text-white"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

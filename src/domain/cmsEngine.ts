/**
 * LINGUAVERSE AI — Shared CMS Domain, Defaults, Validation & Sanitization Engine
 *
 * Pure TypeScript module (zero Node/DOM dependencies) shared across:
 * - Frontend Landing Page & Admin CMS Dashboard (src/)
 * - Express local dev/production backend (server/)
 * - Cloudflare Workers + D1 backend (worker/)
 *
 * Strictly enforces:
 * - Zero fabricated user counts, reviews, or payment claims by default
 * - Honest separation of Live vs. Coming Soon languages
 * - Safe URL/text sanitization and media upload validation
 */

export type CmsSectionId =
  | 'hero'
  | 'problem_solution'
  | 'features'
  | 'how_it_works'
  | 'languages_pricing'
  | 'live_demo'
  | 'community_testimonials_faq'
  | 'final_cta';

export interface CmsSectionToggle {
  id: CmsSectionId;
  label: string;
  enabled: boolean;
  order: number;
}

export interface CmsDropdownItem {
  id: string;
  labelEn: string;
  labelBn: string;
  href: string;
  descriptionEn?: string;
  descriptionBn?: string;
}

export interface CmsNavItem {
  id: string;
  labelEn: string;
  labelBn: string;
  href: string;
  type: 'anchor' | 'route' | 'dropdown';
  enabled: boolean;
  order: number;
  dropdownItems?: CmsDropdownItem[];
}

export interface CmsHeroConfig {
  badgeEn: string;
  badgeBn: string;
  headlineLine1En: string;
  headlineLine1Bn: string;
  headlineLine2En: string;
  headlineLine2Bn: string;
  subheadlineEn: string;
  subheadlineBn: string;
  descriptionEn: string;
  descriptionBn: string;
  primaryCtaEn: string;
  primaryCtaBn: string;
  secondaryCtaEn: string;
  secondaryCtaBn: string;
  trustTextEn: string;
  trustTextBn: string;
  showInteractivePreviewLabel: boolean;
}

export interface CmsProblemItem {
  id: string;
  textEn: string;
  textBn: string;
}

export interface CmsLoopNode {
  id: 'learn' | 'speak' | 'improve' | 'transfer' | 'practice';
  labelEn: string;
  labelBn: string;
  detailEn: string;
  detailBn: string;
  color: 'cyan' | 'emerald' | 'amber' | 'violet' | 'magenta';
}

export interface CmsProblemSolutionConfig {
  problemEyebrowEn: string;
  problemEyebrowBn: string;
  problemTitleEn: string;
  problemTitleBn: string;
  problemItems: CmsProblemItem[];
  solutionEyebrowEn: string;
  solutionEyebrowBn: string;
  solutionTitleEn: string;
  solutionTitleBn: string;
  solutionPillarsEn: string[];
  solutionPillarsBn: string[];
  loopNodes: CmsLoopNode[];
}

export type CmsFeatureIconKey =
  | 'dna'
  | 'mistake'
  | 'mic'
  | 'transfer'
  | 'progress'
  | 'adaptive'
  | 'sparkles';

export interface CmsFeatureItem {
  id: string;
  iconKey: CmsFeatureIconKey;
  accent: 'violet' | 'magenta' | 'cyan' | 'blue' | 'emerald' | 'amber';
  titleEn: string;
  titleBn: string;
  summaryEn: string;
  summaryBn: string;
  targetRoute: string;
  enabled: boolean;
  order: number;
}

export interface CmsHowItWorksStep {
  id: string;
  stepNumber: number;
  accent: 'cyan' | 'violet' | 'emerald';
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
}

export interface CmsHowItWorksConfig {
  titlePrefixEn: string;
  titleAccentEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  steps: CmsHowItWorksStep[];
  journeyTitleLine1En: string;
  journeyTitleLine2En: string;
  journeyTitleBn: string;
  journeySubtitleEn: string;
  journeySubtitleBn: string;
}

export type CmsLanguageStatus = 'live' | 'coming_soon';

export interface CmsLanguageItem {
  id: string;
  code: string;
  name: string;
  nativeLabel: string;
  flagKey: 'en' | 'bn' | 'es' | 'fr' | 'de' | 'ja' | 'ko' | 'global';
  status: CmsLanguageStatus;
  enabled: boolean;
  order: number;
}

export interface CmsPricingPlan {
  id: string;
  slug: 'free' | 'premium' | string;
  nameEn: string;
  nameBn: string;
  taglineEn: string;
  taglineBn: string;
  currency: string;
  monthlyPrice: number;
  yearlyMonthlyPrice: number;
  billingLabelEn: string;
  billingLabelBn: string;
  isPopular: boolean;
  popularBadgeEn: string;
  popularBadgeBn: string;
  featuresEn: string[];
  featuresBn: string[];
  fairUseNoteEn?: string;
  fairUseNoteBn?: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
  enabled: boolean;
  order: number;
}

export interface CmsTestimonialItem {
  id: string;
  authorName: string;
  authorRole: string;
  quoteEn: string;
  quoteBn?: string;
  rating: number;
  avatarUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  order: number;
  createdAt: string;
}

export interface CmsFaqItem {
  id: string;
  questionEn: string;
  questionBn: string;
  answerEn: string;
  answerBn: string;
  category: string;
  published: boolean;
  order: number;
}

export interface CmsCommunityLink {
  id: string;
  label: string;
  url: string;
  platform: 'discord' | 'youtube' | 'linkedin' | 'x' | 'forum' | 'other';
  enabled: boolean;
}

export interface CmsCommunityAnnouncement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  enabled: boolean;
}

export interface CmsCommunityConfig {
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
  links: CmsCommunityLink[];
  announcements: CmsCommunityAnnouncement[];
}

export interface CmsFinalCtaConfig {
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
}

export interface CmsMediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  altText: string;
  uploadedBy: string;
  createdAt: string;
}

export interface CmsSeoConfig {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  twitterCard: 'summary' | 'summary_large_image';
}

export interface CmsFooterLink {
  id: string;
  labelEn: string;
  labelBn: string;
  href: string;
  enabled: boolean;
  order: number;
}

export interface CmsSystemSettings {
  brandName: string;
  taglineEn: string;
  taglineBn: string;
  supportEmail: string;
  socialLinks: {
    youtube: string;
    discord: string;
    linkedin: string;
    x: string;
  };
  footerLinks: CmsFooterLink[];
  featureFlags: {
    showThreeGlobe: boolean;
    showLiveDemo: boolean;
    allowPublicRegistration: boolean;
    maintenanceNotice: string;
  };
  copyrightText: string;
}

export interface CmsConfig {
  version: number;
  publishedAt: string;
  updatedAt: string;
  updatedBy: string;
  sections: CmsSectionToggle[];
  navigation: CmsNavItem[];
  hero: CmsHeroConfig;
  problemSolution: CmsProblemSolutionConfig;
  features: CmsFeatureItem[];
  howItWorks: CmsHowItWorksConfig;
  languages: CmsLanguageItem[];
  pricingPlans: CmsPricingPlan[];
  community: CmsCommunityConfig;
  testimonials: CmsTestimonialItem[];
  faqs: CmsFaqItem[];
  finalCta: CmsFinalCtaConfig;
  media: CmsMediaAsset[];
  seo: CmsSeoConfig;
  settings: CmsSystemSettings;
}

export interface CmsAnalyticsSummary {
  totalPageViews: number;
  heroCtaClicks: number;
  watchDemoClicks: number;
  pricingClicks: number;
  liveDemoSubmissions: number;
  upgradeModalOpens: number;
  recentEvents: Array<{
    id: string;
    eventType: string;
    path: string;
    metadata?: Record<string, string | number | boolean>;
    createdAt: string;
  }>;
}

export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const MAX_MEDIA_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

export const CMS_ADMIN_WRITE_ROLES = new Set([
  'super_admin',
  'admin',
  'content_manager',
]);

export const CMS_ADMIN_READ_ROLES = new Set([
  'super_admin',
  'admin',
  'content_manager',
  'ai_ops',
  'moderator',
]);

export function canAdminRoleEditCms(role: string | undefined | null): boolean {
  return Boolean(role && CMS_ADMIN_WRITE_ROLES.has(role));
}

export function canAdminRoleReadCms(role: string | undefined | null): boolean {
  return Boolean(role && CMS_ADMIN_READ_ROLES.has(role));
}

export function sanitizeText(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return trimmed.slice(0, 300);
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
      return parsed.toString().slice(0, 500);
    }
  } catch {
    return '';
  }
  return '';
}

export function validateMediaUpload(input: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}): { ok: boolean; error?: string } {
  const filename = sanitizeText(input.filename, 140);
  if (!filename) {
    return { ok: false, error: 'A valid filename is required.' };
  }
  if (/\.svgz?$/i.test(filename)) {
    return {
      ok: false,
      error: 'SVG uploads are not permitted. Allowed formats: PNG, JPEG, WebP.',
    };
  }
  if (!ALLOWED_MEDIA_MIME_TYPES.has(input.mimeType)) {
    return {
      ok: false,
      error: 'Unsupported file type. Allowed formats: PNG, JPEG, WebP.',
    };
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, error: 'Uploaded file is empty.' };
  }
  if (input.sizeBytes > MAX_MEDIA_UPLOAD_BYTES) {
    return { ok: false, error: 'File exceeds the 2 MB maximum upload limit.' };
  }
  return { ok: true };
}

export function reorderItems<T extends { id: string; order: number }>(
  items: T[],
  id: string,
  direction: 'up' | 'down'
): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((item) => item.id === id);
  if (idx === -1) return sorted;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return sorted;
  const next = [...sorted];
  const temp = next[idx];
  next[idx] = next[swapIdx];
  next[swapIdx] = temp;
  return next.map((item, index) => ({ ...item, order: index + 1 }));
}

export function getApprovedTestimonials(config: CmsConfig): CmsTestimonialItem[] {
  return [...config.testimonials]
    .filter((t) => t.status === 'approved')
    .sort((a, b) => a.order - b.order);
}

export function getPublishedFaqs(config: CmsConfig): CmsFaqItem[] {
  return [...config.faqs]
    .filter((f) => f.published)
    .sort((a, b) => a.order - b.order);
}

export function isSectionEnabled(config: CmsConfig, id: CmsSectionId): boolean {
  const found = config.sections.find((s) => s.id === id);
  return found ? found.enabled : true;
}

export function createDefaultCmsConfig(): CmsConfig {
  const nowIso = '2026-03-01T00:00:00.000Z';
  return {
    version: 1,
    publishedAt: nowIso,
    updatedAt: nowIso,
    updatedBy: 'system',
    sections: [
      { id: 'hero', label: 'Hero 3D Experience', enabled: true, order: 1 },
      { id: 'problem_solution', label: 'Problem & Solution Loop', enabled: true, order: 2 },
      { id: 'features', label: 'Six Powerful Features', enabled: true, order: 3 },
      { id: 'how_it_works', label: 'How It Works (3 Steps)', enabled: true, order: 4 },
      { id: 'languages_pricing', label: 'Languages & Pricing', enabled: true, order: 5 },
      { id: 'live_demo', label: 'Interactive AI Sample Workbench', enabled: true, order: 6 },
      {
        id: 'community_testimonials_faq',
        label: 'Community, Testimonials & FAQs',
        enabled: true,
        order: 7,
      },
      { id: 'final_cta', label: 'Final Conversion Banner', enabled: true, order: 8 },
    ],
    navigation: [
      { id: 'nav_home', labelEn: 'Home', labelBn: 'হোম', href: '#home', type: 'anchor', enabled: true, order: 1 },
      { id: 'nav_features', labelEn: 'Features', labelBn: 'ফিচারসমূহ', href: '#features', type: 'anchor', enabled: true, order: 2 },
      { id: 'nav_how', labelEn: 'How It Works', labelBn: 'কিভাবে কাজ করে', href: '#how-it-works', type: 'anchor', enabled: true, order: 3 },
      { id: 'nav_pricing', labelEn: 'Pricing', labelBn: 'প্রাইসিং', href: '#pricing', type: 'anchor', enabled: true, order: 4 },
      { id: 'nav_about', labelEn: 'About', labelBn: 'আমাদের সম্পর্কে', href: '#problem-solution', type: 'anchor', enabled: true, order: 5 },
      {
        id: 'nav_community',
        labelEn: 'Community',
        labelBn: 'কমিউনিটি',
        href: '#community',
        type: 'dropdown',
        enabled: true,
        order: 6,
        dropdownItems: [
          {
            id: 'dd_hub',
            labelEn: 'Global Learner Community',
            labelBn: 'গ্লোবাল শিক্ষার্থী কমিউনিটি',
            href: '#community',
            descriptionEn: 'Practice channels & updates',
            descriptionBn: 'অনুশীলন চ্যানেল ও আপডেট',
          },
          {
            id: 'dd_demo',
            labelEn: 'Try Live AI Feedback',
            labelBn: 'লাইভ AI ফিডব্যাক পরীক্ষা করুন',
            href: '#live-demo',
            descriptionEn: 'Test real Bangla-to-English correction',
            descriptionBn: 'বাংলা ব্যাখ্যাসহ ইংরেজি সংশোধন দেখুন',
          },
          {
            id: 'dd_faq',
            labelEn: 'Frequently Asked Questions',
            labelBn: 'সাধারণ জিজ্ঞাসা (FAQ)',
            href: '#faq',
            descriptionEn: 'Pricing, privacy & learning method',
            descriptionBn: 'প্রাইসিং, প্রাইভেসি ও শেখার পদ্ধতি',
          },
        ],
      },
    ],
    hero: {
      badgeEn: 'Next-Gen AI Language Learning Platform',
      badgeBn: 'নেক্সট-জেন AI ভাষা ও কমিউনিকেশন প্ল্যাটফর্ম',
      headlineLine1En: 'Stop Studying English.',
      headlineLine1Bn: 'ইংরেজি মুখস্থ করা থামান।',
      headlineLine2En: 'Start Speaking It.',
      headlineLine2Bn: 'আত্মবিশ্বাসের সাথে কথা বলুন।',
      subheadlineEn: "Don't Just Learn a Language. Master Real Communication.",
      subheadlineBn: 'শুধু নিয়ম শেখা নয়—বাস্তব জীবনের যোগাযোগ দক্ষতায় পারদর্শী হোন।',
      descriptionEn:
        'Learn smarter, practice real conversations, fix recurring mistakes, and see how your communication improves.',
      descriptionBn:
        'বাস্তব কথোপকথন অনুশীলন করুন, বারবার হওয়া ভুলগুলো চিহ্নিত করে ঠিক করুন এবং প্রমাণভিত্তিক অগ্রগতি দেখুন।',
      primaryCtaEn: 'Start Learning',
      primaryCtaBn: 'বিনামূল্যে শুরু করুন',
      secondaryCtaEn: 'Watch Demo',
      secondaryCtaBn: 'লাইভ ডেমো দেখুন',
      trustTextEn: 'Voice-first AI coaching · Built for Bangla & global English learners · Privacy-first',
      trustTextBn: 'ভয়েস-ফার্স্ট AI কোচিং · বাংলাভাষী ও গ্লোবাল শিক্ষার্থীদের জন্য · প্রাইভেসি-সুরক্ষিত',
      showInteractivePreviewLabel: true,
    },
    problemSolution: {
      problemEyebrowEn: 'The Problem',
      problemEyebrowBn: 'মূল সমস্যা',
      problemTitleEn: 'Traditional Learning Falls Short...',
      problemTitleBn: 'প্রচলিত শেখার পদ্ধতি যেখানে ব্যর্থ হয়...',
      problemItems: [
        {
          id: 'prob_1',
          textEn: "You know words, but can't speak.",
          textBn: 'শব্দ জানেন, কিন্তু কথা বলার সময় মুখ দিয়ে আসে না।',
        },
        {
          id: 'prob_2',
          textEn: 'You make the same mistakes again.',
          textBn: 'টেন্স ও প্রিপোজিশনের একই ভুল বারবার করেন।',
        },
        {
          id: 'prob_3',
          textEn: 'You lack real conversation practice.',
          textBn: 'বাস্তব পরিস্থিতিতে ইংরেজি বলার পরিবেশ পান না।',
        },
        {
          id: 'prob_4',
          textEn: 'You feel nervous speaking English.',
          textBn: 'ভুল করার ভয়ে কথা বলতে জড়তা ও নার্ভাসনেস কাজ করে।',
        },
      ],
      solutionEyebrowEn: 'The LINGUAVERSE Solution',
      solutionEyebrowBn: 'LINGUAVERSE-এর সমাধান',
      solutionTitleEn: 'A Complete Communication Improvement Loop',
      solutionTitleBn: 'একটি পূর্ণাঙ্গ কমিউনিকেশন উন্নয়ন চক্র',
      solutionPillarsEn: [
        'Learn · Practice · Get Feedback',
        'Improve · Transfer to Real Life',
      ],
      solutionPillarsBn: [
        'শেখা · অনুশীলন · তাৎক্ষণিক ফিডব্যাক',
        'ভুল সংশোধন · বাস্তব জীবনে প্রয়োগ',
      ],
      loopNodes: [
        {
          id: 'learn',
          labelEn: 'Learn',
          labelBn: 'শেখা',
          detailEn: 'Short Bangla-aware micro-lessons target the exact patterns behind hesitation.',
          detailBn: 'বাংলাভাষী শিক্ষার্থীদের সাধারণ ভুলগুলো লক্ষ্য করে সংক্ষিপ্ত লেসন।',
          color: 'cyan',
        },
        {
          id: 'speak',
          labelEn: 'Speak',
          labelBn: 'বলা',
          detailEn: 'Voice-first AI Speaking Studio simulates natural conversations with gentle prompts.',
          detailBn: 'ভয়েস-ফার্স্ট AI স্পিকিং স্টুডিওতে বাস্তব কথোপকথন অনুশীলন।',
          color: 'emerald',
        },
        {
          id: 'improve',
          labelEn: 'Improve',
          labelBn: 'উন্নতি',
          detailEn: 'Mistake Memory saves every recurring error and schedules targeted repair drills.',
          detailBn: 'মিস্টেক মেমোরি আপনার বারবার হওয়া ভুল মনে রেখে অনুশীলনের মাধ্যমে ঠিক করে।',
          color: 'amber',
        },
        {
          id: 'transfer',
          labelEn: 'Transfer',
          labelBn: 'প্রয়োগ',
          detailEn: 'Transfer Lab tests your spoken English in interviews, client calls, and daily life.',
          detailBn: 'ট্রান্সফার ল্যাবে ইন্টারভিউ, মিটিং ও দৈনন্দিন পরিস্থিতিতে দক্ষতা যাচাই।',
          color: 'violet',
        },
        {
          id: 'practice',
          labelEn: 'Practice',
          labelBn: 'অনুশীলন',
          detailEn: 'Adaptive spaced repetition keeps corrected habits active under real pressure.',
          detailBn: 'অ্যাডাপ্টিভ অনুশীলনের মাধ্যমে নতুন দক্ষতা স্থায়ী অভ্যাসে পরিণত হয়।',
          color: 'magenta',
        },
      ],
    },
    features: [
      {
        id: 'feat_dna',
        iconKey: 'dna',
        accent: 'violet',
        titleEn: 'Communication DNA',
        titleBn: 'কমিউনিকেশন DNA',
        summaryEn: 'Know your strengths and weaknesses',
        summaryBn: 'আপনার শক্তি ও দুর্বলতার স্পষ্ট মানচিত্র',
        targetRoute: '/app/progress',
        enabled: true,
        order: 1,
      },
      {
        id: 'feat_mistake',
        iconKey: 'mistake',
        accent: 'magenta',
        titleEn: 'Mistake Memory Engine',
        titleBn: 'মিস্টেক মেমোরি ইঞ্জিন',
        summaryEn: 'Never repeat the same mistakes',
        summaryBn: 'একই ভুল বারবার হওয়া চিরতরে বন্ধ করুন',
        targetRoute: '/app/improve',
        enabled: true,
        order: 2,
      },
      {
        id: 'feat_speaking',
        iconKey: 'mic',
        accent: 'cyan',
        titleEn: 'AI Speaking Studio',
        titleBn: 'AI স্পিকিং স্টুডিও',
        summaryEn: 'Real conversations with AI partner',
        summaryBn: 'AI পার্টনারের সাথে বাস্তব কথোপকথন',
        targetRoute: '/app/speak',
        enabled: true,
        order: 3,
      },
      {
        id: 'feat_transfer',
        iconKey: 'transfer',
        accent: 'violet',
        titleEn: 'Transfer Lab',
        titleBn: 'ট্রান্সফার ল্যাব',
        summaryEn: 'Apply learning in real-life scenarios',
        summaryBn: 'বাস্তব জীবনের পরিস্থিতিতে ইংরেজি প্রয়োগ',
        targetRoute: '/app/transfer-lab',
        enabled: true,
        order: 4,
      },
      {
        id: 'feat_progress',
        iconKey: 'progress',
        accent: 'cyan',
        titleEn: 'Evidence-Based Progress',
        titleBn: 'প্রমাণভিত্তিক অগ্রগতি',
        summaryEn: 'Track real improvement',
        summaryBn: 'কোনো ভুয়া স্কোর নয়—বাস্তব উন্নতির হিসাব',
        targetRoute: '/app/progress',
        enabled: true,
        order: 5,
      },
      {
        id: 'feat_adaptive',
        iconKey: 'adaptive',
        accent: 'amber',
        titleEn: 'Adaptive Learning',
        titleBn: 'অ্যাডাপ্টিভ লার্নিং',
        summaryEn: 'Personalized lessons just for you',
        summaryBn: 'আপনার স্তর ও লক্ষ্য অনুযায়ী ব্যক্তিগত পাঠ্যক্রম',
        targetRoute: '/app/learn',
        enabled: true,
        order: 6,
      },
    ],
    howItWorks: {
      titlePrefixEn: 'How It ',
      titleAccentEn: 'Works?',
      titleBn: 'কিভাবে কাজ করে?',
      subtitleEn: 'Just 3 Simple Steps to Speak Better',
      subtitleBn: 'মাত্র ৩টি সহজ ধাপে ইংরেজি বলায় আত্মবিশ্বাসী হয়ে উঠুন',
      steps: [
        {
          id: 'step_1',
          stepNumber: 1,
          accent: 'cyan',
          titleEn: 'Learn & Practice',
          titleBn: 'শেখা ও অনুশীলন',
          descriptionEn: 'Expert lessons and real conversations',
          descriptionBn: 'কাঠামোগত লেসন এবং বাস্তব কথোপকথন অনুশীলন',
        },
        {
          id: 'step_2',
          stepNumber: 2,
          accent: 'violet',
          titleEn: 'Get Instant Feedback',
          titleBn: 'তাৎক্ষণিক ফিডব্যাক',
          descriptionEn: 'Know your mistakes and fix them',
          descriptionBn: 'বাংলা ব্যাখ্যাসহ ভুল জানুন ও সাথে সাথে ঠিক করুন',
        },
        {
          id: 'step_3',
          stepNumber: 3,
          accent: 'emerald',
          titleEn: 'See Real Progress',
          titleBn: 'বাস্তব অগ্রগতি দেখুন',
          descriptionEn: 'Track improvement with clear insights',
          descriptionBn: 'স্পষ্ট বিশ্লেষণের মাধ্যমে নিজের উন্নতি দেখুন',
        },
      ],
      journeyTitleLine1En: 'Your Learning',
      journeyTitleLine2En: 'Journey',
      journeyTitleBn: 'আপনার শেখার যাত্রা',
      journeySubtitleEn: 'A smarter, personalized path to fluency',
      journeySubtitleBn: 'স্বাভাবিক ইংরেজি বলার একটি স্মার্ট ও ব্যক্তিগত পথ',
    },
    languages: [
      { id: 'lang_en', code: 'en', name: 'English', nativeLabel: 'English', flagKey: 'en', status: 'live', enabled: true, order: 1 },
      { id: 'lang_bn', code: 'bn', name: 'Bangla', nativeLabel: 'বাংলা', flagKey: 'bn', status: 'live', enabled: true, order: 2 },
      { id: 'lang_es', code: 'es', name: 'Spanish', nativeLabel: 'Spanish', flagKey: 'es', status: 'coming_soon', enabled: true, order: 3 },
      { id: 'lang_fr', code: 'fr', name: 'French', nativeLabel: 'French', flagKey: 'fr', status: 'coming_soon', enabled: true, order: 4 },
      { id: 'lang_de', code: 'de', name: 'German', nativeLabel: 'German', flagKey: 'de', status: 'coming_soon', enabled: true, order: 5 },
      { id: 'lang_ja', code: 'ja', name: 'Japanese', nativeLabel: 'Japanese', flagKey: 'ja', status: 'coming_soon', enabled: true, order: 6 },
      { id: 'lang_ko', code: 'ko', name: 'Korean', nativeLabel: 'Korean', flagKey: 'ko', status: 'coming_soon', enabled: true, order: 7 },
    ],
    pricingPlans: [
      {
        id: 'plan_free',
        slug: 'free',
        nameEn: 'Free Plan',
        nameBn: 'ফ্রি প্ল্যান',
        taglineEn: 'Perfect to get started.',
        taglineBn: 'শুরু করার জন্য একদম উপযুক্ত।',
        currency: '$',
        monthlyPrice: 0,
        yearlyMonthlyPrice: 0,
        billingLabelEn: '/month',
        billingLabelBn: '/মাস',
        isPopular: false,
        popularBadgeEn: '',
        popularBadgeBn: '',
        featuresEn: ['Basic Lessons', 'Limited AI Practice', 'Basic Progress'],
        featuresBn: ['মূল ফাউন্ডেশন লেসন', 'সীমিত AI অনুশীলন', 'মৌলিক অগ্রগতি ট্র্যাকিং'],
        ctaLabelEn: 'Get Started',
        ctaLabelBn: 'বিনামূল্যে শুরু করুন',
        enabled: true,
        order: 1,
      },
      {
        id: 'plan_premium',
        slug: 'premium',
        nameEn: 'Premium Plan',
        nameBn: 'প্রিমিয়াম প্ল্যান',
        taglineEn: 'Unlock your full potential!',
        taglineBn: 'সম্পূর্ণ কমিউনিকেশন দক্ষতা আনলক করুন!',
        currency: '$',
        monthlyPrice: 9.99,
        yearlyMonthlyPrice: 7.99,
        billingLabelEn: '/month',
        billingLabelBn: '/মাস',
        isPopular: true,
        popularBadgeEn: 'Most Popular',
        popularBadgeBn: 'সবচেয়ে জনপ্রিয়',
        featuresEn: [
          'Unlimited AI Speaking*',
          'Advanced Analytics',
          'Personalized Learning',
        ],
        featuresBn: [
          'আনলিমিটেড AI স্পিকিং*',
          'অ্যাডভান্সড অ্যানালিটিক্স',
          'পার্সোনালাইজড লার্নিং পাথ',
        ],
        fairUseNoteEn: '*Subject to responsible fair-use limits to keep voice latency fast for every learner.',
        fairUseNoteBn: '*সব শিক্ষার্থীর দ্রুত ভয়েস রেসপন্স নিশ্চিত করতে ফেয়ার-ইউজ নীতিমালা প্রযোজ্য।',
        ctaLabelEn: 'Upgrade Now',
        ctaLabelBn: 'আপগ্রেড করুন',
        enabled: true,
        order: 2,
      },
    ],
    community: {
      titleEn: 'Join a Global Community of Confident Speakers',
      titleBn: 'আত্মবিশ্বাসী বক্তাদের গ্লোবাল কমিউনিটিতে যোগ দিন',
      subtitleEn: 'Learn together. Grow together.',
      subtitleBn: 'একসাথে শিখুন। একসাথে এগিয়ে যান।',
      ctaLabelEn: 'Join Community',
      ctaLabelBn: 'কমিউনিটিতে যোগ দিন',
      links: [
        {
          id: 'comm_discord',
          label: 'Practice Community Hub',
          url: '#community',
          platform: 'discord',
          enabled: true,
        },
        {
          id: 'comm_youtube',
          label: 'Speaking Guides & Walkthroughs',
          url: '#how-it-works',
          platform: 'youtube',
          enabled: true,
        },
      ],
      announcements: [
        {
          id: 'ann_1',
          title: 'English & Bangla Bilingual Engine Live',
          body: 'Voice-first AI Speaking Studio, Mistake Memory, and Transfer Lab are live for English learners with Bangla explanations. Additional target languages are on our roadmap.',
          publishedAt: nowIso,
          enabled: true,
        },
      ],
    },
    // Strictly ZERO fabricated testimonials by default — Admin approves real learner testimonials in /admin.
    testimonials: [],
    faqs: [
      {
        id: 'faq_1',
        questionEn: 'How is LINGUAVERSE AI different from regular English courses?',
        questionBn: 'সাধারণ ইংরেজি কোর্সের চেয়ে LINGUAVERSE AI কিভাবে আলাদা?',
        answerEn:
          'Instead of passive videos or rote flashcards, LINGUAVERSE AI connects structured lessons, voice-first AI speaking practice, a Mistake Memory Engine that tracks your recurring patterns, and Transfer Lab real-life scenarios.',
        answerBn:
          'শুধু ভিডিও দেখা বা নিয়ম মুখস্থ করার বদলে LINGUAVERSE AI লেসন, ভয়েস-ফার্স্ট AI স্পিকিং অনুশীলন, মিস্টেক মেমোরি ইঞ্জিন এবং বাস্তব জীবনের ট্রান্সফার ল্যাবকে একত্রে যুক্ত করে।',
        category: 'Method',
        published: true,
        order: 1,
      },
      {
        id: 'faq_2',
        questionEn: 'Which languages are live right now?',
        questionBn: 'বর্তমানে কোন ভাষাগুলো সক্রিয় আছে?',
        answerEn:
          'English learning with full English and Bangla (বাংলা) bilingual UI and grammar explanations is live today. Spanish, French, German, Japanese, and Korean are planned roadmap languages managed through our platform.',
        answerBn:
          'বর্তমানে ইংরেজি এবং বাংলা (EN + বাংলা) বাইলিঙ্গুয়াল ইন্টারফেস ও ব্যাখ্যাসহ ইংরেজি শেখার পূর্ণাঙ্গ অভিজ্ঞতা চালু আছে। স্প্যানিশ, ফ্রেঞ্চ, জার্মান, জাপানিজ ও কোরিয়ান আমাদের রোডম্যাপে রয়েছে।',
        category: 'Languages',
        published: true,
        order: 2,
      },
      {
        id: 'faq_3',
        questionEn: 'Can I start for free without a credit card?',
        questionBn: 'ক্রেডিট কার্ড ছাড়াই কি বিনামূল্যে শুরু করা যাবে?',
        answerEn:
          'Yes. The Free Plan gives you access to foundational lessons, diagnostic onboarding, and starter AI practice with zero payment details required.',
        answerBn:
          'হ্যাঁ। ফ্রি প্ল্যানে কোনো পেমেন্ট তথ্য ছাড়াই মূল লেসন, ডায়াগনস্টিক ও প্রাথমিক AI অনুশীলন শুরু করতে পারবেন।',
        category: 'Pricing',
        published: true,
        order: 3,
      },
      {
        id: 'faq_4',
        questionEn: 'How are my voice recordings and privacy handled?',
        questionBn: 'আমার ভয়েস রেকর্ডিং এবং তথ্যের গোপনীয়তা কিভাবে রক্ষা করা হয়?',
        answerEn:
          'You stay in full control inside Account Settings. Voice recording storage is opt-in, and you can purge saved recordings or delete your entire account at any time.',
        answerBn:
          'সেটিংস থেকে আপনি সম্পূর্ণ নিয়ন্ত্রণ পাবেন। ভয়েস রেকর্ডিং সংরক্ষণ ঐচ্ছিক এবং আপনি যেকোনো সময় আপনার রেকর্ডিং বা অ্যাকাউন্ট মুছে ফেলতে পারবেন।',
        category: 'Privacy',
        published: true,
        order: 4,
      },
    ],
    finalCta: {
      titleEn: 'Ready to Speak English with Confidence?',
      titleBn: 'আত্মবিশ্বাসের সাথে ইংরেজি বলতে প্রস্তুত?',
      subtitleEn: 'Join LINGUAVERSE AI today and start your journey.',
      subtitleBn: 'আজই LINGUAVERSE AI-তে যোগ দিন এবং আপনার নতুন যাত্রা শুরু করুন।',
      ctaLabelEn: 'Start Learning Free',
      ctaLabelBn: 'বিনামূল্যে শেখা শুরু করুন',
    },
    media: [],
    seo: {
      metaTitle: 'LINGUAVERSE AI — Stop Studying English. Start Speaking It.',
      metaDescription:
        'Next-Gen AI Language Learning & Communication Intelligence Platform. Practice real conversations, fix recurring mistakes with Mistake Memory, and track evidence-based fluency.',
      ogTitle: 'LINGUAVERSE AI — Stop Studying English. Start Speaking It.',
      ogDescription:
        'Learn smarter, practice real conversations, fix recurring mistakes, and see how your communication improves.',
      ogImageUrl: '',
      canonicalUrl: 'https://linguaverse.ai/',
      twitterCard: 'summary_large_image',
    },
    settings: {
      brandName: 'LINGUAVERSE AI',
      taglineEn: 'Learn. Speak. Improve. Communicate.',
      taglineBn: 'শিখুন। বলুন। উন্নতি করুন। যোগাযোগ গড়ুন।',
      supportEmail: 'support@linguaverse.ai',
      socialLinks: {
        youtube: 'https://youtube.com',
        discord: 'https://discord.com',
        linkedin: 'https://linkedin.com',
        x: 'https://x.com',
      },
      footerLinks: [
        { id: 'fl_home', labelEn: 'Home', labelBn: 'হোম', href: '#home', enabled: true, order: 1 },
        { id: 'fl_features', labelEn: 'Features', labelBn: 'ফিচারসমূহ', href: '#features', enabled: true, order: 2 },
        { id: 'fl_how', labelEn: 'How It Works', labelBn: 'কিভাবে কাজ করে', href: '#how-it-works', enabled: true, order: 3 },
        { id: 'fl_pricing', labelEn: 'Pricing', labelBn: 'প্রাইসিং', href: '#pricing', enabled: true, order: 4 },
        { id: 'fl_about', labelEn: 'About', labelBn: 'আমাদের সম্পর্কে', href: '#problem-solution', enabled: true, order: 5 },
        { id: 'fl_faq', labelEn: 'FAQ', labelBn: 'জিজ্ঞাসা', href: '#faq', enabled: true, order: 6 },
        { id: 'fl_support', labelEn: 'Support', labelBn: 'সাপোর্ট', href: 'mailto:support@linguaverse.ai', enabled: true, order: 7 },
        { id: 'fl_privacy', labelEn: 'Privacy', labelBn: 'প্রাইভেসি', href: '#privacy-policy', enabled: true, order: 8 },
        { id: 'fl_terms', labelEn: 'Terms', labelBn: 'শর্তাবলী', href: '#terms-of-service', enabled: true, order: 9 },
      ],
      featureFlags: {
        showThreeGlobe: true,
        showLiveDemo: true,
        allowPublicRegistration: true,
        maintenanceNotice: '',
      },
      copyrightText: '© 2026 LINGUAVERSE AI. All rights reserved.',
    },
  };
}

export function sanitizeCmsConfigPatch(
  current: CmsConfig,
  patch: Partial<CmsConfig>,
  actorEmail: string
): CmsConfig {
  const nowIso = new Date().toISOString();
  const next: CmsConfig = {
    ...current,
    updatedAt: nowIso,
    updatedBy: sanitizeText(actorEmail, 120) || 'admin',
  };

  if (Array.isArray(patch.sections) && patch.sections.length > 0) {
    next.sections = patch.sections.map((s, idx) => ({
      id: s.id,
      label: sanitizeText(s.label, 80) || s.id,
      enabled: Boolean(s.enabled),
      order: Number.isFinite(s.order) ? s.order : idx + 1,
    }));
  }

  if (Array.isArray(patch.navigation)) {
    next.navigation = patch.navigation.map((n, idx) => ({
      id: sanitizeText(n.id, 60) || `nav_${idx + 1}`,
      labelEn: sanitizeText(n.labelEn, 50) || 'Link',
      labelBn: sanitizeText(n.labelBn, 60) || sanitizeText(n.labelEn, 50) || 'লিংক',
      href: sanitizeUrl(n.href) || '#home',
      type: n.type === 'dropdown' || n.type === 'route' ? n.type : 'anchor',
      enabled: Boolean(n.enabled),
      order: Number.isFinite(n.order) ? n.order : idx + 1,
      dropdownItems: Array.isArray(n.dropdownItems)
        ? n.dropdownItems.map((d, dIdx) => ({
            id: sanitizeText(d.id, 60) || `dd_${dIdx + 1}`,
            labelEn: sanitizeText(d.labelEn, 60),
            labelBn: sanitizeText(d.labelBn, 70),
            href: sanitizeUrl(d.href) || '#home',
            descriptionEn: d.descriptionEn ? sanitizeText(d.descriptionEn, 120) : undefined,
            descriptionBn: d.descriptionBn ? sanitizeText(d.descriptionBn, 140) : undefined,
          }))
        : undefined,
    }));
  }

  if (patch.hero) {
    next.hero = {
      badgeEn: sanitizeText(patch.hero.badgeEn, 100) || current.hero.badgeEn,
      badgeBn: sanitizeText(patch.hero.badgeBn, 120) || current.hero.badgeBn,
      headlineLine1En: sanitizeText(patch.hero.headlineLine1En, 100) || current.hero.headlineLine1En,
      headlineLine1Bn: sanitizeText(patch.hero.headlineLine1Bn, 120) || current.hero.headlineLine1Bn,
      headlineLine2En: sanitizeText(patch.hero.headlineLine2En, 100) || current.hero.headlineLine2En,
      headlineLine2Bn: sanitizeText(patch.hero.headlineLine2Bn, 120) || current.hero.headlineLine2Bn,
      subheadlineEn: sanitizeText(patch.hero.subheadlineEn, 160) || current.hero.subheadlineEn,
      subheadlineBn: sanitizeText(patch.hero.subheadlineBn, 180) || current.hero.subheadlineBn,
      descriptionEn: sanitizeText(patch.hero.descriptionEn, 320) || current.hero.descriptionEn,
      descriptionBn: sanitizeText(patch.hero.descriptionBn, 360) || current.hero.descriptionBn,
      primaryCtaEn: sanitizeText(patch.hero.primaryCtaEn, 40) || current.hero.primaryCtaEn,
      primaryCtaBn: sanitizeText(patch.hero.primaryCtaBn, 50) || current.hero.primaryCtaBn,
      secondaryCtaEn: sanitizeText(patch.hero.secondaryCtaEn, 40) || current.hero.secondaryCtaEn,
      secondaryCtaBn: sanitizeText(patch.hero.secondaryCtaBn, 50) || current.hero.secondaryCtaBn,
      trustTextEn: sanitizeText(patch.hero.trustTextEn, 180) || current.hero.trustTextEn,
      trustTextBn: sanitizeText(patch.hero.trustTextBn, 200) || current.hero.trustTextBn,
      showInteractivePreviewLabel: patch.hero.showInteractivePreviewLabel !== false,
    };
  }

  if (patch.problemSolution) {
    next.problemSolution = {
      ...current.problemSolution,
      ...patch.problemSolution,
      problemTitleEn:
        sanitizeText(patch.problemSolution.problemTitleEn, 120) ||
        current.problemSolution.problemTitleEn,
      problemTitleBn:
        sanitizeText(patch.problemSolution.problemTitleBn, 140) ||
        current.problemSolution.problemTitleBn,
      solutionTitleEn:
        sanitizeText(patch.problemSolution.solutionTitleEn, 140) ||
        current.problemSolution.solutionTitleEn,
      solutionTitleBn:
        sanitizeText(patch.problemSolution.solutionTitleBn, 160) ||
        current.problemSolution.solutionTitleBn,
    };
  }

  if (Array.isArray(patch.features)) {
    next.features = patch.features.map((f, idx) => ({
      id: sanitizeText(f.id, 60) || `feat_${idx + 1}`,
      iconKey: f.iconKey || 'sparkles',
      accent: f.accent || 'cyan',
      titleEn: sanitizeText(f.titleEn, 80) || 'Feature',
      titleBn: sanitizeText(f.titleBn, 90) || sanitizeText(f.titleEn, 80) || 'ফিচার',
      summaryEn: sanitizeText(f.summaryEn, 160),
      summaryBn: sanitizeText(f.summaryBn, 180),
      targetRoute: sanitizeUrl(f.targetRoute) || '/app',
      enabled: Boolean(f.enabled),
      order: Number.isFinite(f.order) ? f.order : idx + 1,
    }));
  }

  if (patch.howItWorks) {
    next.howItWorks = {
      ...current.howItWorks,
      ...patch.howItWorks,
      subtitleEn: sanitizeText(patch.howItWorks.subtitleEn, 140) || current.howItWorks.subtitleEn,
      subtitleBn: sanitizeText(patch.howItWorks.subtitleBn, 160) || current.howItWorks.subtitleBn,
    };
  }

  if (Array.isArray(patch.languages)) {
    next.languages = patch.languages.map((l, idx) => ({
      id: sanitizeText(l.id, 60) || `lang_${idx + 1}`,
      code: sanitizeText(l.code, 12).toLowerCase() || 'en',
      name: sanitizeText(l.name, 50) || 'Language',
      nativeLabel: sanitizeText(l.nativeLabel, 50) || sanitizeText(l.name, 50) || 'Language',
      flagKey: l.flagKey || 'global',
      status: l.status === 'live' ? 'live' : 'coming_soon',
      enabled: Boolean(l.enabled),
      order: Number.isFinite(l.order) ? l.order : idx + 1,
    }));
  }

  if (Array.isArray(patch.pricingPlans)) {
    next.pricingPlans = patch.pricingPlans.map((p, idx) => ({
      id: sanitizeText(p.id, 60) || `plan_${idx + 1}`,
      slug: sanitizeText(p.slug, 40) || `plan_${idx + 1}`,
      nameEn: sanitizeText(p.nameEn, 60) || 'Plan',
      nameBn: sanitizeText(p.nameBn, 70) || sanitizeText(p.nameEn, 60) || 'প্ল্যান',
      taglineEn: sanitizeText(p.taglineEn, 120),
      taglineBn: sanitizeText(p.taglineBn, 140),
      currency: sanitizeText(p.currency, 8) || '$',
      monthlyPrice: Math.max(0, Number(p.monthlyPrice) || 0),
      yearlyMonthlyPrice: Math.max(0, Number(p.yearlyMonthlyPrice) || 0),
      billingLabelEn: sanitizeText(p.billingLabelEn, 30) || '/month',
      billingLabelBn: sanitizeText(p.billingLabelBn, 30) || '/মাস',
      isPopular: Boolean(p.isPopular),
      popularBadgeEn: sanitizeText(p.popularBadgeEn, 40),
      popularBadgeBn: sanitizeText(p.popularBadgeBn, 50),
      featuresEn: Array.isArray(p.featuresEn)
        ? p.featuresEn.map((item) => sanitizeText(item, 100)).filter(Boolean)
        : [],
      featuresBn: Array.isArray(p.featuresBn)
        ? p.featuresBn.map((item) => sanitizeText(item, 120)).filter(Boolean)
        : [],
      fairUseNoteEn: p.fairUseNoteEn ? sanitizeText(p.fairUseNoteEn, 240) : undefined,
      fairUseNoteBn: p.fairUseNoteBn ? sanitizeText(p.fairUseNoteBn, 260) : undefined,
      ctaLabelEn: sanitizeText(p.ctaLabelEn, 40) || 'Get Started',
      ctaLabelBn: sanitizeText(p.ctaLabelBn, 50) || 'শুরু করুন',
      enabled: Boolean(p.enabled),
      order: Number.isFinite(p.order) ? p.order : idx + 1,
    }));
  }

  if (patch.community) {
    next.community = {
      titleEn: sanitizeText(patch.community.titleEn, 140) || current.community.titleEn,
      titleBn: sanitizeText(patch.community.titleBn, 160) || current.community.titleBn,
      subtitleEn: sanitizeText(patch.community.subtitleEn, 180) || current.community.subtitleEn,
      subtitleBn: sanitizeText(patch.community.subtitleBn, 200) || current.community.subtitleBn,
      ctaLabelEn: sanitizeText(patch.community.ctaLabelEn, 40) || current.community.ctaLabelEn,
      ctaLabelBn: sanitizeText(patch.community.ctaLabelBn, 50) || current.community.ctaLabelBn,
      links: Array.isArray(patch.community.links)
        ? patch.community.links.map((lk, idx) => ({
            id: sanitizeText(lk.id, 60) || `cl_${idx + 1}`,
            label: sanitizeText(lk.label, 80) || 'Community Link',
            url: sanitizeUrl(lk.url) || '#community',
            platform: lk.platform || 'other',
            enabled: Boolean(lk.enabled),
          }))
        : current.community.links,
      announcements: Array.isArray(patch.community.announcements)
        ? patch.community.announcements.map((a, idx) => ({
            id: sanitizeText(a.id, 60) || `ann_${idx + 1}`,
            title: sanitizeText(a.title, 120) || 'Announcement',
            body: sanitizeText(a.body, 500),
            publishedAt: a.publishedAt || nowIso,
            enabled: Boolean(a.enabled),
          }))
        : current.community.announcements,
    };
  }

  if (Array.isArray(patch.testimonials)) {
    next.testimonials = patch.testimonials.map((t, idx) => ({
      id: sanitizeText(t.id, 60) || `test_${idx + 1}`,
      authorName: sanitizeText(t.authorName, 80) || 'Verified Learner',
      authorRole: sanitizeText(t.authorRole, 80) || 'Learner',
      quoteEn: sanitizeText(t.quoteEn, 400),
      quoteBn: t.quoteBn ? sanitizeText(t.quoteBn, 450) : undefined,
      rating: Math.min(5, Math.max(1, Math.round(Number(t.rating) || 5))),
      avatarUrl: t.avatarUrl ? sanitizeUrl(t.avatarUrl) : undefined,
      status:
        t.status === 'approved' || t.status === 'rejected' ? t.status : 'pending',
      order: Number.isFinite(t.order) ? t.order : idx + 1,
      createdAt: t.createdAt || nowIso,
    }));
  }

  if (Array.isArray(patch.faqs)) {
    next.faqs = patch.faqs.map((f, idx) => ({
      id: sanitizeText(f.id, 60) || `faq_${idx + 1}`,
      questionEn: sanitizeText(f.questionEn, 200) || 'Question',
      questionBn: sanitizeText(f.questionBn, 220) || sanitizeText(f.questionEn, 200) || 'প্রশ্ন',
      answerEn: sanitizeText(f.answerEn, 800),
      answerBn: sanitizeText(f.answerBn, 900),
      category: sanitizeText(f.category, 40) || 'General',
      published: Boolean(f.published),
      order: Number.isFinite(f.order) ? f.order : idx + 1,
    }));
  }

  if (patch.finalCta) {
    next.finalCta = {
      titleEn: sanitizeText(patch.finalCta.titleEn, 140) || current.finalCta.titleEn,
      titleBn: sanitizeText(patch.finalCta.titleBn, 160) || current.finalCta.titleBn,
      subtitleEn: sanitizeText(patch.finalCta.subtitleEn, 200) || current.finalCta.subtitleEn,
      subtitleBn: sanitizeText(patch.finalCta.subtitleBn, 220) || current.finalCta.subtitleBn,
      ctaLabelEn: sanitizeText(patch.finalCta.ctaLabelEn, 50) || current.finalCta.ctaLabelEn,
      ctaLabelBn: sanitizeText(patch.finalCta.ctaLabelBn, 60) || current.finalCta.ctaLabelBn,
    };
  }

  if (Array.isArray(patch.media)) {
    next.media = patch.media;
  }

  if (patch.seo) {
    next.seo = {
      metaTitle: sanitizeText(patch.seo.metaTitle, 120) || current.seo.metaTitle,
      metaDescription: sanitizeText(patch.seo.metaDescription, 320) || current.seo.metaDescription,
      ogTitle: sanitizeText(patch.seo.ogTitle, 120) || current.seo.ogTitle,
      ogDescription: sanitizeText(patch.seo.ogDescription, 320) || current.seo.ogDescription,
      ogImageUrl: sanitizeUrl(patch.seo.ogImageUrl),
      canonicalUrl: sanitizeUrl(patch.seo.canonicalUrl) || current.seo.canonicalUrl,
      twitterCard: patch.seo.twitterCard === 'summary' ? 'summary' : 'summary_large_image',
    };
  }

  if (patch.settings) {
    next.settings = {
      brandName: sanitizeText(patch.settings.brandName, 60) || current.settings.brandName,
      taglineEn: sanitizeText(patch.settings.taglineEn, 120) || current.settings.taglineEn,
      taglineBn: sanitizeText(patch.settings.taglineBn, 140) || current.settings.taglineBn,
      supportEmail: sanitizeText(patch.settings.supportEmail, 120) || current.settings.supportEmail,
      socialLinks: {
        youtube: sanitizeUrl(patch.settings.socialLinks?.youtube ?? current.settings.socialLinks.youtube),
        discord: sanitizeUrl(patch.settings.socialLinks?.discord ?? current.settings.socialLinks.discord),
        linkedin: sanitizeUrl(patch.settings.socialLinks?.linkedin ?? current.settings.socialLinks.linkedin),
        x: sanitizeUrl(patch.settings.socialLinks?.x ?? current.settings.socialLinks.x),
      },
      footerLinks: Array.isArray(patch.settings.footerLinks)
        ? patch.settings.footerLinks.map((fl, idx) => ({
            id: sanitizeText(fl.id, 60) || `fl_${idx + 1}`,
            labelEn: sanitizeText(fl.labelEn, 50) || 'Link',
            labelBn: sanitizeText(fl.labelBn, 60) || sanitizeText(fl.labelEn, 50) || 'লিংক',
            href: sanitizeUrl(fl.href) || '#home',
            enabled: Boolean(fl.enabled),
            order: Number.isFinite(fl.order) ? fl.order : idx + 1,
          }))
        : current.settings.footerLinks,
      featureFlags: {
        showThreeGlobe:
          patch.settings.featureFlags?.showThreeGlobe ?? current.settings.featureFlags.showThreeGlobe,
        showLiveDemo:
          patch.settings.featureFlags?.showLiveDemo ?? current.settings.featureFlags.showLiveDemo,
        allowPublicRegistration:
          patch.settings.featureFlags?.allowPublicRegistration ??
          current.settings.featureFlags.allowPublicRegistration,
        maintenanceNotice: sanitizeText(
          patch.settings.featureFlags?.maintenanceNotice ??
            current.settings.featureFlags.maintenanceNotice,
          220
        ),
      },
      copyrightText:
        sanitizeText(patch.settings.copyrightText, 120) || current.settings.copyrightText,
    };
  }

  return next;
}

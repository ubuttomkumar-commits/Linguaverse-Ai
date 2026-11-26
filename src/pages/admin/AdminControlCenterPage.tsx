import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BookPlus,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Flag,
  Layers,
  LayoutDashboard,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { CreditCard, Cpu, Server, ShieldAlert, Sliders } from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { AdminOverviewTab } from '../../components/admin/AdminOverviewTab';
import { AdminUserManagementTab } from '../../components/admin/AdminUserManagementTab';
import { AdminCmsWorkspace, type CmsSubModule } from '../../components/admin/AdminCmsWorkspace';
import { AdminModerationTab } from '../../components/admin/AdminModerationTab';
import { AdminSubscriptionsTab } from '../../components/admin/AdminSubscriptionsTab';
import { AdminSystemConfigTab } from '../../components/admin/AdminSystemConfigTab';
import { AdminAiProvidersTab } from '../../components/admin/AdminAiProvidersTab';
import { AdminSystemHealthTab } from '../../components/admin/AdminSystemHealthTab';
import { deleteAdminUserAccount } from '../../services/prd61Api';
import type { ServerAuditEntry } from '../../services/cmsApi';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  ADMIN_ROLE_LABELS,
  aggregateAiOpsMetrics,
  buildPublishedCourse,
  buildPublishedLesson,
  buildPublishedModule,
  hasAdminPermission,
  ROLE_PERMISSION_MATRIX,
} from '../../domain/adminGovernanceEngine';
import { getAllCourses } from '../../domain/curriculumData';
import {
  readCustomCurriculumOverlay,
  upsertPublishedCourse,
  upsertPublishedLesson,
  upsertPublishedModule,
} from '../../services/curriculumStore';
import {
  appendAuditLog,
  listAiTelemetryEvents,
  listAuditLogs,
} from '../../services/governanceStore';
import type {
  AccountStatus,
  AdminOverviewStats,
  AdminRole,
  AdminUserSummary,
  AiTelemetryEvent,
  AuditLogEntry,
  AuditResourceType,
  CurriculumCourse,
  CurriculumLesson,
  MistakeCategory,
  MistakeMemoryItem,
} from '../../types/domain';

type AdminTab =
  | 'overview'
  | 'cms'
  | 'users'
  | 'curriculum'
  | 'ai_ops'
  | 'ai_providers'
  | 'mistakes'
  | 'moderation'
  | 'subscriptions'
  | 'system_config'
  | 'system_health'
  | 'audit';
type BuilderMode = 'lesson' | 'course' | 'module';

const ADMIN_ROLES: AdminRole[] = [
  'learner',
  'moderator',
  'content_manager',
  'ai_ops',
  'admin',
  'super_admin',
];
const MISTAKE_CATEGORIES: MistakeCategory[] = [
  'Tense',
  'Preposition',
  'Article',
  'Word Order',
  'Auxiliary Verb',
  'Collocation',
  'Vocabulary',
  'Grammar',
];

export function AdminControlCenterPage() {
  const { lang } = useLanguage();
  const {
    user,
    storageMode,
    updateProfile,
    getFlaggedMistakes,
    reviewFlaggedMistake,
    getAdminOverviewStats,
    listAdminUsers,
    updateAdminUserAccount,
  } = useAuth();

  const activeRole: AdminRole = user?.role ?? 'learner';
  const canAccessAdmin = hasAdminPermission(activeRole, 'admin:access');
  const canReadOverview = hasAdminPermission(activeRole, 'overview:read');
  const canManageUsers = hasAdminPermission(activeRole, 'users:manage');
  const canWriteCurriculum = hasAdminPermission(activeRole, 'curriculum:write');
  const canReadAiOps = hasAdminPermission(activeRole, 'ai_ops:read');
  const canReviewMistakes = hasAdminPermission(activeRole, 'mistakes:review');
  const canReadAudit = hasAdminPermission(activeRole, 'audit:read');

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [cmsSubModule, setCmsSubModule] = useState<CmsSubModule>('landing');
  const [serverAuditLogs, setServerAuditLogs] = useState<ServerAuditEntry[]>([]);
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Live Curriculum State
  const [catalogTick, setCatalogTick] = useState(0);
  const [builderMode, setBuilderMode] = useState<BuilderMode>('lesson');
  const [publishNotice, setPublishNotice] = useState<{
    messageEn: string;
    messageBn: string;
    correlationId: string;
    lessonId?: string;
  } | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);

  // Course Builder Form State
  const [editingCourseId, setEditingCourseId] = useState<string>('');
  const [courseTitleEn, setCourseTitleEn] = useState('');
  const [courseTitleBn, setCourseTitleBn] = useState('');
  const [courseCefr, setCourseCefr] = useState('A2 – B1');
  const [courseSubtitleEn, setCourseSubtitleEn] = useState('');
  const [courseSubtitleBn, setCourseSubtitleBn] = useState('');

  // Module Builder Form State
  const [moduleCourseId, setModuleCourseId] = useState('course_foundations');
  const [moduleTitleEn, setModuleTitleEn] = useState('');
  const [moduleTitleBn, setModuleTitleBn] = useState('');
  const [moduleDescEn, setModuleDescEn] = useState('');
  const [moduleDescBn, setModuleDescBn] = useState('');

  // Lesson Builder Form State
  const [editingLessonId, setEditingLessonId] = useState<string>('');
  const [lessonCourseId, setLessonCourseId] = useState('course_foundations');
  const [lessonModuleId, setLessonModuleId] = useState('mod_svo_aux');
  const [lessonCefr, setLessonCefr] = useState('A2 – B1');
  const [lessonMinutes, setLessonMinutes] = useState(7);
  const [lessonTitleEn, setLessonTitleEn] = useState('');
  const [lessonTitleBn, setLessonTitleBn] = useState('');
  const [lessonSummaryEn, setLessonSummaryEn] = useState('');
  const [lessonSummaryBn, setLessonSummaryBn] = useState('');
  const [lessonRuleEn, setLessonRuleEn] = useState('');
  const [lessonRuleBn, setLessonRuleBn] = useState('');
  const [lessonTrapEn, setLessonTrapEn] = useState('');
  const [lessonTrapBn, setLessonTrapBn] = useState('');
  const [lessonCommonTrap, setLessonCommonTrap] = useState('');
  const [lessonNaturalEnglish, setLessonNaturalEnglish] = useState('');
  const [lessonBanglaMeaning, setLessonBanglaMeaning] = useState('');
  const [lessonCategory, setLessonCategory] = useState<MistakeCategory>('Preposition');

  // Overview, User Management, AI Ops, Mistakes Queue, and Audit Logs
  const [overviewStats, setOverviewStats] = useState<AdminOverviewStats | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserSummary[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [telemetryEvents, setTelemetryEvents] = useState<AiTelemetryEvent[]>(() =>
    listAiTelemetryEvents()
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => listAuditLogs());
  const [auditFilter, setAuditFilter] = useState<'all' | AuditResourceType>('all');
  const [flaggedMistakes, setFlaggedMistakes] = useState<MistakeMemoryItem[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);

  const courses = useMemo(() => {
    void catalogTick;
    return getAllCourses();
  }, [catalogTick]);

  const overlay = useMemo(() => {
    void catalogTick;
    return readCustomCurriculumOverlay();
  }, [catalogTick]);

  const totalModulesCount = useMemo(
    () => courses.reduce((sum, c) => sum + c.modules.length, 0),
    [courses]
  );
  const totalLessonsCount = useMemo(
    () =>
      courses.reduce(
        (sum, c) => sum + c.modules.reduce((ms, m) => ms + m.lessons.length, 0),
        0
      ),
    [courses]
  );

  const selectedCourseForLesson = useMemo(
    () => courses.find((c) => c.id === lessonCourseId) ?? courses[0],
    [courses, lessonCourseId]
  );

  useEffect(() => {
    if (
      selectedCourseForLesson &&
      selectedCourseForLesson.modules.length > 0 &&
      !selectedCourseForLesson.modules.some((m) => m.id === lessonModuleId)
    ) {
      setLessonModuleId(selectedCourseForLesson.modules[0].id);
    }
  }, [selectedCourseForLesson, lessonModuleId]);

  const refreshGovernanceData = useCallback(async () => {
    const events = listAiTelemetryEvents();
    setTelemetryEvents(events);
    setAuditLogs(listAuditLogs());
    setCatalogTick((t) => t + 1);
    const [flagged, stats, usersList] = await Promise.all([
      getFlaggedMistakes(),
      getAdminOverviewStats(events.length),
      listAdminUsers(userSearchQuery),
    ]);
    setFlaggedMistakes(flagged);
    setOverviewStats(stats);
    setAdminUsers(usersList);
  }, [getFlaggedMistakes, getAdminOverviewStats, listAdminUsers, userSearchQuery]);

  useEffect(() => {
    void refreshGovernanceData();
  }, [refreshGovernanceData]);

  // Keep active tab valid when switching between restricted admin roles
  useEffect(() => {
    if (!canAccessAdmin) return;
    if (activeTab === 'users' && !canManageUsers) {
      setActiveTab('overview');
    } else if (activeTab === 'curriculum' && !canWriteCurriculum && canReadAiOps) {
      setActiveTab('ai_ops');
    } else if (activeTab === 'ai_ops' && !canReadAiOps && canWriteCurriculum) {
      setActiveTab('curriculum');
    }
  }, [activeRole, activeTab, canAccessAdmin, canManageUsers, canWriteCurriculum, canReadAiOps]);

  const aiMetrics = useMemo(
    () => aggregateAiOpsMetrics(telemetryEvents),
    [telemetryEvents]
  );

  const filteredAuditLogs = useMemo(
    () =>
      auditFilter === 'all'
        ? auditLogs
        : auditLogs.filter((entry) => entry.resourceType === auditFilter),
    [auditLogs, auditFilter]
  );

  const handleRoleSwitch = async (nextRole: AdminRole) => {
    if (!user || nextRole === activeRole) return;
    setRoleUpdating(true);
    try {
      await updateProfile({ role: nextRole });
      appendAuditLog({
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: nextRole,
        action: 'rbac.role_switched',
        resourceType: 'rbac_role',
        resourceId: user.id,
        summaryEn: `Switched active governance role from ${activeRole} to ${nextRole}.`,
        summaryBn: `সক্রিয় গভর্ন্যান্স ভূমিকা ${activeRole} থেকে ${nextRole}-এ পরিবর্তন করা হয়েছে।`,
        metadata: { previousRole: activeRole, newRole: nextRole },
      });
      await refreshGovernanceData();
    } finally {
      setRoleUpdating(false);
    }
  };

  const handleAdminUserUpdate = async (
    target: AdminUserSummary,
    patch: { role?: AdminRole; accountStatus?: AccountStatus }
  ) => {
    if (!user || !canManageUsers) return;
    await updateAdminUserAccount(target.id, patch);
    const summaryParts: string[] = [];
    if (patch.role) summaryParts.push(`role -> ${patch.role}`);
    if (patch.accountStatus) summaryParts.push(`status -> ${patch.accountStatus}`);
    appendAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: activeRole,
      action: patch.accountStatus
        ? `user.status_${patch.accountStatus}`
        : 'user.role_updated',
      resourceType: 'user_account',
      resourceId: target.id,
      summaryEn: `Updated ${target.email}: ${summaryParts.join(', ')}.`,
      summaryBn: `${target.email} অ্যাকাউন্ট আপডেট করা হয়েছে: ${summaryParts.join(', ')}।`,
      metadata: {
        targetEmail: target.email,
        ...(patch.role ? { newRole: patch.role } : {}),
        ...(patch.accountStatus ? { accountStatus: patch.accountStatus } : {}),
      },
    });
    await refreshGovernanceData();
  };

  const handleAdminUserDelete = async (target: AdminUserSummary) => {
    if (!user || !canManageUsers) return;
    await deleteAdminUserAccount(target.id);
    appendAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: activeRole,
      action: 'user.deleted',
      resourceType: 'user_account',
      resourceId: target.id,
      summaryEn: `Deleted user account ${target.email}.`,
      summaryBn: `${target.email} অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলা হয়েছে।`,
    });
    await refreshGovernanceData();
  };

  const handleStartEditCourse = (course: CurriculumCourse) => {
    setBuilderMode('course');
    setEditingCourseId(course.id);
    setCourseTitleEn(course.titleEn);
    setCourseTitleBn(course.titleBn);
    setCourseCefr(course.cefrRange);
    setCourseSubtitleEn(course.subtitleEn);
    setCourseSubtitleBn(course.subtitleBn);
    setBuilderError(null);
  };

  const handleStartEditLesson = (lesson: CurriculumLesson) => {
    setBuilderMode('lesson');
    setEditingLessonId(lesson.id);
    setLessonCourseId(lesson.courseId);
    setLessonModuleId(lesson.moduleId);
    setLessonCefr(lesson.cefrBand);
    setLessonMinutes(lesson.estimatedMinutes);
    setLessonTitleEn(lesson.titleEn);
    setLessonTitleBn(lesson.titleBn);
    setLessonSummaryEn(lesson.summaryEn);
    setLessonSummaryBn(lesson.summaryBn);
    setLessonRuleEn(lesson.conceptRuleEn);
    setLessonRuleBn(lesson.conceptRuleBn);
    setLessonTrapEn(lesson.banglaInterferenceEn);
    setLessonTrapBn(lesson.banglaInterferenceBn);
    setLessonCommonTrap(lesson.contrastRows[0]?.commonTrap ?? '');
    setLessonNaturalEnglish(lesson.contrastRows[0]?.naturalEnglish ?? '');
    setLessonBanglaMeaning(lesson.contrastRows[0]?.banglaThought ?? '');
    setLessonCategory(lesson.targetCategories[0] ?? 'Grammar');
    setBuilderError(null);
  };

  const handlePublishCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canWriteCurriculum) return;
    if (!courseTitleEn.trim() || !courseSubtitleEn.trim()) {
      setBuilderError(
        lang === 'bn'
          ? 'ইংরেজি শিরোনাম এবং সংক্ষিপ্ত বিবরণ পূরণ করুন।'
          : 'Please provide both the English course title and subtitle.'
      );
      return;
    }

    const existing = editingCourseId
      ? courses.find((c) => c.id === editingCourseId)
      : undefined;

    const built = buildPublishedCourse({
      id: existing?.id,
      order: existing?.order ?? courses.length + 1,
      cefrRange: courseCefr,
      titleEn: courseTitleEn,
      titleBn: courseTitleBn,
      subtitleEn: courseSubtitleEn,
      subtitleBn: courseSubtitleBn,
      targetAudienceEn: existing?.targetAudienceEn ?? 'Bangla-speaking English learners.',
      targetAudienceBn:
        existing?.targetAudienceBn ?? 'ইংরেজি শেখায় আগ্রহী বাংলাভাষী শিক্ষার্থী।',
      version: existing ? (existing.version ?? 1) + 1 : 1,
    });

    upsertPublishedCourse(built);

    // Ensure brand-new custom courses start with a ready module so lessons can be added immediately
    if (!existing) {
      const starterModule = buildPublishedModule({
        courseId: built.id,
        order: 1,
        titleEn: 'Module 1: Core Practice',
        titleBn: 'মডিউল ১: মূল অনুশীলন',
        descriptionEn: 'Primary lessons published in this course.',
        descriptionBn: 'এই কোর্সে প্রকাশিত মূল লেসনসমূহ।',
      });
      upsertPublishedModule(starterModule);
      setLessonCourseId(built.id);
      setLessonModuleId(starterModule.id);
    }

    const logEntry = appendAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: activeRole,
      action: existing ? 'curriculum.course_versioned' : 'curriculum.course_published',
      resourceType: 'curriculum',
      resourceId: built.id,
      summaryEn: `${existing ? 'Updated & published' : 'Published'} course "${built.titleEn}" (v${built.version ?? 1}).`,
      summaryBn: `"${built.titleBn}" কোর্সটি (v${built.version ?? 1}) প্রকাশ করা হয়েছে।`,
      metadata: { version: built.version ?? 1, cefrRange: built.cefrRange },
    });

    setPublishNotice({
      messageEn: `Course "${built.titleEn}" published (v${built.version ?? 1}) and synced live to Academy.`,
      messageBn: `"${built.titleBn}" কোর্সটি (v${built.version ?? 1}) একাডেমিতে লাইভ প্রকাশিত হয়েছে।`,
      correlationId: logEntry.correlationId,
    });
    setEditingCourseId('');
    setCourseTitleEn('');
    setCourseTitleBn('');
    setCourseSubtitleEn('');
    setCourseSubtitleBn('');
    setBuilderError(null);
    setCatalogTick((t) => t + 1);
    setAuditLogs(listAuditLogs());
  };

  const handlePublishModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canWriteCurriculum) return;
    const parent = courses.find((c) => c.id === moduleCourseId);
    if (!parent || !moduleTitleEn.trim()) {
      setBuilderError(
        lang === 'bn'
          ? 'কোর্স নির্বাচন করুন এবং মডিউলের ইংরেজি শিরোনাম দিন।'
          : 'Select a parent course and enter the module title.'
      );
      return;
    }

    const built = buildPublishedModule({
      courseId: parent.id,
      order: parent.modules.length + 1,
      titleEn: moduleTitleEn,
      titleBn: moduleTitleBn,
      descriptionEn: moduleDescEn || 'Structured Bangla-aware English practice module.',
      descriptionBn: moduleDescBn || 'বাংলাভাষীদের জন্য কাঠামোগত ইংরেজি অনুশীলন মডিউল।',
    });

    upsertPublishedModule(built);
    const logEntry = appendAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: activeRole,
      action: 'curriculum.module_published',
      resourceType: 'curriculum',
      resourceId: built.id,
      summaryEn: `Published module "${built.titleEn}" under course "${parent.titleEn}".`,
      summaryBn: `"${parent.titleBn}" কোর্সে "${built.titleBn}" মডিউল প্রকাশ করা হয়েছে।`,
      metadata: { courseId: parent.id },
    });

    setPublishNotice({
      messageEn: `Module "${built.titleEn}" published under "${parent.titleEn}".`,
      messageBn: `"${built.titleBn}" মডিউলটি "${parent.titleBn}" কোর্সে যুক্ত হয়েছে।`,
      correlationId: logEntry.correlationId,
    });
    setModuleTitleEn('');
    setModuleTitleBn('');
    setModuleDescEn('');
    setModuleDescBn('');
    setLessonCourseId(parent.id);
    setLessonModuleId(built.id);
    setBuilderError(null);
    setCatalogTick((t) => t + 1);
    setAuditLogs(listAuditLogs());
  };

  const handlePublishLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canWriteCurriculum) return;
    const parentCourse = courses.find((c) => c.id === lessonCourseId);
    const parentModule = parentCourse?.modules.find((m) => m.id === lessonModuleId);

    if (
      !parentCourse ||
      !parentModule ||
      !lessonTitleEn.trim() ||
      !lessonRuleEn.trim() ||
      !lessonCommonTrap.trim() ||
      !lessonNaturalEnglish.trim()
    ) {
      setBuilderError(
        lang === 'bn'
          ? 'লেসনের শিরোনাম, মূল নিয়ম, সাধারণ ভুল বাক্য এবং স্বাভাবিক ইংরেজি বাক্য অবশ্যই পূরণ করুন।'
          : 'Please complete Lesson Title, Core Rule, Common Trap Sentence, and Natural English Model.'
      );
      return;
    }

    const existing = editingLessonId
      ? parentModule.lessons.find((l) => l.id === editingLessonId)
      : undefined;

    const built = buildPublishedLesson({
      id: existing?.id,
      courseId: parentCourse.id,
      moduleId: parentModule.id,
      order: existing?.order ?? parentModule.lessons.length + 1,
      cefrBand: lessonCefr,
      estimatedMinutes: lessonMinutes,
      titleEn: lessonTitleEn,
      titleBn: lessonTitleBn,
      summaryEn:
        lessonSummaryEn.trim() ||
        `Eliminate "${lessonCommonTrap.trim()}" and apply "${lessonNaturalEnglish.trim()}" accurately.`,
      summaryBn:
        lessonSummaryBn.trim() ||
        `"${lessonCommonTrap.trim()}" ভুলটি বাদ দিয়ে স্বাভাবিকভাবে "${lessonNaturalEnglish.trim()}" বলুন।`,
      conceptRuleEn: lessonRuleEn,
      conceptRuleBn: lessonRuleBn,
      banglaInterferenceEn:
        lessonTrapEn.trim() ||
        'Direct word-for-word translation from Bangla triggers this recurring pattern.',
      banglaInterferenceBn:
        lessonTrapBn.trim() ||
        'বাংলা থেকে সরাসরি শব্দে-শব্দে অনুবাদ করতে গেলে এই ভুলটি বারবার হয়।',
      commonTrap: lessonCommonTrap,
      naturalEnglish: lessonNaturalEnglish,
      banglaExampleMeaning: lessonBanglaMeaning,
      targetCategory: lessonCategory,
      version: existing ? (existing.version ?? 1) + 1 : 1,
    });

    upsertPublishedLesson(built);
    const logEntry = appendAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: activeRole,
      action: existing ? 'curriculum.lesson_versioned' : 'curriculum.lesson_published',
      resourceType: 'curriculum',
      resourceId: built.id,
      summaryEn: `${existing ? 'Versioned' : 'Published'} 7-stage lesson "${built.titleEn}" (v${built.version ?? 1}) in ${parentCourse.titleEn}.`,
      summaryBn: `"${built.titleBn}" ৭-ধাপের লেসনটি (v${built.version ?? 1}) প্রকাশ করা হয়েছে।`,
      metadata: {
        courseId: parentCourse.id,
        moduleId: parentModule.id,
        version: built.version ?? 1,
        category: lessonCategory,
      },
    });

    setPublishNotice({
      messageEn: `7-stage lesson "${built.titleEn}" (v${built.version ?? 1}) is now live in Academy.`,
      messageBn: `৭-ধাপের লেসন "${built.titleBn}" (v${built.version ?? 1}) এখন একাডেমিতে লাইভ।`,
      correlationId: logEntry.correlationId,
      lessonId: built.id,
    });
    setEditingLessonId('');
    setLessonTitleEn('');
    setLessonTitleBn('');
    setLessonSummaryEn('');
    setLessonSummaryBn('');
    setLessonRuleEn('');
    setLessonRuleBn('');
    setLessonTrapEn('');
    setLessonTrapBn('');
    setLessonCommonTrap('');
    setLessonNaturalEnglish('');
    setLessonBanglaMeaning('');
    setBuilderError(null);
    setCatalogTick((t) => t + 1);
    setAuditLogs(listAuditLogs());
  };

  const handleReviewMistake = async (
    mistake: MistakeMemoryItem,
    decision: 'upheld_false_positive' | 'confirmed_accurate'
  ) => {
    if (!user || !canReviewMistakes) return;
    setReviewBusyId(mistake.id);
    try {
      const note = reviewNotes[mistake.id] ?? '';
      const res = await reviewFlaggedMistake({
        mistakeId: mistake.id,
        decision,
        note,
      });
      setFlaggedMistakes(res.flaggedMistakes);
      appendAuditLog({
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: activeRole,
        action:
          decision === 'upheld_false_positive'
            ? 'mistakes.false_positive_upheld'
            : 'mistakes.correction_confirmed_accurate',
        resourceType: 'mistake_review',
        resourceId: mistake.id,
        summaryEn:
          decision === 'upheld_false_positive'
            ? `Upheld false-positive flag for "${mistake.userExample}" → "${mistake.correctedExample}".`
            : `Restored AI correction "${mistake.userExample}" → "${mistake.correctedExample}" as accurate.`,
        summaryBn:
          decision === 'upheld_false_positive'
            ? `"${mistake.userExample}" ভুল রিপোর্টটি সঠিক (False Positive) হিসেবে অনুমোদিত হয়েছে।`
            : `"${mistake.userExample}" → "${mistake.correctedExample}" AI সংশোধনটি সঠিক হিসেবে পুনর্বহাল করা হয়েছে।`,
        metadata: { decision, category: mistake.category },
      });
      setAuditLogs(listAuditLogs());
    } finally {
      setReviewBusyId(null);
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <LearnerShell
      title={lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল সেন্টার' : 'Admin Control Center'}
      subtitle={
        lang === 'bn'
          ? 'ভূমিকা-ভিত্তিক প্রবেশাধিকার (RBAC), লাইভ কারিকুলাম প্রকাশনা, বাস্তব AI অপারেশনস মনিটরিং এবং অপরিবর্তনীয় অডিট লগ।'
          : 'Role-based governance (RBAC), live Curriculum Builder, real AI Operations telemetry, Reported Mistakes triage, and immutable Audit Log.'
      }
    >
      <div className="space-y-6">
        {/* RBAC Role & Permission Guard Bar */}
        <section className="rounded-xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#3B82F6]">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {lang === 'bn'
                    ? 'ভূমিকা-ভিত্তিক নিরাপত্তা গার্ড (RBAC)'
                    : 'Role-Based Access Control (RBAC) Guard'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">
                {lang === 'bn'
                  ? ADMIN_ROLE_LABELS[activeRole].descBn
                  : ADMIN_ROLE_LABELS[activeRole].descEn}
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-400">
                {lang === 'bn'
                  ? `সক্রিয় অনুমতি (${ROLE_PERMISSION_MATRIX[activeRole].length}): `
                  : `Active Grants (${ROLE_PERMISSION_MATRIX[activeRole].length}): `}
                {ROLE_PERMISSION_MATRIX[activeRole].length > 0
                  ? ROLE_PERMISSION_MATRIX[activeRole].join(' · ')
                  : 'NONE (Blocked)'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {ADMIN_ROLES.map((roleKey) => {
                const isSelected = activeRole === roleKey;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    disabled={roleUpdating}
                    aria-pressed={isSelected}
                    onClick={() => void handleRoleSwitch(roleKey)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? roleKey === 'learner'
                          ? 'border-amber-500/60 bg-amber-500/15 text-amber-200'
                          : 'border-[#3B82F6] bg-[#3B82F6] text-white'
                        : 'border-slate-700 bg-[#0A0F1C] text-slate-300 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    {lang === 'bn'
                      ? ADMIN_ROLE_LABELS[roleKey].bn
                      : ADMIN_ROLE_LABELS[roleKey].en}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-3 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
            {lang === 'bn'
              ? `স্টোরেজ মোড: ${storageMode === 'cloudflare-d1' ? 'Cloudflare Workers + D1 (JWT RBAC সক্রিয়)' : 'লোকাল D1-সক্ষম অ্যাডাপ্টার (প্রোডাকশনে Cloudflare Workers সাইনড JWT ক্লেইম দিয়ে সার্ভার-সাইডে RBAC যাচাই করে)'}।`
              : `Storage Mode: ${storageMode === 'cloudflare-d1' ? 'Cloudflare Workers + D1 (Server-Side JWT RBAC Active)' : 'Local D1-Ready Adapter (In Cloudflare production, Workers enforce these exact role claims server-side via signed JWT + D1 users.role)'}.`}
          </p>
        </section>

        {/* Strict Access Denied Guard when Role is Learner */}
        {!canAccessAdmin ? (
          <section
            role="alert"
            className="rounded-xl border border-amber-500/40 bg-[#111827] p-6 sm:p-8"
          >
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#F59E0B]" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold text-white">
                  {lang === 'bn'
                    ? 'প্রবেশাধিকার সংরক্ষিত (403 — শিক্ষার্থী অ্যাকাউন্ট ব্লকড)'
                    : 'Access Restricted (403 — Learner Account Blocked)'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                  {lang === 'bn'
                    ? 'আপনার বর্তমান ভূমিকা হলো "শিক্ষার্থী"। কারিকুলাম প্রকাশনা, AI অপারেশনস মনিটরিং, রিপোর্টকৃত ভুল যাচাই এবং অডিট লগ দেখার জন্য অ্যাডমিন, কন্টেন্ট ম্যানেজার অথবা AI Ops অনুমতি প্রয়োজন।'
                    : 'Your current account role is Learner, which holds zero administrative permissions. Switch to Super Admin, Content Manager, or AI Ops Engineer above to inspect role-gated governance controls, or return to your Learner Workspace.'}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleRoleSwitch('admin')}
                    className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors cursor-pointer"
                  >
                    {lang === 'bn'
                      ? 'সুপার অ্যাডমিন ভূমিকায় প্রবেশ করুন'
                      : 'Switch to Super Admin Role'}
                  </button>
                  <Link
                    to="/app"
                    className="rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
                  >
                    {lang === 'bn' ? 'লার্নার ড্যাশবোর্ডে ফিরুন' : 'Return to Learner Home'}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Admin Control Center sections"
                className="flex flex-wrap items-center gap-2"
              >
                {(
                  [
                    {
                      id: 'overview' as const,
                      labelEn: 'Overview',
                      labelBn: 'ওভারভিউ',
                      icon: LayoutDashboard,
                      allowed: canReadOverview,
                    },
                    {
                      id: 'cms' as const,
                      labelEn: 'Website CMS & Analytics',
                      labelBn: 'ওয়েবসাইট CMS ও অ্যানালিটিক্স',
                      icon: Layers,
                      allowed: canAccessAdmin,
                    },
                    {
                      id: 'users' as const,
                      labelEn: `Users (${adminUsers.length})`,
                      labelBn: `ব্যবহারকারী (${adminUsers.length})`,
                      icon: Users,
                      allowed: canManageUsers,
                    },
                    {
                      id: 'curriculum' as const,
                      labelEn: 'Curriculum Builder',
                      labelBn: 'কারিকুলাম বিল্ডার',
                      icon: BookPlus,
                      allowed: canWriteCurriculum,
                    },
                    {
                      id: 'ai_ops' as const,
                      labelEn: `AI Ops & Cost (${aiMetrics.totalCalls})`,
                      labelBn: `AI অপস ও খরচ (${aiMetrics.totalCalls})`,
                      icon: Activity,
                      allowed: canReadAiOps,
                    },
                    {
                      id: 'ai_providers' as const,
                      labelEn: 'AI & API Providers',
                      labelBn: 'AI ও API প্রোভাইডার',
                      icon: Cpu,
                      allowed: canReadAiOps || canManageUsers,
                    },
                    {
                      id: 'mistakes' as const,
                      labelEn: `Reported Mistakes (${flaggedMistakes.length})`,
                      labelBn: `রিপোর্টকৃত ভুল (${flaggedMistakes.length})`,
                      icon: Flag,
                      allowed: canReviewMistakes,
                    },
                    {
                      id: 'moderation' as const,
                      labelEn: 'Moderation & Appeals',
                      labelBn: 'মডারেশন ও আপিল',
                      icon: ShieldAlert,
                      allowed: canReviewMistakes,
                    },
                    {
                      id: 'subscriptions' as const,
                      labelEn: 'Subscriptions & Support',
                      labelBn: 'সাবস্ক্রিপশন ও সাপোর্ট',
                      icon: CreditCard,
                      allowed: canManageUsers,
                    },
                    {
                      id: 'system_config' as const,
                      labelEn: 'System & Flags',
                      labelBn: 'সিস্টেম ও ফ্ল্যাগ',
                      icon: Sliders,
                      allowed: canManageUsers,
                    },
                    {
                      id: 'system_health' as const,
                      labelEn: 'Health & Broadcasts',
                      labelBn: 'সিস্টেম হেলথ',
                      icon: Server,
                      allowed: canReadAiOps || canManageUsers,
                    },
                    {
                      id: 'audit' as const,
                      labelEn: `Audit Log (${auditLogs.length})`,
                      labelBn: `অডিট লগ (${auditLogs.length})`,
                      icon: ClipboardList,
                      allowed: canReadAudit,
                    },
                  ]
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
                          : 'border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {tab.allowed ? (
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                      )}
                      <span>{lang === 'bn' ? tab.labelBn : tab.labelEn}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => void refreshGovernanceData()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh Live Data'}</span>
              </button>
            </div>

            {/* TAB 0: ADMIN OVERVIEW (REAL DB COUNTS) */}
            {activeTab === 'overview' && (
              <AdminOverviewTab
                lang={lang}
                stats={overviewStats}
                coursesCount={courses.length}
                modulesCount={totalModulesCount}
                lessonsCount={totalLessonsCount}
                storageMode={storageMode}
              />
            )}

            {/* TAB 0A: FULL WEBSITE CMS, NAVIGATION, LANGUAGES, PRICING, TESTIMONIALS, FAQS, MEDIA, SEO, ANALYTICS & SETTINGS */}
            {activeTab === 'cms' && user && (
              <AdminCmsWorkspace
                activeModule={cmsSubModule}
                onSelectModule={setCmsSubModule}
                actorEmail={user.email}
                actorRole={activeRole}
                onServerAuditRefresh={setServerAuditLogs}
              />
            )}

            {/* TAB 0B: USER MANAGEMENT */}
            {activeTab === 'users' && user && (
              <AdminUserManagementTab
                lang={lang}
                canManageUsers={canManageUsers}
                currentUserId={user.id}
                users={adminUsers}
                searchQuery={userSearchQuery}
                onSearchChange={setUserSearchQuery}
                onUpdateUser={handleAdminUserUpdate}
                onDeleteUser={handleAdminUserDelete}
              />
            )}

            {/* TAB 0C: AI & EXTERNAL PROVIDERS MANAGEMENT */}
            {activeTab === 'ai_providers' && (
              <AdminAiProvidersTab lang={lang} canRotateKeys={canManageUsers} />
            )}

            {/* TAB 0D: SYSTEM HEALTH, MIGRATIONS, SECURITY EVENTS & BROADCASTS */}
            {activeTab === 'system_health' && (
              <AdminSystemHealthTab lang={lang} canBroadcast={canManageUsers} />
            )}

            {/* TAB 1: CURRICULUM BUILDER */}
            {activeTab === 'curriculum' && (
              <div className="space-y-6">
                {!canWriteCurriculum ? (
                  <div className="rounded-xl border border-amber-500/40 bg-[#111827] p-6">
                    <p className="text-sm font-semibold text-amber-200">
                      {lang === 'bn'
                        ? 'আপনার বর্তমান ভূমিকা (AI Ops) কারিকুলাম সম্পাদনা বা প্রকাশ করতে পারবে না।'
                        : 'Your current role (AI Ops Engineer) has read-only curriculum visibility and cannot publish changes.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Live Catalog KPI Strip */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                        <p className="text-xs text-slate-400">
                          {lang === 'bn' ? 'ক্যাটালগ ভার্সন' : 'Catalog Version'}
                        </p>
                        <p className="mt-1.5 font-mono text-2xl font-bold text-white tabular-nums">
                          v{overlay.catalogVersion}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                        <p className="text-xs text-slate-400">
                          {lang === 'bn' ? 'মোট কোর্স' : 'Published Courses'}
                        </p>
                        <p className="mt-1.5 font-mono text-2xl font-bold text-white tabular-nums">
                          {courses.length}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                        <p className="text-xs text-slate-400">
                          {lang === 'bn' ? 'মোট মডিউল' : 'Published Modules'}
                        </p>
                        <p className="mt-1.5 font-mono text-2xl font-bold text-white tabular-nums">
                          {totalModulesCount}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                        <p className="text-xs text-slate-400">
                          {lang === 'bn' ? 'মোট ৭-ধাপের লেসন' : 'Playable Lessons'}
                        </p>
                        <p className="mt-1.5 font-mono text-2xl font-bold text-white tabular-nums">
                          {totalLessonsCount}
                        </p>
                      </div>
                    </div>

                    {publishNotice && (
                      <div
                        role="status"
                        className="flex flex-col gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-sm font-semibold text-emerald-200">
                              {lang === 'bn' ? publishNotice.messageBn : publishNotice.messageEn}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-emerald-300/80">
                              Correlation ID: {publishNotice.correlationId}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <Link
                            to="/app/learn"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-[#0A0F1C] px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-950/40"
                          >
                            <span>{lang === 'bn' ? 'একাডেমিতে দেখুন' : 'Open Academy'}</span>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </Link>
                          {publishNotice.lessonId && (
                            <Link
                              to={`/app/learn/${publishNotice.lessonId}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2563EB]"
                            >
                              <span>
                                {lang === 'bn' ? 'লেসন প্লেয়ার খুলুন' : 'Launch 7-Stage Player'}
                              </span>
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </Link>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Authoring Form Card */}
                    <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                        <h2 className="text-base font-bold text-white">
                          {lang === 'bn'
                            ? 'নতুন কন্টেন্ট তৈরি, সংস্করণ ও প্রকাশ'
                            : 'Create, Version & Publish Curriculum Content'}
                        </h2>
                        <div className="flex items-center gap-2">
                          {(
                            [
                              { id: 'lesson' as const, en: '7-Stage Lesson', bn: '৭-ধাপের লেসন' },
                              { id: 'course' as const, en: 'Course', bn: 'কোর্স' },
                              { id: 'module' as const, en: 'Module', bn: 'মডিউল' },
                            ]
                          ).map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => {
                                setBuilderMode(mode.id);
                                setBuilderError(null);
                              }}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                                builderMode === mode.id
                                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/20 text-violet-200'
                                  : 'border-slate-700 bg-[#0A0F1C] text-slate-300 hover:text-white'
                              }`}
                            >
                              {lang === 'bn' ? mode.bn : mode.en}
                            </button>
                          ))}
                        </div>
                      </div>

                      {builderError && (
                        <p role="alert" className="mt-4 text-sm font-medium text-rose-300">
                          {builderError}
                        </p>
                      )}

                      {builderMode === 'lesson' && (
                        <form onSubmit={handlePublishLesson} className="mt-5 space-y-4">
                          {editingLessonId && (
                            <div className="flex items-center justify-between rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-3.5 py-2 text-xs text-blue-200">
                              <span>
                                {lang === 'bn'
                                  ? `লেসন সম্পাদনা ও ভার্সন বৃদ্ধি: ${editingLessonId}`
                                  : `Editing & bumping version for lesson: ${editingLessonId}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingLessonId('')}
                                className="font-semibold underline cursor-pointer"
                              >
                                {lang === 'bn' ? 'নতুন লেসন তৈরি' : 'Switch to New Lesson'}
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <label
                                htmlFor="admin-les-course"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'কোর্স' : 'Parent Course'}
                              </label>
                              <select
                                id="admin-les-course"
                                value={lessonCourseId}
                                onChange={(e) => setLessonCourseId(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-xs text-white focus:border-[#3B82F6] focus:outline-none"
                              >
                                {courses.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.titleEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor="admin-les-module"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'মডিউল' : 'Parent Module'}
                              </label>
                              <select
                                id="admin-les-module"
                                value={lessonModuleId}
                                onChange={(e) => setLessonModuleId(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-xs text-white focus:border-[#3B82F6] focus:outline-none"
                              >
                                {(selectedCourseForLesson?.modules ?? []).map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.titleEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor="admin-les-category"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'ভুলের ধরন (Category)' : 'Target Mistake Category'}
                              </label>
                              <select
                                id="admin-les-category"
                                value={lessonCategory}
                                onChange={(e) =>
                                  setLessonCategory(e.target.value as MistakeCategory)
                                }
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-xs text-white focus:border-[#3B82F6] focus:outline-none"
                              >
                                {MISTAKE_CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label
                                  htmlFor="admin-les-cefr"
                                  className="block text-xs font-medium text-slate-300"
                                >
                                  CEFR
                                </label>
                                <input
                                  id="admin-les-cefr"
                                  type="text"
                                  value={lessonCefr}
                                  onChange={(e) => setLessonCefr(e.target.value)}
                                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-xs text-white focus:border-[#3B82F6] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor="admin-les-min"
                                  className="block text-xs font-medium text-slate-300"
                                >
                                  {lang === 'bn' ? 'মিনিট' : 'Min'}
                                </label>
                                <input
                                  id="admin-les-min"
                                  type="number"
                                  min={3}
                                  max={45}
                                  value={lessonMinutes}
                                  onChange={(e) => setLessonMinutes(Number(e.target.value) || 6)}
                                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-xs text-white focus:border-[#3B82F6] focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label
                                htmlFor="admin-les-title-en"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'লেসনের শিরোনাম (English) *' : 'Lesson Title (English) *'}
                              </label>
                              <input
                                id="admin-les-title-en"
                                type="text"
                                required
                                placeholder="e.g., Polite Requests in Client Emails (Could / Would)"
                                value={lessonTitleEn}
                                onChange={(e) => setLessonTitleEn(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="admin-les-title-bn"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'লেসনের শিরোনাম (বাংলা)' : 'Lesson Title (Bangla)'}
                              </label>
                              <input
                                id="admin-les-title-bn"
                                type="text"
                                placeholder="যেমন: ক্লায়েন্ট ইমেইলে ভদ্র অনুরোধ (Could / Would)"
                                value={lessonTitleBn}
                                onChange={(e) => setLessonTitleBn(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label
                                htmlFor="admin-les-rule-en"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'মূল ব্যাকরণ নিয়ম (English) *' : 'Core Grammar Rule (English) *'}
                              </label>
                              <textarea
                                id="admin-les-rule-en"
                                rows={2}
                                required
                                placeholder="Use 'Could you please send...' instead of 'Kindly do the needful'."
                                value={lessonRuleEn}
                                onChange={(e) => setLessonRuleEn(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="admin-les-rule-bn"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'বাংলা ব্যাখ্যা (বাংলা)' : 'Bangla Grammar Explanation'}
                              </label>
                              <textarea
                                id="admin-les-rule-bn"
                                rows={2}
                                placeholder="ভদ্রভাবে অনুরোধ করতে Could you please + base verb ব্যবহার করুন।"
                                value={lessonRuleBn}
                                onChange={(e) => setLessonRuleBn(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <label
                                htmlFor="admin-les-trap"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'সাধারণ ভুল বাক্য *' : 'Common Bangla-Speaker Trap *'}
                              </label>
                              <input
                                id="admin-les-trap"
                                type="text"
                                required
                                placeholder="Please send me the file fast."
                                value={lessonCommonTrap}
                                onChange={(e) => setLessonCommonTrap(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="admin-les-natural"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'স্বাভাবিক ইংরেজি বাক্য *' : 'Natural English Model *'}
                              </label>
                              <input
                                id="admin-les-natural"
                                type="text"
                                required
                                placeholder="Could you please share the file by 4 PM?"
                                value={lessonNaturalEnglish}
                                onChange={(e) => setLessonNaturalEnglish(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="admin-les-bn-meaning"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'বাংলা অর্থ' : 'Bangla Meaning'}
                              </label>
                              <input
                                id="admin-les-bn-meaning"
                                type="text"
                                placeholder="বিকেল ৪টার মধ্যে ফাইলটি কি পাঠাতে পারবেন?"
                                value={lessonBanglaMeaning}
                                onChange={(e) => setLessonBanglaMeaning(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors cursor-pointer"
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                              <span>
                                {editingLessonId
                                  ? lang === 'bn'
                                    ? 'নতুন ভার্সন প্রকাশ করুন'
                                    : 'Publish New Lesson Version'
                                  : lang === 'bn'
                                    ? 'একাডেমিতে ৭-ধাপের লেসন প্রকাশ করুন'
                                    : 'Publish 7-Stage Lesson to Academy'}
                              </span>
                            </button>
                          </div>
                        </form>
                      )}

                      {builderMode === 'course' && (
                        <form onSubmit={handlePublishCourse} className="mt-5 space-y-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <label
                                htmlFor="admin-course-title-en"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'কোর্স শিরোনাম (English) *' : 'Course Title (English) *'}
                              </label>
                              <input
                                id="admin-course-title-en"
                                type="text"
                                required
                                placeholder="e.g., IELTS Speaking Fluency Lab"
                                value={courseTitleEn}
                                onChange={(e) => setCourseTitleEn(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="admin-course-title-bn"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'কোর্স শিরোনাম (বাংলা)' : 'Course Title (Bangla)'}
                              </label>
                              <input
                                id="admin-course-title-bn"
                                type="text"
                                placeholder="IELTS স্পিকিং সাবলীলতা ল্যাব"
                                value={courseTitleBn}
                                onChange={(e) => setCourseTitleBn(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="admin-course-cefr"
                                className="block text-xs font-medium text-slate-300"
                              >
                                CEFR Range
                              </label>
                              <select
                                id="admin-course-cefr"
                                value={courseCefr}
                                onChange={(e) => setCourseCefr(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              >
                                <option value="Pre-A1 – A2">Pre-A1 – A2</option>
                                <option value="A2 – B1">A2 – B1</option>
                                <option value="B1 – B2">B1 – B2</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label
                                htmlFor="admin-course-sub-en"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'সংক্ষিপ্ত বিবরণ (English) *' : 'Course Subtitle (English) *'}
                              </label>
                              <input
                                id="admin-course-sub-en"
                                type="text"
                                required
                                value={courseSubtitleEn}
                                onChange={(e) => setCourseSubtitleEn(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="admin-course-sub-bn"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'সংক্ষিপ্ত বিবরণ (বাংলা)' : 'Course Subtitle (Bangla)'}
                              </label>
                              <input
                                id="admin-course-sub-bn"
                                type="text"
                                value={courseSubtitleBn}
                                onChange={(e) => setCourseSubtitleBn(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                              <span>
                                {editingCourseId
                                  ? lang === 'bn'
                                    ? 'কোর্স ভার্সন আপডেট করুন'
                                    : 'Publish Course Version'
                                  : lang === 'bn'
                                    ? 'নতুন কোর্স প্রকাশ করুন'
                                    : 'Publish New Course'}
                              </span>
                            </button>
                          </div>
                        </form>
                      )}

                      {builderMode === 'module' && (
                        <form onSubmit={handlePublishModule} className="mt-5 space-y-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <label
                                htmlFor="admin-mod-course"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'কোর্স নির্বাচন করুন' : 'Target Course'}
                              </label>
                              <select
                                id="admin-mod-course"
                                value={moduleCourseId}
                                onChange={(e) => setModuleCourseId(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              >
                                {courses.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.titleEn}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label
                                htmlFor="admin-mod-title-en"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'মডিউল শিরোনাম (English) *' : 'Module Title (English) *'}
                              </label>
                              <input
                                id="admin-mod-title-en"
                                type="text"
                                required
                                value={moduleTitleEn}
                                onChange={(e) => setModuleTitleEn(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="admin-mod-title-bn"
                                className="block text-xs font-medium text-slate-300"
                              >
                                {lang === 'bn' ? 'মডিউল শিরোনাম (বাংলা)' : 'Module Title (Bangla)'}
                              </label>
                              <input
                                id="admin-mod-title-bn"
                                type="text"
                                value={moduleTitleBn}
                                onChange={(e) => setModuleTitleBn(e.target.value)}
                                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                              <span>
                                {lang === 'bn' ? 'মডিউল প্রকাশ করুন' : 'Publish Module'}
                              </span>
                            </button>
                          </div>
                        </form>
                      )}
                    </section>

                    {/* Live Catalog Inventory */}
                    <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
                      <h2 className="text-base font-bold text-white">
                        {lang === 'bn'
                          ? 'প্রকাশিত কারিকুলাম তালিকা (লাইভ সংস্করণ)'
                          : 'Published Curriculum Inventory (Live Versioned Catalog)'}
                      </h2>
                      <div className="mt-4 space-y-4">
                        {courses.map((course) => (
                          <div
                            key={course.id}
                            className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-mono text-[11px] text-[#3B82F6]">
                                  {course.id} · v{course.version ?? 1} · {course.cefrRange}
                                </p>
                                <h3 className="mt-0.5 text-sm font-bold text-white">
                                  {lang === 'bn' ? course.titleBn : course.titleEn}
                                </h3>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStartEditCourse(course)}
                                className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-[#3B82F6] hover:text-white cursor-pointer"
                              >
                                {lang === 'bn' ? 'সম্পাদনা / ভার্সন' : 'Edit & Version'}
                              </button>
                            </div>

                            <div className="mt-3 space-y-2 border-t border-slate-800/80 pt-3">
                              {course.modules.map((mod) => (
                                <div key={mod.id} className="space-y-1.5">
                                  <p className="text-xs font-semibold text-slate-300">
                                    {lang === 'bn' ? mod.titleBn : mod.titleEn}
                                  </p>
                                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    {mod.lessons.map((lesson) => (
                                      <div
                                        key={lesson.id}
                                        className="flex items-center justify-between gap-2 rounded-md border border-slate-800/80 bg-[#111827] px-3 py-2 text-xs"
                                      >
                                        <div className="min-w-0">
                                          <p className="truncate font-semibold text-slate-100">
                                            {lang === 'bn' ? lesson.titleBn : lesson.titleEn}
                                          </p>
                                          <p className="font-mono text-[11px] text-slate-400">
                                            v{lesson.version ?? 1} · {lesson.cefrBand} ·{' '}
                                            {lesson.isCustom
                                              ? lang === 'bn'
                                                ? 'অ্যাডমিন প্রকাশিত'
                                                : 'Custom Published'
                                              : 'Core'}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleStartEditLesson(lesson)}
                                            className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                                          >
                                            {lang === 'bn' ? 'সম্পাদনা' : 'Edit'}
                                          </button>
                                          <Link
                                            to={`/app/learn/${lesson.id}`}
                                            className="rounded border border-[#3B82F6]/40 px-2 py-1 text-[11px] font-medium text-[#3B82F6] hover:bg-[#3B82F6]/10"
                                          >
                                            {lang === 'bn' ? 'খুলুন' : 'Open'}
                                          </Link>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: AI OPERATIONS & COST MONITOR */}
            {activeTab === 'ai_ops' && (
              <div className="space-y-6">
                {!canReadAiOps ? (
                  <div className="rounded-xl border border-amber-500/40 bg-[#111827] p-6">
                    <p className="text-sm font-semibold text-amber-200">
                      {lang === 'bn'
                        ? 'আপনার বর্তমান ভূমিকা (কন্টেন্ট ম্যানেজার) AI অপারেশনস ও খরচ টেলিমেট্রি দেখার অনুমতি পায়নি।'
                        : 'Your current role (Content Manager) does not have ai_ops:read permission. Switch to AI Ops Engineer or Super Admin to inspect AI telemetry.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Honest Telemetry KPIs */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                        <p className="text-xs text-slate-400">
                          {lang === 'bn' ? 'মোট API কল' : 'Total API Calls'}
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                          {aiMetrics.totalCalls}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                          {aiMetrics.successCalls} ok · {aiMetrics.errorCalls} err
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                        <p className="text-xs text-slate-400">
                          {lang === 'bn' ? 'ত্রুটির হার' : 'Error Rate'}
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                          {aiMetrics.errorRatePercent}%
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {aiMetrics.totalCalls === 0
                            ? lang === 'bn'
                              ? 'কোনো কল নথিভুক্ত হয়নি'
                              : 'No calls recorded yet'
                            : lang === 'bn'
                              ? 'বাস্তব সেশন টেলিমেট্রি'
                              : 'Measured live'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                        <p className="text-xs text-slate-400">
                          {lang === 'bn' ? 'গড় / P95 ল্যাটেন্সি' : 'Avg / P95 Latency'}
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                          {aiMetrics.avgLatencyMs}ms
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                          P95: {aiMetrics.p95LatencyMs}ms
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                        <p className="text-xs text-slate-400">
                          {lang === 'bn' ? 'টোকেন ব্যবহার (আনুমানিক)' : 'Est. Tokens'}
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                          {(
                            aiMetrics.totalInputTokens + aiMetrics.totalOutputTokens
                          ).toLocaleString()}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                          In {aiMetrics.totalInputTokens} · Out {aiMetrics.totalOutputTokens}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
                        <p className="text-xs text-slate-400">
                          {lang === 'bn' ? 'আনুমানিক খরচ (USD)' : 'Est. Cost (USD)'}
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                          ${aiMetrics.totalEstimatedCostUsd.toFixed(5)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {lang === 'bn' ? 'সর্বমোট প্রকৃত কল' : 'Zero fabricated spend'}
                        </p>
                      </div>
                    </div>

                    {aiMetrics.totalCalls === 0 ? (
                      <div className="rounded-xl border border-slate-800 bg-[#111827] p-6">
                        <h3 className="text-sm font-bold text-white">
                          {lang === 'bn'
                            ? 'এখনও কোনো লাইভ AI মূল্যায়ন কল নথিভুক্ত হয়নি'
                            : 'No live AI evaluation calls logged yet'}
                        </h3>
                        <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
                          {lang === 'bn'
                            ? 'সততার নীতি অনুযায়ী এখানে কোনো ভুয়া ল্যাটেন্সি বা টোকেন সংখ্যা দেখানো হয় না। স্পিকিং স্টুডিও বা ট্রান্সফার ল্যাবে একটি বাস্তব উত্তর মূল্যায়ন করলে প্রতিটি কল এখানে রিয়েল-টাইমে যুক্ত হবে।'
                            : 'Honest empty state: zero synthetic API metrics are generated. Complete a real evaluation in AI Speaking Studio or Transfer Lab (with AI Telemetry enabled in Settings) to populate live latency, token estimates, prompt versions, and cost.'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2.5">
                          <Link
                            to="/app/speak"
                            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB]"
                          >
                            {lang === 'bn' ? 'স্পিকিং স্টুডিও খুলুন' : 'Open Speaking Studio'}
                          </Link>
                          <Link
                            to="/app/transfer-lab"
                            className="rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
                          >
                            {lang === 'bn' ? 'ট্রান্সফার ল্যাব খুলুন' : 'Open Transfer Lab'}
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Prompt Versions Active */}
                        <section className="rounded-xl border border-slate-800 bg-[#111827] p-5">
                          <h3 className="text-sm font-bold text-white">
                            {lang === 'bn'
                              ? 'ব্যবহৃত প্রম্পট ভার্সন ও মডেল'
                              : 'Active Prompt Versions & Models'}
                          </h3>
                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                  <th className="py-2 pr-4 font-medium">Prompt Version</th>
                                  <th className="py-2 pr-4 font-medium">Model</th>
                                  <th className="py-2 font-medium text-right">Calls</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/70">
                                {aiMetrics.promptVersionsUsed.map((row) => (
                                  <tr key={`${row.promptVersion}-${row.model}`}>
                                    <td className="py-2.5 pr-4 font-mono text-slate-200">
                                      {row.promptVersion}
                                    </td>
                                    <td className="py-2.5 pr-4 font-mono text-[#3B82F6]">
                                      {row.model}
                                    </td>
                                    <td className="py-2.5 text-right font-mono font-semibold text-white tabular-nums">
                                      {row.calls}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>

                        {/* Recent API Calls & Error Logs */}
                        <section className="rounded-xl border border-slate-800 bg-[#111827] p-5">
                          <h3 className="text-sm font-bold text-white">
                            {lang === 'bn'
                              ? 'সাম্প্রতিক API কল ও ত্রুটি লগ'
                              : 'Recent Live AI Calls & Error Telemetry'}
                          </h3>
                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                  <th className="py-2 pr-3 font-medium">Time</th>
                                  <th className="py-2 pr-3 font-medium">Endpoint</th>
                                  <th className="py-2 pr-3 font-medium">Prompt / Model</th>
                                  <th className="py-2 pr-3 font-medium">Status</th>
                                  <th className="py-2 pr-3 font-medium text-right">Latency</th>
                                  <th className="py-2 pr-3 font-medium text-right">Tokens</th>
                                  <th className="py-2 font-medium">Correlation ID</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/70">
                                {telemetryEvents.slice(0, 25).map((evt) => (
                                  <tr key={evt.id}>
                                    <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                      {formatTimestamp(evt.timestamp)}
                                    </td>
                                    <td className="py-2.5 pr-3 font-mono text-slate-200 whitespace-nowrap">
                                      {evt.endpoint}
                                    </td>
                                    <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                                      {evt.promptVersion} · {evt.model}
                                    </td>
                                    <td className="py-2.5 pr-3 whitespace-nowrap">
                                      <span
                                        className={`font-mono text-[11px] font-semibold ${
                                          evt.status === 'success'
                                            ? 'text-emerald-400'
                                            : 'text-rose-400'
                                        }`}
                                      >
                                        {evt.status === 'success'
                                          ? 'OK'
                                          : `ERR (${evt.errorCode ?? 'FAIL'})`}
                                      </span>
                                    </td>
                                    <td className="py-2.5 pr-3 text-right font-mono text-slate-200 tabular-nums whitespace-nowrap">
                                      {evt.latencyMs}ms
                                    </td>
                                    <td className="py-2.5 pr-3 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                                      {evt.estimatedInputTokens}/{evt.estimatedOutputTokens}
                                    </td>
                                    <td className="py-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                      {evt.correlationId}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB 3: REPORTED MISTAKES QUEUE */}
            {activeTab === 'mistakes' && (
              <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
                <h2 className="text-base font-bold text-white">
                  {lang === 'bn'
                    ? 'ব্যবহারকারী-রিপোর্টকৃত AI ভুল সংশোধন কিউ'
                    : 'User-Flagged AI False Corrections Queue'}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'শিক্ষার্থীরা "Report False Correction" বাটনে ক্লিক করলে প্রতিটি আইটেম এখানে মানব-যাচাইয়ের জন্য জমা হয়।'
                    : 'Every AI-detected mistake flagged via "Report False Correction" on /app/improve appears here for quality review and audit logging.'}
                </p>

                {flaggedMistakes.length === 0 ? (
                  <div className="mt-5 rounded-lg border border-slate-800 bg-[#0A0F1C] p-5">
                    <p className="text-sm font-semibold text-white">
                      {lang === 'bn'
                        ? 'এই মুহূর্তে কোনো রিপোর্টকৃত AI ভুল নেই'
                        : 'No reported AI false corrections in the queue'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {lang === 'bn'
                        ? 'ভুল মেমোরি পেজে (/app/improve) কোনো সংশোধনকে ভুল হিসেবে রিপোর্ট করলে তা এখানে দেখা যাবে।'
                        : 'Flag any correction on the Mistake Memory page (/app/improve) to review and triage it here.'}
                    </p>
                    <Link
                      to="/app/improve"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-[#3B82F6] hover:text-white"
                    >
                      <span>{lang === 'bn' ? 'মিস্টেক মেমোরি খুলুন' : 'Open Mistake Memory'}</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {flaggedMistakes.map((item) => {
                      const statusLabel =
                        item.adminReviewStatus === 'confirmed_accurate'
                          ? lang === 'bn'
                            ? 'সংশোধন অনুমোদিত'
                            : 'Approved Correction'
                          : item.adminReviewStatus === 'upheld_false_positive'
                            ? lang === 'bn'
                              ? 'বাতিল (ভুল শনাক্তকরণ)'
                              : 'Dismissed (False Positive)'
                            : lang === 'bn'
                              ? 'পর্যালোচনা বাকি'
                              : 'Pending Review';

                      return (
                        <article
                          key={item.id}
                          className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-mono text-slate-400">
                              {item.category} · {item.id}
                            </span>
                            <span
                              className={`font-mono font-semibold ${
                                item.adminReviewStatus === 'confirmed_accurate'
                                  ? 'text-emerald-400'
                                  : item.adminReviewStatus === 'upheld_false_positive'
                                    ? 'text-slate-400'
                                    : 'text-[#F59E0B]'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-md border border-slate-800 bg-[#111827] p-3">
                              <p className="text-[11px] text-slate-400">
                                {lang === 'bn' ? 'শিক্ষার্থীর মূল বাক্য' : 'Learner Original'}
                              </p>
                              <p className="mt-1 text-sm text-rose-200">{item.userExample}</p>
                            </div>
                            <div className="rounded-md border border-slate-800 bg-[#111827] p-3">
                              <p className="text-[11px] text-slate-400">
                                {lang === 'bn' ? 'AI প্রস্তাবিত সংশোধন' : 'AI Correction'}
                              </p>
                              <p className="mt-1 text-sm text-emerald-200">
                                {item.correctedExample}
                              </p>
                            </div>
                          </div>

                          {item.falseCorrectionReason && (
                            <p className="mt-2.5 flex items-start gap-1.5 text-xs text-amber-200">
                              <AlertTriangle
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F59E0B]"
                                aria-hidden="true"
                              />
                              <span>
                                {lang === 'bn' ? 'রিপোর্টের কারণ: ' : 'Learner Report: '}
                                {item.falseCorrectionReason}
                              </span>
                            </p>
                          )}

                          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                            <input
                              type="text"
                              placeholder={
                                lang === 'bn'
                                  ? 'অ্যাডমিন রিভিউ নোট (ঐচ্ছিক)...'
                                  : 'Optional reviewer note for audit log...'
                              }
                              value={reviewNotes[item.id] ?? item.adminReviewNote ?? ''}
                              onChange={(e) =>
                                setReviewNotes((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              className="flex-1 rounded-lg border border-slate-700 bg-[#111827] px-3 py-1.5 text-xs text-white focus:border-[#3B82F6] focus:outline-none"
                            />
                            <div className="flex flex-wrap gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={reviewBusyId === item.id}
                                onClick={() =>
                                  void handleReviewMistake(item, 'confirmed_accurate')
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 cursor-pointer"
                              >
                                {lang === 'bn'
                                  ? 'সংশোধন অনুমোদন করুন'
                                  : 'Approve Correction'}
                              </button>
                              <button
                                type="button"
                                disabled={reviewBusyId === item.id}
                                onClick={() =>
                                  void handleReviewMistake(item, 'upheld_false_positive')
                                }
                                className="rounded-lg border border-slate-700 bg-[#111827] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-rose-500/70 hover:text-white disabled:opacity-60 cursor-pointer"
                              >
                                {lang === 'bn' ? 'বাতিল করুন' : 'Dismiss'}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* TAB: COMMUNITY MODERATION & APPEALS */}
            {activeTab === 'moderation' && canReviewMistakes && (
              <AdminModerationTab lang={lang} />
            )}

            {/* TAB: SUBSCRIPTIONS, REAL FINANCE & SUPPORT TICKETS */}
            {activeTab === 'subscriptions' && canManageUsers && (
              <AdminSubscriptionsTab
                lang={lang}
                totalUsers={adminUsers.length}
                totalAiCostUsd={aiMetrics.totalEstimatedCostUsd}
              />
            )}

            {/* TAB: SYSTEM CONFIGURATION */}
            {activeTab === 'system_config' && canManageUsers && (
              <AdminSystemConfigTab lang={lang} />
            )}

            {/* TAB 4: IMMUTABLE AUDIT LOG VIEWER */}
            {activeTab === 'audit' && (
              <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {lang === 'bn'
                        ? 'অপরিবর্তনীয় অ্যাডমিন ও প্রাইভেসি অডিট লগ'
                        : 'Immutable Administrative & Privacy Audit Log'}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {lang === 'bn'
                        ? 'প্রতিটি কারিকুলাম প্রকাশ, ভূমিকা পরিবর্তন, প্রাইভেসি সম্মতি ও ডেটা এক্সপোর্ট স্থায়ী Correlation ID সহ সংরক্ষিত থাকে।'
                        : 'Append-only ledger of curriculum publishes, role changes, mistake reviews, privacy consent toggles, and data exports with correlation IDs.'}
                    </p>
                  </div>

                  <select
                    aria-label="Filter audit logs"
                    value={auditFilter}
                    onChange={(e) =>
                      setAuditFilter(e.target.value as 'all' | AuditResourceType)
                    }
                    className="rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-xs font-medium text-white focus:border-[#3B82F6] focus:outline-none"
                  >
                    <option value="all">{lang === 'bn' ? 'সব ইভেন্ট' : 'All Audit Events'}</option>
                    <option value="curriculum">Curriculum</option>
                    <option value="mistake_review">Mistake Reviews</option>
                    <option value="privacy_consent">Privacy Consent</option>
                    <option value="data_export">Data Exports</option>
                    <option value="recordings_purge">Recordings Purge</option>
                    <option value="rbac_role">RBAC Role Changes</option>
                  </select>
                </div>

                {filteredAuditLogs.length === 0 ? (
                  <div className="mt-5 rounded-lg border border-slate-800 bg-[#0A0F1C] p-5 text-sm text-slate-400">
                    {lang === 'bn'
                      ? 'এই ফিল্টারে এখনও কোনো অডিট এন্ট্রি নেই।'
                      : 'No audit log entries recorded for this filter yet.'}
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-2 pr-3 font-medium">Timestamp</th>
                          <th className="py-2 pr-3 font-medium">Actor / Role</th>
                          <th className="py-2 pr-3 font-medium">Action</th>
                          <th className="py-2 pr-3 font-medium">Summary</th>
                          <th className="py-2 font-medium">Correlation ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {filteredAuditLogs.slice(0, 50).map((entry) => (
                          <tr key={entry.id}>
                            <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {formatTimestamp(entry.timestamp)}
                            </td>
                            <td className="py-2.5 pr-3 whitespace-nowrap">
                              <p className="text-slate-200">{entry.actorEmail}</p>
                              <p className="font-mono text-[10px] text-[#8B5CF6]">
                                {entry.actorRole}
                              </p>
                            </td>
                            <td className="py-2.5 pr-3 font-mono text-[11px] text-[#3B82F6] whitespace-nowrap">
                              {entry.action}
                            </td>
                            <td className="py-2.5 pr-3 text-slate-300">
                              {lang === 'bn' ? entry.summaryBn : entry.summaryEn}
                            </td>
                            <td className="py-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {entry.correlationId}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {serverAuditLogs.length > 0 && (
                  <div className="mt-6 border-t border-slate-800 pt-5">
                    <h3 className="text-sm font-bold text-white">
                      Server-Persisted CMS & Media Audit Log ({serverAuditLogs.length})
                    </h3>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="py-2 pr-3 font-medium">Timestamp</th>
                            <th className="py-2 pr-3 font-medium">Actor / Role</th>
                            <th className="py-2 pr-3 font-medium">Action</th>
                            <th className="py-2 pr-3 font-medium">Summary</th>
                            <th className="py-2 font-medium">Correlation ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {serverAuditLogs.slice(0, 30).map((entry) => (
                            <tr key={entry.id}>
                              <td className="py-2 pr-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                {formatTimestamp(entry.timestamp)}
                              </td>
                              <td className="py-2 pr-3 whitespace-nowrap">
                                <p className="text-slate-200">{entry.actorEmail}</p>
                                <p className="font-mono text-[10px] text-[#00D9FF]">
                                  {entry.actorRole}
                                </p>
                              </td>
                              <td className="py-2 pr-3 font-mono text-[11px] text-[#3B82F6] whitespace-nowrap">
                                {entry.action}
                              </td>
                              <td className="py-2 pr-3 text-slate-300">{entry.summary}</td>
                              <td className="py-2 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                {entry.correlationId}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </LearnerShell>
  );
}

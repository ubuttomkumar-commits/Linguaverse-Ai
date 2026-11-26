import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM_COURSES } from './curriculumData.ts';
import {
  buildCourseDetailViewModel,
  buildCourseSummaries,
  buildLearningCategories,
  buildLearningPathStages,
  buildRecentlyCompletedLessons,
  buildRecommendedLessons,
  EMPTY_ACADEMY_STATE,
  filterAndSortCourses,
  resolveContinueLearning,
  resolveLessonNeighbors,
  type UserAcademyState,
} from './academyEngine.ts';
import type {
  EvidenceStartingProfile,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeMemoryItem,
} from '../types/domain.ts';

function makeAttempt(
  lessonId: string,
  completedAt: string,
  accuracy = 88
): LessonAttemptRecord {
  return {
    id: `att_${lessonId}_${completedAt}`,
    userId: 'user_1',
    lessonId,
    startedAt: completedAt,
    completedAt,
    durationSeconds: 320,
    guidedCorrect: 3,
    guidedTotal: 3,
    independentCorrect: 2,
    independentTotal: 2,
    assessmentCorrect: 2,
    assessmentTotal: 3,
    overallAccuracyPercent: accuracy,
    mistakesLoggedCount: 1,
  };
}

function makeMastery(
  lessonId: string,
  overrides: Partial<LessonMasteryRecord> = {}
): LessonMasteryRecord {
  return {
    lessonId,
    userId: 'user_1',
    attemptCount: 1,
    consecutivePassCount: 1,
    bestAccuracyPercent: 88,
    lastAccuracyPercent: 88,
    masteryPercent: 45,
    status: 'initial_acquisition',
    lastAttemptAt: '2026-05-01T10:00:00.000Z',
    nextReviewAt: '2026-05-10T10:00:00.000Z',
    reviewIntervalDays: 1,
    schedulePreset: 'standard',
    ...overrides,
  };
}

describe('academyEngine — honest progress, catalog filters & recommendations', () => {
  it('never counts enrollment, bookmarks, or drafts as completed lessons', () => {
    const state: UserAcademyState = {
      enrolledCourseIds: ['course_foundations'],
      bookmarkedLessonIds: ['les_svo_order'],
      lessonDrafts: {
        les_svo_order: {
          lessonId: 'les_svo_order',
          courseId: 'course_foundations',
          stage: 'guided',
          updatedAt: '2026-05-01T12:00:00.000Z',
          guidedDoneCount: 2,
          independentDoneCount: 0,
        },
      },
    };

    const summaries = buildCourseSummaries({
      courses: CURRICULUM_COURSES,
      lessonAttempts: [],
      lessonMastery: {},
      academyState: state,
      now: new Date('2026-05-02T00:00:00.000Z'),
    });

    const foundations = summaries.find((s) => s.course.id === 'course_foundations');
    assert.ok(foundations);
    assert.equal(foundations.enrolled, true);
    assert.equal(foundations.completedLessonCount, 0);
    assert.equal(foundations.completionPercent, 0);
    assert.equal(foundations.status, 'in_progress');
    assert.equal(foundations.bookmarkedLessonCount, 1);
    assert.equal(foundations.hasActiveDraft, true);
  });

  it('computes verified course completion only from real lesson attempts', () => {
    const attempts = [
      makeAttempt('les_svo_order', '2026-05-01T10:00:00.000Z', 100),
      makeAttempt('les_do_does_questions', '2026-05-01T11:00:00.000Z', 90),
    ];
    const mastery = {
      les_svo_order: makeMastery('les_svo_order'),
      les_do_does_questions: makeMastery('les_do_does_questions'),
    };

    const summaries = buildCourseSummaries({
      courses: CURRICULUM_COURSES,
      lessonAttempts: attempts,
      lessonMastery: mastery,
      academyState: EMPTY_ACADEMY_STATE,
      now: new Date('2026-05-02T00:00:00.000Z'),
    });

    const foundations = summaries.find((s) => s.course.id === 'course_foundations');
    assert.ok(foundations);
    assert.equal(foundations.completedLessonCount, 2);
    assert.equal(foundations.completionPercent, 100);
    assert.equal(foundations.status, 'completed');
    // Single-attempt mastery remains capped honestly at 45%
    assert.equal(foundations.averageMasteryPercent, 45);
  });

  it('filters courses accurately by search query, category, difficulty, status, and sort', () => {
    const summaries = buildCourseSummaries({
      courses: CURRICULUM_COURSES,
      lessonAttempts: [makeAttempt('les_preposition_traps', '2026-05-01T10:00:00.000Z')],
      lessonMastery: { les_preposition_traps: makeMastery('les_preposition_traps') },
      academyState: {
        enrolledCourseIds: ['course_workplace'],
        bookmarkedLessonIds: ['les_interview_impact'],
        lessonDrafts: {},
      },
    });

    const bySearch = filterAndSortCourses(summaries, {
      searchQuery: 'interview',
      category: 'all',
      difficulty: 'all',
      language: 'all',
      status: 'all',
      sortBy: 'recommended',
    });
    assert.ok(bySearch.length >= 1);
    assert.ok(bySearch.some((c) => c.course.id === 'course_workplace'));

    const byBookmarked = filterAndSortCourses(summaries, {
      searchQuery: '',
      category: 'all',
      difficulty: 'all',
      language: 'all',
      status: 'bookmarked',
      sortBy: 'recommended',
    });
    assert.equal(byBookmarked.length, 1);
    assert.equal(byBookmarked[0].course.id, 'course_workplace');

    const byProgressDesc = filterAndSortCourses(summaries, {
      searchQuery: '',
      category: 'all',
      difficulty: 'all',
      language: 'all',
      status: 'all',
      sortBy: 'progress_desc',
    });
    assert.equal(byProgressDesc[0].course.id, 'course_workplace');
  });

  it('builds honest Learning Categories distinguishing playable content from upcoming categories', () => {
    const categories = buildLearningCategories(CURRICULUM_COURSES);
    assert.equal(categories.length, 8);

    const grammar = categories.find((c) => c.key === 'grammar');
    const speaking = categories.find((c) => c.key === 'speaking');
    const reading = categories.find((c) => c.key === 'reading');
    const listening = categories.find((c) => c.key === 'listening');
    const writing = categories.find((c) => c.key === 'writing');
    const pronunciation = categories.find((c) => c.key === 'pronunciation');

    assert.equal(grammar?.availability, 'playable_academy');
    assert.ok((grammar?.lessonCount ?? 0) > 0);
    assert.equal(speaking?.availability, 'playable_module_link');
    assert.equal(speaking?.targetRoute, '/app/speak');
    assert.equal(reading?.availability, 'playable_academy');
    assert.ok((reading?.lessonCount ?? 0) >= 2);
    assert.equal(listening?.availability, 'playable_academy');
    assert.ok((listening?.lessonCount ?? 0) >= 2);
    assert.equal(writing?.availability, 'playable_academy');
    assert.ok((writing?.lessonCount ?? 0) >= 1);
    assert.equal(pronunciation?.availability, 'playable_module_link');
    assert.equal(pronunciation?.targetRoute, '/app/speak');
  });

  it('prioritizes saved draft in Continue Learning over older completed attempts', () => {
    const state: UserAcademyState = {
      enrolledCourseIds: ['course_foundations', 'course_tenses'],
      bookmarkedLessonIds: [],
      lessonDrafts: {
        les_past_simple_markers: {
          lessonId: 'les_past_simple_markers',
          courseId: 'course_tenses',
          stage: 'independent',
          updatedAt: '2026-05-03T12:00:00.000Z',
          guidedDoneCount: 3,
          independentDoneCount: 1,
        },
      },
    };
    const attempts = [makeAttempt('les_svo_order', '2026-05-01T10:00:00.000Z')];
    const mastery = { les_svo_order: makeMastery('les_svo_order') };
    const summaries = buildCourseSummaries({
      courses: CURRICULUM_COURSES,
      lessonAttempts: attempts,
      lessonMastery: mastery,
      academyState: state,
    });

    const target = resolveContinueLearning({
      courses: CURRICULUM_COURSES,
      summaries,
      lessonAttempts: attempts,
      lessonMastery: mastery,
      academyState: state,
      diagnostic: null,
    });

    assert.ok(target);
    assert.equal(target.mode, 'resume_draft');
    assert.equal(target.lesson.id, 'les_past_simple_markers');
    assert.equal(target.draftStage, 'independent');
  });

  it('drives recommendations from due reviews, active mistakes, and diagnostic evidence', () => {
    const now = new Date('2026-05-05T00:00:00.000Z');
    const mastery = {
      les_svo_order: makeMastery('les_svo_order', {
        nextReviewAt: '2026-05-02T00:00:00.000Z', // overdue
      }),
    };
    const mistakes: MistakeMemoryItem[] = [
      {
        id: 'm1',
        userId: 'user_1',
        source: 'lesson_guided',
        category: 'Preposition',
        domain: 'vocabulary',
        patternEn: 'Using in instead of at for specific time',
        patternBn: 'নির্দিষ্ট সময়ের আগে at না বসিয়ে in বসানো',
        userExample: 'I arrive in 9 AM',
        correctedExample: 'I arrive at 9 AM',
        explanationEn: 'Use at for exact times.',
        explanationBn: 'নির্দিষ্ট সময়ের আগে at বসে।',
        occurrences: 3,
        createdAt: '2026-05-01T00:00:00.000Z',
        lastSeenAt: '2026-05-04T00:00:00.000Z',
        status: 'active',
      },
    ];
    const diagnostic: EvidenceStartingProfile = {
      attemptId: 'diag_1',
      userId: 'user_1',
      completedAt: '2026-05-01T00:00:00.000Z',
      totalQuestions: 10,
      totalCorrect: 5,
      accuracyPercent: 50,
      estimatedStartingBand: 'A2',
      estimatedStartingBandBn: 'A2',
      recommendedTrackEn: 'Tense Mastery',
      recommendedTrackBn: 'টেন্স মাস্টারি',
      selfEstimatedLevel: 'A2',
      calibrationNoteEn: 'Aligned',
      calibrationNoteBn: 'সামঞ্জস্যপূর্ণ',
      confidenceCoveragePercent: 80,
      confidenceLabelEn: 'High',
      confidenceLabelBn: 'উচ্চ',
      isCertifiedCefr: false,
      domainBreakdown: [],
      items: [],
      fiveSkillSummary: {
        skills: [],
        assessedSkillCount: 4,
        hasSufficientRadarData: true,
        listeningMode: 'speech_synthesis',
        speakingMode: 'skipped',
        strengthsEn: [],
        strengthsBn: [],
        opportunitiesEn: [],
        opportunitiesBn: [],
        personalizedPath: {
          startingPointEn: 'A2 Foundation',
          startingPointBn: 'A2 ভিত্তি',
          strongestSkills: ['vocabulary'],
          prioritySkills: ['grammar'],
          recommendedFirstLessonId: 'les_past_simple_markers',
          recommendedFirstLessonTitleEn: 'Past Simple Time Markers',
          recommendedFirstLessonTitleBn: 'অতীত কালের সময়সূচক',
          dailyPracticeMinutes: 15,
          nextStepsEn: [],
          nextStepsBn: [],
        },
      },
    };

    const recs = buildRecommendedLessons({
      courses: CURRICULUM_COURSES,
      lessonMastery: mastery,
      mistakes,
      diagnostic,
      profile: null,
      bookmarkedLessonIds: ['les_preposition_traps'],
      now,
      limit: 5,
    });

    assert.equal(recs.length, 5);
    assert.equal(recs[0].priority, 'due_review');
    assert.equal(recs[0].lesson.id, 'les_svo_order');
    assert.equal(recs[1].priority, 'mistake_memory');
    assert.ok(recs[1].lesson.targetCategories.includes('Preposition'));
    assert.ok(recs.some((r) => r.priority === 'diagnostic' && r.lesson.id === 'les_past_simple_markers'));
  });

  it('returns empty Recently Completed for new learners and newest-first verified attempts otherwise', () => {
    const empty = buildRecentlyCompletedLessons({
      courses: CURRICULUM_COURSES,
      lessonAttempts: [],
      lessonMastery: {},
    });
    assert.equal(empty.length, 0);

    const recent = buildRecentlyCompletedLessons({
      courses: CURRICULUM_COURSES,
      lessonAttempts: [
        makeAttempt('les_svo_order', '2026-05-01T08:00:00.000Z', 75),
        makeAttempt('les_do_does_questions', '2026-05-02T09:00:00.000Z', 92),
        makeAttempt('les_svo_order', '2026-05-03T10:00:00.000Z', 100),
      ],
      lessonMastery: {
        les_svo_order: makeMastery('les_svo_order', { attemptCount: 2, masteryPercent: 70 }),
        les_do_does_questions: makeMastery('les_do_does_questions'),
      },
    });

    assert.equal(recent.length, 2);
    assert.equal(recent[0].lesson.id, 'les_svo_order');
    assert.equal(recent[0].attemptCount, 2);
    assert.equal(recent[1].lesson.id, 'les_do_does_questions');
  });

  it('builds Course Detail view model and Previous/Next lesson navigation accurately', () => {
    const course = CURRICULUM_COURSES[0];
    const vm = buildCourseDetailViewModel({
      course,
      allCourses: CURRICULUM_COURSES,
      lessonAttempts: [makeAttempt('les_svo_order', '2026-05-01T10:00:00.000Z')],
      lessonMastery: { les_svo_order: makeMastery('les_svo_order') },
      academyState: EMPTY_ACADEMY_STATE,
      now: new Date('2026-05-02T00:00:00.000Z'),
    });

    assert.equal(vm.ctaMode, 'continue');
    assert.equal(vm.ctaLesson?.id, 'les_do_does_questions');
    assert.equal(vm.modules[0].completedCount, 1);
    assert.equal(vm.modules[0].lessons[0].isCompleted, true);
    assert.equal(vm.modules[0].lessons[1].isCurrentFocus, true);

    const path = buildLearningPathStages(
      buildCourseSummaries({
        courses: CURRICULUM_COURSES,
        lessonAttempts: [],
        lessonMastery: {},
        academyState: EMPTY_ACADEMY_STATE,
      })
    );
    assert.equal(path[0].state, 'current');
    assert.equal(path[1].state, 'available');

    const nav1 = resolveLessonNeighbors(CURRICULUM_COURSES, 'les_svo_order');
    assert.equal(nav1.prevLesson, null);
    assert.equal(nav1.nextLesson?.id, 'les_do_does_questions');
    assert.equal(nav1.currentIndex, 0);
    assert.equal(nav1.totalInCourse, 2);

    const nav2 = resolveLessonNeighbors(CURRICULUM_COURSES, 'les_do_does_questions');
    assert.equal(nav2.prevLesson?.id, 'les_svo_order');
    assert.equal(nav2.nextLesson, null);
  });

  it('does NOT count a failed (<60% / needs_review) attempt as completed in summaries, detail, or Recently Completed', () => {
    const failedAttempt = makeAttempt('les_svo_order', '2026-05-04T10:00:00.000Z', 38);
    const failedMastery = makeMastery('les_svo_order', {
      status: 'needs_review',
      masteryPercent: 28,
      lastAccuracyPercent: 38,
      bestAccuracyPercent: 38,
      attemptCount: 1,
    });

    const summaries = buildCourseSummaries({
      courses: CURRICULUM_COURSES,
      lessonAttempts: [failedAttempt],
      lessonMastery: { les_svo_order: failedMastery },
      academyState: EMPTY_ACADEMY_STATE,
      now: new Date('2026-05-04T12:00:00.000Z'),
    });

    const foundations = summaries.find((s) => s.course.id === 'course_foundations')!;
    assert.equal(foundations.completedLessonCount, 0);
    assert.equal(foundations.completionPercent, 0);
    assert.equal(foundations.status, 'in_progress');
    assert.equal(foundations.nextLesson?.id, 'les_svo_order');

    const recent = buildRecentlyCompletedLessons({
      courses: CURRICULUM_COURSES,
      lessonAttempts: [failedAttempt],
      lessonMastery: { les_svo_order: failedMastery },
    });
    assert.equal(recent.length, 0);

    const detail = buildCourseDetailViewModel({
      course: CURRICULUM_COURSES[0],
      allCourses: CURRICULUM_COURSES,
      lessonAttempts: [failedAttempt],
      lessonMastery: { les_svo_order: failedMastery },
      academyState: EMPTY_ACADEMY_STATE,
      now: new Date('2026-05-04T12:00:00.000Z'),
    });
    assert.equal(detail.modules[0].lessons[0].isCompleted, false);
    assert.equal(detail.modules[0].lessons[0].attemptCount, 1);
    assert.equal(detail.modules[0].lessons[0].masteryStatus, 'needs_review');
  });
});

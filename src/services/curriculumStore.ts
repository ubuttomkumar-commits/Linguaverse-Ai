import type {
  CurriculumCourse,
  CurriculumLesson,
  CurriculumModule,
  CustomCurriculumOverlay,
} from '../types/domain';

const CUSTOM_CURRICULUM_KEY = 'linguaverse_custom_curriculum_v1';

const EMPTY_OVERLAY: CustomCurriculumOverlay = {
  schemaVersion: 1,
  catalogVersion: 1,
  customCourses: [],
  customModules: [],
  customLessons: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function getBrowserStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore SSR/node test contexts
  }
  return null;
}

export function readCustomCurriculumOverlay(): CustomCurriculumOverlay {
  const storage = getBrowserStorage();
  if (!storage) return EMPTY_OVERLAY;
  try {
    const raw = storage.getItem(CUSTOM_CURRICULUM_KEY);
    if (!raw) return EMPTY_OVERLAY;
    const parsed = JSON.parse(raw) as Partial<CustomCurriculumOverlay>;
    return {
      schemaVersion: 1,
      catalogVersion: typeof parsed.catalogVersion === 'number' ? parsed.catalogVersion : 1,
      customCourses: Array.isArray(parsed.customCourses) ? parsed.customCourses : [],
      customModules: Array.isArray(parsed.customModules) ? parsed.customModules : [],
      customLessons: Array.isArray(parsed.customLessons) ? parsed.customLessons : [],
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return EMPTY_OVERLAY;
  }
}

function writeOverlay(overlay: CustomCurriculumOverlay): CustomCurriculumOverlay {
  const storage = getBrowserStorage();
  if (storage) {
    try {
      storage.setItem(CUSTOM_CURRICULUM_KEY, JSON.stringify(overlay));
    } catch {
      // Ignore storage quota errors
    }
  }
  return overlay;
}

export function hydrateCustomCurriculumOverlay(
  serverOverlay: Partial<CustomCurriculumOverlay>
): CustomCurriculumOverlay {
  const normalized: CustomCurriculumOverlay = {
    schemaVersion: 1,
    catalogVersion:
      typeof serverOverlay.catalogVersion === 'number' ? serverOverlay.catalogVersion : 1,
    customCourses: Array.isArray(serverOverlay.customCourses) ? serverOverlay.customCourses : [],
    customModules: Array.isArray(serverOverlay.customModules) ? serverOverlay.customModules : [],
    customLessons: Array.isArray(serverOverlay.customLessons) ? serverOverlay.customLessons : [],
    updatedAt: serverOverlay.updatedAt ?? new Date().toISOString(),
  };
  return writeOverlay(normalized);
}

/**
 * Pure merger combining static base courses with Admin-published courses, modules, and lessons.
 */
export function mergeCurriculumWithOverlay(
  baseCourses: CurriculumCourse[],
  overlay: CustomCurriculumOverlay
): CurriculumCourse[] {
  const courseMap = new Map<string, CurriculumCourse>();

  for (const base of baseCourses) {
    courseMap.set(base.id, {
      ...base,
      version: base.version ?? 1,
      publishedStatus: base.publishedStatus ?? 'published',
      modules: base.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => ({
          ...l,
          version: l.version ?? 1,
          publishedStatus: l.publishedStatus ?? 'published',
        })),
      })),
    });
  }

  // Upsert custom courses (edits override existing course metadata while keeping existing modules)
  for (const cc of overlay.customCourses) {
    const existing = courseMap.get(cc.id);
    if (existing) {
      courseMap.set(cc.id, {
        ...existing,
        ...cc,
        modules: existing.modules,
      });
    } else {
      courseMap.set(cc.id, {
        ...cc,
        modules: [...(cc.modules ?? [])],
      });
    }
  }

  // Upsert custom modules into their parent courses
  for (const cm of overlay.customModules) {
    const parent = courseMap.get(cm.courseId);
    if (!parent) continue;
    const idx = parent.modules.findIndex((m) => m.id === cm.id);
    if (idx >= 0) {
      parent.modules[idx] = {
        ...parent.modules[idx],
        ...cm,
        lessons: parent.modules[idx].lessons,
      };
    } else {
      parent.modules.push({ ...cm, lessons: [...(cm.lessons ?? [])] });
    }
  }

  // Upsert custom lessons into their parent modules
  for (const cl of overlay.customLessons) {
    const parentCourse = courseMap.get(cl.courseId);
    if (!parentCourse) continue;
    const parentMod = parentCourse.modules.find((m) => m.id === cl.moduleId);
    if (!parentMod) continue;
    const idx = parentMod.lessons.findIndex((l) => l.id === cl.id);
    if (idx >= 0) {
      parentMod.lessons[idx] = cl;
    } else {
      parentMod.lessons.push(cl);
    }
  }

  return Array.from(courseMap.values())
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      ...c,
      modules: c.modules
        .sort((a, b) => a.order - b.order)
        .map((m) => ({
          ...m,
          lessons: m.lessons.sort((a, b) => a.order - b.order),
        })),
    }));
}

export function upsertPublishedCourse(course: CurriculumCourse): CustomCurriculumOverlay {
  const current = readCustomCurriculumOverlay();
  const idx = current.customCourses.findIndex((c) => c.id === course.id);
  const nextCourses = [...current.customCourses];
  const nextVersion = idx >= 0 ? (nextCourses[idx].version ?? 1) + 1 : course.version ?? 1;
  const versionedCourse: CurriculumCourse = {
    ...course,
    version: nextVersion,
    publishedStatus: course.publishedStatus ?? 'published',
    isCustom: true,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    nextCourses[idx] = versionedCourse;
  } else {
    nextCourses.push(versionedCourse);
  }

  return writeOverlay({
    ...current,
    catalogVersion: current.catalogVersion + 1,
    customCourses: nextCourses,
    updatedAt: new Date().toISOString(),
  });
}

export function upsertPublishedModule(mod: CurriculumModule): CustomCurriculumOverlay {
  const current = readCustomCurriculumOverlay();
  const idx = current.customModules.findIndex((m) => m.id === mod.id);
  const nextModules = [...current.customModules];
  if (idx >= 0) {
    nextModules[idx] = mod;
  } else {
    nextModules.push(mod);
  }

  return writeOverlay({
    ...current,
    catalogVersion: current.catalogVersion + 1,
    customModules: nextModules,
    updatedAt: new Date().toISOString(),
  });
}

export function upsertPublishedLesson(lesson: CurriculumLesson): CustomCurriculumOverlay {
  const current = readCustomCurriculumOverlay();
  const idx = current.customLessons.findIndex((l) => l.id === lesson.id);
  const nextLessons = [...current.customLessons];
  const nextVersion = idx >= 0 ? (nextLessons[idx].version ?? 1) + 1 : lesson.version ?? 1;
  const versionedLesson: CurriculumLesson = {
    ...lesson,
    version: nextVersion,
    publishedStatus: lesson.publishedStatus ?? 'published',
    isCustom: true,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    nextLessons[idx] = versionedLesson;
  } else {
    nextLessons.push(versionedLesson);
  }

  return writeOverlay({
    ...current,
    catalogVersion: current.catalogVersion + 1,
    customLessons: nextLessons,
    updatedAt: new Date().toISOString(),
  });
}

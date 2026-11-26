import { DIAGNOSTIC_QUESTIONS } from './diagnosticData';
import { evaluateDiagnosticAttempt } from './diagnosticEngine';
import { getAllLessons } from './curriculumData';
import type {
  AssessmentSkillKey,
  DailyTimeGoalMinutes,
  DiagnosticQuestion,
  DiagnosticUserAnswer,
  EvidenceStartingProfile,
  FiveSkillAssessmentSummary,
  FiveSkillResultItem,
  LearningGoalId,
  MistakeMemoryItem,
  PersonalizedLearningPath,
  SelfEstimatedLevel,
} from '../types/domain';

export interface ListeningAssessmentQuestion {
  id: string;
  order: number;
  titleEn: string;
  titleBn: string;
  /** Exact spoken script played via browser Speech Synthesis (never shown before audio unless playback fails) */
  spokenScriptEn: string;
  promptEn: string;
  promptBn: string;
  options: { id: string; label: string }[];
  correctAnswer: string;
  explanationEn: string;
  explanationBn: string;
}

export interface SpeakingAssessmentPrompt {
  id: string;
  titleEn: string;
  titleBn: string;
  promptEn: string;
  promptBn: string;
  guidanceEn: string;
  guidanceBn: string;
  maxSeconds: number;
}

/** Additional written items expanding Vocabulary, Grammar, and Reading cleanly alongside core 5 diagnostic items */
export const SUPPLEMENTAL_ASSESSMENT_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'assess_vocab_2',
    order: 6,
    domain: 'vocabulary',
    type: 'mcq',
    promptEn:
      'Choose the word that best fits this context:\n"Because the project deadline moved up, we need a _____ solution we can deploy this week."',
    promptBn:
      'প্রসঙ্গ অনুযায়ী সবচেয়ে উপযুক্ত শব্দটি বেছে নিন:\n"Because the project deadline moved up, we need a _____ solution we can deploy this week."',
    options: [
      { id: 'practical', label: 'practical' },
      { id: 'fragile', label: 'fragile' },
      { id: 'hesitant', label: 'hesitant' },
      { id: 'vague', label: 'vague' },
    ],
    correctAnswer: 'practical',
    mistakeCategory: 'Contextual Vocabulary',
    mistakePatternEn: 'Choosing context-appropriate workplace adjectives',
    mistakePatternBn: 'কর্মক্ষেত্রের প্রসঙ্গ অনুযায়ী সঠিক বিশেষণ নির্বাচন',
    explanationEn:
      '"Practical" means realistic and immediately workable, which fits an urgent weekly deployment.',
    explanationBn:
      '"Practical" অর্থ বাস্তবসম্মত ও দ্রুত প্রয়োগযোগ্য—জরুরি প্রজেক্টের ক্ষেত্রে এটিই সবচেয়ে স্বাভাবিক।',
  },
  {
    id: 'assess_vocab_3',
    order: 7,
    domain: 'vocabulary',
    type: 'mcq',
    promptEn:
      'What does "follow up" mean in this message?\n"Thanks for sending the proposal. I will follow up with our finance lead tomorrow."',
    promptBn:
      'এই বার্তায় "follow up" বলতে কী বোঝানো হয়েছে?\n"Thanks for sending the proposal. I will follow up with our finance lead tomorrow."',
    options: [
      { id: 'cancel_plan', label: 'Cancel the proposal immediately' },
      { id: 'check_back', label: 'Check back and continue the next step' },
      { id: 'walk_behind', label: 'Walk physically behind someone' },
      { id: 'reject_budget', label: 'Reject the budget permanently' },
    ],
    correctAnswer: 'check_back',
    mistakeCategory: 'Phrasal Verb Meaning',
    mistakePatternEn: 'Understanding high-frequency workplace phrasal verbs ("follow up")',
    mistakePatternBn: 'প্রচলিত Phrasal Verb ("follow up")-এর সঠিক অর্থ বোঝা',
    explanationEn:
      '"Follow up" means checking back on a previous discussion or taking the next action to keep work moving.',
    explanationBn:
      '"Follow up" বলতে আগের আলোচনার ধারাবাহিকতায় পুনরায় খোঁজ নেওয়া বা পরবর্তী পদক্ষেপ নেওয়াকে বোঝায়।',
  },
  {
    id: 'assess_reading_2',
    order: 8,
    domain: 'reading',
    type: 'mcq',
    passageEn:
      'Many adult learners memorize hundreds of isolated vocabulary words yet still freeze during live meetings. Research on skill transfer shows that recognition and spoken recall rely on different habits: practicing short, spoken responses under mild time pressure helps bridge that gap much faster than passive rereading.',
    passageBnHint:
      'ছোট অনুচ্ছেদটি পড়ে মূল ধারণা (main idea) শনাক্ত করুন।',
    promptEn: 'What is the main idea of this passage?',
    promptBn: 'এই অনুচ্ছেদটির মূল বক্তব্য কী?',
    options: [
      { id: 'main_a', label: 'Memorizing long word lists alone guarantees fluent speaking.' },
      { id: 'main_b', label: 'Active spoken recall bridges the gap between knowing words and speaking.' },
      { id: 'main_c', label: 'Adult learners should stop reading English completely.' },
      { id: 'main_d', label: 'Meetings should avoid time limits so nobody speaks.' },
    ],
    correctAnswer: 'main_b',
    mistakeCategory: 'Reading Main Idea',
    mistakePatternEn: 'Identifying the central claim of a short informational passage',
    mistakePatternBn: 'সংক্ষিপ্ত অনুচ্ছেদের মূল বক্তব্য নির্ভুলভাবে শনাক্ত করা',
    explanationEn:
      'The passage contrasts passive word memorization with active spoken recall, arguing that active practice transfers much better to real meetings.',
    explanationBn:
      'অনুচ্ছেদটিতে বলা হয়েছে শুধু শব্দ মুখস্থ না করে সক্রিয়ভাবে মুখে বলার অনুশীলন করলে বাস্তব মিটিংয়ে কথা বলার জড়তা দ্রুত কাটে।',
  },
];

export const LISTENING_ASSESSMENT_QUESTIONS: ListeningAssessmentQuestion[] = [
  {
    id: 'assess_listen_1',
    order: 1,
    titleEn: 'Listening Clip 1 — Schedule Update',
    titleBn: 'লিসেনিং ক্লিপ ১ — সময়সূচি পরিবর্তন',
    spokenScriptEn:
      'Good morning everyone. Quick update: our design review has moved from room four B to the main conference room on the third floor, and we will start fifteen minutes later at ten fifteen.',
    promptEn: 'Where and when will the design review take place?',
    promptBn: 'ডিজাইন রিভিউটি কোথায় এবং কখন অনুষ্ঠিত হবে?',
    options: [
      { id: 'l1_a', label: 'Room 4B at 10:00' },
      { id: 'l1_b', label: 'Main conference room on the 3rd floor at 10:15' },
      { id: 'l1_c', label: 'Main conference room on the 4th floor at 10:30' },
      { id: 'l1_d', label: 'Online only at 11:00' },
    ],
    correctAnswer: 'l1_b',
    explanationEn:
      'The speaker moves the meeting to the main conference room on the third floor and shifts the start time fifteen minutes later to 10:15.',
    explanationBn:
      'বক্তা জানিয়েছেন মিটিংটি তৃতীয় তলার মেইন কনফারেন্স রুমে সরানো হয়েছে এবং ১৫ মিনিট পিছিয়ে ১০:১৫-এ শুরু হবে।',
  },
  {
    id: 'assess_listen_2',
    order: 2,
    titleEn: 'Listening Clip 2 — Customer Request',
    titleBn: 'লিসেনিং ক্লিপ ২ — কাস্টমার অনুরোধ',
    spokenScriptEn:
      'Hi, I ordered two blue notebooks yesterday, and the package arrived today with one blue notebook and one red one. Could you send a replacement blue notebook before Friday?',
    promptEn: 'What issue is the customer reporting?',
    promptBn: 'গ্রাহক কোন সমস্যার কথা জানাচ্ছেন?',
    options: [
      { id: 'l2_a', label: 'The entire order never arrived.' },
      { id: 'l2_b', label: 'One of the two notebooks arrived in the wrong color.' },
      { id: 'l2_c', label: 'They want to cancel the order and get a refund only.' },
      { id: 'l2_d', label: 'Both notebooks were damaged during shipping.' },
    ],
    correctAnswer: 'l2_b',
    explanationEn:
      'The customer ordered two blue notebooks, received one blue and one red, and asked for a replacement blue notebook before Friday.',
    explanationBn:
      'গ্রাহক দুটি নীল নোটবুক অর্ডার করেছিলেন, কিন্তু একটি নীল ও একটি লাল পেয়েছেন এবং শুক্রবারের আগে সঠিকটি চেয়েছেন।',
  },
];

export const SPEAKING_ASSESSMENT_PROMPT: SpeakingAssessmentPrompt = {
  id: 'assess_speak_1',
  titleEn: 'Short Spoken Introduction',
  titleBn: 'সংক্ষিপ্ত মৌখিক পরিচিতি',
  promptEn:
    'In 20 to 40 seconds, introduce yourself and describe one real situation where you want to use English more confidently.',
  promptBn:
    '২০ থেকে ৪০ সেকেন্ডের মধ্যে আপনার সংক্ষিপ্ত পরিচয় দিন এবং একটি বাস্তব পরিস্থিতির কথা বলুন যেখানে আপনি আরও আত্মবিশ্বাসের সাথে ইংরেজি বলতে চান।',
  guidanceEn:
    'Speak naturally at your own pace. Perfection is not expected—this helps measure real spoken patterns only when speech processing is active.',
  guidanceBn:
    'নিজের স্বাভাবিক গতিতে কথা বলুন। নির্ভুল হওয়া বাধ্যতামূলক নয়—স্পিচ প্রসেসিং চালু থাকলে এটি আপনার বলার ধরন বুঝতে সাহায্য করবে।',
  maxSeconds: 45,
};

export interface AssessmentSpeakingInput {
  mode: 'ai_evaluated' | 'recorded_unscored' | 'skipped' | 'unavailable';
  transcript?: string;
  aiMistakesCount?: number;
  aiCorrectElementsCount?: number;
  aiCoachNoteEn?: string;
  aiCoachNoteBn?: string;
}

export interface FiveSkillEvaluationParams {
  attemptId: string;
  userId: string;
  selfEstimatedLevel: SelfEstimatedLevel;
  dailyPracticeMinutes: DailyTimeGoalMinutes;
  learningGoals?: LearningGoalId[];
  writtenAnswers: DiagnosticUserAnswer[];
  listeningAnswers: Record<string, string>;
  listeningMode: 'speech_synthesis' | 'skipped' | 'unavailable';
  speakingInput: AssessmentSpeakingInput;
  completedAt?: string;
}

const SKILL_DISPLAY_NAMES: Record<AssessmentSkillKey, { en: string; bn: string }> = {
  vocabulary: { en: 'Vocabulary', bn: 'শব্দভাণ্ডার (Vocabulary)' },
  grammar: { en: 'Grammar', bn: 'গ্রামার (Grammar)' },
  reading: { en: 'Reading', bn: 'পড়ে বোঝা (Reading)' },
  listening: { en: 'Listening', bn: 'শুনে বোঝা (Listening)' },
  speaking: { en: 'Speaking', bn: 'কথা বলা (Speaking)' },
};

export function getSkillDisplayName(skill: AssessmentSkillKey, lang: 'en' | 'bn'): string {
  return lang === 'bn' ? SKILL_DISPLAY_NAMES[skill].bn : SKILL_DISPLAY_NAMES[skill].en;
}

export function getAllWrittenAssessmentQuestions(): DiagnosticQuestion[] {
  return [...DIAGNOSTIC_QUESTIONS, ...SUPPLEMENTAL_ASSESSMENT_QUESTIONS];
}

function buildPersonalizedLearningPath(params: {
  skills: FiveSkillResultItem[];
  dailyPracticeMinutes: DailyTimeGoalMinutes;
  learningGoals?: LearningGoalId[];
  estimatedStartingBand: string;
  estimatedStartingBandBn: string;
}): PersonalizedLearningPath {
  const assessed = params.skills
    .filter((s) => s.status === 'assessed' && typeof s.scorePercent === 'number')
    .sort((a, b) => (b.scorePercent ?? 0) - (a.scorePercent ?? 0));

  const strongestSkills = assessed
    .filter((s) => (s.scorePercent ?? 0) >= 65)
    .slice(0, 2)
    .map((s) => s.skill);

  const weakestAssessed = [...assessed]
    .reverse()
    .filter((s) => (s.scorePercent ?? 0) < 85)
    .map((s) => s.skill);

  const unassessedSkills = params.skills
    .filter((s) => s.status !== 'assessed')
    .map((s) => s.skill);

  const prioritySkills = [...weakestAssessed, ...unassessedSkills].slice(0, 3);

  const allLessons = getAllLessons();
  // Choose a real lesson from the actual curriculum based on weakest skill / learner goal
  let recommendedLesson = allLessons[0];
  if (prioritySkills[0] === 'grammar') {
    recommendedLesson =
      allLessons.find((l) =>
        l.targetCategories.some((c) => c === 'Tense' || c === 'Grammar' || c === 'Preposition')
      ) ?? allLessons[0];
  } else if (prioritySkills[0] === 'vocabulary') {
    recommendedLesson =
      allLessons.find((l) =>
        l.targetCategories.some((c) => c === 'Vocabulary' || c === 'Collocation')
      ) ?? allLessons[0];
  } else if (params.learningGoals?.includes('prepare_interviews')) {
    recommendedLesson =
      allLessons.find((l) => /interview|intro|past/i.test(l.titleEn)) ?? allLessons[0];
  }

  const nextStepsEn: string[] = [
    `Start with "${recommendedLesson?.titleEn ?? 'Foundational Speaking Lesson'}" (${params.dailyPracticeMinutes} min/day target).`,
  ];
  const nextStepsBn: string[] = [
    `"${recommendedLesson?.titleBn ?? 'মৌলিক স্পিকিং লেসন'}" দিয়ে শুরু করুন (দৈনিক ${params.dailyPracticeMinutes} মিনিট লক্ষ্য)।`,
  ];

  if (prioritySkills.includes('speaking')) {
    nextStepsEn.push(
      'Complete a short guided session in AI Speaking Studio to gather active spoken evidence.'
    );
    nextStepsBn.push(
      'বাস্তব বলার প্রমাণ সংগ্রহ করতে AI স্পিকিং স্টুডিওতে একটি সংক্ষিপ্ত সেশন সম্পন্ন করুন।'
    );
  }
  if (prioritySkills.includes('grammar') || prioritySkills.includes('vocabulary')) {
    nextStepsEn.push(
      'Review any logged patterns in Mistake Memory before moving to timed Transfer Lab tasks.'
    );
    nextStepsBn.push(
      'ট্রান্সফার ল্যাবে যাওয়ার আগে মিস্টেক মেমোরিতে সংরক্ষিত ভুলগুলো একবার রিভিউ করুন।'
    );
  }
  if (prioritySkills.includes('listening')) {
    nextStepsEn.push(
      'Enable audio playback in a quiet space to complete listening practice when ready.'
    );
    nextStepsBn.push(
      'সুবিধাজনক সময়ে অডিও চালু করে লিসেনিং অনুশীলন যুক্ত করুন।'
    );
  }

  return {
    startingPointEn: params.estimatedStartingBand,
    startingPointBn: params.estimatedStartingBandBn,
    strongestSkills,
    prioritySkills,
    recommendedFirstLessonId: recommendedLesson?.id ?? 'c1_m1_l1',
    recommendedFirstLessonTitleEn:
      recommendedLesson?.titleEn ?? 'Core Sentence Clarity & Natural Verbs',
    recommendedFirstLessonTitleBn:
      recommendedLesson?.titleBn ?? 'মৌলিক বাক্য গঠন ও স্বাভাবিক ক্রিয়া',
    dailyPracticeMinutes: params.dailyPracticeMinutes,
    nextStepsEn,
    nextStepsBn,
  };
}

/**
 * Evaluates all 5 skills honestly:
 * - Vocabulary, Grammar (+ Sentence Construction), and Reading are evaluated from actual answers.
 * - Listening is evaluated ONLY when real audio clips were played and answered.
 * - Speaking is evaluated ONLY when a real speech transcript was evaluated by the backend AI service.
 * - Never fabricates scores, CEFR certifications, or pronunciation metrics.
 */
export function evaluateFiveSkillAssessment(params: FiveSkillEvaluationParams): {
  profile: EvidenceStartingProfile;
  mistakes: MistakeMemoryItem[];
} {
  const completedAt = params.completedAt ?? new Date().toISOString();

  // 1. Evaluate core 5 diagnostic items via existing canonical diagnostic engine
  const baseEval = evaluateDiagnosticAttempt({
    attemptId: params.attemptId,
    userId: params.userId,
    selfEstimatedLevel: params.selfEstimatedLevel,
    answers: params.writtenAnswers,
    completedAt,
  });

  const answerMap = new Map<string, string>();
  for (const ans of params.writtenAnswers) {
    answerMap.set(ans.questionId, ans.userResponse);
  }

  // 2. Evaluate supplemental written items (Vocab x2, Reading x1)
  const extraItems = SUPPLEMENTAL_ASSESSMENT_QUESTIONS.map((q) => {
    const raw = (answerMap.get(q.id) ?? '').trim();
    const isCorrect = raw === q.correctAnswer;
    const matchLabel = q.options?.find((o) => o.id === raw)?.label ?? raw;
    const correctLabel = q.options?.find((o) => o.id === q.correctAnswer)?.label ?? q.correctAnswer;
    return {
      question: q,
      isCorrect,
      userResponse: matchLabel,
      correctAnswer: correctLabel,
    };
  });

  const allEvaluatedWritten = [
    ...baseEval.profile.items,
    ...extraItems.map((e) => ({
      questionId: e.question.id,
      domain: e.question.domain,
      userResponse: e.userResponse,
      correctAnswer: e.correctAnswer,
      isCorrect: e.isCorrect,
      mistakeCategory: e.question.mistakeCategory,
      mistakePatternEn: e.question.mistakePatternEn,
      mistakePatternBn: e.question.mistakePatternBn,
      explanationEn: e.question.explanationEn,
      explanationBn: e.question.explanationBn,
    })),
  ];

  // Aggregate Vocabulary (3 items), Grammar (grammar + sentence_construction = 3 items), Reading (2 items)
  const vocabItems = allEvaluatedWritten.filter((i) => i.domain === 'vocabulary');
  const grammarItems = allEvaluatedWritten.filter(
    (i) => i.domain === 'grammar' || i.domain === 'sentence_construction'
  );
  const readingItems = allEvaluatedWritten.filter((i) => i.domain === 'reading');

  const vocabCorrect = vocabItems.filter((i) => i.isCorrect).length;
  const grammarCorrect = grammarItems.filter((i) => i.isCorrect).length;
  const readingCorrect = readingItems.filter((i) => i.isCorrect).length;

  const vocabSkill: FiveSkillResultItem = {
    skill: 'vocabulary',
    status: 'assessed',
    scorePercent: Math.round((vocabCorrect / Math.max(1, vocabItems.length)) * 100),
    correctCount: vocabCorrect,
    totalCount: vocabItems.length,
    noteEn: `${vocabCorrect} of ${vocabItems.length} contextual vocabulary items accurate.`,
    noteBn: `${vocabItems.length}টির মধ্যে ${vocabCorrect}টি শব্দভাণ্ডার প্রশ্ন সঠিক হয়েছে।`,
  };

  const grammarSkill: FiveSkillResultItem = {
    skill: 'grammar',
    status: 'assessed',
    scorePercent: Math.round((grammarCorrect / Math.max(1, grammarItems.length)) * 100),
    correctCount: grammarCorrect,
    totalCount: grammarItems.length,
    noteEn: `${grammarCorrect} of ${grammarItems.length} grammar and sentence-structure items accurate.`,
    noteBn: `${grammarItems.length}টির মধ্যে ${grammarCorrect}টি গ্রামার ও বাক্য গঠন প্রশ্ন সঠিক হয়েছে।`,
  };

  const readingSkill: FiveSkillResultItem = {
    skill: 'reading',
    status: 'assessed',
    scorePercent: Math.round((readingCorrect / Math.max(1, readingItems.length)) * 100),
    correctCount: readingCorrect,
    totalCount: readingItems.length,
    noteEn: `${readingCorrect} of ${readingItems.length} reading comprehension items accurate.`,
    noteBn: `${readingItems.length}টির মধ্যে ${readingCorrect}টি প্যাসেজ বোধগম্যতা প্রশ্ন সঠিক হয়েছে।`,
  };

  // 3. Listening skill — ONLY scored when audio played and answered
  let listeningSkill: FiveSkillResultItem;
  const listeningAnsweredCount = LISTENING_ASSESSMENT_QUESTIONS.filter(
    (q) => Boolean((params.listeningAnswers[q.id] ?? '').trim())
  ).length;

  if (params.listeningMode === 'speech_synthesis' && listeningAnsweredCount > 0) {
    const listenCorrect = LISTENING_ASSESSMENT_QUESTIONS.filter(
      (q) => (params.listeningAnswers[q.id] ?? '').trim() === q.correctAnswer
    ).length;
    listeningSkill = {
      skill: 'listening',
      status: 'assessed',
      scorePercent: Math.round((listenCorrect / LISTENING_ASSESSMENT_QUESTIONS.length) * 100),
      correctCount: listenCorrect,
      totalCount: LISTENING_ASSESSMENT_QUESTIONS.length,
      noteEn: `${listenCorrect} of ${LISTENING_ASSESSMENT_QUESTIONS.length} audio comprehension questions accurate.`,
      noteBn: `${LISTENING_ASSESSMENT_QUESTIONS.length}টির মধ্যে ${listenCorrect}টি লিসেনিং প্রশ্ন সঠিক হয়েছে।`,
    };
  } else {
    listeningSkill = {
      skill: 'listening',
      status: params.listeningMode === 'unavailable' ? 'unavailable' : 'not_assessed',
      scorePercent: null,
      correctCount: 0,
      totalCount: LISTENING_ASSESSMENT_QUESTIONS.length,
      noteEn:
        params.listeningMode === 'unavailable'
          ? 'Audio synthesis was unavailable on this browser — not assessed yet.'
          : 'Skipped for now — not assessed yet.',
      noteBn:
        params.listeningMode === 'unavailable'
          ? 'এই ব্রাউজারে অডিও প্লেব্যাক পাওয়া যায়নি — এখনো মূল্যায়িত হয়নি।'
          : 'এখনকার মতো এড়িয়ে যাওয়া হয়েছে — এখনো মূল্যায়িত হয়নি।',
    };
  }

  // 4. Speaking skill — ONLY scored when real AI evaluation succeeded on a real user transcript
  let speakingSkill: FiveSkillResultItem;
  if (
    params.speakingInput.mode === 'ai_evaluated' &&
    params.speakingInput.transcript &&
    params.speakingInput.transcript.trim().length > 0
  ) {
    const mistakesCount = Math.max(0, params.speakingInput.aiMistakesCount ?? 0);
    const correctCount = Math.max(1, params.speakingInput.aiCorrectElementsCount ?? 1);
    // Conservative text-transcript grammar/clarity evidence ratio (explicitly NOT an acoustic pronunciation score)
    const ratio = Math.round((correctCount / (correctCount + mistakesCount)) * 100);
    speakingSkill = {
      skill: 'speaking',
      status: 'assessed',
      scorePercent: Math.max(15, Math.min(100, ratio)),
      correctCount,
      totalCount: correctCount + mistakesCount,
      noteEn:
        params.speakingInput.aiCoachNoteEn ||
        'Transcript structure evaluated by AI Speaking Coach (acoustic pronunciation not scored).',
      noteBn:
        params.speakingInput.aiCoachNoteBn ||
        'আপনার বলার ট্রান্সক্রিপ্ট AI কোচ দ্বারা বিশ্লেষিত হয়েছে (অ্যাকোস্টিক উচ্চারণ স্কোর নয়)।',
    };
  } else {
    speakingSkill = {
      skill: 'speaking',
      status: params.speakingInput.mode === 'unavailable' ? 'unavailable' : 'not_assessed',
      scorePercent: null,
      correctCount: 0,
      totalCount: 1,
      noteEn:
        params.speakingInput.mode === 'unavailable'
          ? 'Automated speech analysis service is not configured right now — not assessed yet.'
          : params.speakingInput.mode === 'recorded_unscored'
            ? 'Voice clip recorded locally, but live AI speech processing is unavailable — not scored.'
            : 'Skipped for now — not assessed yet.',
      noteBn:
        params.speakingInput.mode === 'unavailable'
          ? 'স্বয়ংক্রিয় স্পিচ বিশ্লেষণ সার্ভিস এই মুহূর্তে চালু নেই — এখনো মূল্যায়িত হয়নি।'
          : params.speakingInput.mode === 'recorded_unscored'
            ? 'ভয়েস ক্লিপ রেকর্ড হয়েছে, তবে লাইভ AI স্পিচ প্রসেসিং অনুপলব্ধ থাকায় স্কোর দেওয়া হয়নি।'
            : 'এখনকার মতো এড়িয়ে যাওয়া হয়েছে — এখনো মূল্যায়িত হয়নি।',
    };
  }

  const skills: FiveSkillResultItem[] = [
    vocabSkill,
    grammarSkill,
    readingSkill,
    listeningSkill,
    speakingSkill,
  ];

  const assessedSkills = skills.filter((s) => s.status === 'assessed');
  const assessedSkillCount = assessedSkills.length;
  const hasSufficientRadarData = assessedSkillCount >= 3;

  // Compute honest coverage percent strictly proportional to how many of the 5 skills were actually assessed
  // Max initial diagnostic coverage is capped at 50% (since one short sitting is never full proficiency proof)
  const coveragePercent = Math.min(50, assessedSkillCount * 10);

  const strengthsEn: string[] = [];
  const strengthsBn: string[] = [];
  const opportunitiesEn: string[] = [];
  const opportunitiesBn: string[] = [];

  for (const s of skills) {
    if (s.status === 'assessed' && s.scorePercent !== null) {
      if (s.scorePercent >= 70) {
        strengthsEn.push(
          `${SKILL_DISPLAY_NAMES[s.skill].en} (${s.scorePercent}%) — solid accuracy on initial diagnostic items.`
        );
        strengthsBn.push(
          `${SKILL_DISPLAY_NAMES[s.skill].bn} (${s.scorePercent}%) — প্রাথমিক মূল্যায়নে ভালো নির্ভুলতা দেখা গেছে।`
        );
      } else {
        opportunitiesEn.push(
          `${SKILL_DISPLAY_NAMES[s.skill].en} (${s.scorePercent}%) — targeted drills can close recurring gaps quickly.`
        );
        opportunitiesBn.push(
          `${SKILL_DISPLAY_NAMES[s.skill].bn} (${s.scorePercent}%) — নির্দিষ্ট অনুশীলনে দ্রুত উন্নতি সম্ভব।`
        );
      }
    } else {
      opportunitiesEn.push(
        `${SKILL_DISPLAY_NAMES[s.skill].en} (Not assessed yet) — gather real evidence once ready.`
      );
      opportunitiesBn.push(
        `${SKILL_DISPLAY_NAMES[s.skill].bn} (এখনো মূল্যায়িত হয়নি) — প্রস্তুত হলে বাস্তব প্রমাণ সংগ্রহ করুন।`
      );
    }
  }

  if (strengthsEn.length === 0) {
    strengthsEn.push(
      'You completed the initial diagnostic honestly—this gives LINGUAVERSE AI an accurate starting baseline.'
    );
    strengthsBn.push(
      'আপনি সততার সাথে প্রাথমিক মূল্যায়ন সম্পন্ন করেছেন—এটি আপনার সঠিক শেখার পথ তৈরিতে সাহায্য করবে।'
    );
  }

  const personalizedPath = buildPersonalizedLearningPath({
    skills,
    dailyPracticeMinutes: params.dailyPracticeMinutes,
    learningGoals: params.learningGoals,
    estimatedStartingBand: baseEval.profile.estimatedStartingBand,
    estimatedStartingBandBn: baseEval.profile.estimatedStartingBandBn,
  });

  const fiveSkillSummary: FiveSkillAssessmentSummary = {
    skills,
    assessedSkillCount,
    hasSufficientRadarData,
    listeningMode: params.listeningMode,
    speakingMode: params.speakingInput.mode,
    speakingTranscript: params.speakingInput.transcript,
    speakingCoachNoteEn: params.speakingInput.aiCoachNoteEn,
    speakingCoachNoteBn: params.speakingInput.aiCoachNoteBn,
    strengthsEn,
    strengthsBn,
    opportunitiesEn,
    opportunitiesBn,
    personalizedPath,
  };

  // Extra mistakes from supplemental written items
  const extraMistakes: MistakeMemoryItem[] = extraItems
    .filter((e) => !e.isCorrect)
    .map((e) => ({
      id: `mm_${params.attemptId}_${e.question.id}`,
      userId: params.userId,
      source: 'diagnostic',
      domain: e.question.domain,
      category: e.question.mistakeCategory,
      userExample: e.userResponse || '(No response)',
      correctedExample: e.correctAnswer,
      patternEn: e.question.mistakePatternEn,
      patternBn: e.question.mistakePatternBn,
      explanationEn: e.question.explanationEn,
      explanationBn: e.question.explanationBn,
      occurrences: 1,
      status: 'active',
      createdAt: completedAt,
    }));

  const totalWrittenCorrect = allEvaluatedWritten.filter((i) => i.isCorrect).length;
  const totalWrittenCount = allEvaluatedWritten.length;
  const overallWrittenAcc = Math.round((totalWrittenCorrect / Math.max(1, totalWrittenCount)) * 100);

  const calibrationNoteEn =
    overallWrittenAcc >= 75
      ? `You self-estimated ${params.selfEstimatedLevel}, and this ${totalWrittenCount}-item written diagnostic (${assessedSkillCount}/5 skills assessed) confirms solid baseline accuracy. Targeted speaking and transfer practice will deepen real-time fluency.`
      : `You self-estimated ${params.selfEstimatedLevel}, while this ${totalWrittenCount}-item written diagnostic (${assessedSkillCount}/5 skills assessed) surfaced specific grammar, vocabulary, or comprehension gaps. We will prioritize closing those patterns first.`;

  const calibrationNoteBn =
    overallWrittenAcc >= 75
      ? `আপনি নিজের স্তর ${params.selfEstimatedLevel} হিসেবে অনুমান করেছেন এবং ${totalWrittenCount}টি লিখিত প্রশ্নের প্রাথমিক মূল্যায়নে (${assessedSkillCount}/৫ দক্ষতা মূল্যায়িত) ভালো ভিত্তি দেখা গেছে। নিয়মিত স্পিকিং ও ট্রান্সফার অনুশীলন আপনার সাবলীলতা আরও বাড়াবে।`
      : `আপনি নিজের স্তর ${params.selfEstimatedLevel} হিসেবে অনুমান করেছেন, তবে ${totalWrittenCount}টি লিখিত প্রশ্নের প্রাথমিক মূল্যায়নে (${assessedSkillCount}/৫ দক্ষতা মূল্যায়িত) গ্রামার, শব্দভাণ্ডার বা বোধগম্যতায় কিছু নির্দিষ্ট ঘাটতি ধরা পড়েছে। আমরা প্রথমে সেগুলো ঠিক করব।`;

  const combinedProfile: EvidenceStartingProfile = {
    ...baseEval.profile,
    totalCorrect: totalWrittenCorrect,
    totalQuestions: totalWrittenCount,
    accuracyPercent: overallWrittenAcc,
    calibrationNoteEn,
    calibrationNoteBn,
    confidenceCoveragePercent: coveragePercent,
    confidenceLabelEn: `Initial Diagnostic Evidence (${assessedSkillCount}/5 skills assessed · ${coveragePercent}% coverage · Not an official CEFR certification)`,
    confidenceLabelBn: `প্রাথমিক ডায়াগনস্টিক প্রমাণ (${assessedSkillCount}/৫ দক্ষতা মূল্যায়িত · ${coveragePercent}% কভারেজ · এটি কোনো সনদপ্রাপ্ত CEFR সার্টিফিকেট নয়)`,
    items: allEvaluatedWritten,
    fiveSkillSummary,
  };

  return {
    profile: combinedProfile,
    mistakes: [...baseEval.mistakes, ...extraMistakes],
  };
}

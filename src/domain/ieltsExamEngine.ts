/**
 * IELTS & English Examination Preparation Domain Engine (PRD v6.1 §22)
 *
 * Truth Policy (§22.6):
 * - All tasks are 100% original examination-style practice materials (zero copyrighted official tests).
 * - AI rubric feedback is strictly labeled as PRACTICE ESTIMATE, never an official IELTS band score
 *   and never endorsed by British Council, IDP, or Cambridge Assessment English.
 */

export type IeltsModuleType = 'speaking' | 'writing' | 'reading' | 'listening';

export interface IeltsObjectiveQuestion {
  id: string;
  questionType: 'mcq' | 'tfng';
  promptEn: string;
  options: string[];
  correctOptionIndex: number;
  explanationEn: string;
  explanationBn: string;
}

export interface IeltsExamTask {
  id: string;
  module: IeltsModuleType;
  subType: string;
  titleEn: string;
  titleBn: string;
  targetMinutes: number;
  difficultyBand: 'A2-B1' | 'B1-B2' | 'B2-C1';
  instructionsEn: string;
  instructionsBn: string;
  promptTextEn: string;
  cueBulletsEn?: string[];
  followUpQuestionsEn?: string[];
  minWordCount?: number;
  passageOrTranscriptEn?: string;
  questions?: IeltsObjectiveQuestion[];
}

export interface IeltsRubricFeedback {
  taskResponseOrAchievement: { practiceSignal: string; feedbackEn: string; feedbackBn: string };
  coherenceAndCohesion: { practiceSignal: string; feedbackEn: string; feedbackBn: string };
  lexicalResource: { practiceSignal: string; feedbackEn: string; feedbackBn: string };
  grammaticalRangeAndAccuracy: { practiceSignal: string; feedbackEn: string; feedbackBn: string };
  overallPracticeEstimate: string;
  strengthsEn: string[];
  priorityFixesEn: string[];
  banglaSummary: string;
  disclaimerEn: string;
  disclaimerBn: string;
}

export interface IeltsExamAttemptRecord {
  id: string;
  userId: string;
  taskId: string;
  module: IeltsModuleType;
  taskTitleEn: string;
  responseText: string;
  wordCount: number;
  durationSeconds: number;
  objectiveScorePct: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  rubricFeedback: IeltsRubricFeedback | null;
  questionResults?: Array<{
    questionId: string;
    selectedIndex: number;
    correctIndex: number;
    isCorrect: boolean;
    explanationEn: string;
    explanationBn: string;
  }>;
  modelUsed: string;
  createdAt: string;
}

export const IELTS_TRUTH_DISCLAIMER_EN =
  'Practice feedback only — NOT an official IELTS band score and not affiliated with or endorsed by IELTS, British Council, IDP, or Cambridge.';
export const IELTS_TRUTH_DISCLAIMER_BN =
  'এটি শুধুমাত্র অনুশীলনমূলক ফিডব্যাক — কোনো অফিসিয়াল IELTS ব্যান্ড স্কোর নয় এবং IELTS, British Council, IDP বা Cambridge দ্বারা অনুমোদিত নয়।';

export const IELTS_TASK_CATALOG: readonly IeltsExamTask[] = [
  {
    id: 'ielts_speak_p1_work_study',
    module: 'speaking',
    subType: 'Part 1: Introduction & Interview',
    titleEn: 'Speaking Part 1 — Daily Routine, Work & Study Goals',
    titleBn: 'স্পিকিং পার্ট ১ — দৈনন্দিন রুটিন, কাজ ও পড়াশোনার লক্ষ্য',
    targetMinutes: 4,
    difficultyBand: 'A2-B1',
    instructionsEn:
      'Answer naturally in 3–5 connected sentences. Avoid one-word answers and give a clear reason or example.',
    instructionsBn:
      '৩–৫টি সংযুক্ত বাক্যে স্বাভাবিকভাবে উত্তর দিন। এক শব্দের উত্তর এড়িয়ে কারণ বা উদাহরণ দিন।',
    promptTextEn:
      'Tell me about what you currently study or work on, and describe one part of your weekday schedule that you would like to improve.',
    followUpQuestionsEn: [
      'Why is improving that part of your routine important for your long-term goals?',
      'How do you usually organize tasks when you have a tight deadline?',
    ],
  },
  {
    id: 'ielts_speak_p2_long_turn',
    module: 'speaking',
    subType: 'Part 2: Individual Long Turn (Cue Card)',
    titleEn: 'Speaking Part 2 — A Useful Skill You Learned Recently',
    titleBn: 'স্পিকিং পার্ট ২ — সম্প্রতি শেখা একটি উপকারী দক্ষতা',
    targetMinutes: 2,
    difficultyBand: 'B1-B2',
    instructionsEn:
      'Spend up to 1 minute planning your key points, then speak or write your 1–2 minute continuous talk covering all cue card bullets.',
    instructionsBn:
      'সর্বোচ্চ ১ মিনিট মূল পয়েন্টগুলো সাজিয়ে নিন, তারপর কিউ কার্ডের প্রতিটি পয়েন্ট কভার করে ১–২ মিনিট একটানা বলুন বা লিখুন।',
    promptTextEn: 'Describe a practical skill you learned in the past two years that helped you in study or work.',
    cueBulletsEn: [
      'What the skill is and why you decided to learn it',
      'How you practiced it and what difficulties you faced',
      'A real situation where you applied it successfully',
      'How you plan to develop this skill further',
    ],
  },
  {
    id: 'ielts_speak_p3_discussion',
    module: 'speaking',
    subType: 'Part 3: Two-Way Abstract Discussion',
    titleEn: 'Speaking Part 3 — Remote Work, Digital Skills & Global Communication',
    titleBn: 'স্পিকিং পার্ট ৩ — রিমোট ওয়ার্ক, ডিজিটাল দক্ষতা ও বৈশ্বিক যোগাযোগ',
    targetMinutes: 5,
    difficultyBand: 'B2-C1',
    instructionsEn:
      'Give a structured opinion with balanced reasoning, concrete examples, and clear signposting (e.g., "On the other hand...", "In the long run...").',
    instructionsBn:
      'ভারসাম্যপূর্ণ যুক্তি, বাস্তব উদাহরণ এবং স্পষ্ট সংযোগকারী শব্দ ব্যবহার করে আপনার মতামত গুছিয়ে বলুন।',
    promptTextEn:
      'Do you think remote work helps young professionals in developing economies access global opportunities, or does it create new communication barriers?',
    followUpQuestionsEn: [
      'What communication habits matter most when collaborating across different time zones and cultures?',
    ],
  },
  {
    id: 'ielts_write_t1_academic',
    module: 'writing',
    subType: 'Academic Writing Task 1',
    titleEn: 'Academic Task 1 — Urban Commute Mode Shift (2015–2025)',
    titleBn: 'একাডেমিক টাস্ক ১ — শহরের যাতায়াত মাধ্যমের পরিবর্তন (২০১৫–২০২৫)',
    targetMinutes: 20,
    difficultyBand: 'B1-B2',
    minWordCount: 150,
    instructionsEn:
      'Write at least 150 words summarizing the main trends and making clear comparisons without giving personal opinions.',
    instructionsBn:
      'কমপক্ষে ১৫০ শব্দে মূল প্রবণতা ও তুলনা তুলে ধরুন; ব্যক্তিগত মতামত যোগ করবেন না।',
    promptTextEn:
      'Original Practice Data Table — Share of Daily Commuters in Metro City X (%): Bus: 48% (2015) -> 34% (2025); Metro Rail: 8% (2015) -> 31% (2025); Private Car: 26% (2015) -> 19% (2025); Cycling & Walking: 18% (2015) -> 16% (2025). Summarize the main features and make relevant comparisons.',
  },
  {
    id: 'ielts_write_t2_academic',
    module: 'writing',
    subType: 'Academic Writing Task 2',
    titleEn: 'Academic Task 2 — Practical Communication vs. Exam-Only Language Study',
    titleBn: 'একাডেমিক টাস্ক ২ — বাস্তব যোগাযোগ বনাম শুধু পরীক্ষামুখী ভাষা শিক্ষা',
    targetMinutes: 40,
    difficultyBand: 'B2-C1',
    minWordCount: 250,
    instructionsEn:
      'Write at least 250 words presenting a clear thesis, well-developed body paragraphs with examples, and a concise conclusion.',
    instructionsBn:
      'কমপক্ষে ২৫০ শব্দে স্পষ্ট অবস্থান, উদাহরণসহ প্যারাগ্রাফ এবং সংক্ষিপ্ত উপসংহার লিখুন।',
    promptTextEn:
      'Many schools focus heavily on grammar memorization and written tests rather than real-world speaking and listening tasks. To what extent do you agree or disagree that universities and schools should prioritize practical communication skills?',
  },
  {
    id: 'ielts_write_gt_letter',
    module: 'writing',
    subType: 'General Training Task 1 (Formal Letter)',
    titleEn: 'General Training Task 1 — Requesting Project Timeline Adjustment',
    titleBn: 'জেনারেল ট্রেনিং টাস্ক ১ — প্রজেক্টের সময়সীমা পরিবর্তনের অনুরোধ',
    targetMinutes: 20,
    difficultyBand: 'B1-B2',
    minWordCount: 150,
    instructionsEn:
      'Write at least 150 words in an appropriate professional register addressing all three bullet points clearly.',
    instructionsBn:
      'কমপক্ষে ১৫০ শব্দে পেশাদার ভাষায় তিনটি পয়েন্টই স্পষ্টভাবে কভার করে চিঠি/ইমেইল লিখুন।',
    promptTextEn:
      'You are coordinating a team training workshop at your company, but an external software outage has delayed preparation. Write to your manager to: (1) explain the cause of the delay, (2) propose a realistic new schedule, and (3) describe how you will prevent disruption for participants.',
  },
  {
    id: 'ielts_read_solar_microgrids',
    module: 'reading',
    subType: 'Academic Reading Passage (Original)',
    titleEn: 'Reading Practice — Community Solar Microgrids in Riverine Regions',
    titleBn: 'রিডিং অনুশীলন — নদীমাতৃক অঞ্চলে কমিউনিটি সোলার মাইক্রোগ্রিড',
    targetMinutes: 12,
    difficultyBand: 'B1-B2',
    instructionsEn:
      'Read the original passage carefully and answer all questions. Instant explanations are provided after submission.',
    instructionsBn:
      'মূল অনুচ্ছেদটি মনোযোগ দিয়ে পড়ুন এবং সব প্রশ্নের উত্তর দিন। জমা দেওয়ার পর তাৎক্ষণিক ব্যাখ্যা দেখতে পাবেন।',
    promptTextEn: 'Read the passage below and answer questions 1–3.',
    passageOrTranscriptEn:
      'In several riverine districts where seasonal flooding makes extending heavy national transmission towers prohibitively expensive, localized solar microgrids have emerged as a pragmatic alternative. Rather than waiting years for centralized grid expansion, small clusters of 40 to 80 households share a raised photovoltaic array paired with modular lithium-iron-phosphate battery banks. Early pilot programs struggled when maintenance depended entirely on visiting engineers from capital cities; however, later initiatives achieved over 94% uptime by training two local technicians per village and introducing prepaid mobile metering. Critics initially argued that upfront equipment costs would exclude low-income fishers and farmers, yet flexible micro-installment plans timed to harvest cycles significantly lowered default rates. Crucially, reliable evening electricity did not merely replace kerosene lamps—it extended cold-storage hours for perishable catch and enabled evening vocational and English-language study groups.',
    questions: [
      {
        id: 'rq1',
        questionType: 'mcq',
        promptEn: 'According to the passage, what most directly improved microgrid uptime in later initiatives?',
        options: [
          'Replacing battery banks with diesel backup generators',
          'Training local village technicians and using prepaid mobile metering',
          'Building taller centralized national transmission towers',
          'Eliminating installation fees for all households',
        ],
        correctOptionIndex: 1,
        explanationEn: 'The passage states later initiatives achieved over 94% uptime by training two local technicians per village and introducing prepaid mobile metering.',
        explanationBn: 'অনুচ্ছেদে বলা হয়েছে প্রতিটি গ্রামে দুইজন স্থানীয় টেকনিশিয়ানকে প্রশিক্ষণ দেওয়া এবং প্রিপেইড মোবাইল মিটারিং চালু করার মাধ্যমে ৯৪%-এর বেশি আপটাইম অর্জিত হয়েছে।',
      },
      {
        id: 'rq2',
        questionType: 'tfng',
        promptEn: 'TRUE, FALSE, or NOT GIVEN: Seasonal flooding reduces the cost of building national transmission towers in riverine districts.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctOptionIndex: 1,
        explanationEn: 'FALSE — the first sentence says seasonal flooding makes extending national transmission towers "prohibitively expensive".',
        explanationBn: 'FALSE — প্রথম বাক্যেই বলা হয়েছে মৌসুমি বন্যার কারণে জাতীয় ট্রান্সমিশন টাওয়ার সম্প্রসারণ অত্যন্ত ব্যয়বহুল হয়ে পড়ে।',
      },
      {
        id: 'rq3',
        questionType: 'tfng',
        promptEn: 'TRUE, FALSE, or NOT GIVEN: Every village microgrid in the region receives international grant funding from European donors.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctOptionIndex: 2,
        explanationEn: 'NOT GIVEN — international grant funding or European donors are never mentioned in the passage.',
        explanationBn: 'NOT GIVEN — অনুচ্ছেদে আন্তর্জাতিক অনুদান বা ইউরোপীয় দাতাদের কোনো উল্লেখ নেই।',
      },
    ],
  },
  {
    id: 'ielts_listen_campus_orientation',
    module: 'listening',
    subType: 'Listening Section — Academic Briefing (Original)',
    titleEn: 'Listening Practice — University Research Library Orientation',
    titleBn: 'লিসেনিং অনুশীলন — বিশ্ববিদ্যালয় গবেষণা লাইব্রেরি ওরিয়েন্টেশন',
    targetMinutes: 10,
    difficultyBand: 'A2-B1',
    instructionsEn:
      'Play the spoken audio briefing (or toggle the transcript only after attempting) and answer the three listening detail & inference questions.',
    instructionsBn:
      'অডিও ব্রিফিংটি শুনুন (প্রথমে না দেখে উত্তর দেওয়ার চেষ্টা করুন) এবং তিনটি প্রশ্নের উত্তর দিন।',
    promptTextEn: 'Listen to the library coordinator briefing new postgraduate students and answer questions 1–3.',
    passageOrTranscriptEn:
      'Good morning everyone, and welcome to the North Wing Research Library orientation. Before we tour the reading rooms, please note three schedule updates for this semester. First, while the main ground-floor hall stays open until 10 p.m. on weekdays, the quiet study pods on Floor 3 must be booked online at least two hours in advance; walk-in access was discontinued last month because of overcrowding. Second, if you need inter-library journal scans from partner universities, submit the digital form before 3 p.m. on Thursdays so our team can deliver the PDF before the weekend. Finally, our academic writing drop-in clinic has moved from Room 204 to Seminar Room 118 near the courtyard entrance, and sessions now focus specifically on literature review structure and citation accuracy.',
    questions: [
      {
        id: 'lq1',
        questionType: 'mcq',
        promptEn: 'Why is walk-in access no longer available for Floor 3 quiet study pods?',
        options: [
          'The floor is closed for roof renovations',
          'Previous overcrowding led to mandatory advance online booking',
          'Only faculty members may enter Floor 3',
          'Booking fees were introduced this semester',
        ],
        correctOptionIndex: 1,
        explanationEn: 'The coordinator explains that walk-in access was discontinued last month because of overcrowding, so pods must be booked online at least two hours in advance.',
        explanationBn: 'সমন্বয়ক জানান যে অতিরিক্ত ভিড়ের কারণে গত মাসে ওয়াক-ইন প্রবেশ বন্ধ করা হয়েছে এবং এখন অন্তত দুই ঘণ্টা আগে অনলাইনে বুক করতে হয়।',
      },
      {
        id: 'lq2',
        questionType: 'mcq',
        promptEn: 'When is the deadline to request inter-library journal scans for pre-weekend delivery?',
        options: ['10 p.m. on Wednesdays', '2 hours before arrival', '3 p.m. on Thursdays', 'Noon on Fridays'],
        correctOptionIndex: 2,
        explanationEn: 'Students must submit the digital form before 3 p.m. on Thursdays to receive the PDF before the weekend.',
        explanationBn: 'সপ্তাহান্তের আগে PDF পেতে হলে বৃহস্পতিবার বিকেল ৩টার আগে ডিজিটাল ফর্ম জমা দিতে হয়।',
      },
      {
        id: 'lq3',
        questionType: 'mcq',
        promptEn: 'Where is the academic writing drop-in clinic now located?',
        options: ['Room 204', 'Floor 3 Quiet Pods', 'Seminar Room 118 near the courtyard entrance', 'Ground-floor main hall'],
        correctOptionIndex: 2,
        explanationEn: 'The clinic moved from Room 204 to Seminar Room 118 near the courtyard entrance.',
        explanationBn: 'ক্লিনিকটি রুম ২০৪ থেকে কোর্টইয়ার্ড প্রবেশপথের কাছে সেমিনার রুম ১১৮-এ স্থানান্তরিত হয়েছে।',
      },
    ],
  },
] as const;

export function getIeltsTaskById(taskId: string): IeltsExamTask | undefined {
  return IELTS_TASK_CATALOG.find((t) => t.id === taskId);
}

export function countEnglishWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function gradeObjectiveIeltsTask(
  task: IeltsExamTask,
  selectedAnswers: Record<string, number>
): {
  correctCount: number;
  totalQuestions: number;
  scorePct: number;
  questionResults: NonNullable<IeltsExamAttemptRecord['questionResults']>;
} {
  const questions = task.questions ?? [];
  let correctCount = 0;
  const questionResults = questions.map((q) => {
    const selectedIndex =
      typeof selectedAnswers[q.id] === 'number' && Number.isInteger(selectedAnswers[q.id])
        ? selectedAnswers[q.id]
        : -1;
    const isCorrect = selectedIndex === q.correctOptionIndex;
    if (isCorrect) correctCount += 1;
    return {
      questionId: q.id,
      selectedIndex,
      correctIndex: q.correctOptionIndex,
      isCorrect,
      explanationEn: q.explanationEn,
      explanationBn: q.explanationBn,
    };
  });
  const totalQuestions = questions.length;
  const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  return { correctCount, totalQuestions, scorePct, questionResults };
}

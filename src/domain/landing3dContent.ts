import type { UILanguage } from '../types/domain';

export type HeroDeckViewId = 'speaking' | 'mistake_memory' | 'dna' | 'progress';

export interface HeroDeckPanel {
  id: HeroDeckViewId;
  tabLabel: string;
  shortSubtitle: string;
  panelTitle: string;
  previewBadge: string;
  headlineMetricLabel: string;
  headlineMetricValue: string;
  summary: string;
  lines: readonly {
    label: string;
    value: string;
    tone: 'cyan' | 'emerald' | 'violet' | 'rose';
  }[];
  ringSegments?: readonly {
    label: string;
    sampleLevel: number;
    color: string;
  }[];
}

export interface OrbitalLoopStep {
  id: 'detect' | 'explain' | 'personalize' | 'practice' | 'transfer' | 'retest' | 'improve';
  stepNumber: string;
  code: string;
  label: string;
  shortSummary: string;
  howItWorks: string;
  exampleInput: string;
  exampleOutput: string;
  accentColor: string;
  routeKey: 'demo' | 'improve' | 'speaking' | 'transfer' | 'progress';
}

export interface FeatureCard3DItem {
  id:
    | 'communication_dna'
    | 'mistake_memory'
    | 'speaking_studio'
    | 'transfer_lab'
    | 'evidence_progress'
    | 'adaptive_learning';
  number: string;
  title: string;
  statusNote: string;
  problemSolved: string;
  howItWorks: string;
  userGain: string;
  previewTitle: string;
  previewNote: string;
  previewRows: readonly {
    label: string;
    value: string;
  }[];
  accent: 'cyan' | 'blue' | 'violet' | 'magenta';
  routeKey: 'improve' | 'speaking' | 'transfer' | 'progress' | 'demo';
}

export interface Landing3DContentBundle {
  heroDeck: {
    previewDisclaimer: string;
    globeCaption: string;
    panels: readonly HeroDeckPanel[];
  };
  loop: {
    kicker: string;
    title: string;
    lead: string;
    orbitalAriaLabel: string;
    activeStageLabel: string;
    inputLabel: string;
    outputLabel: string;
    cycleNote: string;
    steps: readonly OrbitalLoopStep[];
  };
  features3D: {
    kicker: string;
    title: string;
    lead: string;
    problemLabel: string;
    howLabel: string;
    gainLabel: string;
    togglePreviewOpen: string;
    togglePreviewClose: string;
    actionLabel: string;
    items: readonly FeatureCard3DItem[];
  };
  demoDashboard: {
    workspaceTitle: string;
    sampleBadge: string;
    speakingPanelLabel: string;
    progressPanelLabel: string;
    recommendationLabel: string;
    sampleMetricDisclaimer: string;
    rings: readonly {
      id: string;
      label: string;
      sampleValue: number;
      color: string;
    }[];
  };
}

export const LANDING_3D_CONTENT: Record<UILanguage, Landing3DContentBundle> = {
  en: {
    heroDeck: {
      previewDisclaimer: 'Interactive Product Preview · Sample workspace states only',
      globeCaption: '3D Bilingual Communication Core · EN ↔ বাংলা',
      panels: [
        {
          id: 'speaking',
          tabLabel: 'Speaking Studio',
          shortSubtitle: 'Live waveform & coaching',
          panelTitle: 'AI Speaking Studio · Sample Turn',
          previewBadge: 'Illustrative Preview',
          headlineMetricLabel: 'Active mode',
          headlineMetricValue: 'Calm Guided Flow',
          summary:
            'Practice speaking at your own pace with live Bangla-aware phrasing suggestions and zero pressure.',
          lines: [
            { label: 'Spoken draft', value: '“Yesterday I discuss about the budget.”', tone: 'rose' },
            { label: 'Natural rewrite', value: '“Yesterday I discussed the budget.”', tone: 'emerald' },
            { label: 'Next prompt', value: 'Follow-up on timeline trade-offs', tone: 'cyan' },
          ],
        },
        {
          id: 'mistake_memory',
          tabLabel: 'Mistake Memory',
          shortSubtitle: 'Recurring L1 patterns',
          panelTitle: 'Mistake Memory Dashboard · Sample',
          previewBadge: 'Illustrative Preview',
          headlineMetricLabel: 'Tracked pattern',
          headlineMetricValue: 'Extra “Be” Before Agree',
          summary:
            'Captures Bangla-to-English interference habits automatically and turns them into focused recall drills.',
          lines: [
            { label: 'Detected habit', value: '“I am agree” → “I agree”', tone: 'rose' },
            { label: 'Bangla trigger', value: '“আমি একমত” feels like an adjective', tone: 'violet' },
            { label: 'Next review', value: 'Scheduled spaced micro-drill', tone: 'cyan' },
          ],
        },
        {
          id: 'dna',
          tabLabel: 'Communication DNA',
          shortSubtitle: '4-axis clarity profile',
          panelTitle: 'Communication DNA · Sample Profile',
          previewBadge: 'Illustrative Preview',
          headlineMetricLabel: 'Focus priority',
          headlineMetricValue: 'Verb Tense & Prepositions',
          summary:
            'Maps grammar accuracy, natural phrasing, transfer readiness, and hesitation signals from real sessions.',
          lines: [
            { label: 'Clarity focus', value: 'Past tense consistency under questions', tone: 'cyan' },
            { label: 'Natural tone', value: 'Polite workplace alignment phrases', tone: 'emerald' },
          ],
          ringSegments: [
            { label: 'Structure', sampleLevel: 76, color: '#38bdf8' },
            { label: 'Naturalness', sampleLevel: 68, color: '#8b6dff' },
            { label: 'Transfer', sampleLevel: 62, color: '#d946ef' },
          ],
        },
        {
          id: 'progress',
          tabLabel: 'Progress Analytics',
          shortSubtitle: 'Evidence-based mastery',
          panelTitle: 'Evidence-Based Progress · Sample',
          previewBadge: 'Illustrative Preview',
          headlineMetricLabel: 'Retention gate',
          headlineMetricValue: 'Delayed Retest Required',
          summary:
            'A single lucky answer caps at 45% initial acquisition—true mastery unlocks only after spaced recall.',
          lines: [
            { label: 'Stage 1 cap', value: '45% Initial Acquisition (no inflation)', tone: 'cyan' },
            { label: 'Stage 2–4', value: '70% → 88% → 100% verified retention', tone: 'emerald' },
          ],
          ringSegments: [
            { label: 'Recall', sampleLevel: 70, color: '#34d399' },
            { label: 'Consistency', sampleLevel: 64, color: '#4f8bff' },
            { label: 'Readiness', sampleLevel: 58, color: '#c084fc' },
          ],
        },
      ],
    },
    loop: {
      kicker: 'Communication Improvement Loop',
      title: 'Seven connected stages that turn knowledge into natural speech.',
      lead: 'Instead of disconnected quizzes, every sentence you speak or write moves through a closed evidence-based intelligence loop.',
      orbitalAriaLabel:
        'Interactive 7-step orbital Communication Improvement Loop from Detect to Improve',
      activeStageLabel: 'Active Stage',
      inputLabel: 'What happens here',
      outputLabel: 'How it advances your English',
      cycleNote:
        'Click or tap any orbital node to trace how LINGUAVERSE AI closes the gap between knowing grammar and speaking naturally.',
      steps: [
        {
          id: 'detect',
          stepNumber: '01',
          code: 'DETECT',
          label: 'Detect',
          shortSummary: 'Spot Bangla-to-English interference & hesitation.',
          howItWorks:
            'Identifies recurring verb-tense drops, extra auxiliaries (“I am agree”), and redundant prepositions (“discuss about”) as you practice.',
          exampleInput: 'Learner says: “I am working here since 2 years.”',
          exampleOutput: 'Tagged under Duration Aspect + Preposition memory key.',
          accentColor: '#38bdf8',
          routeKey: 'demo',
        },
        {
          id: 'explain',
          stepNumber: '02',
          code: 'EXPLAIN',
          label: 'Explain',
          shortSummary: 'Clear EN + বাংলা reasoning without jargon.',
          howItWorks:
            'Explains why the habit occurs from Bangla sentence logic and provides natural English rewrites immediately.',
          exampleInput: 'Why did “since 2 years” happen?',
          exampleOutput: 'Bangla duration maps to “for 2 years” + “have been working”.',
          accentColor: '#4f8bff',
          routeKey: 'demo',
        },
        {
          id: 'personalize',
          stepNumber: '03',
          code: 'PERSONALIZE',
          label: 'Personalize',
          shortSummary: 'Adapt lessons & Mistake Memory to your DNA.',
          howItWorks:
            'Logs repeated patterns into your personal Mistake Memory and updates your Communication DNA priority focus.',
          exampleInput: 'Pattern repeats twice across speaking sessions.',
          exampleOutput: 'Elevated to active micro-drill queue with custom cues.',
          accentColor: '#8b6dff',
          routeKey: 'improve',
        },
        {
          id: 'practice',
          stepNumber: '04',
          code: 'PRACTICE',
          label: 'Practice',
          shortSummary: 'Rehearse calmly inside AI Speaking Studio.',
          howItWorks:
            'Reinforces the corrected structure across low-pressure guided prompts, voice or text turns, and natural alternatives.',
          exampleInput: 'Guided standup prompt with optional microphone.',
          exampleOutput: 'Learner produces fluent phrasing without stalling.',
          accentColor: '#a855f7',
          routeKey: 'speaking',
        },
        {
          id: 'transfer',
          stepNumber: '05',
          code: 'TRANSFER',
          label: 'Transfer',
          shortSummary: 'Apply skills under real-world pressure.',
          howItWorks:
            'Tests your corrected habits inside realistic Transfer Lab scenarios—interviews, workplace alignment, and follow-up twists.',
          exampleInput: 'Hiring manager asks an unexpected follow-up.',
          exampleOutput: 'Evaluated on 4 clear rubrics for real-world clarity.',
          accentColor: '#d946ef',
          routeKey: 'transfer',
        },
        {
          id: 'retest',
          stepNumber: '06',
          code: 'RETEST',
          label: 'Retest',
          shortSummary: 'Verify delayed retention via spaced intervals.',
          howItWorks:
            'Brings patterns back days later so mastery reflects genuine long-term recall rather than short-term memorization.',
          exampleInput: 'Delayed spaced micro-drill 3 days later.',
          exampleOutput: 'Mastery climbs from 45% → 70% → 88% → 100%.',
          accentColor: '#34d399',
          routeKey: 'progress',
        },
        {
          id: 'improve',
          stepNumber: '07',
          code: 'IMPROVE',
          label: 'Improve',
          shortSummary: 'Compound clarity & confidence across conversations.',
          howItWorks:
            'Archives resolved patterns, surfaces the next highest-leverage habit, and keeps your speaking sharper each week.',
          exampleInput: 'Previous habit stays clean across fresh scenarios.',
          exampleOutput: 'Loop advances automatically to your next fluency edge.',
          accentColor: '#38bdf8',
          routeKey: 'progress',
        },
      ],
    },
    features3D: {
      kicker: 'Six Interactive Intelligence Systems',
      title: 'Engineered for measurable communication growth.',
      lead: 'Each core system solves a concrete bottleneck for Bangla-speaking English learners—inspect any card to preview how it works inside your workspace.',
      problemLabel: 'Problem solved',
      howLabel: 'How it works',
      gainLabel: 'What you gain',
      togglePreviewOpen: 'Inspect live preview',
      togglePreviewClose: 'Hide preview',
      actionLabel: 'Explore module',
      items: [
        {
          id: 'communication_dna',
          number: '01',
          title: 'Communication DNA',
          statusNote: 'Live in Progress',
          problemSolved:
            'Generic level labels hide which exact speaking habits hold back your confidence.',
          howItWorks:
            'Synthesizes grammar accuracy, natural phrasing, transfer readiness, and response patterns across your sessions.',
          userGain:
            'A transparent map of your strongest skills and your next highest-impact speaking focus.',
          previewTitle: 'Sample DNA Snapshot (Illustrative)',
          previewNote: 'Computed strictly from recorded attempts—starts empty for new accounts.',
          previewRows: [
            { label: 'Primary focus', value: 'Past tense under spontaneous questions' },
            { label: 'Natural strength', value: 'Polite workplace structure & greeting flow' },
          ],
          accent: 'cyan',
          routeKey: 'progress',
        },
        {
          id: 'mistake_memory',
          number: '02',
          title: 'Mistake Memory Engine',
          statusNote: 'Live in Improve',
          problemSolved:
            'Repeating the exact same Bangla-to-English slips because feedback disappears once a chat ends.',
          howItWorks:
            'Stores recurring patterns like “I am agree” or “discuss about” with Bangla root explanations and spaced micro-drills.',
          userGain:
            'Permanent habit repair instead of forgetting yesterday’s corrections.',
          previewTitle: 'Sample Memory Queue (Illustrative)',
          previewNote: 'Patterns resolve only after delayed clean recall.',
          previewRows: [
            { label: 'Tracked pattern', value: 'L1-STRUCT-AGREE-07 (“I am agree” → “I agree”)' },
            { label: 'Drill status', value: 'Due for spaced recall verification' },
          ],
          accent: 'blue',
          routeKey: 'improve',
        },
        {
          id: 'speaking_studio',
          number: '03',
          title: 'AI Speaking Studio',
          statusNote: 'Live · Voice or Text',
          problemSolved:
            'Freezing in real conversations because you never had a calm, judgment-free place to rehearse.',
          howItWorks:
            'Combines 7 conversation modes with a 5-level Pressure Ladder, optional mic input, and bilingual turn feedback.',
          userGain:
            'Steadier spoken flow without fabricating numeric pronunciation percentages.',
          previewTitle: 'Sample Studio Session (Illustrative)',
          previewNote: 'Optional microphone—full text fallback always available.',
          previewRows: [
            { label: 'Pressure Ladder', value: 'Level 2 Guided → Level 4 Real-World Twist' },
            { label: 'Coaching style', value: 'Natural rewrite + concise Bangla clarity note' },
          ],
          accent: 'violet',
          routeKey: 'speaking',
        },
        {
          id: 'transfer_lab',
          number: '04',
          title: 'Transfer Lab',
          statusNote: '5 Live Scenarios',
          problemSolved:
            'Passing textbook exercises easily yet losing structure during job interviews or team standups.',
          howItWorks:
            'Simulates practical interviews, client calls, and team meetings with unexpected follow-ups and 4-rubric grading.',
          userGain:
            'Confidence that your new phrasing actually holds up when conversations matter.',
          previewTitle: 'Sample Transfer Rubric (Illustrative)',
          previewNote: 'Links directly to active Mistake Memory patterns.',
          previewRows: [
            { label: 'Active scenarios', value: 'Interviews, Workplace, Meetings, Academic, Daily' },
            { label: 'Evaluation', value: 'Clarity, Grammar Control, Natural Tone, Goal Completion' },
          ],
          accent: 'magenta',
          routeKey: 'transfer',
        },
        {
          id: 'evidence_progress',
          number: '05',
          title: 'Evidence-Based Progress',
          statusNote: 'Zero Fake Metrics',
          problemSolved:
            'Inflated streaks and instant 100% badges that feel rewarding while leaving real fluency unchanged.',
          howItWorks:
            'Caps first-attempt mastery at 45% initial acquisition and advances only through verified spaced retention.',
          userGain:
            'Honest analytics grounded in real completed exercises, drills, and speaking turns.',
          previewTitle: 'Mastery Progression Gate',
          previewNote: 'Every XP and mastery transition is idempotent and audit-backed.',
          previewRows: [
            { label: 'Pass 1 → Pass 4', value: '45% → 70% → 88% → 100% spaced mastery' },
            { label: 'New account state', value: 'Starts cleanly at 0—zero fabricated baselines' },
          ],
          accent: 'cyan',
          routeKey: 'progress',
        },
        {
          id: 'adaptive_learning',
          number: '06',
          title: 'Adaptive Learning',
          statusNote: 'Bilingual Bridge',
          problemSolved:
            'Static one-size-fits-all courses that ignore your Bangla background, goals, and comfort level.',
          howItWorks:
            'Adjusts explanation language (Bangla-first to English immersion), starting CEFR path, and daily review priority.',
          userGain:
            'Every 10-minute session focuses directly on the patterns blocking your real goals.',
          previewTitle: 'Adaptive Path Controls',
          previewNote: 'Tailored during onboarding and updated after each diagnostic.',
          previewRows: [
            { label: 'Bilingual bridge', value: 'Bangla-First → Bilingual → English Immersion' },
            { label: 'Curriculum sync', value: '7-stage structured Academy + micro-drills' },
          ],
          accent: 'violet',
          routeKey: 'demo',
        },
      ],
    },
    demoDashboard: {
      workspaceTitle: 'LINGUAVERSE AI · Interactive Demonstration Workspace',
      sampleBadge: 'Interactive Sample Preview · Demonstration Data',
      speakingPanelLabel: 'Speaking Studio Sync (Sample)',
      progressPanelLabel: 'Sample Retention Rings (Illustrative)',
      recommendationLabel: 'Personalized Next Step (Sample)',
      sampleMetricDisclaimer:
        'Illustrative preview metrics shown for demonstration—your signed-in workspace begins strictly from your real attempts.',
      rings: [
        { id: 'clarity', label: 'Clarity', sampleValue: 78, color: '#38bdf8' },
        { id: 'structure', label: 'Structure', sampleValue: 64, color: '#8b6dff' },
        { id: 'natural', label: 'Naturalness', sampleValue: 72, color: '#d946ef' },
      ],
    },
  },
  bn: {
    heroDeck: {
      previewDisclaimer: 'ইন্টারেক্টিভ প্রোডাক্ট প্রিভিউ · শুধুমাত্র নমুনা ওয়ার্কস্পেস',
      globeCaption: '৩ডি বাইলিঙ্গুয়াল কমিউনিকেশন কোর · EN ↔ বাংলা',
      panels: [
        {
          id: 'speaking',
          tabLabel: 'স্পিকিং স্টুডিও',
          shortSubtitle: 'অডিও ওয়েভ ও কোচিং',
          panelTitle: 'AI স্পিকিং স্টুডিও · নমুনা টার্ন',
          previewBadge: 'নমুনা প্রিভিউ',
          headlineMetricLabel: 'সক্রিয় মোড',
          headlineMetricValue: 'শান্ত গাইডেড প্র্যাকটিস',
          summary:
            'কোনো চাপ ছাড়াই নিজের গতিতে ইংরেজি বলার অনুশীলন করুন—সাথে বাংলা-সহায়ক স্বাভাবিক বাক্য পরামর্শ।',
          lines: [
            { label: 'বলা বাক্য', value: '“Yesterday I discuss about the budget.”', tone: 'rose' },
            { label: 'স্বাভাবিক রূপ', value: '“Yesterday I discussed the budget.”', tone: 'emerald' },
            { label: 'পরবর্তী প্রশ্ন', value: 'টাইমলাইন নিয়ে স্বাভাবিক ফলো-আপ', tone: 'cyan' },
          ],
        },
        {
          id: 'mistake_memory',
          tabLabel: 'মিস্টেক মেমোরি',
          shortSubtitle: 'পুনরাবৃত্ত L1 অভ্যাস',
          panelTitle: 'মিস্টেক মেমোরি ড্যাশবোর্ড · নমুনা',
          previewBadge: 'নমুনা প্রিভিউ',
          headlineMetricLabel: 'শনাক্ত প্যাটার্ন',
          headlineMetricValue: 'Agree-এর আগে অতিরিক্ত “am”',
          summary:
            'বাংলা থেকে ইংরেজি অনুবাদের বারবার হওয়া ভুলগুলো স্বয়ংক্রিয়ভাবে ধরে স্মার্ট রিভিশন ড্রিলে রূপ দেয়।',
          lines: [
            { label: 'ভুলের অভ্যাস', value: '“I am agree” → “I agree”', tone: 'rose' },
            { label: 'বাংলার কারণ', value: '“আমি একমত”-কে Adjective মনে হওয়া', tone: 'violet' },
            { label: 'পরবর্তী রিভিউ', value: 'স্পেসড মাইক্রো-ড্রিল নির্ধারিত', tone: 'cyan' },
          ],
        },
        {
          id: 'dna',
          tabLabel: 'কমিউনিকেশন DNA',
          shortSubtitle: '৪-মাত্রার দক্ষতা চিত্র',
          panelTitle: 'কমিউনিকেশন DNA · নমুনা প্রোফাইল',
          previewBadge: 'নমুনা প্রিভিউ',
          headlineMetricLabel: 'প্রাথমিক ফোকাস',
          headlineMetricValue: 'Verb Tense ও Preposition',
          summary:
            'বাস্তব অনুশীলন থেকে গ্রামার নির্ভুলতা, স্বাভাবিকতা ও ট্রান্সফার প্রস্তুতির পরিষ্কার চিত্র তৈরি করে।',
          lines: [
            { label: 'স্পষ্টতা ফোকাস', value: 'প্রশ্নের উত্তরে Past Tense ধরে রাখা', tone: 'cyan' },
            { label: 'স্বাভাবিক টোন', value: 'অফিস ও মিটিংয়ের ভদ্র বাক্যগঠন', tone: 'emerald' },
          ],
          ringSegments: [
            { label: 'গঠন', sampleLevel: 76, color: '#38bdf8' },
            { label: 'স্বাভাবিকতা', sampleLevel: 68, color: '#8b6dff' },
            { label: 'ট্রান্সফার', sampleLevel: 62, color: '#d946ef' },
          ],
        },
        {
          id: 'progress',
          tabLabel: 'প্রগ্রেস অ্যানালিটিক্স',
          shortSubtitle: 'প্রমাণভিত্তিক মাস্টারি',
          panelTitle: 'প্রমাণভিত্তিক অগ্রগতি · নমুনা',
          previewBadge: 'নমুনা প্রিভিউ',
          headlineMetricLabel: 'রিটেনশন নিয়ম',
          headlineMetricValue: 'স্পেসড রিটেস্ট আবশ্যক',
          summary:
            'একবার সঠিক হলেই ১০০% নয়—প্রথম ধাপে ৪৫% সীমা থাকে এবং পরবর্তী রিভিউয়ে স্থায়ী দক্ষতা প্রমাণিত হয়।',
          lines: [
            { label: 'ধাপ ১ সীমা', value: '৪৫% প্রাথমিক অর্জন (কোনো বাড়িয়ে বলা নয়)', tone: 'cyan' },
            { label: 'ধাপ ২–৪', value: '৭০% → ৮৮% → ১০০% যাচাইকৃত রিটেনশন', tone: 'emerald' },
          ],
          ringSegments: [
            { label: 'স্মৃতি', sampleLevel: 70, color: '#34d399' },
            { label: 'ধারাবাহিকতা', sampleLevel: 64, color: '#4f8bff' },
            { label: 'প্রস্তুতি', sampleLevel: 58, color: '#c084fc' },
          ],
        },
      ],
    },
    loop: {
      kicker: 'কমিউনিকেশন ইমপ্রুভমেন্ট লুপ',
      title: 'সাতটি সংযুক্ত ধাপ যা জ্ঞানকে স্বাভাবিক বলায় রূপান্তর করে।',
      lead: 'বিচ্ছিন্ন কুইজের বদলে আপনার প্রতিটি বলা বা লেখা বাক্য প্রমাণভিত্তিক ইন্টেলিজেন্স লুপের মধ্য দিয়ে যায়।',
      orbitalAriaLabel:
        'ডিটেক্ট থেকে ইমপ্রুভ পর্যন্ত ইন্টারেক্টিভ ৭-ধাপের অরবিটাল কমিউনিকেশন ইমপ্রুভমেন্ট লুপ',
      activeStageLabel: 'নির্বাচিত ধাপ',
      inputLabel: 'এই ধাপে যা হয়',
      outputLabel: 'কীভাবে আপনার ইংরেজি এগোয়',
      cycleNote:
        'যেকোনো অরবিটাল নোডে ক্লিক বা ট্যাপ করে দেখুন কীভাবে LINGUAVERSE AI গ্রামার জ্ঞানকে বাস্তব কথাবার্তায় রূপ দেয়।',
      steps: [
        {
          id: 'detect',
          stepNumber: '০১',
          code: 'DETECT',
          label: 'শনাক্ত',
          shortSummary: 'বাংলা-টু-ইংরেজি ভুল ও দ্বিধা চিহ্নিত করে।',
          howItWorks:
            'অনুশীলনের সময় Past Tense বাদ পড়া, অতিরিক্ত “am” (“I am agree”) বা “discuss about”-এর মতো অভ্যাস শনাক্ত করে।',
          exampleInput: 'শিক্ষার্থী বললেন: “I am working here since 2 years.”',
          exampleOutput: 'Duration Aspect ও Preposition মেমোরি ট্যাগে সংরক্ষিত।',
          accentColor: '#38bdf8',
          routeKey: 'demo',
        },
        {
          id: 'explain',
          stepNumber: '০২',
          code: 'EXPLAIN',
          label: 'ব্যাখ্যা',
          shortSummary: 'জটিল পরিভাষা ছাড়াই সহজ EN + বাংলা ব্যাখ্যা।',
          howItWorks:
            'বাংলার কোন বাক্যগঠন থেকে ভুলটি আসছে তা পরিষ্কার করে বোঝায় এবং সাথে সাথে স্বাভাবিক ইংরেজি বিকল্প দেয়।',
          exampleInput: 'কেন “since 2 years” হলো?',
          exampleOutput: 'সময়ের দৈর্ঘ্য বোঝাতে “for 2 years” এবং “have been working”।',
          accentColor: '#4f8bff',
          routeKey: 'demo',
        },
        {
          id: 'personalize',
          stepNumber: '০৩',
          code: 'PERSONALIZE',
          label: 'পার্সোনালাইজ',
          shortSummary: 'আপনার DNA অনুযায়ী লেসন ও ড্রিল সাজায়।',
          howItWorks:
            'পুনরাবৃত্ত ভুলগুলো ব্যক্তিগত Mistake Memory-তে যুক্ত হয় এবং Communication DNA-এর ফোকাস আপডেট করে।',
          exampleInput: 'একই প্যাটার্ন দুটি সেশনে পুনরাবৃত্তি হলো।',
          exampleOutput: 'ব্যক্তিগত মাইক্রো-ড্রিল তালিকায় অগ্রাধিকার পেল।',
          accentColor: '#8b6dff',
          routeKey: 'improve',
        },
        {
          id: 'practice',
          stepNumber: '০৪',
          code: 'PRACTICE',
          label: 'অনুশীলন',
          shortSummary: 'AI স্পিকিং স্টুডিওতে শান্ত পরিবেশে চর্চা।',
          howItWorks:
            'গাইডেড প্রম্পট, ভয়েস বা টাইপ করা উত্তর এবং স্বাভাবিক বিকল্পের মাধ্যমে সঠিক বাক্যগঠন অভ্যাসে পরিণত করে।',
          exampleInput: 'ঐচ্ছিক মাইক্রোফোনসহ গাইডেড স্ট্যান্ডআপ প্রম্পট।',
          exampleOutput: 'দ্বিধা ছাড়াই সাবলীল ইংরেজি বাক্য গঠন।',
          accentColor: '#a855f7',
          routeKey: 'speaking',
        },
        {
          id: 'transfer',
          stepNumber: '০৫',
          code: 'TRANSFER',
          label: 'ট্রান্সফার',
          shortSummary: 'বাস্তব পরিস্থিতির চাপে দক্ষতা প্রয়োগ।',
          howItWorks:
            'চাকরির ইন্টারভিউ, অফিস মিটিং ও অপ্রত্যাশিত ফলো-আপ প্রশ্নে ৪টি স্পষ্ট রুব্রিকে আপনার প্রস্তুতি যাচাই করে।',
          exampleInput: 'ইন্টারভিউয়ার হঠাৎ একটি ফলো-আপ প্রশ্ন করলেন।',
          exampleOutput: 'স্পষ্টতা, গ্রামার ও স্বাভাবিক টোনে মূল্যায়ন সম্পন্ন।',
          accentColor: '#d946ef',
          routeKey: 'transfer',
        },
        {
          id: 'retest',
          stepNumber: '০৬',
          code: 'RETEST',
          label: 'রিটেস্ট',
          shortSummary: 'বিরতির পর স্পেসড রিভিশনে স্থায়িত্ব যাচাই।',
          howItWorks:
            'কয়েক দিন পর একই প্যাটার্ন ফিরিয়ে এনে নিশ্চিত করে যে আপনি সত্যিই স্থায়ীভাবে আয়ত্ত করেছেন।',
          exampleInput: '৩ দিন পর নির্ধারিত মাইক্রো-ড্রিল রিটেস্ট।',
          exampleOutput: 'মাস্টারি ৪৫% → ৭০% → ৮৮% → ১০০% ধাপে এগোয়।',
          accentColor: '#34d399',
          routeKey: 'progress',
        },
        {
          id: 'improve',
          stepNumber: '০৭',
          code: 'IMPROVE',
          label: 'উন্নতি',
          shortSummary: 'প্রতিটি কথোপকথনে ক্রমবর্ধমান আত্মবিশ্বাস।',
          howItWorks:
            'সমাধান হওয়া ভুলগুলো আর্কাইভ করে পরবর্তী সবচেয়ে গুরুত্বপূর্ণ দক্ষতায় ফোকাস স্থানান্তর করে।',
          exampleInput: 'নতুন দৃশ্যপটেও আগের ভুল আর ফিরে এলো না।',
          exampleOutput: 'লুপ স্বয়ংক্রিয়ভাবে পরবর্তী ফ্লুয়েন্সি লক্ষ্য শুরু করে।',
          accentColor: '#38bdf8',
          routeKey: 'progress',
        },
      ],
    },
    features3D: {
      kicker: 'ছয়টি ইন্টারেক্টিভ ইন্টেলিজেন্স সিস্টেম',
      title: 'পরিমাপযোগ্য কমিউনিকেশন উন্নতির জন্য নির্মিত।',
      lead: 'প্রতিটি সিস্টেম বাংলাভাষী ইংরেজি শিক্ষার্থীদের একটি নির্দিষ্ট বাধা দূর করে—যেকোনো কার্ডে ক্লিক করে প্রিভিউ দেখুন।',
      problemLabel: 'সমাধান করা সমস্যা',
      howLabel: 'কীভাবে কাজ করে',
      gainLabel: 'আপনার অর্জন',
      togglePreviewOpen: 'প্রিভিউ দেখুন',
      togglePreviewClose: 'প্রিভিউ লুকান',
      actionLabel: 'মডিউল দেখুন',
      items: [
        {
          id: 'communication_dna',
          number: '০১',
          title: 'কমিউনিকেশন DNA',
          statusNote: 'প্রগ্রেস-এ সক্রিয়',
          problemSolved:
            'সাধারণ লেভেল স্কোর কখনো বলে না ঠিক কোন অভ্যাসের কারণে কথা বলতে গিয়ে আটকে যাচ্ছেন।',
          howItWorks:
            'আপনার প্রতিটি সেশন থেকে গ্রামার নির্ভুলতা, স্বাভাবিক বাক্যগঠন ও ট্রান্সফার প্রস্তুতি বিশ্লেষণ করে।',
          userGain:
            'আপনার শক্তিশালী দিক ও পরবর্তী সবচেয়ে গুরুত্বপূর্ণ ফোকাসের স্বচ্ছ মানচিত্র।',
          previewTitle: 'নমুনা DNA চিত্র (উদাহরণ)',
          previewNote: 'শুধুমাত্র আপনার বাস্তব অনুশীলন থেকে হিসাব হয়—নতুন অ্যাকাউন্ট শূন্য থেকে শুরু হয়।',
          previewRows: [
            { label: 'মূল ফোকাস', value: 'তাৎক্ষণিক প্রশ্নে Past Tense ঠিক রাখা' },
            { label: 'শক্তিশালী দিক', value: 'ভদ্র অফিসিয়াল বাক্য ও কাঠামো' },
          ],
          accent: 'cyan',
          routeKey: 'progress',
        },
        {
          id: 'mistake_memory',
          number: '০২',
          title: 'মিস্টেক মেমোরি ইঞ্জিন',
          statusNote: 'ইমপ্রুভ-এ সক্রিয়',
          problemSolved:
            'আগের ফিডব্যাক হারিয়ে যাওয়ায় একই বাংলা-টু-ইংরেজি ভুল বারবার ফিরে আসা।',
          howItWorks:
            '“I am agree” বা “discuss about”-এর মতো পুনরাবৃত্ত ভুল বাংলা কারণসহ সংরক্ষণ করে এবং স্পেসড ড্রিল তৈরি করে।',
          userGain:
            'ভুল ভুলে যাওয়ার বদলে স্থায়ীভাবে অভ্যাসের পরিবর্তন।',
          previewTitle: 'নমুনা মেমোরি কিউ (উদাহরণ)',
          previewNote: 'বিরতির পর নির্ভুল উত্তরের পরই প্যাটার্ন সমাধান হিসেবে চিহ্নিত হয়।',
          previewRows: [
            { label: 'সংরক্ষিত প্যাটার্ন', value: 'L1-STRUCT-AGREE-07 (“I am agree” → “I agree”)' },
            { label: 'ড্রিল অবস্থা', value: 'স্পেসড রিকল যাচাইয়ের জন্য প্রস্তুত' },
          ],
          accent: 'blue',
          routeKey: 'improve',
        },
        {
          id: 'speaking_studio',
          number: '০৩',
          title: 'AI স্পিকিং স্টুডিও',
          statusNote: 'সক্রিয় · ভয়েস বা টেক্সট',
          problemSolved:
            'বিচারহীন শান্ত অনুশীলনের জায়গা না থাকায় বাস্তব কথোপকথনে জড়তা আসা।',
          howItWorks:
            '৭টি কথোপকথন মোড, ৫-ধাপের প্রেশার ল্যাডার, ঐচ্ছিক মাইক্রোফোন ও বাংলা-ইংরেজি ফিডব্যাক একসাথে দেয়।',
          userGain:
            'কোনো ভুয়া উচ্চারণ শতাংশ ছাড়াই বাস্তব ও সাবলীল কথা বলার অভ্যাস।',
          previewTitle: 'নমুনা স্টুডিও সেশন (উদাহরণ)',
          previewNote: 'মাইক্রোফোন সম্পূর্ণ ঐচ্ছিক—টাইপ করেও পুরো অনুশীলন করা যায়।',
          previewRows: [
            { label: 'প্রেশার ল্যাডার', value: 'লেভেল ২ গাইডেড → লেভেল ৪ বাস্তব টুইস্ট' },
            { label: 'কোচিং ধরন', value: 'স্বাভাবিক বিকল্প বাক্য + সহজ বাংলা ব্যাখ্যা' },
          ],
          accent: 'violet',
          routeKey: 'speaking',
        },
        {
          id: 'transfer_lab',
          number: '০৪',
          title: 'ট্রান্সফার ল্যাব',
          statusNote: '৫টি সক্রিয় দৃশ্যপট',
          problemSolved:
            'বইয়ের অনুশীলনে পারলেও ইন্টারভিউ বা টিম মিটিংয়ে গিয়ে সঠিক শব্দ খুঁজে না পাওয়া।',
          howItWorks:
            'বাস্তব ইন্টারভিউ, ক্লায়েন্ট কল ও মিটিংয়ের অপ্রত্যাশিত ফলো-আপ প্রশ্নে ৪-রুব্রিক মূল্যায়ন করে।',
          userGain:
            'গুরুত্বপূর্ণ বাস্তব কথোপকথনে শেখা ইংরেজি প্রয়োগের আত্মবিশ্বাস।',
          previewTitle: 'নমুনা ট্রান্সফার রুব্রিক (উদাহরণ)',
          previewNote: 'আপনার সক্রিয় মিস্টেক মেমোরির সাথে সরাসরি যুক্ত।',
          previewRows: [
            { label: 'সক্রিয় দৃশ্যপট', value: 'ইন্টারভিউ, অফিস, মিটিং, অ্যাকাডেমিক, দৈনন্দিন' },
            { label: 'মূল্যায়ন', value: 'স্পষ্টতা, গ্রামার নিয়ন্ত্রণ, স্বাভাবিক টোন ও লক্ষ্য পূরণ' },
          ],
          accent: 'magenta',
          routeKey: 'transfer',
        },
        {
          id: 'evidence_progress',
          number: '০৫',
          title: 'প্রমাণভিত্তিক অগ্রগতি',
          statusNote: 'কোনো ভুয়া মেট্রিক নয়',
          problemSolved:
            'ভুয়া স্ট্রিক ও তাৎক্ষণিক ১০০% ব্যাজ যা আসল ফ্লুয়েন্সি না বাড়িয়ে শুধু সাময়িক আনন্দ দেয়।',
          howItWorks:
            'প্রথম চেষ্টায় সর্বোচ্চ ৪৫% সীমা রাখে এবং বিরতি দিয়ে পুনরায় যাচাই করলেই মাস্টারি বাড়ায়।',
          userGain:
            'বাস্তব অনুশীলন ও রিটেস্টের ওপর ভিত্তি করে সৎ ও নির্ভরযোগ্য অগ্রগতি চিত্র।',
          previewTitle: 'মাস্টারি অগ্রগতি ধাপ',
          previewNote: 'প্রতিটি XP ও মাস্টারি আপডেট প্রমাণভিত্তিক ও ডুপ্লিকেট-মুক্ত।',
          previewRows: [
            { label: 'পাস ১ → পাস ৪', value: '৪৫% → ৭০% → ৮৮% → ১০০% স্পেসড মাস্টারি' },
            { label: 'নতুন অ্যাকাউন্ট', value: 'সম্পূর্ণ ০ থেকে শুরু হয়—কোনো কাল্পনিক সংখ্যা নয়' },
          ],
          accent: 'cyan',
          routeKey: 'progress',
        },
        {
          id: 'adaptive_learning',
          number: '০৬',
          title: 'অ্যাডাপ্টিভ লার্নিং',
          statusNote: 'বাইলিঙ্গুয়াল ব্রিজ',
          problemSolved:
            'সবার জন্য একই পাঠ্যক্রম যা আপনার বাংলা পটভূমি, লক্ষ্য ও স্বাচ্ছন্দ্যকে উপেক্ষা করে।',
          howItWorks:
            'ব্যাখ্যার ভাষা (বাংলা-প্রধান থেকে সম্পূর্ণ ইংরেজি), CEFR ধাপ ও দৈনিক রিভিউ অগ্রাধিকার আপনার জন্য সাজায়।',
          userGain:
            'প্রতিদিনের ১০ মিনিট অনুশীলন সরাসরি আপনার বাস্তব লক্ষ্যে কাজে লাগে।',
          previewTitle: 'অ্যাডাপ্টিভ পাথ নিয়ন্ত্রণ',
          previewNote: 'অনবোর্ডিং ও ডায়াগনস্টিক অনুযায়ী স্বয়ংক্রিয়ভাবে মানিয়ে নেয়।',
          previewRows: [
            { label: 'বাইলিঙ্গুয়াল ব্রিজ', value: 'বাংলা-প্রধান → দ্বিভাষিক → ইংরেজি ইমারশন' },
            { label: 'কারিকুলাম সংযোগ', value: '৭-ধাপের একাডেমি লেসন + মাইক্রো-ড্রিল' },
          ],
          accent: 'violet',
          routeKey: 'demo',
        },
      ],
    },
    demoDashboard: {
      workspaceTitle: 'LINGUAVERSE AI · ইন্টারেক্টিভ ডেমো ওয়ার্কস্পেস',
      sampleBadge: 'ইন্টারেক্টিভ নমুনা প্রিভিউ · ডেমো ডেটা',
      speakingPanelLabel: 'স্পিকিং স্টুডিও সিঙ্ক (নমুনা)',
      progressPanelLabel: 'নমুনা রিটেনশন রিং (উদাহরণ)',
      recommendationLabel: 'ব্যক্তিগত পরবর্তী ধাপ (নমুনা)',
      sampleMetricDisclaimer:
        'এখানে প্রদর্শিত রিংগুলো শুধুমাত্র ডেমোনস্ট্রেশন উদাহরণ—আপনার সাইন-ইন অ্যাকাউন্ট সম্পূর্ণ বাস্তব অনুশীলন থেকে হিসাব হবে।',
      rings: [
        { id: 'clarity', label: 'স্পষ্টতা', sampleValue: 78, color: '#38bdf8' },
        { id: 'structure', label: 'গঠন', sampleValue: 64, color: '#8b6dff' },
        { id: 'natural', label: 'স্বাভাবিকতা', sampleValue: 72, color: '#d946ef' },
      ],
    },
  },
};

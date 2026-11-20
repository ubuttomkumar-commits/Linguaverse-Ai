import type { UILanguage } from '../types/domain';
import type { QuizComfortLevel, QuizPrimaryGoal } from './landingQuiz';

export interface HeroScenarioItem {
  id: 'job_interview' | 'office_meeting' | 'daily_conversation';
  tabEn: string;
  tabBn: string;
  contextEn: string;
  contextBn: string;
  promptQuestionEn: string;
  promptQuestionBn: string;
  brokenBefore: string;
  brokenHighlight: string;
  brokenAfter: string;
  naturalBefore: string;
  naturalHighlight: string;
  naturalAfter: string;
  fullNatural: string;
  categoryEn: string;
  categoryBn: string;
  explanationBn: string;
  explanationEn: string;
  dnaPreview: {
    accuracy: number;
    naturalness: number;
    clarity: number;
  };
}

export const HERO_SCENARIOS: HeroScenarioItem[] = [
  {
    id: 'job_interview',
    tabEn: 'Job Interview',
    tabBn: 'চাকরির ইন্টারভিউ',
    contextEn: 'HR Interviewer · Experience Question',
    contextBn: 'এইচআর ইন্টারভিউয়ার · অভিজ্ঞতার প্রশ্ন',
    promptQuestionEn: 'How long have you been with your current team?',
    promptQuestionBn: 'আপনি বর্তমান টিমে কতদিন ধরে কাজ করছেন?',
    brokenBefore: 'Sir, ',
    brokenHighlight: 'I am working here since three years',
    brokenAfter: '.',
    naturalBefore: '',
    naturalHighlight: "I've been working here for three years",
    naturalAfter: '.',
    fullNatural: "I've been working here for three years.",
    categoryEn: 'Verb Tense & Duration',
    categoryBn: 'Verb Tense ও সময়ের ব্যবহার',
    explanationBn:
      'বাংলায় "তিন বছর ধরে কাজ করছি" বললেও ইংরেজিতে অতীতে শুরু হয়ে এখনো চলা কাজে "am working" নয়, "have been working" বসে। আর নির্দিষ্ট সময়ের দৈর্ঘ্য (three years) বোঝাতে "since" নয়, "for" ব্যবহার করতে হয়।',
    explanationEn:
      'Use Present Perfect Continuous ("I\'ve been working") for work that began in the past and continues now, paired with "for" before a duration ("three years"). Also drop "Sir" in modern interviews.',
    dnaPreview: {
      accuracy: 86,
      naturalness: 91,
      clarity: 88,
    },
  },
  {
    id: 'office_meeting',
    tabEn: 'Office Meeting',
    tabBn: 'অফিস মিটিং',
    contextEn: 'Weekly Team Sync · Sharing Agreement',
    contextBn: 'সাপ্তাহিক টিম মিটিং · মতামত প্রকাশ',
    promptQuestionEn: 'Should we move the client review to Thursday?',
    promptQuestionBn: 'আমরা কি ক্লায়েন্ট রিভিউ বৃহস্পতিবারে সরিয়ে নেব?',
    brokenBefore: '',
    brokenHighlight: 'I am agree',
    brokenAfter: ' and we can discuss about the timeline later.',
    naturalBefore: '',
    naturalHighlight: 'I agree,',
    naturalAfter: ' and we can discuss the timeline later.',
    fullNatural: 'I agree, and we can discuss the timeline later.',
    categoryEn: 'Sentence Structure & Preposition',
    categoryBn: 'বাক্য গঠন ও Preposition',
    explanationBn:
      'ইংরেজিতে "agree" নিজেই একটি Verb—তাই "I am agree" না বলে সরাসরি "I agree" বলতে হয়। আর "discuss"-এর অর্থই হলো "নিয়ে আলোচনা করা", তাই এর পরে আলাদা করে "about" বসে না।',
    explanationEn:
      '"Agree" is a full verb (never pair it with "am"), and "discuss" is transitive—so say "discuss the timeline" directly without "about".',
    dnaPreview: {
      accuracy: 89,
      naturalness: 94,
      clarity: 92,
    },
  },
  {
    id: 'daily_conversation',
    tabEn: 'Daily Conversation',
    tabBn: 'দৈনন্দিন কথা',
    contextEn: 'Colleague Catch-Up · Explaining a Delay',
    contextBn: 'সহকর্মীর সাথে কথা · দেরির কারণ বলা',
    promptQuestionEn: 'You missed the morning standup yesterday—everything okay?',
    promptQuestionBn: 'গতকাল সকালের মিটিংয়ে ছিলেন না—সব ঠিক ছিল?',
    brokenBefore: 'Yesterday ',
    brokenHighlight: 'I go to office late because traffic jam',
    brokenAfter: '.',
    naturalBefore: 'Yesterday ',
    naturalHighlight: 'I got to the office late because of a traffic jam',
    naturalAfter: '.',
    fullNatural: 'Yesterday I got to the office late because of a traffic jam.',
    categoryEn: 'Past Tense & Connector',
    categoryBn: 'অতীত কাল ও সংযোজক',
    explanationBn:
      '"Yesterday" থাকায় Verb-এর Past form ("got" বা "went") বসাতে হবে। আর "traffic jam" একটি Noun phrase হওয়ায় শুধু "because" নয়, "because of a traffic jam" বলতে হয়।',
    explanationEn:
      'Finished past time ("yesterday") requires a past verb ("got to the office"), and a noun phrase like "a traffic jam" needs "because of" rather than "because".',
    dnaPreview: {
      accuracy: 84,
      naturalness: 89,
      clarity: 90,
    },
  },
];

export interface LandingCopy {
  nav: {
    whyItWorks: string;
    liveDemo: string;
    loop: string;
    support: string;
    pricing: string;
    login: string;
    startFree: string;
    openWorkspace: string;
  };
  hero: {
    badge: string;
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    honestyNote: string;
    samplePreviewTag: string;
    sampleSubtitle: string;
    heardLabel: string;
    naturalLabel: string;
    banglaExplainLabel: string;
    englishExplainLabel: string;
    dnaMiniTitle: string;
    dnaSampleCaption: string;
    dnaAxes: {
      accuracy: string;
      naturalness: string;
      clarity: string;
    };
    listenNormal: string;
    listenSlow: string;
    coreCaption: string;
  };
  painMatrix: {
    kicker: string;
    title: string;
    subtitle: string;
    beforeLabel: string;
    afterLabel: string;
    items: Array<{
      id: string;
      num: string;
      struggleQuote: string;
      struggleDetail: string;
      solutionTitle: string;
      solutionDetail: string;
      proofPoint: string;
    }>;
  };
  sandbox: {
    kicker: string;
    sampleLabel: string;
    title: string;
    subtitle: string;
    chipsLabel: string;
    inputLabel: string;
    inputPlaceholder: string;
    analyzeBtn: string;
    analyzingBtn: string;
    emptyError: string;
    originalLabel: string;
    correctedLabel: string;
    categoryLabel: string;
    banglaLabel: string;
    englishLabel: string;
    l1Label: string;
    cleanBanner: string;
    detectedBanner: string;
    sourceRule: string;
    sourceAi: string;
    conversionCta: string;
    listenSlow: string;
    listenNormal: string;
  };
  loop: {
    kicker: string;
    title: string;
    subtitle: string;
    stepPrefix: string;
    exampleLabel: string;
    outcomeLabel: string;
    prevBtn: string;
    nextBtn: string;
    steps: Array<{
      num: string;
      shortTitle: string;
      title: string;
      summary: string;
      learnerExampleLabel: string;
      learnerExample: string;
      outcome: string;
    }>;
  };
  systems: {
    kicker: string;
    title: string;
    subtitle: string;
    sampleCaption: string;
    items: Array<{
      id: 'dna' | 'mistake_memory' | 'transfer_lab' | 'pressure_ladder' | 'replay' | 'evidence';
      num: string;
      name: string;
      tagline: string;
      description: string;
    }>;
  };
  support: {
    kicker: string;
    title: string;
    subtitle: string;
    pillars: Array<{
      id: 'bangla' | 'slow_audio' | 'text_fallback';
      title: string;
      description: string;
      demoActionLabel: string;
    }>;
    faqTitle: string;
    faqs: Array<{ q: string; a: string }>;
  };
  pricing: {
    kicker: string;
    title: string;
    subtitle: string;
    bdtLabel: string;
    usdLabel: string;
    monthlyLabel: string;
    annualLabel: string;
    perMonth: string;
    billedAnnually: string;
    honestyNote: string;
    free: {
      name: string;
      audience: string;
      priceBdtMonthly: string;
      priceBdtAnnual: string;
      priceUsdMonthly: string;
      priceUsdAnnual: string;
      cta: string;
      features: string[];
    };
    pro: {
      name: string;
      audience: string;
      priceBdtMonthly: string;
      priceBdtAnnual: string;
      priceUsdMonthly: string;
      priceUsdAnnual: string;
      cta: string;
      features: string[];
    };
  };
  finalCta: {
    title: string;
    subtitle: string;
    primaryBtn: string;
    secondaryBtn: string;
  };
  footer: {
    tagline: string;
    navTitle: string;
    privacyTitle: string;
    privacyPoints: string[];
    accountTitle: string;
    copyright: string;
    subline: string;
  };
  guideWidget: {
    triggerLabel: string;
    title: string;
    subtitle: string;
    tabAnswers: string;
    tabQuiz: string;
    quickAnswers: Array<{ q: string; a: string }>;
    quizIntro: string;
    q1Label: string;
    q1Options: Array<{ value: QuizComfortLevel; label: string }>;
    q2Label: string;
    q2Options: Array<{ value: QuizPrimaryGoal; label: string }>;
    resultTitle: string;
    pressureLabel: string;
    focusLabel: string;
    startPathCta: string;
    retakeBtn: string;
  };
}

export const LANDING_COPY: Record<UILanguage, LandingCopy> = {
  en: {
    nav: {
      whyItWorks: 'Why It Works',
      liveDemo: 'Live Demo',
      loop: '8-Step Loop',
      support: 'Support',
      pricing: 'Pricing',
      login: 'Login',
      startFree: 'Start Free',
      openWorkspace: 'Open Workspace',
    },
    hero: {
      badge: 'Built for Bangla-Speaking Learners • বাংলায় বুঝুন, ইংরেজিতে বলুন',
      headline: 'Stop Studying English. Start Speaking It.',
      subheadline:
        "You know grammar rules, yet your mind freezes when it's time to speak. Practice real conversations with AI, catch your exact Bangla-to-English mistakes, and see real proof of your improvement.",
      primaryCta: 'Start Free Speaking Diagnostic',
      secondaryCta: 'Try Live Mistake Detector ↓',
      honestyNote:
        'Honest progress only — zero fabricated user counts, zero fake 5-star reviews, and zero inflated streaks.',
      samplePreviewTag: 'Interactive Sample Preview',
      sampleSubtitle: 'Switch a real scenario to watch Bangla-interference detection in action',
      heardLabel: 'Common Bangla-Influenced Phrasing',
      naturalLabel: 'Natural Fluent English',
      banglaExplainLabel: 'বাংলা ব্যাকরণ ব্যাখ্যা',
      englishExplainLabel: 'Why this upgrade works',
      dnaMiniTitle: 'Communication DNA · Sample Shift',
      dnaSampleCaption: 'Interactive Sample Preview',
      dnaAxes: {
        accuracy: 'Grammar Accuracy',
        naturalness: 'Natural Phrasing',
        clarity: 'Spoken Clarity',
      },
      listenNormal: '1.0x Listen',
      listenSlow: '0.75x Slow',
      coreCaption: 'Acoustic Intelligence Core · Responds to your selection',
    },
    painMatrix: {
      kicker: 'Why You Still Can’t Speak',
      title: 'Three Real Barriers Holding Bangla Speakers Back — And How We Fix Them',
      subtitle:
        'Ten years of textbook grammar never trained your mouth to answer in real time. Each system in LINGUAVERSE AI directly dismantles a specific roadblock.',
      beforeLabel: 'The Daily Struggle',
      afterLabel: 'The LINGUAVERSE Solution',
      items: [
        {
          id: 'freeze',
          num: '01',
          struggleQuote: '"I understand English, but freeze when speaking to people."',
          struggleDetail:
            'In your head you translate word-by-word from Bangla, hesitate on verb forms, and go quiet when an interviewer or colleague waits for your reply.',
          solutionTitle: 'Zero-Judgment AI Speaking Studio & 5-Level Pressure Ladder',
          solutionDetail:
            'Start untimed at Level 1 with 0.75x slow playback and phrasing hints, then steadily climb to Level 5 realistic timed conversations at your own pace.',
          proofPoint: 'Includes 0.75x slow audio + full text fallback whenever you cannot use a mic.',
        },
        {
          id: 'repeat',
          num: '02',
          struggleQuote: '"I repeat the exact same tense & preposition mistakes every day."',
          struggleDetail:
            'Saying "I am agree", "discuss about", or "I go yesterday" happens automatically because no tool tracks your personal Bangla-to-English interference habits.',
          solutionTitle: 'Mistake Memory Engine with Spaced Repetition',
          solutionDetail:
            'Every recurring mistake is automatically logged, explained clearly in Bangla, and brought back for quick targeted micro-drills until your brain stops making it.',
          proofPoint: 'Tracks each recurring pattern from Active → Stabilizing → Resolved.',
        },
        {
          id: 'fake-streaks',
          num: '03',
          struggleQuote: '"Other apps give fake streaks, not real interview or workplace confidence."',
          struggleDetail:
            'Tapping multiple-choice flashcards for 200 days creates an illusion of progress that collapses the moment an HR panel asks an unexpected follow-up.',
          solutionTitle: 'Transfer Lab & Evidence-Based Communication DNA',
          solutionDetail:
            'Transfer Lab drops your studied skills into fresh, unscripted workplace scenarios with unexpected twists—updating your Communication DNA strictly from real work.',
          proofPoint: 'Zero synthetic scores — every metric traces directly to completed speaking tasks.',
        },
      ],
    },
    sandbox: {
      kicker: 'Live Interactive Sandbox · Zero Signup Required',
      sampleLabel: 'Interactive Sample Preview',
      title: 'Test Your English Sentence Right Now',
      subtitle:
        'Pick one of the 4 classic Bangla-speaker mistakes below—or type your own English sentence—to get instant correction with clear Bangla and English explanations.',
      chipsLabel: 'One-click Bangla-speaker samples:',
      inputLabel: 'Type or edit any English sentence',
      inputPlaceholder: 'Example: Yesterday I go to office late because traffic jam',
      analyzeBtn: 'Analyze My Sentence',
      analyzingBtn: 'Analyzing...',
      emptyError: 'Please enter an English sentence before analyzing.',
      originalLabel: 'Your Input Sentence',
      correctedLabel: 'Natural Corrected English',
      categoryLabel: 'Error Category',
      banglaLabel: 'বাংলা ব্যাখ্যা (Bangla Explanation)',
      englishLabel: 'English Coaching Note',
      l1Label: 'Why Bangla speakers make this slip',
      cleanBanner: 'No Common Mistake Detected',
      detectedBanner: 'Mistake Pattern Identified',
      sourceRule: 'Instant L1 Pattern Engine',
      sourceAi: 'Live Gemini Bilingual Analysis',
      conversionCta: 'Save this to your Mistake Memory & start your personalized plan →',
      listenSlow: 'Hear 0.75x',
      listenNormal: 'Hear 1.0x',
    },
    loop: {
      kicker: 'Closed-Loop Fluency Architecture',
      title: 'The 8-Step Communication Improvement Loop',
      subtitle:
        'Click any node in the loop to trace how a single spoken mistake turns into permanent, stress-tested English fluency.',
      stepPrefix: 'Step',
      exampleLabel: 'Concrete Learner Example',
      outcomeLabel: 'What Changes for You',
      prevBtn: '← Previous step',
      nextBtn: 'Next step →',
      steps: [
        {
          num: '01',
          shortTitle: 'Detect',
          title: 'Detect Exact Spoken Errors',
          summary: 'Capture tense, preposition, and phrasing slips in real sentences.',
          learnerExampleLabel: 'Job Interview Turn',
          learnerExample:
            'You say: "I am working here since three years." The engine pinpoints both tense aspect ("am working") and duration preposition ("since").',
          outcome: 'Stops vague feedback and isolates the exact habit costing you clarity.',
        },
        {
          num: '02',
          shortTitle: 'Explain in Bangla',
          title: 'Explain Clearly in Bangla',
          summary: 'Understand the mental Bangla translation causing the slip.',
          learnerExampleLabel: 'Bilingual Coaching Card',
          learnerExample:
            'Explains in natural Bangla why "তিন বছর ধরে কাজ করছি" maps to "have been working ... for three years" instead of continuous + since.',
          outcome: 'Zero grammar jargon confusion—you grasp the root cause in seconds.',
        },
        {
          num: '03',
          shortTitle: 'Personalize',
          title: 'Personalize Your Mistake Memory',
          summary: 'Save recurring slips into your private spaced-repetition queue.',
          learnerExampleLabel: 'Personal Priority Queue',
          learnerExample:
            'Your workspace prioritizes "Duration Aspect (for/since)" and "Past Tense Omission" ahead of textbook chapters you already know.',
          outcome: 'Every practice minute targets your real weaknesses, not generic lessons.',
        },
        {
          num: '04',
          shortTitle: 'Practice',
          title: 'Guided Voice Practice on the Pressure Ladder',
          summary: 'Rehearse calmly at 0.75x with hints before moving to timed replies.',
          learnerExampleLabel: 'Level 1 → Level 3 Progression',
          learnerExample:
            'You answer 3 calm guided turns using "have been + -ing", hear natural 0.75x audio, and compare your replay side-by-side.',
          outcome: 'Builds spoken muscle memory without anxiety or embarrassment.',
        },
        {
          num: '05',
          shortTitle: 'Transfer Lab',
          title: 'Prove It Inside Transfer Lab',
          summary: 'Apply the same structure inside a brand-new, unscripted scenario.',
          learnerExampleLabel: 'Unexpected Follow-Up Twist',
          learnerExample:
            'Instead of a textbook quiz, a simulated client asks: "How long has your team managed this account?"—testing spontaneous transfer.',
          outcome: 'Verifies that grammar knowledge actually survives real conversation.',
        },
        {
          num: '06',
          shortTitle: 'Retest',
          title: 'Spaced Retest Days Later',
          summary: 'Confirm the old habit does not return under fresh pressure.',
          learnerExampleLabel: '3-Day Retention Check',
          learnerExample:
            'Three days later, a short 60-second drill re-checks your duration phrasing to confirm the fix stuck long-term.',
          outcome: 'Prevents the classic cycle of learning a rule and forgetting it next week.',
        },
        {
          num: '07',
          shortTitle: 'Update DNA',
          title: 'Update Your Communication DNA',
          summary: 'Record verified growth across accuracy, clarity, and structure.',
          learnerExampleLabel: 'Evidence-Backed Shift',
          learnerExample:
            'Only after verified spoken transfer does your Tense Accuracy & Workplace Readiness profile move upward.',
          outcome: 'You see honest, traceable proof of real communication growth.',
        },
        {
          num: '08',
          shortTitle: 'Repeat',
          title: 'Repeat on Your Next Highest-Impact Gap',
          summary: 'Lock in the win and advance seamlessly to the next skill.',
          learnerExampleLabel: 'Continuous Fluency Cycle',
          learnerExample:
            'Once duration tense is resolved, the loop automatically promotes your next recurring pattern—such as polite disagreement in meetings.',
          outcome: 'Compounding real-world fluency week after week.',
        },
      ],
    },
    systems: {
      kicker: 'Six Differentiation Systems',
      title: 'Purpose-Built Architecture — Not Another Flashcard Game',
      subtitle:
        'Explore the six connected engines working together inside your learner workspace. Every micro-preview below is an Interactive Sample Preview.',
      sampleCaption: 'Interactive Sample Preview',
      items: [
        {
          id: 'dna',
          num: '01',
          name: 'Communication DNA',
          tagline: 'Multi-axis profile built strictly from completed work',
          description:
            'Maps grammar accuracy, spoken fluency, natural collocations, and transfer reliability with explicit evidence coverage—never a guessed CEFR badge.',
        },
        {
          id: 'mistake_memory',
          num: '02',
          name: 'Mistake Memory Engine',
          tagline: 'Captures & drills Bangla-to-English interference habits',
          description:
            'Logs your real spoken errors across sessions and schedules focused spaced-repetition drills until each habit is genuinely resolved.',
        },
        {
          id: 'transfer_lab',
          num: '03',
          name: 'Transfer Lab',
          tagline: '4-rubric grading on unexpected real-world twists',
          description:
            'Tests whether studied grammar holds up during unscripted job interviews, client objections, and workplace follow-ups.',
        },
        {
          id: 'pressure_ladder',
          num: '04',
          name: '5-Level Pressure Ladder',
          tagline: 'Move safely from untimed templates to timed high stakes',
          description:
            'Climb from Level 1 controlled templates and 0.75x audio up to Level 5 timed simulations so you stay composed when stakes are real.',
        },
        {
          id: 'replay',
          num: '05',
          name: 'Communication Replay',
          tagline: 'Side-by-side look at what you said vs. fluent phrasing',
          description:
            'Inspect your exact transcript next to a cleaner, natural upgrade—paired with concise Bangla notes explaining every change.',
        },
        {
          id: 'evidence',
          num: '06',
          name: 'Evidence-Based Progress',
          tagline: 'Zero fake streaks or empty gamification',
          description:
            'Your dashboard starts honestly at zero and only rewards verified speaking turns, fixed mistakes, and passed transfer checks.',
        },
      ],
    },
    support: {
      kicker: 'Always-Supported Learner Ecosystem',
      title: 'Built So Beginners Never Feel Lost, Rushed, or Judged',
      subtitle:
        'Whether you are starting from basic sentences or practicing on a noisy commute without a headset, every safeguard is built right in.',
      pillars: [
        {
          id: 'bangla',
          title: 'Instant Bangla Explanations',
          description:
            'Switch any explanation between Bangla, English, or Both with one click so complex grammar rules click immediately in your native language.',
          demoActionLabel: 'Toggle preview language',
        },
        {
          id: 'slow_audio',
          title: 'Slow Audio Playback (0.75x)',
          description:
            'Native speed can feel overwhelming at first. Tap 0.75x on any example or AI reply to hear every word and rhythm clearly.',
          demoActionLabel: 'Hear 0.75x vs 1.0x sample',
        },
        {
          id: 'text_fallback',
          title: 'Text Fallback When You Have No Mic',
          description:
            'In a quiet library, office, or without a good microphone? Seamlessly type your conversation turn and still get full Mistake Memory feedback.',
          demoActionLabel: 'Switch Voice / Text mode',
        },
      ],
      faqTitle: 'Honest Answers to Common Beginner Questions',
      faqs: [
        {
          q: 'What if my English is very basic and I get nervous speaking?',
          a: 'You are exactly who LINGUAVERSE AI is built for. You can start at Level 1 on the Pressure Ladder with full Bangla guidance, sentence templates, zero countdown timer, and 0.75x slow audio until you feel comfortable speaking freely.',
        },
        {
          q: 'Do I need a good microphone or quiet room to practice?',
          a: 'No. Any phone or laptop mic works for voice sessions—and whenever you are in a noisy place or prefer not to speak aloud, one tap switches to Text Fallback mode with the exact same AI coaching and Bangla explanations.',
        },
        {
          q: 'Are my voice recordings private?',
          a: 'Yes. Storing audio clips for self-replay is opt-in and controlled directly in your Settings. You can review or permanently delete all stored recordings anytime with one click, and we never sell or share learner audio.',
        },
        {
          q: 'Why does the platform say "Interactive Sample Preview" instead of showing user counts?',
          a: 'Because trust matters more than hype. We never fabricate learner counts, fake 5-star reviews, or inflated CEFR badges. Every metric in your learner workspace is calculated strictly from your own completed sessions.',
        },
      ],
    },
    pricing: {
      kicker: 'Transparent Pricing',
      title: 'Start Free. Upgrade Only When You Want Unlimited Voice & Transfer Labs.',
      subtitle:
        'Honest pricing built for Bangladesh and global learners. Switch currency or billing cycle anytime—no fake countdown timers.',
      bdtLabel: '৳ BDT',
      usdLabel: '$ USD',
      monthlyLabel: 'Monthly',
      annualLabel: 'Annual (Save 20%)',
      perMonth: '/ month',
      billedAnnually: 'Billed annually',
      honestyNote: 'No hidden auto-traps · Cancel or stay on Free forever.',
      free: {
        name: 'Free Starter',
        audience: 'For learners building an honest baseline & daily habit',
        priceBdtMonthly: '৳0',
        priceBdtAnnual: '৳0',
        priceUsdMonthly: '$0',
        priceUsdAnnual: '$0',
        cta: 'Start Free Speaking Diagnostic',
        features: [
          'Full EN / বাংলা bilingual interface & Bangla grammar explanations',
          'Honest Speaking & Grammar Diagnostic with personalized starting plan',
          'Foundational lessons + 0.75x slow audio + Text Fallback mode',
          'Mistake Memory Engine (track up to 15 active patterns)',
          '3 guided AI Speaking Studio sessions per week',
        ],
      },
      pro: {
        name: 'Pro Fluency',
        audience: 'For job interviews, workplace meetings & rapid spoken fluency',
        priceBdtMonthly: '৳490',
        priceBdtAnnual: '৳390',
        priceUsdMonthly: '$9',
        priceUsdAnnual: '$7',
        cta: 'Start with Pro Plan',
        features: [
          'Everything in Free Starter, plus unlimited AI Speaking Studio',
          'Full 5-Level Pressure Ladder (including Level 4 twists & Level 5 timed rounds)',
          'Unlimited Mistake Memory patterns with spaced-repetition micro-drills',
          'Full Transfer Lab with 4-rubric AI grading & Communication Replay',
          'Complete Communication DNA timeline & exportable progress evidence',
        ],
      },
    },
    finalCta: {
      title: "Your Next Interview or Conversation Doesn't Have to Be Scary.",
      subtitle:
        'Take a calm, zero-judgment diagnostic in under 3 minutes. Get your honest starting profile, Bangla-first explanations, and a clear path to confident English.',
      primaryBtn: 'Start Free Speaking Diagnostic',
      secondaryBtn: 'Try Live Mistake Detector',
    },
    footer: {
      tagline:
        'Voice-first, evidence-based AI English learning and communication intelligence built for Bangla-speaking learners.',
      navTitle: 'Explore',
      privacyTitle: 'Privacy & Data Sovereignty',
      privacyPoints: [
        'Opt-in voice recording storage with one-click full erasure in Settings',
        'Zero dark patterns, zero fake scores, and zero third-party audio resale',
        'All AI evaluations run securely server-side with transparent feedback',
      ],
      accountTitle: 'Get Started',
      copyright: '© 2026 LINGUAVERSE AI. Built for honest, measurable spoken fluency.',
      subline: 'English & বাংলা · Voice-First Communication Intelligence',
    },
    guideWidget: {
      triggerLabel: 'LINGUAVERSE Guide & Support',
      title: 'LINGUAVERSE Guide & Support',
      subtitle: 'Quick beginner answers & a 30-second starting path finder',
      tabAnswers: 'Quick Answers',
      tabQuiz: 'Find My Level (30s)',
      quickAnswers: [
        {
          q: 'Is it okay if I only know basic English?',
          a: 'Yes! Level 1 starts with full Bangla explanations, fill-in templates, and 0.75x slow audio—no timer, no pressure.',
        },
        {
          q: 'What if I cannot use my microphone right now?',
          a: 'Every AI conversation and diagnostic supports instant Text Fallback mode so you can practice anywhere quietly.',
        },
        {
          q: 'How is this different from memorization apps?',
          a: 'We capture your real Bangla-to-English mistakes in conversation, drill them via spaced repetition, and prove transfer in fresh scenarios.',
        },
      ],
      quizIntro: 'Answer 2 quick questions to see your recommended starting track:',
      q1Label: '1. What happens when you need to speak English today?',
      q1Options: [
        { value: 'freeze_basic', label: 'I know basic words but freeze and struggle to form sentences' },
        { value: 'understand_hesitate', label: 'I understand well, but hesitate and translate from Bangla' },
        { value: 'speak_with_errors', label: 'I can speak, but repeat tense/preposition slips under pressure' },
      ],
      q2Label: '2. What is your top priority right now?',
      q2Options: [
        { value: 'job_interview', label: 'Job interviews & career growth' },
        { value: 'office_meetings', label: 'Office meetings & client calls' },
        { value: 'daily_confidence', label: 'Everyday spoken confidence' },
      ],
      resultTitle: 'Your Recommended Starting Path',
      pressureLabel: 'Starting Pressure Tier',
      focusLabel: 'First Priority',
      startPathCta: 'Start This Path Free →',
      retakeBtn: 'Change answers',
    },
  },
  bn: {
    nav: {
      whyItWorks: 'কেন কার্যকর',
      liveDemo: 'লাইভ ডেমো',
      loop: '৮-ধাপের লুপ',
      support: 'সহায়তা',
      pricing: 'মূল্য তালিকা',
      login: 'লগইন',
      startFree: 'ফ্রি শুরু করুন',
      openWorkspace: 'ওয়ার্কস্পেস খুলুন',
    },
    hero: {
      badge: 'বাংলাভাষী শিক্ষার্থীদের জন্য তৈরি • বাংলায় বুঝুন, ইংরেজিতে বলুন',
      headline: 'ইংরেজি মুখস্থ করা বন্ধ করুন। আত্মবিশ্বাসের সাথে কথা বলা শুরু করুন।',
      subheadline:
        'আপনি গ্রামারের নিয়ম জানেন, তবু কথা বলার সময় মাথা ফাঁকা হয়ে যায়। এআই-এর সাথে বাস্তব কথোপকথন অনুশীলন করুন, আপনার বাংলা-থেকে-ইংরেজি ভুলগুলো ধরুন এবং উন্নতির বাস্তব প্রমাণ দেখুন।',
      primaryCta: 'ফ্রি স্পিকিং ডায়াগনস্টিক শুরু করুন',
      secondaryCta: 'লাইভ ভুল শনাক্তকরণ দেখুন ↓',
      honestyNote:
        'সম্পূর্ণ সৎ অগ্রগতি — কোনো ভুয়া ইউজার সংখ্যা, নকল ৫-স্টার রিভিউ বা কৃত্রিম স্ট্রিক নয়।',
      samplePreviewTag: 'ইন্টারেক্টিভ স্যাম্পল প্রিভিউ (Interactive Sample Preview)',
      sampleSubtitle: 'যেকোনো একটি বাস্তব পরিস্থিতি বেছে নিন এবং বাংলা-প্রভাবিত ভুল শোধরানো দেখুন',
      heardLabel: 'বাংলা প্রভাবে সাধারণ ভুল বাক্য',
      naturalLabel: 'স্বাভাবিক ও সাবলীল ইংরেজি',
      banglaExplainLabel: 'বাংলা ব্যাকরণ ব্যাখ্যা',
      englishExplainLabel: 'ইংরেজি নোট',
      dnaMiniTitle: 'Communication DNA · নমুনা উন্নতি',
      dnaSampleCaption: 'ইন্টারেক্টিভ স্যাম্পল প্রিভিউ',
      dnaAxes: {
        accuracy: 'গ্রামার নির্ভুলতা',
        naturalness: 'স্বাভাবিক প্রকাশভঙ্গি',
        clarity: 'বলার স্পষ্টতা',
      },
      listenNormal: '১.০x শুনুন',
      listenSlow: '০.৭৫x ধীরে',
      coreCaption: 'অ্যাকোস্টিক ইন্টেলিজেন্স কোর · আপনার ক্লিকে সাড়া দেয়',
    },
    painMatrix: {
      kicker: 'কেন এখনো ইংরেজিতে কথা বলতে পারছেন না',
      title: 'বাংলাভাষী শিক্ষার্থীদের ৩টি আসল বাধা — এবং আমাদের কার্যকর সমাধান',
      subtitle:
        '১০ বছর বইয়ে গ্রামার পড়েও বাস্তব কথায় জড়তা কাটে না। LINGUAVERSE AI-এর প্রতিটি সিস্টেম সরাসরি এই তিনটি সমস্যার সমাধান করে।',
      beforeLabel: 'প্রতিদিনের সমস্যা',
      afterLabel: 'LINGUAVERSE সমাধান',
      items: [
        {
          id: 'freeze',
          num: '01',
          struggleQuote: '"আমি ইংরেজি বুঝি, কিন্তু মানুষের সামনে কথা বলতে গেলে আটকে যাই।"',
          struggleDetail:
            'মনে মনে বাংলা থেকে শব্দে-শব্দে অনুবাদ করতে গিয়ে দেরি হয়ে যায়, আর ইন্টারভিউ বা অফিসে চুপ হয়ে যেতে হয়।',
          solutionTitle: 'জাজমেন্ট-ফ্রি AI Speaking Studio ও ৫-ধাপের Pressure Ladder',
          solutionDetail:
            'লেভেল ১-এ কোনো টাইমার ছাড়াই ০.৭৫x ধীর অডিও ও হিন্টসহ অনুশীলন শুরু করুন, তারপর ধীরে ধীরে লেভেল ৫-এর বাস্তব সময়ের চাপে অভ্যস্ত হোন।',
          proofPoint: 'প্রতিটি সেশনে ০.৭৫x ধীর অডিও এবং মাইক না থাকলে টেক্সট ফলব্যাক সুবিধা আছে।',
        },
        {
          id: 'repeat',
          num: '02',
          struggleQuote: '"আমি প্রতিদিন একই Tense আর Preposition-এর ভুল বারবার করি।"',
          struggleDetail:
            '"I am agree", "discuss about" বা "I go yesterday"-এর মতো ভুল অভ্যাস হয়ে যায়, কারণ কোনো অ্যাপ আপনার ব্যক্তিগত ভুলগুলো মনে রাখে না।',
          solutionTitle: 'স্পেসড রিপিটিশনসহ Mistake Memory Engine',
          solutionDetail:
            'আপনার প্রতিটি পুনরাবৃত্ত ভুল স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়, সহজ বাংলায় ব্যাখ্যা করা হয় এবং স্থায়ীভাবে ঠিক না হওয়া পর্যন্ত ছোট ড্রিলে অনুশীলন করানো হয়।',
          proofPoint: 'প্রতিটি ভুল Active → Stabilizing → Resolved ধাপে ট্র্যাক হয়।',
        },
        {
          id: 'fake-streaks',
          num: '03',
          struggleQuote: '"অন্যান্য অ্যাপ ভুয়া স্ট্রিক দেয়, কিন্তু ইন্টারভিউ বা অফিসের আত্মবিশ্বাস দেয় না।"',
          struggleDetail:
            '২০০ দিন ফ্ল্যাশকার্ড ট্যাপ করলেও ইন্টারভিউয়ার হঠাৎ পাল্টা প্রশ্ন করলে আসল কথা বলা থেমে যায়।',
          solutionTitle: 'Transfer Lab ও প্রমাণ-ভিত্তিক Communication DNA',
          solutionDetail:
            'Transfer Lab আপনাকে অপ্রত্যাশিত বাস্তব পরিস্থিতিতে পরীক্ষা করে—আর আপনার Communication DNA কেবল সম্পন্ন করা বাস্তব কাজের ভিত্তিতেই আপডেট হয়।',
          proofPoint: 'কোনো অনুমানভিত্তিক স্কোর নেই—প্রতিটি সংখ্যা আপনার বাস্তব অনুশীলনের প্রমাণ।',
        },
      ],
    },
    sandbox: {
      kicker: 'লাইভ ইন্টারেক্টিভ স্যান্ডবক্স · কোনো সাইনআপ ছাড়াই',
      sampleLabel: 'ইন্টারেক্টিভ স্যাম্পল প্রিভিউ (Interactive Sample Preview)',
      title: 'এখনই আপনার ইংরেজি বাক্য পরীক্ষা করুন',
      subtitle:
        'নিচের ৪টি পরিচিত বাংলাভাষী ভুল বাক্য থেকে একটি বেছে নিন—অথবা নিজের যেকোনো ইংরেজি বাক্য লিখে তাৎক্ষণিক শুদ্ধ রূপ ও বাংলা ব্যাখ্যা দেখুন।',
      chipsLabel: 'এক ক্লিকে পরিচিত নমুনা পরীক্ষা করুন:',
      inputLabel: 'যেকোনো ইংরেজি বাক্য লিখুন বা পরিবর্তন করুন',
      inputPlaceholder: 'যেমন: Yesterday I go to office late because traffic jam',
      analyzeBtn: 'আমার বাক্য বিশ্লেষণ করুন',
      analyzingBtn: 'বিশ্লেষণ চলছে...',
      emptyError: 'বিশ্লেষণ করার আগে অনুগ্রহ করে একটি ইংরেজি বাক্য লিখুন।',
      originalLabel: 'আপনার লেখা বাক্য',
      correctedLabel: 'স্বাভাবিক ও শুদ্ধ ইংরেজি',
      categoryLabel: 'ভুলের ধরন',
      banglaLabel: 'বাংলা ব্যাখ্যা',
      englishLabel: 'ইংরেজি কোচিং নোট',
      l1Label: 'কেন বাংলাভাষীদের এই ভুলটি হয়',
      cleanBanner: 'সাধারণ কোনো ভুল ধরা পড়েনি',
      detectedBanner: 'ভুলের ধরন শনাক্ত হয়েছে',
      sourceRule: 'তাৎক্ষণিক বাংলা L1 প্যাটার্ন ইঞ্জিন',
      sourceAi: 'লাইভ Gemini দ্বিভাষিক বিশ্লেষণ',
      conversionCta: 'এটি আপনার Mistake Memory-তে সেভ করুন ও ব্যক্তিগত প্ল্যান শুরু করুন →',
      listenSlow: '০.৭৫x শুনুন',
      listenNormal: '১.০x শুনুন',
    },
    loop: {
      kicker: 'ধারাবাহিক উন্নতির পদ্ধতি',
      title: '৮-ধাপের কমিউনিকেশন ইম্প্রুভমেন্ট লুপ',
      subtitle:
        'যেকোনো ধাপে ক্লিক করে দেখুন কীভাবে একটি সাধারণ ভুল ধাপে ধাপে স্থায়ী ইংরেজি সাবলীলতায় পরিণত হয়।',
      stepPrefix: 'ধাপ',
      exampleLabel: 'শিক্ষার্থীর বাস্তব উদাহরণ',
      outcomeLabel: 'আপনার কী পরিবর্তন হবে',
      prevBtn: '← আগের ধাপ',
      nextBtn: 'পরের ধাপ →',
      steps: [
        {
          num: '01',
          shortTitle: 'শনাক্ত',
          title: '১. বাস্তব ভুল শনাক্ত করুন (Detect)',
          summary: 'কথার মধ্যে Tense, Preposition ও বাক্য গঠনের সঠিক ভুল ধরা।',
          learnerExampleLabel: 'ইন্টারভিউয়ের উত্তর',
          learnerExample:
            'আপনি বললেন: "I am working here since three years." সিস্টেম সাথে সাথেই Tense ("am working") ও Preposition ("since") দুটি ভুলই চিহ্নিত করে।',
          outcome: 'অস্পষ্ট পরামর্শ নয়—ঠিক কোন অভ্যাস আপনার স্পষ্টতা কমাচ্ছে তা পরিষ্কার হয়।',
        },
        {
          num: '02',
          shortTitle: 'বাংলায় ব্যাখ্যা',
          title: '২. সহজ বাংলায় কারণ বুঝুন (Explain in Bangla)',
          summary: 'বাংলা থেকে সরাসরি অনুবাদের কারণে কেন ভুলটি হলো তা পরিষ্কার করা।',
          learnerExampleLabel: 'দ্বিভাষিক ব্যাখ্যা কার্ড',
          learnerExample:
            'সহজ বাংলায় বোঝানো হয় কেন "তিন বছর ধরে কাজ করছি"-এর ইংরেজি "have been working ... for three years" হয়।',
          outcome: 'জটিল ব্যাকরণ বই ছাড়াই কয়েক সেকেন্ডে আসল যুক্তি পরিষ্কার হয়ে যায়।',
        },
        {
          num: '03',
          shortTitle: 'পার্সোনালাইজ',
          title: '৩. ব্যক্তিগত Mistake Memory সাজানো (Personalize)',
          summary: 'আপনার পুনরাবৃত্ত ভুলগুলো ব্যক্তিগত রিভিশন তালিকায় যুক্ত করা।',
          learnerExampleLabel: 'ব্যক্তিগত অগ্রাধিকার তালিকা',
          learnerExample:
            'যে অধ্যায় আপনি আগেই জানেন তা বাদ দিয়ে আপনার প্রকৃত দুর্বলতা—যেমন for/since ও Past Tense—সবার আগে রাখা হয়।',
          outcome: 'প্রতি মিনিটের অনুশীলন আপনার আসল দুর্বলতার ওপর কাজ করে।',
        },
        {
          num: '04',
          shortTitle: 'অনুশীলন',
          title: '৪. Pressure Ladder-এ ভয়েস অনুশীলন (Practice)',
          summary: '০.৭৫x ধীর অডিও ও হিন্টসহ শান্তভাবে বলার অভ্যাস তৈরি।',
          learnerExampleLabel: 'লেভেল ১ → লেভেল ৩ উত্তরণ',
          learnerExample:
            'হিন্টসহ ৩টি বাস্তব বাক্যে "have been + -ing" বলে অনুশীলন করেন এবং নিজের কথা আবার শুনে মিলিয়ে নেন।',
          outcome: 'ভয় বা লজ্জা ছাড়াই মুখে স্বতঃস্ফূর্ত ইংরেজি চলে আসে।',
        },
        {
          num: '05',
          shortTitle: 'Transfer Lab',
          title: '৫. Transfer Lab-এ বাস্তব প্রয়োগ (Transfer Lab)',
          summary: 'একেবারে নতুন ও অপ্রত্যাশিত পরিস্থিতিতে শেখা নিয়ম প্রয়োগ।',
          learnerExampleLabel: 'অপ্রত্যাশিত ফলো-আপ প্রশ্ন',
          learnerExample:
            'মুখস্থ কুইজ নয়—নতুন এক ক্লায়েন্ট সিমুলেশনে প্রশ্ন আসে: "How long has your team managed this account?"',
          outcome: 'প্রমাণ হয় যে শেখা নিয়ম আসল কথোপকথনেও কাজ করছে।',
        },
        {
          num: '06',
          shortTitle: 'পুনরায় যাচাই',
          title: '৬. কয়েক দিন পর রিটেনশন যাচাই (Retest)',
          summary: 'পুরনো ভুলটি আবার ফিরে আসছে কি না তা কয়েক দিন পর পরীক্ষা।',
          learnerExampleLabel: '৩ দিন পর ৬০-সেকেন্ড ড্রিল',
          learnerExample:
            'তিন দিন পর একটি ছোট স্পিকিং ড্রিলে আবার সময়ের Tense যাচাই করে স্থায়ীত্ব নিশ্চিত করা হয়।',
          outcome: 'আজ শিখে পরের সপ্তাহে ভুলে যাওয়ার চক্র স্থায়ীভাবে বন্ধ হয়।',
        },
        {
          num: '07',
          shortTitle: 'DNA আপডেট',
          title: '৭. Communication DNA আপডেট (Update DNA)',
          summary: 'প্রমাণিত দক্ষতার ভিত্তিতে আপনার কমিউনিকেশন প্রোফাইল উন্নীত হয়।',
          learnerExampleLabel: 'প্রমাণ-ভিত্তিক উন্নতি',
          learnerExample:
            'বাস্তব কথায় সফল প্রয়োগের পরই কেবল আপনার গ্রামার নির্ভুলতা ও কর্মক্ষেত্রের প্রস্তুতি স্কোর বাড়ে।',
          outcome: 'কোনো ভুয়া সংখ্যা নয়—আপনার বাস্তব উন্নতির স্পষ্ট রেকর্ড থাকে।',
        },
        {
          num: '08',
          shortTitle: 'পুনরাবৃত্তি',
          title: '৮. পরবর্তী গুরুত্বপূর্ণ দক্ষতায় এগোন (Repeat)',
          summary: 'একটি ভুল স্থায়ীভাবে দূর করে পরবর্তী দক্ষতায় মনোযোগ দেওয়া।',
          learnerExampleLabel: 'ধারাবাহিক সাবলীলতা চক্র',
          learnerExample:
            'একটি প্যাটার্ন ঠিক হলেই সিস্টেম স্বয়ংক্রিয়ভাবে পরবর্তী দুর্বলতা—যেমন মিটিংয়ে ভদ্রভাবে দ্বিমত পোষণ—উপরে নিয়ে আসে।',
          outcome: 'সপ্তাহের পর সপ্তাহ জুড়ে দৃশ্যমান ও স্থায়ী উন্নতি।',
        },
      ],
    },
    systems: {
      kicker: '৬টি স্বতন্ত্র সিস্টেম',
      title: 'আসল সাবলীলতার জন্য নির্মিত ৬টি সমন্বিত ইঞ্জিন',
      subtitle:
        'সাধারণ ফ্ল্যাশকার্ড অ্যাপ নয়—প্রতিটি সিস্টেম একসাথে কাজ করে আপনাকে জড়তামুক্ত বক্তা হিসেবে গড়ে তোলে। নিচের প্রিভিউগুলো Interactive Sample Preview।',
      sampleCaption: 'ইন্টারেক্টিভ স্যাম্পল প্রিভিউ',
      items: [
        {
          id: 'dna',
          num: '01',
          name: 'Communication DNA',
          tagline: 'সম্পন্ন করা বাস্তব কাজের ভিত্তিতে বহুমাত্রিক প্রোফাইল',
          description:
            'গ্রামার নির্ভুলতা, সাবলীলতা, স্বাভাবিক শব্দচয়ন ও ট্রান্সফার দক্ষতার সুস্পষ্ট মানচিত্র—কোনো মনগড়া CEFR ব্যাজ নয়।',
        },
        {
          id: 'mistake_memory',
          num: '02',
          name: 'Mistake Memory Engine',
          tagline: 'বাংলা-থেকে-ইংরেজি ভুলগুলো ধরে ও মনে রাখে',
          description:
            'সেশনের পর সেশন আপনার পুনরাবৃত্ত ভুলগুলো চিহ্নিত করে এবং স্থায়ীভাবে না শোধরানো পর্যন্ত ছোট স্পেসড ড্রিলে অনুশীলন করায়।',
        },
        {
          id: 'transfer_lab',
          num: '03',
          name: 'Transfer Lab',
          tagline: 'অপ্রত্যাশিত বাস্তব পরিস্থিতিতে ৪-রুব্রিক মূল্যায়ন',
          description:
            'চাকরির ইন্টারভিউ, ক্লায়েন্টের আপত্তি বা অফিসের ফলো-আপ প্রশ্নে আপনার শেখা গ্রামার আসলেই টিকে কি না তা যাচাই করে।',
        },
        {
          id: 'pressure_ladder',
          num: '04',
          name: '৫-ধাপের Pressure Ladder',
          tagline: 'ধীর টেমপ্লেট থেকে সময়ের চাপে কথা বলার উত্তরণ',
          description:
            'লেভেল ১-এর সহজ টেমপ্লেট ও ০.৭৫x অডিও থেকে ধাপে ধাপে লেভেল ৫-এর টাইমড সিমুলেশনে পৌঁছান নিজের গতিতে।',
        },
        {
          id: 'replay',
          num: '05',
          name: 'Communication Replay',
          tagline: 'আপনি কী বললেন বনাম স্বাভাবিক ইংরেজি—পাশাপাশি তুলনা',
          description:
            'আপনার বলা বাক্যের ঠিক পাশে আরও স্বাভাবিক ও পেশাদার সংস্করণ এবং প্রতিটি পরিবর্তনের সংক্ষিপ্ত বাংলা ব্যাখ্যা।',
        },
        {
          id: 'evidence',
          num: '06',
          name: 'প্রমাণ-ভিত্তিক অগ্রগতি',
          tagline: 'ভুয়া স্ট্রিক ও কৃত্রিম পয়েন্ট ছাড়া সৎ ড্যাশবোর্ড',
          description:
            'আপনার ড্যাশবোর্ড সততার সাথে শূন্য থেকে শুরু হয় এবং কেবল বাস্তব স্পিকিং, ভুল সংশোধন ও Transfer Lab-এর ফলাফলই দেখায়।',
        },
      ],
    },
    support: {
      kicker: 'সবসময় পাশে থাকা লার্নিং সাপোর্ট',
      title: 'একদম নতুন শিক্ষার্থীরাও কখনো আটকে বা লজ্জা পাবেন না',
      subtitle:
        'আপনার ইংরেজি যদি একদম প্রাথমিক পর্যায়েও হয় বা আশেপাশে শব্দ থাকে—প্রতিটি সুরক্ষা ব্যবস্থা আগেই তৈরি রাখা হয়েছে।',
      pillars: [
        {
          id: 'bangla',
          title: 'তাৎক্ষণিক বাংলা ব্যাখ্যা',
          description:
            'এক ক্লিকেই যেকোনো ব্যাখ্যা বাংলা, ইংরেজি বা উভয় ভাষায় দেখুন—যাতে জটিল নিয়ম নিজের ভাষায় সহজে বুঝে নিতে পারেন।',
          demoActionLabel: 'ভাষা পরিবর্তন করে দেখুন',
        },
        {
          id: 'slow_audio',
          title: 'ধীর গতির অডিও (০.৭৫x)',
          description:
            'দ্রুত ইংরেজি শুনতে অসুবিধা হলে যেকোনো উদাহরণ বা এআই উত্তর ০.৭৫x গতিতে ধীরে ও স্পষ্টভাবে শুনুন।',
          demoActionLabel: '০.৭৫x বনাম ১.০x শুনে দেখুন',
        },
        {
          id: 'text_fallback',
          title: 'মাইক ছাড়াই টেক্সট ফলব্যাক',
          description:
            'অফিসে, লাইব্রেরিতে বা ভালো মাইক্রোফোন না থাকলে সরাসরি টাইপ করেই পূর্ণ কথোপকথন ও Mistake Memory ফিডব্যাক নিন।',
          demoActionLabel: 'ভয়েস / টেক্সট মোড দেখুন',
        },
      ],
      faqTitle: 'সাধারণ প্রশ্নের স্পষ্ট উত্তর',
      faqs: [
        {
          q: 'আমার ইংরেজি যদি খুবই প্রাথমিক পর্যায়ের হয় এবং কথা বলতে ভয় লাগে?',
          a: 'আপনার কথা ভেবেই LINGUAVERSE AI তৈরি। আপনি Pressure Ladder-এর লেভেল ১ থেকে বাংলা নির্দেশিকা, বাক্য গঠনের টেমপ্লেট, ০.৭৫x ধীর অডিও এবং টাইমার ছাড়াই নিশ্চিন্তে শুরু করতে পারবেন।',
        },
        {
          q: 'অনুশীলনের জন্য কি খুব ভালো মাইক্রোফোন বা নিরিবিলি ঘর লাগবে?',
          a: 'না। সাধারণ ফোন বা ল্যাপটপের মাইকই যথেষ্ট—আর আপনি যদি কোলাহলপূর্ণ জায়গায় থাকেন বা কথা বলতে না পারেন, তবে এক ক্লিকেই টেক্সট ফলব্যাক মোডে অনুশীলন চালিয়ে যেতে পারবেন।',
        },
        {
          q: 'আমার ভয়েস রেকর্ডিংগুলো কি ব্যক্তিগত ও সুরক্ষিত থাকবে?',
          a: 'হ্যাঁ। নিজের কথা পুনরায় শোনার জন্য অডিও সংরক্ষণ সম্পূর্ণ অপশনাল এবং Settings থেকে নিয়ন্ত্রণ করা যায়। আপনি যেকোনো সময় এক ক্লিকে সব রেকর্ডিং চিরতরে মুছে ফেলতে পারবেন।',
        },
        {
          q: 'এখানে কেন ভুয়া ইউজার সংখ্যা বা নকল ৫-স্টার রিভিউ দেখানো হয়নি?',
          a: 'কারণ অতিরঞ্জনের চেয়ে সততা বেশি গুরুত্বপূর্ণ। আমাদের প্রতিটি ডেমো পরিষ্কারভাবে "Interactive Sample Preview" হিসেবে চিহ্নিত, আর আপনার ড্যাশবোর্ডে কেবল আপনার নিজের সম্পন্ন কাজের প্রমাণই দেখানো হয়।',
        },
      ],
    },
    pricing: {
      kicker: 'স্বচ্ছ মূল্য তালিকা',
      title: 'ফ্রি দিয়ে শুরু করুন। আনলিমিটেড ভয়েস ও Transfer Lab চাইলে আপগ্রেড করুন।',
      subtitle:
        'বাংলাদেশ এবং বিশ্বের সবার জন্য সাশ্রয়ী ও সৎ মূল্য। কোনো ভুয়া কাউন্টডাউন টাইমার বা লুকানো শর্ত নেই।',
      bdtLabel: '৳ টাকা (BDT)',
      usdLabel: '$ ডলার (USD)',
      monthlyLabel: 'মাসিক',
      annualLabel: 'বার্ষিক (২০% সাশ্রয়)',
      perMonth: '/ মাস',
      billedAnnually: 'বার্ষিক বিল',
      honestyNote: 'কোনো লুকানো চার্জ নেই · আজীবন ফ্রি প্ল্যানেও ব্যবহার করতে পারবেন।',
      free: {
        name: 'ফ্রি স্টার্টার (Free)',
        audience: 'নিজের সঠিক স্তর যাচাই ও নিয়মিত অভ্যাস গড়ার জন্য',
        priceBdtMonthly: '৳০',
        priceBdtAnnual: '৳০',
        priceUsdMonthly: '$0',
        priceUsdAnnual: '$0',
        cta: 'ফ্রি স্পিকিং ডায়াগনস্টিক শুরু করুন',
        features: [
          'সম্পূর্ণ EN / বাংলা দ্বিভাষিক ইন্টারফেস ও বাংলা গ্রামার ব্যাখ্যা',
          'সৎ স্পিকিং ও গ্রামার ডায়াগনস্টিক এবং ব্যক্তিগত শুরুর প্ল্যান',
          'ভিত্তিমূলক লেসন + ০.৭৫x ধীর অডিও + টেক্সট ফলব্যাক সুবিধা',
          'Mistake Memory Engine (সর্বোচ্চ ১৫টি সক্রিয় ভুল প্যাটার্ন)',
          'সপ্তাহে ৩টি গাইডেড AI Speaking Studio সেশন',
        ],
      },
      pro: {
        name: 'প্রো ফ্লুয়েন্সি (Pro)',
        audience: 'চাকরির ইন্টারভিউ, অফিস মিটিং ও দ্রুত সাবলীলতার জন্য',
        priceBdtMonthly: '৳৪৯০',
        priceBdtAnnual: '৳৩৯০',
        priceUsdMonthly: '$9',
        priceUsdAnnual: '$7',
        cta: 'প্রো প্ল্যান দিয়ে শুরু করুন',
        features: [
          'ফ্রি স্টার্টারের সব সুবিধা + আনলিমিটেড AI Speaking Studio',
          'সম্পূর্ণ ৫-ধাপের Pressure Ladder (লেভেল ৪ টুইস্ট ও লেভেল ৫ টাইমড রাউন্ড)',
          'আনলিমিটেড Mistake Memory প্যাটার্ন ও স্পেসড-রিপিটিশন মাইক্রো-ড্রিল',
          '৪-রুব্রিক AI গ্রেডিংসহ Transfer Lab ও Communication Replay',
          'সম্পূর্ণ Communication DNA টাইমলাইন ও প্রমাণ-ভিত্তিক প্রগ্রেস রিপোর্ট',
        ],
      },
    },
    finalCta: {
      title: 'আপনার পরবর্তী ইন্টারভিউ বা ইংরেজি কথোপকথন আর ভয়ের কারণ হবে না।',
      subtitle:
        'মাত্র ৩ মিনিটে কোনো চাপ ছাড়াই ফ্রি ডায়াগনস্টিক দিন। আপনার প্রকৃত অবস্থান, বাংলা ব্যাখ্যা এবং ধাপে ধাপে এগোনোর পরিষ্কার পথ পান।',
      primaryBtn: 'ফ্রি স্পিকিং ডায়াগনস্টিক শুরু করুন',
      secondaryBtn: 'লাইভ ভুল শনাক্তকরণ দেখুন',
    },
    footer: {
      tagline:
        'বাংলাভাষী শিক্ষার্থীদের জন্য নির্মিত ভয়েস-ফার্স্ট, প্রমাণ-ভিত্তিক এআই ইংরেজি শিক্ষা ও কমিউনিকেশন ইন্টেলিজেন্স প্ল্যাটফর্ম।',
      navTitle: 'নেভিগেশন',
      privacyTitle: 'প্রাইভেসি ও ডেটা সুরক্ষা',
      privacyPoints: [
        'ভয়েস রেকর্ডিং সংরক্ষণ সম্পূর্ণ অপশনাল—Settings থেকে এক ক্লিকেই সব মুছে ফেলা যায়',
        'কোনো ডার্ক প্যাটার্ন, ভুয়া স্কোর বা থার্ড-পার্টি অডিও বিক্রি নেই',
        'সকল AI মূল্যায়ন নিরাপদে সার্ভার-সাইডে সম্পন্ন হয়',
      ],
      accountTitle: 'শুরু করুন',
      copyright: '© ২০২৬ LINGUAVERSE AI। সৎ ও পরিমাপযোগ্য ইংরেজি সাবলীলতার জন্য নির্মিত।',
      subline: 'English & বাংলা · ভয়েস-ফার্স্ট কমিউনিকেশন ইন্টেলিজেন্স',
    },
    guideWidget: {
      triggerLabel: 'LINGUAVERSE গাইড ও সাপোর্ট',
      title: 'LINGUAVERSE গাইড ও সাপোর্ট',
      subtitle: 'নতুনদের সাধারণ উত্তর ও ৩০-সেকেন্ডে শুরুর পথ নির্ধারণ',
      tabAnswers: 'দ্রুত উত্তর',
      tabQuiz: 'আমার স্তর খুঁজুন (৩০ সে.)',
      quickAnswers: [
        {
          q: 'আমি যদি খুব সাধারণ ইংরেজি জানি, তবুও কি শুরু করতে পারব?',
          a: 'অবশ্যই! লেভেল ১-এ সম্পূর্ণ বাংলা ব্যাখ্যা, বাক্য টেমপ্লেট ও ০.৭৫x ধীর অডিও আছে—কোনো টাইমার বা চাপ নেই।',
        },
        {
          q: 'এখন মাইক্রোফোন ব্যবহার করতে না পারলে কী করব?',
          a: 'প্রতিটি এআই কথোপকথনে টেক্সট ফলব্যাক মোড আছে, তাই যেকোনো জায়গা থেকে নীরবে টাইপ করে অনুশীলন করতে পারবেন।',
        },
        {
          q: 'এটি সাধারণ মুখস্থ অ্যাপ থেকে কীভাবে আলাদা?',
          a: 'আমরা আপনার কথোপকথন থেকে বাংলা-প্রভাবিত আসল ভুলগুলো ধরে স্পেসড ড্রিলে ঠিক করি এবং নতুন পরিস্থিতিতে প্রয়োগ যাচাই করি।',
        },
      ],
      quizIntro: 'আপনার জন্য সেরা শুরুর পথ জানতে মাত্র ২টি প্রশ্নের উত্তর দিন:',
      q1Label: '১. আজ ইংরেজিতে কথা বলতে গেলে আপনার কী হয়?',
      q1Options: [
        { value: 'freeze_basic', label: 'সাধারণ শব্দ জানি, কিন্তু বাক্য বানাতে গিয়ে আটকে যাই' },
        { value: 'understand_hesitate', label: 'ভালো বুঝতে পারি, কিন্তু বাংলা থেকে অনুবাদ করতে গিয়ে থেমে যাই' },
        { value: 'speak_with_errors', label: 'কথা বলতে পারি, কিন্তু চাপে পড়লে Tense ও Preposition ভুল হয়' },
      ],
      q2Label: '২. এই মুহূর্তে আপনার প্রধান লক্ষ্য কী?',
      q2Options: [
        { value: 'job_interview', label: 'চাকরির ইন্টারভিউ ও ক্যারিয়ার উন্নতি' },
        { value: 'office_meetings', label: 'অফিস মিটিং ও ক্লায়েন্ট কল' },
        { value: 'daily_confidence', label: 'দৈনন্দিন কথায় আত্মবিশ্বাস' },
      ],
      resultTitle: 'আপনার জন্য সুপারিশকৃত শুরুর পথ',
      pressureLabel: 'শুরুর প্রেসার লেভেল',
      focusLabel: 'প্রথম অগ্রাধিকার',
      startPathCta: 'এই পথটি ফ্রি শুরু করুন →',
      retakeBtn: 'উত্তর পরিবর্তন করুন',
    },
  },
};

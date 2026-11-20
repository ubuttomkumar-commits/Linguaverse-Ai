import type { LearnerProfile, UILanguage, UserAccount } from '../types/domain';

export interface LandingRouteTargets {
  primaryAuthRoute: string;
  speakingRoute: string;
  transferLabRoute: string;
  improveRoute: string;
  progressRoute: string;
  settingsRoute: string;
  freeSignupRoute: string;
  isSignedIn: boolean;
}

/**
 * Resolves all landing page CTAs strictly to verified existing application routes.
 * Never links to unimplemented routes or fabricated checkout endpoints.
 */
export function resolveLandingRoutes(
  user: Pick<UserAccount, 'emailVerified'> | null,
  profile: Pick<LearnerProfile, 'onboardingCompleted'> | null
): LandingRouteTargets {
  if (!user) {
    return {
      primaryAuthRoute: '/register',
      speakingRoute: '/register',
      transferLabRoute: '/register',
      improveRoute: '/register',
      progressRoute: '/register',
      settingsRoute: '/register',
      freeSignupRoute: '/register?plan=free',
      isSignedIn: false,
    };
  }

  if (user.emailVerified === false) {
    return {
      primaryAuthRoute: '/verify-email',
      speakingRoute: '/verify-email',
      transferLabRoute: '/verify-email',
      improveRoute: '/verify-email',
      progressRoute: '/verify-email',
      settingsRoute: '/verify-email',
      freeSignupRoute: '/verify-email',
      isSignedIn: true,
    };
  }

  if (profile && !profile.onboardingCompleted) {
    return {
      primaryAuthRoute: '/onboarding',
      speakingRoute: '/onboarding',
      transferLabRoute: '/onboarding',
      improveRoute: '/onboarding',
      progressRoute: '/onboarding',
      settingsRoute: '/onboarding',
      freeSignupRoute: '/onboarding',
      isSignedIn: true,
    };
  }

  return {
    primaryAuthRoute: '/app',
    speakingRoute: '/app/speak',
    transferLabRoute: '/app/transfer-lab',
    improveRoute: '/app/improve',
    progressRoute: '/app/progress',
    settingsRoute: '/app/settings',
    freeSignupRoute: '/app',
    isSignedIn: true,
  };
}

export const PLACEHOLDER_CONTACT_EMAIL = 'hello@linguaverse.ai';

export interface ProblemChapter {
  id: string;
  index: string;
  title: string;
  shortDesc: string;
  mindLoop: string;
  platformResponse: string;
  exampleThought: string;
  exampleBreakthrough: string;
}

export interface IntelligenceSystemItem {
  id: string;
  number: string;
  title: string;
  statusNote: string;
  problemSolved: string;
  howItWorks: string;
  userGain: string;
  featured?: boolean;
  routeKey: 'improve' | 'speaking' | 'transfer' | 'progress' | 'demo';
}

export interface SpeakingPreviewScenario {
  id: string;
  tabLabel: string;
  contextLabel: string;
  prompt: string;
  learnerReply: string;
  feedbackHeading: string;
  feedbackExplanation: string;
  naturalRewrite: string;
  focusDimensions: readonly {
    label: string;
    note: string;
  }[];
}

export interface TransferLabShowcaseItem {
  id: string;
  title: string;
  subtitle: string;
  challengeBrief: string;
  targetSkill: string;
  isLiveInApp: boolean;
}

export interface BanglaBridgeLevel {
  id: 'bangla_first' | 'bilingual_bridge' | 'english_focus';
  label: string;
  explanation: string;
  memoryCue: string;
}

export interface JourneyStageItem {
  step: string;
  title: string;
  shortSummary: string;
  platformMapping: string;
  learnerOutcome: string;
}

export interface TrustPrivacyPillar {
  id: string;
  title: string;
  detail: string;
  verificationNote: string;
}

export interface PricingComparisonRow {
  feature: string;
  freeValue: string;
  premiumValue: string;
}

export interface LandingCopyBundle {
  nav: {
    howItWorks: string;
    liveDemo: string;
    intelligence: string;
    privacy: string;
    pricing: string;
    login: string;
    startFree: string;
    openWorkspace: string;
    openMenu: string;
    closeMenu: string;
  };
  hero: {
    categoryLabel: string;
    audienceLabel: string;
    headlineLine1: string;
    headlineAccent: string;
    positioningQuote: string;
    subcopy: string;
    primaryCta: string;
    primaryCtaSignedIn: string;
    secondaryCta: string;
    trustItems: readonly [string, string, string];
    visualAriaLabel: string;
    coreLabel: string;
    coreSublabel: string;
    orbitNodes: readonly {
      id: string;
      title: string;
      subtitle: string;
      livePreview: string;
    }[];
  };
  problem: {
    kicker: string;
    title: string;
    lead: string;
    mindLabel: string;
    responseLabel: string;
    stuckLabel: string;
    shiftLabel: string;
    chapters: readonly ProblemChapter[];
  };
  transformation: {
    kicker: string;
    title: string;
    lead: string;
    beforeTitle: string;
    beforeSubtitle: string;
    beforePoints: readonly string[];
    afterTitle: string;
    afterSubtitle: string;
    afterPoints: readonly string[];
    honestyDisclaimer: string;
  };
  demo: {
    kicker: string;
    title: string;
    lead: string;
    previewLabel: string;
    inputLabel: string;
    inputPlaceholder: string;
    analyzeBtn: string;
    analyzingBtn: string;
    presetsLabel: string;
    presets: readonly string[];
    originalHeading: string;
    correctedHeading: string;
    explanationHeading: string;
    alternativesHeading: string;
    contextHeading: string;
    sourceAi: string;
    sourceRule: string;
    tryCta: string;
    tryCtaSignedIn: string;
  };
  intelligence: {
    kicker: string;
    title: string;
    lead: string;
    problemLabel: string;
    howLabel: string;
    gainLabel: string;
    actionLabel: string;
    items: readonly IntelligenceSystemItem[];
  };
  speaking: {
    kicker: string;
    title: string;
    lead: string;
    cta: string;
    ctaSignedIn: string;
    sessionHeader: string;
    previewTag: string;
    waveAriaLabel: string;
    noMicDisclaimer: string;
    focusHeading: string;
    scenarios: readonly SpeakingPreviewScenario[];
  };
  transfer: {
    kicker: string;
    title: string;
    lead: string;
    liveTag: string;
    plannedTag: string;
    briefLabel: string;
    skillLabel: string;
    honestyNote: string;
    cta: string;
    ctaSignedIn: string;
    items: readonly TransferLabShowcaseItem[];
  };
  banglaAdvantage: {
    kicker: string;
    title: string;
    lead: string;
    exampleLabel: string;
    mistakeSentence: string;
    correctedSentence: string;
    modeHeading: string;
    cueLabel: string;
    levels: readonly BanglaBridgeLevel[];
  };
  journey: {
    kicker: string;
    title: string;
    lead: string;
    insideAppLabel: string;
    outcomeLabel: string;
    disclaimer: string;
    stages: readonly JourneyStageItem[];
  };
  privacy: {
    kicker: string;
    title: string;
    lead: string;
    settingsCta: string;
    settingsCtaSignedOut: string;
    pillars: readonly TrustPrivacyPillar[];
  };
  pricing: {
    kicker: string;
    title: string;
    lead: string;
    free: {
      eyebrow: string;
      name: string;
      price: string;
      description: string;
      cta: string;
      ctaSignedIn: string;
      highlights: readonly string[];
    };
    premium: {
      eyebrow: string;
      name: string;
      price: string;
      description: string;
      cta: string;
      notice: string;
      highlights: readonly string[];
    };
    tableTitle: string;
    tableHeaders: readonly [string, string, string];
    comparisonRows: readonly PricingComparisonRow[];
  };
  faq: {
    kicker: string;
    title: string;
    items: readonly { q: string; a: string }[];
  };
  finalCta: {
    kicker: string;
    title: string;
    lead: string;
    primaryBtn: string;
    primaryBtnSignedIn: string;
    secondaryBtn: string;
    contactPrefix: string;
    contactEmail: string;
    contactSuffix: string;
  };
  footer: {
    tagline: string;
    productTitle: string;
    learningTitle: string;
    infoTitle: string;
    links: {
      howItWorks: string;
      liveDemo: string;
      intelligence: string;
      speakingStudio: string;
      transferLab: string;
      banglaMethod: string;
      journey: string;
      privacy: string;
      pricing: string;
      faq: string;
      contactPlaceholder: string;
      login: string;
      createAccount: string;
    };
    copyrightSuffix: string;
    subline: string;
  };
}

export const SUPPLIED_LANDING_COPY: Record<UILanguage, LandingCopyBundle> = {
  en: {
    nav: {
      howItWorks: 'How It Works',
      liveDemo: 'Live Demo',
      intelligence: 'Intelligence',
      privacy: 'Privacy',
      pricing: 'Pricing',
      login: 'Log in',
      startFree: 'Start Learning Free',
      openWorkspace: 'Open Workspace',
      openMenu: 'Open navigation menu',
      closeMenu: 'Close navigation menu',
    },
    hero: {
      categoryLabel: 'AI Communication Intelligence',
      audienceLabel: 'Built for Bangla-speaking English learners',
      headlineLine1: 'Speak with Confidence.',
      headlineAccent: 'Think Beyond Translation.',
      positioningQuote: "Don't just learn English. Become naturally understood.",
      subcopy:
        'Build real communication skills through intelligent practice, contextual feedback, and real-world learning experiences.',
      primaryCta: 'Start Learning Free',
      primaryCtaSignedIn: 'Continue in Workspace',
      secondaryCta: 'Explore the Experience',
      trustItems: [
        'Free tier available, no card needed',
        'Bangla-first contextual explanations',
        'Full voice & data deletion controls',
      ],
      visualAriaLabel: 'Interactive 3D LINGUAVERSE Communication Intelligence Core',
      coreLabel: 'LINGUA',
      coreSublabel: 'COMMUNICATION CORE',
      orbitNodes: [
        {
          id: 'grammar',
          title: 'Language',
          subtitle: 'Clear sentence structure',
          livePreview: 'Spots Bangla-to-English interference like "I am agree" → "I agree".',
        },
        {
          id: 'speaking',
          title: 'Speaking',
          subtitle: 'Guided conversation flow',
          livePreview: 'Practices realistic dialogue turns with clear, pressure-paced prompts.',
        },
        {
          id: 'context',
          title: 'Context',
          subtitle: 'Natural phrasing & tone',
          livePreview: 'Adapts phrasing for interviews, workplace meetings, and daily life.',
        },
        {
          id: 'progress',
          title: 'Evidence',
          subtitle: 'Tracked retention & mastery',
          livePreview: 'Measures recurring mistake reduction rather than empty completion clicks.',
        },
      ],
    },
    problem: {
      kicker: 'The Real Problem',
      title: 'Years of rules rarely prepare you for a five-minute conversation.',
      lead: 'Select a familiar barrier below to inspect why traditional study stalls and how a communication-first loop responds.',
      mindLabel: 'What happens in real time',
      responseLabel: 'How LINGUAVERSE responds',
      stuckLabel: 'Common bottleneck',
      shiftLabel: 'Guided shift',
      chapters: [
        {
          id: 'grammar-vs-speaking',
          index: '01.',
          title: 'Knowing grammar but struggling to speak',
          shortDesc: 'Passive textbook rules freeze when someone asks a live question.',
          mindLoop:
            'You remember tense formulas on paper, yet under conversational timing your mind searches for rules instead of expressing a clear thought.',
          platformResponse:
            'Academy lessons connect directly into guided Speaking Studio turns so every grammar rule is spoken in context immediately.',
          exampleThought: '“Wait—is it present perfect or past simple here?”',
          exampleBreakthrough: 'Speak one clear sentence first, receive calm correction, and retry immediately.',
        },
        {
          id: 'mental-translation',
          index: '02.',
          title: 'Translating every sentence mentally',
          shortDesc: 'Word-for-word Bangla translation creates unnatural English patterns.',
          mindLoop:
            'Converting Bangla phrases literally ("আমি একমত" → "I am agree") slows response speed and introduces recurring structural errors.',
          platformResponse:
            'Bangla-first contrast explanations expose the exact translation trap and provide natural English equivalents you can reuse.',
          exampleThought: '“I am agree with your plan.” (literal Bangla structure)',
          exampleBreakthrough: '“I agree with your plan.” — explained clearly in Bangla.',
        },
        {
          id: 'fear-of-mistakes',
          index: '03.',
          title: 'Fear of making mistakes',
          shortDesc: 'Worry about judgment makes you stay silent or keep answers overly short.',
          mindLoop:
            'In meetings or interviews, fear of sounding wrong causes hesitation before you even begin a sentence.',
          platformResponse:
            'Speaking Studio provides a private, judgment-free practice space with a progressive Pressure Ladder—from guided templates to open dialogue.',
          exampleThought: '“Better to say nothing than make an embarrassing grammar error.”',
          exampleBreakthrough: 'Practice at low pressure first, then step up gradually at your own pace.',
        },
        {
          id: 'natural-comprehension',
          index: '04.',
          title: 'Difficulty following natural conversations',
          shortDesc: 'Real dialogue moves quickly and shifts topics unexpectedly.',
          mindLoop:
            'Scripted drills rarely prepare you for follow-up questions, clarifications, or polite disagreement in real conversations.',
          platformResponse:
            'Transfer Lab introduces realistic multi-turn prompts and unexpected conversational twists across work, study, and everyday settings.',
          exampleThought: '“I prepared my first answer, not the follow-up question.”',
          exampleBreakthrough: 'Respond to adaptive follow-ups with structured cue support.',
        },
        {
          id: 'forgetting-vocab',
          index: '05.',
          title: 'Forgetting vocabulary during real conversations',
          shortDesc: 'Memorized word lists vanish when you actually need them.',
          mindLoop:
            'Words studied in isolation lack conversational triggers, so you fall back to the same basic phrases under pressure.',
          platformResponse:
            'Mistake Memory and spaced repetition resurface your exact weak phrases inside fresh drills and practical speaking scenarios.',
          exampleThought: '“I knew the right word yesterday—why can’t I recall it now?”',
          exampleBreakthrough: 'Reinforce vocabulary inside full contextual sentences over spaced intervals.',
        },
      ],
    },
    transformation: {
      kicker: 'The Transformation',
      title: 'Move from reciting memorized lines to expressing your own ideas.',
      lead: 'LINGUAVERSE bridges passive knowledge and active expression through repeated feedback loops.',
      beforeTitle: 'Before',
      beforeSubtitle: 'Rule-heavy study without real practice',
      beforePoints: [
        'Hesitation before answering everyday questions',
        'Word-by-word mental translation from Bangla',
        'Limited confidence in meetings or interviews',
        'Reliance on fragile memorized phrases',
      ],
      afterTitle: 'With Consistent Practice',
      afterSubtitle: 'Evidence-guided communication training',
      afterPoints: [
        'More natural, direct conversational responses',
        'Clear contextual understanding of why phrasing works',
        'Better expression across work, study, and daily life',
        'Steadier real-world communication confidence',
      ],
      honestyDisclaimer:
        'Learning progress depends on consistent practice and active engagement; LINGUAVERSE does not guarantee fixed proficiency outcomes or certifications.',
    },
    demo: {
      kicker: 'Interactive Product Demonstration',
      title: 'Test a sentence. See why it works—and how to say it naturally.',
      lead: 'Try our built-in bilingual analyzer right now. Edit the sentence below or pick a common Bangla-to-English example.',
      previewLabel: 'Interactive Sample Preview · Built-in Sentence Analyzer',
      inputLabel: 'Write an English sentence to inspect',
      inputPlaceholder: 'Type a sentence, e.g. I am agree with you.',
      analyzeBtn: 'Analyze Sentence',
      analyzingBtn: 'Analyzing...',
      presetsLabel: 'Try a common example:',
      presets: [
        'I am agree with you.',
        'Yesterday I go to university.',
        'I am working here since 2 years.',
        'We discussed about the new project.',
      ],
      originalHeading: 'Original sentence',
      correctedHeading: 'Corrected sentence',
      explanationHeading: 'Simple explanation (EN + বাংলা)',
      alternativesHeading: 'More natural alternatives',
      contextHeading: 'Contextual usage',
      sourceAi: 'Live AI preview via /api/landing/analyze',
      sourceRule: 'Built-in deterministic analyzer',
      tryCta: 'Practice full conversations free',
      tryCtaSignedIn: 'Continue in Speaking Studio',
    },
    intelligence: {
      kicker: 'Six Intelligence Systems',
      title: 'Six focused capabilities built around how communication actually improves.',
      lead: 'Each layer solves a concrete communication gap—with honest boundaries around what is live today.',
      problemLabel: 'Problem solved',
      howLabel: 'How it works',
      gainLabel: 'What you gain',
      actionLabel: 'Explore capability',
      items: [
        {
          id: 'language-intelligence',
          number: '01.',
          title: 'Language Intelligence',
          statusNote: 'Live in Academy & Mistake Memory',
          problemSolved: 'Repeating hidden grammar and Bangla-transfer errors without knowing the root cause.',
          howItWorks: 'Detects recurring tense, preposition, and sentence-structure patterns and logs them into targeted micro-drills.',
          userGain: 'Clearer, more accurate sentences built from understanding instead of guesswork.',
          featured: true,
          routeKey: 'improve',
        },
        {
          id: 'speaking-intelligence',
          number: '02.',
          title: 'Speaking Intelligence',
          statusNote: 'Live in Speaking Studio',
          problemSolved: 'Knowing English passively but freezing when asked to reply in conversation.',
          howItWorks: 'Guides multi-turn dialogues across 7 practice modes with a 5-step Pressure Ladder and structured turn feedback.',
          userGain: 'A safe, repeatable habit for turning ideas into spoken or typed replies.',
          routeKey: 'speaking',
        },
        {
          id: 'context-intelligence',
          number: '03.',
          title: 'Context Intelligence',
          statusNote: 'Live in Speaking Studio & Transfer Lab',
          problemSolved: 'Using textbook phrases that sound awkward or overly rigid in real conversations.',
          howItWorks: 'Matches phrasing feedback to your exact goal—whether a job interview, client update, or everyday discussion.',
          userGain: 'More natural word choice that fits the tone and audience in front of you.',
          routeKey: 'demo',
        },
        {
          id: 'pronunciation-intelligence',
          number: '04.',
          title: 'Pronunciation & Delivery Clarity',
          statusNote: 'Honest scope · Fluency & transcript clarity today',
          problemSolved: 'Uncertainty about pacing, clarity, and how spoken phrasing lands with listeners.',
          howItWorks: 'Supports optional browser speech input and transcript review; never fabricates numeric phonetic scores without verified acoustic speech engines.',
          userGain: 'Transparent delivery feedback and replayable transcripts you can honestly trust.',
          routeKey: 'speaking',
        },
        {
          id: 'real-world-transfer',
          number: '05.',
          title: 'Real-World Transfer',
          statusNote: 'Live in Transfer Lab',
          problemSolved: 'Passing isolated exercises yet making the same mistake in real situations.',
          howItWorks: 'Tests your recently practiced rules inside realistic workplace, interview, academic, and service scenarios.',
          userGain: 'Confidence that what you learn holds up outside textbook exercises.',
          routeKey: 'transfer',
        },
        {
          id: 'progress-intelligence',
          number: '06.',
          title: 'Personalized Progress Intelligence',
          statusNote: 'Live in Progress & Communication DNA',
          problemSolved: 'Studying for weeks without knowing which skills actually improved.',
          howItWorks: 'Combines Communication DNA skill tracking, spaced repetition intervals, and verified attempt records—never empty click streaks.',
          userGain: 'Honest visibility into strengths, due reviews, and measurable improvement over time.',
          featured: true,
          routeKey: 'progress',
        },
      ],
    },
    speaking: {
      kicker: 'Speaking Studio',
      title: 'A calm conversation studio designed for real expression.',
      lead: 'Switch between sample scenarios to preview how guided prompts, gentle sentence coaching, and clarity feedback work together.',
      cta: 'Try Speaking Studio Free',
      ctaSignedIn: 'Open Speaking Studio',
      sessionHeader: 'Speaking Studio Preview',
      previewTag: 'Illustrative preview · No audio recorded',
      waveAriaLabel: 'Illustrative voice visualization waveform',
      noMicDisclaimer:
        'Illustrative interface only. Live microphone input is optional and requested only inside your signed-in Speaking Studio.',
      focusHeading: 'Session focus signals (illustrative)',
      scenarios: [
        {
          id: 'daily',
          tabLabel: 'Daily Routine',
          contextLabel: 'Everyday Conversation · Low Pressure',
          prompt: 'Tell me about your morning routine before work or classes.',
          learnerReply: 'I wake up at 7 and then I goes to university by bus.',
          feedbackHeading: 'Subject-verb agreement · Grammar',
          feedbackExplanation:
            'Use the base verb “go” with “I”. Reserve “goes” for “he”, “she”, or “it”.',
          naturalRewrite: 'I wake up at 7, and then I take the bus to university.',
          focusDimensions: [
            { label: 'Sentence structure', note: 'Clear sequence; minor verb agreement fix' },
            { label: 'Natural phrasing', note: '“take the bus to” sounds smoother than “go by bus”' },
            { label: 'Next prompt', note: 'Ask follow-up about evening study habits' },
          ],
        },
        {
          id: 'interview',
          tabLabel: 'Job Interview',
          contextLabel: 'Career Interview · Moderate Pressure',
          prompt: 'How did you handle a challenging deadline in your last project?',
          learnerReply: 'Yesterday our team discuss about the delay and we fixed it.',
          feedbackHeading: 'Past tense & redundant preposition',
          feedbackExplanation:
            'Use Past Simple “discussed” for finished events and drop “about” directly after “discuss”.',
          naturalRewrite: 'Yesterday, our team discussed the delay and agreed on a recovery plan.',
          focusDimensions: [
            { label: 'Verb tense', note: 'Keep past actions consistently in Past Simple' },
            { label: 'Professional tone', note: 'Direct, solution-focused wording for hiring panels' },
            { label: 'Next prompt', note: 'Probe for specific personal contribution' },
          ],
        },
        {
          id: 'workplace',
          tabLabel: 'Team Meeting',
          contextLabel: 'Workplace Alignment · Guided',
          prompt: 'Do you think we should move the client review to Thursday?',
          learnerReply: 'Yes, I am agree with you because we need more testing time.',
          feedbackHeading: 'Bangla-to-English verb transfer',
          feedbackExplanation:
            '“Agree” is already a full verb, so say “I agree with you” directly without “am”.',
          naturalRewrite: 'Yes, I agree with you—we need an extra day for thorough testing.',
          focusDimensions: [
            { label: 'Root pattern', note: 'Avoid inserting “am/is/are” before action verbs like agree' },
            { label: 'Clarity', note: 'Clear reasoning that supports team alignment' },
            { label: 'Next prompt', note: 'Confirm who will notify the client' },
          ],
        },
      ],
    },
    transfer: {
      kicker: 'Real-World Transfer Lab',
      title: 'Apply what you practice to the conversations that actually matter.',
      lead: 'Select a real-world situation to inspect the scenario brief and communication focus.',
      liveTag: 'Live in Transfer Lab',
      plannedTag: 'Planned preview',
      briefLabel: 'Scenario brief',
      skillLabel: 'Core communication focus',
      honestyNote:
        'Five core scenarios are active inside Transfer Lab today; Travel is shown as a planned expansion track.',
      cta: 'Start Practicing in Transfer Lab',
      ctaSignedIn: 'Open Transfer Lab',
      items: [
        {
          id: 'interviews',
          title: 'Job Interviews',
          subtitle: 'Answer behavioral & follow-up questions clearly',
          challengeBrief:
            'Walk an interviewer through a past deliverable, explain what went wrong, and highlight your concrete actions.',
          targetSkill: 'Consistent Past Simple narration and concise STAR structure',
          isLiveInApp: true,
        },
        {
          id: 'workplace',
          title: 'Workplace Communication',
          subtitle: 'Share updates, blockers, and recovery plans',
          challengeBrief:
            'Update a delivery lead on an external dependency delay professionally without sounding defensive.',
          targetSkill: 'Accountable tone, Present Perfect Continuous, and clear next steps',
          isLiveInApp: true,
        },
        {
          id: 'meetings',
          title: 'Meetings & Alignment',
          subtitle: 'Agree, disagree politely, and clarify priorities',
          challengeBrief:
            'Respond to a teammate’s proposal, align on trade-offs, and summarize action items succinctly.',
          targetSkill: 'Eliminating "I am agree" / "discuss about" traps under live timing',
          isLiveInApp: true,
        },
        {
          id: 'academic',
          title: 'Academic Communication',
          subtitle: 'Discuss ideas, admissions, and seminar questions',
          challengeBrief:
            'Explain your study goals and defend a point of view clearly during a university admission interview.',
          targetSkill: 'Structured reasoning, connectors, and precise vocabulary',
          isLiveInApp: true,
        },
        {
          id: 'everyday',
          title: 'Everyday Conversations',
          subtitle: 'Order food, solve service issues, and share stories',
          challengeBrief:
            'Resolve an order mix-up politely or tell an engaging personal story without losing momentum.',
          targetSkill: 'Polite requests, natural transitions, and conversational flow',
          isLiveInApp: true,
        },
        {
          id: 'travel',
          title: 'Travel & Navigation',
          subtitle: 'Check-ins, directions, and unexpected schedule changes',
          challengeBrief:
            'Planned track: Ask for transit alternatives, clarify hotel bookings, and navigate airport desk requests.',
          targetSkill: 'Clear question formation and practical listening comprehension',
          isLiveInApp: false,
        },
      ],
    },
    banglaAdvantage: {
      kicker: 'Bangla-First Advantage',
      title: 'Understand subtle English concepts in Bangla—then speak without translating.',
      lead: 'Toggle the explanation bridge below to see how LINGUAVERSE adapts from Bangla-first clarity to independent English thinking.',
      exampleLabel: 'Bilingual concept preview',
      mistakeSentence: '“I am working here since 2022.”',
      correctedSentence: '“I have been working here since 2022.”',
      modeHeading: 'Choose explanation bridge',
      cueLabel: 'Mental shortcut',
      levels: [
        {
          id: 'bangla_first',
          label: 'Bangla-First Guide',
          explanation:
            'বাংলায় আমরা বলি “আমি ২০২২ সাল থেকে এখানে কাজ করছি”—তাই ইংরেজিতে অনেকেই Present Continuous (“am working”) বসিয়ে ফেলেন। কিন্তু অতীতে শুরু হয়ে এখনও চলছে এমন কাজের সাথে “since” বা “for” থাকলে ইংরেজিতে “have been working” ব্যবহার করতে হয়।',
          memoryCue: '“থেকে করছি” + since/for → সবসময় have/has been + verb-ing।',
        },
        {
          id: 'bilingual_bridge',
          label: 'Bangla + English Bridge',
          explanation:
            'Because Bangla expresses ongoing past-to-present work with a single continuous form (“কাজ করছি”), it is natural to reach for “am working”. In English, pairing a starting point (“since 2022”) requires Present Perfect Continuous: “have been working”.',
          memoryCue: 'Start time in the past + still happening now = “have been working since 2022”.',
        },
        {
          id: 'english_focus',
          label: 'English Immersion',
          explanation:
            'Use Present Perfect Continuous (“have been + -ing”) when an action started in the past and continues into the present. Pair “since” with a specific point in time (2022) and “for” with a duration (two years).',
          memoryCue: 'Past start + present continuation → “have been working since [point] / for [duration]”.',
        },
      ],
    },
    journey: {
      kicker: 'Personalized Learning Journey',
      title: 'A structured path built to turn feedback into lasting skill.',
      lead: 'Select any stage to see how each step connects inside the workspace.',
      insideAppLabel: 'Inside LINGUAVERSE',
      outcomeLabel: 'What happens here',
      disclaimer:
        'Stages serve as a structured learning roadmap—not a guaranteed timeline or formal proficiency certificate.',
      stages: [
        {
          step: '01.',
          title: 'Discover',
          shortSummary: 'Identify your real starting level and recurring patterns.',
          platformMapping: 'Onboarding Goal Setup + Baseline Diagnostic',
          learnerOutcome:
            'Pinpoint your current communication baseline, goals, and top Bangla-to-English interference habits without guessing.',
        },
        {
          step: '02.',
          title: 'Practice',
          shortSummary: 'Build sentences actively in Academy and Speaking Studio.',
          platformMapping: 'Structured Academy Lessons + Guided Speaking Studio',
          learnerOutcome:
            'Move from clear examples and guided templates into active sentence building at a comfortable pressure level.',
        },
        {
          step: '03.',
          title: 'Receive Feedback',
          shortSummary: 'Understand why a sentence felt off—in Bangla or English.',
          platformMapping: 'Contextual Bilingual Coaching & Turn Review',
          learnerOutcome:
            'See exact corrections, root explanations, and more natural alternatives right after each turn.',
        },
        {
          step: '04.',
          title: 'Improve',
          shortSummary: 'Eliminate repeat errors with targeted micro-drills.',
          platformMapping: 'Mistake Memory + Spaced Repetition Reviews',
          learnerOutcome:
            'Revisit your recurring errors at expanding intervals until accurate phrasing becomes automatic.',
        },
        {
          step: '05.',
          title: 'Apply in Real Life',
          shortSummary: 'Transfer new skills into interviews, work, and daily life.',
          platformMapping: 'Transfer Lab + Communication DNA Evidence',
          learnerOutcome:
            'Test your skills inside realistic multi-turn scenarios and track evidence-based progress over time.',
        },
      ],
    },
    privacy: {
      kicker: 'Trust & Privacy',
      title: 'Clear privacy boundaries—built directly into your account controls.',
      lead: 'Every statement below reflects the actual controls implemented in the application today.',
      settingsCta: 'Manage Privacy & Data in Settings',
      settingsCtaSignedOut: 'Create Account to Access Full Data Controls',
      pillars: [
        {
          id: 'data-handling',
          title: 'Transparent Data Handling',
          detail:
            'Your learning profile, diagnostic history, and mistake records are used strictly to personalize lessons, reviews, and progress tracking.',
          verificationNote: 'Export your complete learning dataset as JSON anytime from Settings.',
        },
        {
          id: 'permissions',
          title: 'Optional Microphone Permissions',
          detail:
            'No microphone access is requested on this landing page. Inside Speaking Studio, voice input is strictly opt-in—full typed practice works without a mic.',
          verificationNote: 'Browser permission prompt triggers only when you tap voice input.',
        },
        {
          id: 'voice-storage',
          title: 'Recording Storage & Deletion',
          detail:
            'Optional voice playback clips are governed by your explicit audio-retention consent toggle and can be deleted permanently in one click.',
          verificationNote: '“Delete All Recordings” control is live in /app/settings.',
        },
        {
          id: 'account-control',
          title: 'Account & Consent Ownership',
          detail:
            'Review privacy consent preferences, flag inaccurate AI corrections, or clear your account data whenever you choose.',
          verificationNote: 'Dedicated Privacy & Data Sovereignty panel in Settings.',
        },
      ],
    },
    pricing: {
      kicker: 'Simple, Honest Plans',
      title: 'Start free. Decide on deeper practice only when it earns your trust.',
      lead: 'Final paid pricing is not yet published. Start on the Free tier today with transparent boundaries.',
      free: {
        eyebrow: 'Available Now',
        name: 'Free',
        price: 'Free',
        description: 'Everything you need to start building a real speaking and feedback habit.',
        cta: 'Start Learning Free',
        ctaSignedIn: 'Open Workspace',
        highlights: [
          'Baseline onboarding & diagnostic assessment',
          'Core Academy lessons with Bangla-first explanations',
          'Guided Speaking Studio practice turns',
          'Personal Mistake Memory & Communication DNA overview',
        ],
      },
      premium: {
        eyebrow: 'Planned Tier · Placeholder',
        name: 'Premium',
        price: 'Pricing TBA',
        description: 'Designed for learners seeking higher daily practice volume and expanded scenario tracks.',
        cta: 'Check Plan Status',
        notice:
          'Placeholder status: paid billing and final BDT/USD prices are not active yet. Create a Free account today—no payment is collected.',
        highlights: [
          'Higher daily AI speaking & coaching allowance',
          'Expanded Transfer Lab scenario library',
          'Deeper longitudinal progress analytics',
          'Priority support once live billing launches',
        ],
      },
      tableTitle: 'Transparent Feature & Limitation Comparison',
      tableHeaders: ['Capability', 'Free (Active)', 'Premium (Planned)'],
      comparisonRows: [
        { feature: 'Bangla + English explanations', freeValue: 'Included', premiumValue: 'Included' },
        { feature: 'Structured Academy lessons', freeValue: 'Core curriculum', premiumValue: 'Full expanded library' },
        { feature: 'Speaking Studio & Transfer Lab', freeValue: 'Standard daily access', premiumValue: 'Higher usage limits (TBA)' },
        { feature: 'Mistake Memory & JSON data export', freeValue: 'Included', premiumValue: 'Included' },
        { feature: 'Billing & checkout status', freeValue: 'No card required', premiumValue: 'Not yet active (placeholder)' },
      ],
    },
    faq: {
      kicker: 'Frequently Asked Questions',
      title: 'Honest answers before you start.',
      items: [
        {
          q: 'Is LINGUAVERSE AI suitable if I hesitate even with basic sentences?',
          a: 'Yes. The onboarding diagnostic places you gently at your real starting point, and the Pressure Ladder lets you begin with guided sentence templates before moving into open conversations.',
        },
        {
          q: 'How do Bangla explanations work inside the platform?',
          a: 'You can switch the entire interface between English and বাংলা anytime, and receive clear Bangla explanations for why specific English grammar or word-choice mistakes occur.',
        },
        {
          q: 'Does LINGUAVERSE AI grade my accent or give numeric pronunciation scores?',
          a: 'No—we intentionally avoid fabricated pronunciation percentages. Speech transcription alone is not acoustic proof of pronunciation quality, so coaching focuses honestly on grammar, clarity, natural phrasing, and contextual fit.',
        },
        {
          q: 'Is my microphone active or are my voice recordings stored automatically?',
          a: 'Never on the landing page, and never without your action inside the app. Voice input is optional, governed by consent toggles in Settings, and you can permanently delete stored clips or export your data anytime.',
        },
        {
          q: 'Is the Free tier actually free without hidden billing?',
          a: 'Yes. You can create a Free account with no credit card. Paid Premium plans and final pricing are clearly marked as placeholders until billing is officially configured.',
        },
        {
          q: 'Does it work smoothly on Android smartphones?',
          a: 'Yes. The interface is built mobile-first with touch-friendly controls, lightweight motion that respects reduced-motion preferences, and zero heavy WebGL overhead.',
        },
      ],
    },
    finalCta: {
      kicker: 'Begin Today',
      title: 'Your Next Conversation Can Be Different.',
      lead: 'Start with one conversation. Build confidence one step at a time.',
      primaryBtn: 'Start Learning Free',
      primaryBtnSignedIn: 'Open Your Workspace',
      secondaryBtn: 'Try the Live Sentence Demo',
      contactPrefix: 'Questions or partnership inquiries? Placeholder contact:',
      contactEmail: PLACEHOLDER_CONTACT_EMAIL,
      contactSuffix: '(replace with production inbox before launch).',
    },
    footer: {
      tagline: "Don't just learn English. Become naturally understood.",
      productTitle: 'Product',
      learningTitle: 'Learning & Trust',
      infoTitle: 'Account & Info',
      links: {
        howItWorks: 'How It Works',
        liveDemo: 'Interactive Demo',
        intelligence: 'Six Intelligence Systems',
        speakingStudio: 'Speaking Studio',
        transferLab: 'Transfer Lab',
        banglaMethod: 'Bangla-First Method',
        journey: 'Learning Journey',
        privacy: 'Trust & Privacy',
        pricing: 'Pricing',
        faq: 'FAQ',
        contactPlaceholder: 'Contact (Placeholder)',
        login: 'Log in',
        createAccount: 'Create Free Account',
      },
      copyrightSuffix: 'LINGUAVERSE AI. All rights reserved.',
      subline: 'Built for real-world communication.',
    },
  },
  bn: {
    nav: {
      howItWorks: 'কীভাবে কাজ করে',
      liveDemo: 'লাইভ ডেমো',
      intelligence: 'সিস্টেমসমূহ',
      privacy: 'প্রাইভেসি',
      pricing: 'প্ল্যান',
      login: 'লগ ইন',
      startFree: 'বিনামূল্যে শুরু করুন',
      openWorkspace: 'ওয়ার্কস্পেস খুলুন',
      openMenu: 'নেভিগেশন মেনু খুলুন',
      closeMenu: 'নেভিগেশন মেনু বন্ধ করুন',
    },
    hero: {
      categoryLabel: 'AI কমিউনিকেশন ইন্টেলিজেন্স',
      audienceLabel: 'বাংলাভাষী ইংরেজি শিক্ষার্থীদের জন্য নির্মিত',
      headlineLine1: 'আত্মবিশ্বাসের সাথে বলুন।',
      headlineAccent: 'অনুবাদের গণ্ডি পেরিয়ে ভাবুন।',
      positioningQuote: 'শুধু ইংরেজি শিখবেন না—স্বাভাবিকভাবে নিজেকে প্রকাশ করুন।',
      subcopy:
        'বুদ্ধিমত্তাপূর্ণ অনুশীলন, প্রাসঙ্গিক ফিডব্যাক এবং বাস্তব জীবনের কথোপকথনের মাধ্যমে কার্যকর যোগাযোগ দক্ষতা গড়ে তুলুন।',
      primaryCta: 'বিনামূল্যে শুরু করুন',
      primaryCtaSignedIn: 'ওয়ার্কস্পেসে ফিরে যান',
      secondaryCta: 'অভিজ্ঞতাটি দেখুন',
      trustItems: [
        'বিনামূল্যে শুরু—কার্ডের প্রয়োজন নেই',
        'বাংলা-ফার্স্ট প্রাসঙ্গিক ব্যাখ্যা',
        'ভয়েস ও ডেটা মুছে ফেলার পূর্ণ নিয়ন্ত্রণ',
      ],
      visualAriaLabel: 'ইন্টারঅ্যাক্টিভ 3D LINGUAVERSE কমিউনিকেশন ইন্টেলিজেন্স কোর',
      coreLabel: 'LINGUA',
      coreSublabel: 'COMMUNICATION CORE',
      orbitNodes: [
        {
          id: 'grammar',
          title: 'ভাষা গঠন',
          subtitle: 'স্পষ্ট বাক্য কাঠামো',
          livePreview: 'বাংলা থেকে সরাসরি অনুবাদের ভুল ("I am agree" → "I agree") ধরে দেয়।',
        },
        {
          id: 'speaking',
          title: 'কথোপকথন',
          subtitle: 'গাইডেড স্পিকিং অনুশীলন',
          livePreview: 'ধাপে ধাপে বাস্তব কথোপকথনের উত্তর সাজাতে সাহায্য করে।',
        },
        {
          id: 'context',
          title: 'প্রসঙ্গ (Context)',
          subtitle: 'স্বাভাবিক শব্দচয়ন ও ভঙ্গি',
          livePreview: 'ইন্টারভিউ, অফিস মিটিং বা দৈনন্দিন আলাপ অনুযায়ী ভাষা মানিয়ে নেয়।',
        },
        {
          id: 'progress',
          title: 'প্রমাণভিত্তিক উন্নতি',
          subtitle: 'প্রকৃত ধরে রাখার হিসাব',
          livePreview: 'ফাঁকা ক্লিক নয়—বারবার হওয়া ভুল কমে আসার বাস্তব প্রমাণ দেখায়।',
        },
      ],
    },
    problem: {
      kicker: 'আসল সমস্যাটি কোথায়',
      title: 'বছরের পর বছর নিয়ম পড়েও পাঁচ মিনিটের কথোপকথনে কেন আটকে যাই?',
      lead: 'নিচের পরিচিত বাধাগুলো থেকে যেকোনো একটি বেছে নিন এবং দেখুন আমাদের সিস্টেম কীভাবে তার সমাধান করে।',
      mindLabel: 'কথা বলার মুহূর্তে যা ঘটে',
      responseLabel: 'LINGUAVERSE যেভাবে সাহায্য করে',
      stuckLabel: 'সাধারণ বাধা',
      shiftLabel: 'সঠিক দিকনির্দেশনা',
      chapters: [
        {
          id: 'grammar-vs-speaking',
          index: '01.',
          title: 'ব্যাকরণ জানা থাকলেও কথা বলতে আটকে যাওয়া',
          shortDesc: 'বইয়ের নিয়ম মনে থাকলেও সরাসরি প্রশ্নের উত্তরে জড়তা আসে।',
          mindLoop:
            'খাতায় টেন্সের নিয়ম পারলেও কথা বলার সময় মস্তিষ্ক আগে নিয়ম খুঁজতে থাকে, ফলে স্বাভাবিক প্রবাহ ভেঙে যায়।',
          platformResponse:
            'একাডেমির প্রতিটি লেসন সরাসরি স্পিকিং স্টুডিওর সাথে যুক্ত—যাতে শেখা নিয়ম তৎক্ষণাৎ বাক্যে প্রয়োগ করা যায়।',
          exampleThought: '“এখানে কি Past Simple হবে নাকি Present Perfect?”',
          exampleBreakthrough: 'আগে একটি স্পষ্ট বাক্য বলুন, শান্তভাবে সংশোধন দেখুন এবং আবার চেষ্টা করুন।',
        },
        {
          id: 'mental-translation',
          index: '02.',
          title: 'প্রতিটি বাক্য মনে মনে বাংলা থেকে অনুবাদ করা',
          shortDesc: 'শব্দে শব্দে বাংলা অনুবাদ ইংরেজি বাক্যকে অস্বাভাবিক করে তোলে।',
          mindLoop:
            'বাংলা “আমি একমত” সরাসরি অনুবাদ করে “I am agree” বলার মতো অভ্যাসে উত্তর ধীর হয়ে যায় এবং ভুল জমতে থাকে।',
          platformResponse:
            'বাংলা-ফার্স্ট তুলনামূলক ব্যাখ্যা অনুবাদের ফাঁদটি ধরিয়ে দেয় এবং স্বাভাবিক ইংরেজি বিকল্প শেখায়।',
          exampleThought: '“I am agree with your plan.” (সরাসরি বাংলা কাঠামো)',
          exampleBreakthrough: '“I agree with your plan.” — সহজ বাংলা ব্যাখ্যাসহ।',
        },
        {
          id: 'fear-of-mistakes',
          index: '03.',
          title: 'ভুল হয়ে যাওয়ার ভয়',
          shortDesc: 'মানুষ কী ভাববে—এই চিন্তায় অনেকেই চুপ থাকেন বা সংক্ষিপ্ত উত্তর দেন।',
          mindLoop:
            'মিটিং বা ইন্টারভিউয়ে ভুল হওয়ার আশঙ্কায় বাক্য শুরু করার আগেই দ্বিধা কাজ করে।',
          platformResponse:
            'স্পিকিং স্টুডিও আপনাকে ব্যক্তিগত, নিরাপদ অনুশীলনের জায়গা দেয়—যেখানে প্রেশার ল্যাডারে ধাপে ধাপে আত্মবিশ্বাস বাড়ে।',
          exampleThought: '“ভুল বলার চেয়ে চুপ থাকাই ভালো।”',
          exampleBreakthrough: 'কম চাপে গাইডেড টেমপ্লেট দিয়ে শুরু করে ধীরে ধীরে মুক্ত আলাপে যান।',
        },
        {
          id: 'natural-comprehension',
          index: '04.',
          title: 'স্বাভাবিক কথোপকথনের গতি ধরতে কষ্ট হওয়া',
          shortDesc: 'বাস্তব আলাপ দ্রুত বদলায় এবং অপ্রত্যাশিত ফলো-আপ প্রশ্ন আসে।',
          mindLoop:
            'মুখস্থ ডায়ালগ আপনাকে ফলো-আপ প্রশ্ন, ব্যাখ্যা চাওয়া বা ভদ্রভাবে ভিন্নমত জানানোর জন্য প্রস্তুত করে না।',
          platformResponse:
            'ট্রান্সফার ল্যাব অফিস, পড়াশোনা ও দৈনন্দিন জীবনের বাস্তব ফলো-আপ প্রশ্নে আপনাকে অভ্যস্ত করে।',
          exampleThought: '“প্রথম উত্তরটা সাজিয়েছিলাম, কিন্তু পরের প্রশ্নটা ভাবিনি।”',
          exampleBreakthrough: 'সহায়ক ইঙ্গিতসহ বাস্তব ফলো-আপ প্রশ্নের উত্তর দেওয়ার অনুশীলন করুন।',
        },
        {
          id: 'forgetting-vocab',
          index: '05.',
          title: 'কথোপকথনের সময় শেখা শব্দ মনে না পড়া',
          shortDesc: 'তালিকা করে মুখস্থ করা শব্দ প্রয়োজনের মুহূর্তে মনে আসে না।',
          mindLoop:
            'প্রসঙ্গ ছাড়া শেখা শব্দ মস্তিষ্কে কথোপকথনের সংকেতের সাথে যুক্ত হয় না, ফলে পুরোনো সাধারণ শব্দই ঘুরেফিরে আসে।',
          platformResponse:
            'মিস্টেক মেমোরি ও স্পেসড রিপিটিশন আপনার দুর্বল শব্দ ও কাঠামোগুলো নতুন অনুশীলনে ফিরিয়ে আনে।',
          exampleThought: '“গতকালই শব্দটা শিখলাম—এখন কেন মনে আসছে না?”',
          exampleBreakthrough: 'নির্দিষ্ট বিরতিতে পূর্ণ বাক্যের ভেতর শব্দ ব্যবহার করে স্থায়ীভাবে আয়ত্ত করুন।',
        },
      ],
    },
    transformation: {
      kicker: 'দৃষ্টিভঙ্গির পরিবর্তন',
      title: 'মুখস্থ লাইন আওড়ানো থেকে নিজের ভাবনা প্রকাশের পথে।',
      lead: 'ধারাবাহিক অনুশীলন ও সঠিক ফিডব্যাকের মাধ্যমে জমানো জ্ঞানকে সক্রিয় যোগাযোগে রূপ দিন।',
      beforeTitle: 'আগে',
      beforeSubtitle: 'বাস্তব অনুশীলন ছাড়া শুধু নিয়ম পড়া',
      beforePoints: [
        'দৈনন্দিন প্রশ্নের উত্তর দিতে দ্বিধা ও জড়তা',
        'বাংলা থেকে মনে মনে শব্দে শব্দে অনুবাদ',
        'মিটিং বা ইন্টারভিউয়ে আত্মবিশ্বাসের ঘাটতি',
        'সীমিত কিছু মুখস্থ বাক্যের ওপর নির্ভরতা',
      ],
      afterTitle: 'নিয়মিত অনুশীলনের পর',
      afterSubtitle: 'প্রমাণভিত্তিক যোগাযোগ চর্চা',
      afterPoints: [
        'আরও স্বাভাবিক ও স্পষ্ট কথোপকথনের প্রতিক্রিয়া',
        'কোন বাক্য কেন কাজ করে তার পরিষ্কার বোঝাপড়া',
        'অফিস, পড়াশোনা ও দৈনন্দিন জীবনে উন্নত প্রকাশভঙ্গি',
        'বাস্তব যোগাযোগে ধীরে ধীরে বাড়তে থাকা আত্মবিশ্বাস',
      ],
      honestyDisclaimer:
        'দক্ষতার উন্নতি নিয়মিত চর্চা ও অংশগ্রহণের ওপর নির্ভরশীল; LINGUAVERSE কোনো নিশ্চিত সনদ বা নির্দিষ্ট ফলাফলের অবাস্তব প্রতিশ্রুতি দেয় না।',
    },
    demo: {
      kicker: 'ইন্টারঅ্যাক্টিভ প্রোডাক্ট ডেমো',
      title: 'একটি বাক্য লিখুন। দেখুন কেন পরিবর্তন হলো—আর কীভাবে স্বাভাবিক শোনায়।',
      lead: 'আমাদের বিল্ট-ইন দ্বিভাষিক অ্যানালাইজার এখনই পরীক্ষা করুন। নিচের বাক্যটি বদলে দিন বা সাধারণ একটি উদাহরণ বেছে নিন।',
      previewLabel: 'ইন্টারঅ্যাক্টিভ স্যাম্পল প্রিভিউ · বিল্ট-ইন অ্যানালাইজার',
      inputLabel: 'যাচাই করার জন্য একটি ইংরেজি বাক্য লিখুন',
      inputPlaceholder: 'একটি বাক্য লিখুন, যেমন: I am agree with you.',
      analyzeBtn: 'বাক্য যাচাই করুন',
      analyzingBtn: 'যাচাই হচ্ছে...',
      presetsLabel: 'একটি পরিচিত উদাহরণ বেছে নিন:',
      presets: [
        'I am agree with you.',
        'Yesterday I go to university.',
        'I am working here since 2 years.',
        'We discussed about the new project.',
      ],
      originalHeading: 'মূল বাক্য',
      correctedHeading: 'সংশোধিত বাক্য',
      explanationHeading: 'সহজ ব্যাখ্যা (বাংলা + EN)',
      alternativesHeading: 'আরও স্বাভাবিক বিকল্প',
      contextHeading: 'বাস্তব ব্যবহারের প্রসঙ্গ',
      sourceAi: '/api/landing/analyze থেকে লাইভ AI প্রিভিউ',
      sourceRule: 'বিল্ট-ইন ডিটারমিনিস্টিক অ্যানালাইজার',
      tryCta: 'বিনামূল্যে পূর্ণ কথোপকথন অনুশীলন করুন',
      tryCtaSignedIn: 'স্পিকিং স্টুডিওতে চালিয়ে যান',
    },
    intelligence: {
      kicker: 'ছয়টি ইন্টেলিজেন্স সিস্টেম',
      title: 'যোগাযোগ দক্ষতা বাড়ানোর জন্য নির্মিত ছয়টি সমন্বিত স্তর।',
      lead: 'প্রতিটি সিস্টেম একটি নির্দিষ্ট বাধার সমাধান করে—এবং আজ কী চালু আছে তা স্বচ্ছভাবে উল্লেখ করা হয়েছে।',
      problemLabel: 'যে সমস্যার সমাধান',
      howLabel: 'কীভাবে কাজ করে',
      gainLabel: 'আপনার প্রাপ্তি',
      actionLabel: 'বিস্তারিত দেখুন',
      items: [
        {
          id: 'language-intelligence',
          number: '01.',
          title: 'ল্যাঙ্গুয়েজ ইন্টেলিজেন্স',
          statusNote: 'একাডেমি ও মিস্টেক মেমোরিতে চালু',
          problemSolved: 'মূল কারণ না বুঝে একই ব্যাকরণ ও বাংলা-অনুবাদের ভুল বারবার করা।',
          howItWorks: 'ক্রিয়ার কাল, প্রিপোজিশন ও বাক্য গঠনের ভুল শনাক্ত করে ফোকাসড মাইক্রো-ড্রিলে সাজায়।',
          userGain: 'অনুমান নয়—স্পষ্ট বোঝাপড়া থেকে নির্ভুল বাক্য গঠনের দক্ষতা।',
          featured: true,
          routeKey: 'improve',
        },
        {
          id: 'speaking-intelligence',
          number: '02.',
          title: 'স্পিকিং ইন্টেলিজেন্স',
          statusNote: 'স্পিকিং স্টুডিওতে চালু',
          problemSolved: 'ইংরেজি বুঝলেও সরাসরি উত্তর দিতে গিয়ে থমকে যাওয়া।',
          howItWorks: '৭টি কনভার্সেশন মোড ও ৫ ধাপের প্রেশার ল্যাডারে ধাপে ধাপে গাইডেড অনুশীলন করায়।',
          userGain: 'মনের ভাব স্পষ্ট বাক্যে প্রকাশ করার নিয়মিত ও নিরাপদ অভ্যাস।',
          routeKey: 'speaking',
        },
        {
          id: 'context-intelligence',
          number: '03.',
          title: 'কনটেক্সট ইন্টেলিজেন্স',
          statusNote: 'স্পিকিং স্টুডিও ও ট্রান্সফার ল্যাবে চালু',
          problemSolved: 'বাস্তব আলাপে পাঠ্যবইয়ের মতো কৃত্রিম বা অপ্রাসঙ্গিক বাক্য ব্যবহার করা।',
          howItWorks: 'ইন্টারভিউ, অফিস বা দৈনন্দিন পরিস্থিতি অনুযায়ী সঠিক ভঙ্গি ও শব্দচয়নের পরামর্শ দেয়।',
          userGain: 'শ্রোতা ও পরিবেশের সাথে মানানসই স্বাভাবিক ইংরেজি প্রকাশ।',
          routeKey: 'demo',
        },
        {
          id: 'pronunciation-intelligence',
          number: '04.',
          title: 'উচ্চারণ ও প্রকাশের স্বচ্ছতা',
          statusNote: 'সৎ সীমাবদ্ধতা · বর্তমানে ফ্লুয়েন্সি ও ট্রান্সক্রিপ্ট রিভিউ',
          problemSolved: 'কথা বলার গতি ও বাক্যের স্পষ্টতা নিয়ে অনিশ্চয়তা।',
          howItWorks: 'ঐচ্ছিক ব্রাউজার ভয়েস ইনপুট ও ট্রান্সক্রিপ্ট রিভিউ দেয়; নির্ভরযোগ্য অ্যাকোস্টিক ইঞ্জিন ছাড়া ভুয়া উচ্চারণ স্কোর বানায় না।',
          userGain: 'সৎ ও নির্ভরযোগ্য ডেলিভারি ফিডব্যাক এবং পুনরায় দেখার মতো ট্রান্সক্রিপ্ট।',
          routeKey: 'speaking',
        },
        {
          id: 'real-world-transfer',
          number: '05.',
          title: 'রিয়েল-ওয়ার্ল্ড ট্রান্সফার',
          statusNote: 'ট্রান্সফার ল্যাবে চালু',
          problemSolved: 'সাধারণ কুইজে ভালো করলেও বাস্তব পরিস্থিতিতে একই ভুল ফিরে আসা।',
          howItWorks: 'কর্মক্ষেত্র, ইন্টারভিউ ও বিশ্ববিদ্যালয়ের বাস্তব দৃশ্যপটে শেখা নিয়মগুলো যাচাই করে।',
          userGain: 'বাস্তব জীবনের কথোপকথনে শেখা দক্ষতা কাজে লাগানোর আত্মবিশ্বাস।',
          routeKey: 'transfer',
        },
        {
          id: 'progress-intelligence',
          number: '06.',
          title: 'পার্সোনালাইজড প্রগ্রেস ইন্টেলিজেন্স',
          statusNote: 'প্রগ্রেস ও কমিউনিকেশন DNA-তে চালু',
          problemSolved: 'সপ্তাহের পর সপ্তাহ পড়েও প্রকৃত উন্নতি বুঝতে না পারা।',
          howItWorks: 'কমিউনিকেশন DNA, স্পেসড রিপিটিশন ও বাস্তব অনুশীলনের রেকর্ডের ওপর ভিত্তি করে অগ্রগতি দেখায়।',
          userGain: 'নিজের শক্তি, রিভিশনের সময় ও প্রকৃত উন্নতির স্বচ্ছ চিত্র।',
          featured: true,
          routeKey: 'progress',
        },
      ],
    },
    speaking: {
      kicker: 'স্পিকিং স্টুডিও',
      title: 'ভয়মুক্ত অনুশীলনের জন্য তৈরি একটি শান্ত কথোপকথন স্টুডিও।',
      lead: 'নিচের নমুনা দৃশ্যপটগুলো বদলে দেখুন কীভাবে প্রম্পট, বাক্য সংশোধন এবং প্রাসঙ্গিক নির্দেশনা একসাথে কাজ করে।',
      cta: 'বিনামূল্যে স্পিকিং স্টুডিও দেখুন',
      ctaSignedIn: 'স্পিকিং স্টুডিও খুলুন',
      sessionHeader: 'স্পিকিং স্টুডিও প্রিভিউ',
      previewTag: 'নমুনা প্রিভিউ · কোনো অডিও রেকর্ড হচ্ছে না',
      waveAriaLabel: 'নমুনা ভয়েস ওয়েভফর্ম ভিজ্যুয়ালাইজেশন',
      noMicDisclaimer:
        'শুধুমাত্র নমুনা ইন্টারফেস। লাইভ মাইক্রোফোন ব্যবহার সম্পূর্ণ ঐচ্ছিক এবং কেবল সাইন-ইন করা স্পিকিং স্টুডিওতে চাইলে চালু করা যায়।',
      focusHeading: 'সেশন ফোকাস সংকেত (নমুনা)',
      scenarios: [
        {
          id: 'daily',
          tabLabel: 'দৈনন্দিন রুটিন',
          contextLabel: 'দৈনন্দিন আলাপ · কম চাপ',
          prompt: 'Tell me about your morning routine before work or classes.',
          learnerReply: 'I wake up at 7 and then I goes to university by bus.',
          feedbackHeading: 'Subject-verb agreement · Grammar',
          feedbackExplanation:
            '“I”-এর সাথে মূল ক্রিয়া “go” বসবে। “goes” কেবল “he”, “she” বা “it”-এর সাথে বসে।',
          naturalRewrite: 'I wake up at 7, and then I take the bus to university.',
          focusDimensions: [
            { label: 'বাক্য কাঠামো', note: 'ধারাবাহিকতা ভালো; ক্রিয়ার ফর্মটি ঠিক করা হয়েছে' },
            { label: 'স্বাভাবিক শব্দচয়ন', note: '“go by bus”-এর চেয়ে “take the bus to” বেশি স্বাভাবিক' },
            { label: 'পরবর্তী ধাপ', note: 'বিকেলের রুটিন নিয়ে ফলো-আপ প্রশ্ন' },
          ],
        },
        {
          id: 'interview',
          tabLabel: 'চাকরির ইন্টারভিউ',
          contextLabel: 'ক্যারিয়ার ইন্টারভিউ · মাঝারি চাপ',
          prompt: 'How did you handle a challenging deadline in your last project?',
          learnerReply: 'Yesterday our team discuss about the delay and we fixed it.',
          feedbackHeading: 'Past tense ও বাড়তি প্রিপোজিশন',
          feedbackExplanation:
            'অতীতের ঘটনার জন্য “discussed” ব্যবহার করুন এবং “discuss”-এর পর “about” বাদ দিন।',
          naturalRewrite: 'Yesterday, our team discussed the delay and agreed on a recovery plan.',
          focusDimensions: [
            { label: 'ক্রিয়ার কাল', note: 'অতীতের সব কাজ Past Simple-এ ধারাবাহিক রাখুন' },
            { label: 'পেশাদার ভঙ্গি', note: 'ইন্টারভিউ প্যানেলের জন্য সমাধানমুখী ভাষা' },
            { label: 'পরবর্তী ধাপ', note: 'আপনার ব্যক্তিগত ভূমিকা জানতে ফলো-আপ প্রশ্ন' },
          ],
        },
        {
          id: 'workplace',
          tabLabel: 'টিম মিটিং',
          contextLabel: 'অফিস সমন্বয় · গাইডেড',
          prompt: 'Do you think we should move the client review to Thursday?',
          learnerReply: 'Yes, I am agree with you because we need more testing time.',
          feedbackHeading: 'বাংলা থেকে ইংরেজি অনুবাদের ভুল',
          feedbackExplanation:
            '“Agree” নিজেই একটি পূর্ণ Verb, তাই “am” ছাড়া সরাসরি “I agree with you” বলুন।',
          naturalRewrite: 'Yes, I agree with you—we need an extra day for thorough testing.',
          focusDimensions: [
            { label: 'মূল নিয়ম', note: 'agree-এর আগে কখনোই am/is/are বসাবেন না' },
            { label: 'স্পষ্টতা', note: 'টিমের সিদ্ধান্তের পক্ষে পরিষ্কার যুক্তি' },
            { label: 'পরবর্তী ধাপ', note: 'ক্লায়েন্টকে কে জানাবে তা নিশ্চিত করা' },
          ],
        },
      ],
    },
    transfer: {
      kicker: 'রিয়েল-ওয়ার্ল্ড ট্রান্সফার ল্যাব',
      title: 'আপনার শেখাকে বাস্তব জীবনের গুরুত্বপূর্ণ কথোপকথনে প্রয়োগ করুন।',
      lead: 'যেকোনো পরিস্থিতি বেছে নিয়ে তার বাস্তব চ্যালেঞ্জ ও লক্ষ্য দক্ষতা দেখুন।',
      liveTag: 'ট্রান্সফার ল্যাবে চালু',
      plannedTag: 'পরিকল্পিত প্রিভিউ',
      briefLabel: 'দৃশ্যপটের বিবরণ',
      skillLabel: 'মূল যোগাযোগ দক্ষতা',
      honestyNote:
        'পাঁচটি মূল পরিস্থিতি বর্তমানে ট্রান্সফার ল্যাবে সক্রিয় আছে; ভ্রমণ (Travel) ট্র্যাকটি পরবর্তী সম্প্রসারণ হিসেবে পরিকল্পিত।',
      cta: 'ট্রান্সফার ল্যাবে অনুশীলন শুরু করুন',
      ctaSignedIn: 'ট্রান্সফার ল্যাব খুলুন',
      items: [
        {
          id: 'interviews',
          title: 'চাকরির ইন্টারভিউ',
          subtitle: 'অভিজ্ঞতা ও ফলো-আপ প্রশ্নের স্পষ্ট উত্তর',
          challengeBrief:
            'আগের একটি প্রজেক্টের চ্যালেঞ্জ, আপনার ব্যক্তিগত পদক্ষেপ এবং ফলাফল ইন্টারভিউয়ারের সামনে তুলে ধরুন।',
          targetSkill: 'সঠিক Past Simple বর্ণনা ও গোছানো STAR কাঠামো',
          isLiveInApp: true,
        },
        {
          id: 'workplace',
          title: 'কর্মক্ষেত্রের যোগাযোগ',
          subtitle: 'প্রজেক্ট আপডেট, বিলম্ব ও সমাধানের পরিকল্পনা',
          challengeBrief:
            'ভেন্ডরের কারণে ডেডলাইন পেছানোর বিষয়টি অজুহাত ছাড়া পেশাদারভাবে ক্লায়েন্ট বা ম্যানেজারকে জানান।',
          targetSkill: 'দায়িত্বশীল টোন, Present Perfect Continuous ও স্পষ্ট সমাধান',
          isLiveInApp: true,
        },
        {
          id: 'meetings',
          title: 'মিটিং ও সমন্বয়',
          subtitle: 'সম্মতি, ভদ্র ভিন্নমত ও অগ্রাধিকার নির্ধারণ',
          challengeBrief:
            'সহকর্মীর প্রস্তাবে মতামত দিন, গুরুত্বপূর্ণ বিষয়গুলো সাজিয়ে নিন এবং পরবর্তী ধাপ নিশ্চিত করুন।',
          targetSkill: 'লাইভ আলোচনায় "I am agree" ও "discuss about"-এর মতো ভুল এড়ানো',
          isLiveInApp: true,
        },
        {
          id: 'academic',
          title: 'একাডেমিক যোগাযোগ',
          subtitle: 'বিশ্ববিদ্যালয় ভর্তি, সেমিনার ও আলোচনা',
          challengeBrief:
            'ভর্তি ইন্টারভিউ বা ক্লাস আলোচনায় নিজের লক্ষ্য ও যুক্তি স্পষ্টভাবে উপস্থাপন করুন।',
          targetSkill: 'যুক্তিনির্ভর কাঠামো, সংযোজক শব্দ ও সঠিক শব্দভান্ডার',
          isLiveInApp: true,
        },
        {
          id: 'everyday',
          title: 'দৈনন্দিন কথোপকথন',
          subtitle: 'অর্ডার করা, সমস্যা সমাধান ও গল্প বলা',
          challengeBrief:
            'রেস্টুরেন্ট বা সার্ভিসের কোনো ভুল ভদ্রভাবে সমাধান করুন অথবা স্বাভাবিকভাবে নিজের অভিজ্ঞতা শেয়ার করুন।',
          targetSkill: 'ভদ্র অনুরোধ, স্বাভাবিক বাক্যবদল ও সাবলীল প্রবাহ',
          isLiveInApp: true,
        },
        {
          id: 'travel',
          title: 'ভ্রমণ ও দিকনির্দেশনা',
          subtitle: 'চেক-ইন, দিকনির্দেশনা ও সময়সূচি পরিবর্তন',
          challengeBrief:
            'পরিকল্পিত ট্র্যাক: বিমানবন্দর, হোটেল বুকিং ও নতুন শহরে যাতায়াতের জন্য প্রয়োজনীয় প্রশ্ন ও উত্তর।',
          targetSkill: 'স্পষ্ট প্রশ্ন গঠন ও ব্যবহারিক শোনার দক্ষতা',
          isLiveInApp: false,
        },
      ],
    },
    banglaAdvantage: {
      kicker: 'বাংলা-ফার্স্ট সুবিধা',
      title: 'কঠিন ইংরেজি নিয়ম বাংলায় বুঝুন—তারপর অনুবাদ ছাড়াই বলুন।',
      lead: 'নিচের ব্যাখ্যার ধাপগুলো বদলে দেখুন কীভাবে LINGUAVERSE বাংলা বোঝাপড়া থেকে স্বাধীন ইংরেজি চিন্তায় নিয়ে যায়।',
      exampleLabel: 'দ্বিভাষিক শেখার প্রিভিউ',
      mistakeSentence: '“I am working here since 2022.”',
      correctedSentence: '“I have been working here since 2022.”',
      modeHeading: 'ব্যাখ্যার ধরন বেছে নিন',
      cueLabel: 'মনে রাখার সহজ সূত্র',
      levels: [
        {
          id: 'bangla_first',
          label: 'বাংলা-ফার্স্ট গাইড',
          explanation:
            'বাংলায় আমরা বলি “আমি ২০২২ সাল থেকে এখানে কাজ করছি”—তাই ইংরেজিতে অনেকেই Present Continuous (“am working”) বসিয়ে ফেলেন। কিন্তু অতীতে শুরু হয়ে এখনও চলছে এমন কাজের সাথে “since” বা “for” থাকলে ইংরেজিতে “have been working” ব্যবহার করতে হয়।',
          memoryCue: '“থেকে করছি” + since/for → সবসময় have/has been + verb-ing।',
        },
        {
          id: 'bilingual_bridge',
          label: 'বাংলা + ইংরেজি সেতু',
          explanation:
            'বাংলায় অতীত থেকে চলমান কাজের জন্য আলাদা Perfect Continuous ফর্ম না থাকায় “am working” বলা স্বাভাবিক মনে হয়। কিন্তু ইংরেজিতে শুরুর সময় (“since 2022”) উল্লেখ থাকলে Present Perfect Continuous (“have been working”) ব্যবহার করতে হয়।',
          memoryCue: 'অতীতে শুরু + এখনও চলছে = “have been working since 2022”।',
        },
        {
          id: 'english_focus',
          label: 'ইংরেজি ইমারশন',
          explanation:
            'Use Present Perfect Continuous (“have been + -ing”) when an action started in the past and continues into the present. Pair “since” with a specific point in time (2022) and “for” with a duration (two years).',
          memoryCue: 'Past start + present continuation → “have been working since [point] / for [duration]”.',
        },
      ],
    },
    journey: {
      kicker: 'ব্যক্তিগত শেখার যাত্রা',
      title: 'ফিডব্যাককে স্থায়ী দক্ষতায় রূপ দেওয়ার সুশৃঙ্খল পথ।',
      lead: 'যেকোনো ধাপে ক্লিক করে দেখুন ওয়ার্কস্পেসের ভেতর প্রতিটি ধাপ কীভাবে সংযুক্ত।',
      insideAppLabel: 'ওয়ার্কস্পেসে যা থাকে',
      outcomeLabel: 'এই ধাপে যা ঘটে',
      disclaimer:
        'এই ধাপগুলো একটি কাঠামোবদ্ধ শেখার রোডম্যাপ—কোনো নিশ্চিত সময়সীমা বা আনুষ্ঠানিক সনদ নয়।',
      stages: [
        {
          step: '01.',
          title: 'আবিষ্কার (Discover)',
          shortSummary: 'নিজের প্রকৃত অবস্থান ও সাধারণ ভুলগুলো শনাক্ত করুন।',
          platformMapping: 'অনবোর্ডিং লক্ষ্য নির্ধারণ + বেসলাইন ডায়াগনস্টিক',
          learnerOutcome:
            'অনুমান ছাড়াই নিজের বর্তমান স্তর, লক্ষ্য এবং বাংলা থেকে ইংরেজি অনুবাদের মূল দুর্বলতাগুলো চিহ্নিত করুন।',
        },
        {
          step: '02.',
          title: 'অনুশীলন (Practice)',
          shortSummary: 'একাডেমি ও স্পিকিং স্টুডিওতে সক্রিয়ভাবে বাক্য তৈরি করুন।',
          platformMapping: 'সুশৃঙ্খল একাডেমি লেসন + গাইডেড স্পিকিং স্টুডিও',
          learnerOutcome:
            'সহজ উদাহরণ ও টেমপ্লেট থেকে শুরু করে নিজের স্বাচ্ছন্দ্যমতো চাপে সক্রিয় কথোপকথন অনুশীলন করুন।',
        },
        {
          step: '03.',
          title: 'ফিডব্যাক গ্রহণ',
          shortSummary: 'কোন বাক্য কেন বদলালো তা বাংলা বা ইংরেজিতে স্পষ্টভাবে বুঝুন।',
          platformMapping: 'প্রাসঙ্গিক দ্বিভাষিক কোচিং ও টার্ন রিভিউ',
          learnerOutcome:
            'প্রতিটি উত্তরের পরপরই সঠিক সংশোধন, কারণ এবং আরও স্বাভাবিক বিকল্প দেখে নিন।',
        },
        {
          step: '04.',
          title: 'উন্নতি (Improve)',
          shortSummary: 'টার্গেটেড মাইক্রো-ড্রিলে পুনরাবৃত্ত ভুলগুলো দূর করুন।',
          platformMapping: 'মিস্টেক মেমোরি + স্পেসড রিপিটিশন রিভিউ',
          learnerOutcome:
            'নির্দিষ্ট সময় পরপর নিজের দুর্বল জায়গাগুলো অনুশীলন করে সঠিক কাঠামো স্থায়ীভাবে আয়ত্ত করুন।',
        },
        {
          step: '05.',
          title: 'বাস্তব প্রয়োগ',
          shortSummary: 'ইন্টারভিউ, অফিস ও দৈনন্দিন জীবনে দক্ষতা প্রয়োগ করুন।',
          platformMapping: 'ট্রান্সফার ল্যাব + কমিউনিকেশন DNA প্রমাণ',
          learnerOutcome:
            'বাস্তব দৃশ্যপটে নিজের দক্ষতা যাচাই করুন এবং প্রমাণভিত্তিক অগ্রগতির হিসাব দেখুন।',
        },
      ],
    },
    privacy: {
      kicker: 'আস্থা ও প্রাইভেসি',
      title: 'স্বচ্ছ প্রাইভেসি নিয়ন্ত্রণ—সরাসরি আপনার অ্যাকাউন্ট সেটিংসের ভেতর।',
      lead: 'নিচের প্রতিটি তথ্য বর্তমান অ্যাপ্লিকেশনে বাস্তবে সংযুক্ত নিয়ন্ত্রণের ওপর ভিত্তি করে দেওয়া হয়েছে।',
      settingsCta: 'সেটিংসে প্রাইভেসি ও ডেটা পরিচালনা করুন',
      settingsCtaSignedOut: 'পূর্ণ ডেটা নিয়ন্ত্রণ পেতে অ্যাকাউন্ট তৈরি করুন',
      pillars: [
        {
          id: 'data-handling',
          title: 'স্বচ্ছ ডেটা ব্যবহার',
          detail:
            'আপনার প্রোফাইল, ডায়াগনস্টিক ইতিহাস এবং ভুলের রেকর্ড শুধুমাত্র ব্যক্তিগত লেসন ও রিভিশন সাজানোর কাজে ব্যবহৃত হয়।',
          verificationNote: 'সেটিংস থেকে যেকোনো সময় আপনার সম্পূর্ণ লার্নিং ডেটা JSON হিসেবে ডাউনলোড করা যায়।',
        },
        {
          id: 'permissions',
          title: 'ঐচ্ছিক মাইক্রোফোন অনুমতি',
          detail:
            'এই ল্যান্ডিং পেজে কোনো মাইক্রোফোন অনুমতি চাওয়া হয় না। স্পিকিং স্টুডিওতে ভয়েস ইনপুট ঐচ্ছিক—টাইপ করেও সম্পূর্ণ অনুশীলন করা যায়।',
          verificationNote: 'আপনি ভয়েস বাটনে চাপ দিলেই কেবল ব্রাউজার অনুমতি চাইবে।',
        },
        {
          id: 'voice-storage',
          title: 'ভয়েস রেকর্ডিং সংরক্ষণ ও মুছে ফেলা',
          detail:
            'ঐচ্ছিক ভয়েস প্লেব্যাক ক্লিপ আপনার স্পষ্ট সম্মতির অধীনে থাকে এবং এক ক্লিকেই স্থায়ীভাবে মুছে ফেলা যায়।',
          verificationNote: '“Delete All Recordings” বাটনটি /app/settings-এ সক্রিয় আছে।',
        },
        {
          id: 'account-control',
          title: 'অ্যাকাউন্ট ও সম্মতির মালিকানা',
          detail:
            'প্রাইভেসি সম্মতি পরিবর্তন করুন, ভুল AI সংশোধন রিপোর্ট করুন বা চাইলে নিজের অ্যাকাউন্ট ডেটা মুছে ফেলুন।',
          verificationNote: 'সেটিংসের ভেতর আলাদা প্রাইভেসি ও ডেটা নিয়ন্ত্রণ প্যানেল রয়েছে।',
        },
      ],
    },
    pricing: {
      kicker: 'সহজ ও স্বচ্ছ প্ল্যান',
      title: 'ফ্রিতে শুরু করুন। আস্থা অর্জনের পরই গভীর অনুশীলন বেছে নিন।',
      lead: 'চূড়ান্ত পেইড মূল্য এখনও নির্ধারিত হয়নি। স্বচ্ছ সীমাবদ্ধতাসহ আজই ফ্রি টিয়ারে শুরু করুন।',
      free: {
        eyebrow: 'এখনই চালু',
        name: 'ফ্রি (Free)',
        price: 'ফ্রি',
        description: 'নিয়মিত কথা বলা ও ফিডব্যাকের অভ্যাস গড়ার প্রয়োজনীয় সবকিছু।',
        cta: 'বিনামূল্যে শুরু করুন',
        ctaSignedIn: 'ওয়ার্কস্পেস খুলুন',
        highlights: [
          'বেসলাইন অনবোর্ডিং ও ডায়াগনস্টিক মূল্যায়ন',
          'বাংলা-ফার্স্ট ব্যাখ্যাসহ মূল একাডেমি লেসন',
          'গাইডেড স্পিকিং স্টুডিও অনুশীলন',
          'ব্যক্তিগত মিস্টেক মেমোরি ও কমিউনিকেশন DNA সারাংশ',
        ],
      },
      premium: {
        eyebrow: 'পরিকল্পিত টিয়ার · প্লেসহোল্ডার',
        name: 'প্রিমিয়াম (Premium)',
        price: 'মূল্য শীঘ্রই',
        description: 'যাঁরা প্রতিদিন আরও বেশি অনুশীলন ও বাড়তি সিনারিও ট্র্যাক চান তাঁদের জন্য।',
        cta: 'প্ল্যান স্ট্যাটাস দেখুন',
        notice:
          'প্লেসহোল্ডার স্ট্যাটাস: পেইড বিলিং ও চূড়ান্ত মূল্য এখনও চালু হয়নি। আজই ফ্রি অ্যাকাউন্ট খুলুন—কোনো পেমেন্ট নেওয়া হয় না।',
        highlights: [
          'অধিক দৈনিক AI স্পিকিং ও কোচিং সীমা',
          'সম্প্রসারিত ট্রান্সফার ল্যাব সিনারিও লাইব্রেরি',
          'দীর্ঘমেয়াদি গভীর প্রগ্রেস অ্যানালিটিক্স',
          'বিলিং চালুর পর অগ্রাধিকার সাপোর্ট',
        ],
      },
      tableTitle: 'বৈশিষ্ট্য ও সীমাবদ্ধতার স্বচ্ছ তুলনা',
      tableHeaders: ['সক্ষমতা', 'ফ্রি (সক্রিয়)', 'প্রিমিয়াম (পরিকল্পিত)'],
      comparisonRows: [
        { feature: 'বাংলা + ইংরেজি ব্যাখ্যা', freeValue: 'অন্তর্ভুক্ত', premiumValue: 'অন্তর্ভুক্ত' },
        { feature: 'সুশৃঙ্খল একাডেমি লেসন', freeValue: 'মূল পাঠ্যক্রম', premiumValue: 'সম্প্রসারিত লাইব্রেরি' },
        { feature: 'স্পিকিং স্টুডিও ও ট্রান্সফার ল্যাব', freeValue: 'স্ট্যান্ডার্ড দৈনিক সীমা', premiumValue: 'অধিক ব্যবহারের সীমা (শীঘ্রই)' },
        { feature: 'মিস্টেক মেমোরি ও JSON ডেটা এক্সপোর্ট', freeValue: 'অন্তর্ভুক্ত', premiumValue: 'অন্তর্ভুক্ত' },
        { feature: 'বিলিং ও চেকআউট অবস্থা', freeValue: 'কার্ড প্রয়োজন নেই', premiumValue: 'এখনও চালু নয় (প্লেসহোল্ডার)' },
      ],
    },
    faq: {
      kicker: 'সাধারণ প্রশ্নোত্তর',
      title: 'শুরু করার আগে সৎ ও স্পষ্ট উত্তর।',
      items: [
        {
          q: 'আমি যদি সাধারণ বাক্য বলতেও জড়তা বোধ করি, তবে কি এটি আমার জন্য উপযোগী?',
          a: 'হ্যাঁ। অনবোর্ডিং ডায়াগনস্টিক আপনার প্রকৃত স্তর নির্ধারণ করে এবং প্রেশার ল্যাডার আপনাকে সহজ গাইডেড টেমপ্লেট দিয়ে শুরু করে ধাপে ধাপে মুক্ত কথোপকথনে নিয়ে যায়।',
        },
        {
          q: 'প্ল্যাটফর্মের ভেতর বাংলা ব্যাখ্যা কীভাবে কাজ করে?',
          a: 'আপনি যেকোনো সময় পুরো ইন্টারফেস ইংরেজি ও বাংলার মধ্যে পরিবর্তন করতে পারবেন এবং কেন নির্দিষ্ট ব্যাকরণ বা শব্দচয়নের ভুল হচ্ছে তার স্পষ্ট বাংলা ব্যাখ্যা পাবেন।',
        },
        {
          q: 'এটি কি আমার অ্যাকসেন্ট বা উচ্চারণের ওপর সংখ্যাগত স্কোর দেয়?',
          a: 'না—আমরা ইচ্ছাকৃতভাবে অনুমাননির্ভর উচ্চারণ শতাংশ দেখাই না। শুধু স্পিচ ট্রান্সক্রিপশন উচ্চারণের অ্যাকোস্টিক প্রমাণ নয়; তাই কোচিং ফোকাস করে ব্যাকরণ, স্পষ্টতা, স্বাভাবিক শব্দচয়ন ও প্রসঙ্গের ওপর।',
        },
        {
          q: 'আমার মাইক্রোফোন কি চালু থাকে বা ভয়েস রেকর্ডিং স্বয়ংক্রিয়ভাবে জমা হয়?',
          a: 'ল্যান্ডিং পেজে কখনোই নয়, এবং অ্যাপের ভেতর আপনার অনুমতি ছাড়াও নয়। ভয়েস ইনপুট ঐচ্ছিক, সেটিংসে সম্মতি নিয়ন্ত্রণের অধীনে থাকে এবং আপনি যেকোনো সময় সব ক্লিপ মুছে ফেলতে পারেন।',
        },
        {
          q: 'ফ্রি টিয়ার কি সত্যিই কোনো গোপন চার্জ ছাড়া ফ্রি?',
          a: 'হ্যাঁ। কোনো কার্ড ছাড়াই ফ্রি অ্যাকাউন্ট তৈরি করতে পারবেন। পেইড প্রিমিয়াম প্ল্যান ও চূড়ান্ত মূল্য আনুষ্ঠানিকভাবে চালু না হওয়া পর্যন্ত স্পষ্টভাবে প্লেসহোল্ডার হিসেবে চিহ্নিত আছে।',
        },
        {
          q: 'এটি কি অ্যান্ড্রয়েড ফোনে মসৃণভাবে কাজ করে?',
          a: 'হ্যাঁ। টাচ-বান্ধব বাটন, হালকা অ্যানিমেশন (যা reduced-motion সমর্থন করে) এবং ভারী WebGL ছাড়াই মোবাইল-ফার্স্ট ডিজাইনে এটি তৈরি।',
        },
      ],
    },
    finalCta: {
      kicker: 'আজই শুরু করুন',
      title: 'আপনার পরবর্তী কথোপকথন হতে পারে একদম ভিন্ন।',
      lead: 'একটি কথোপকথন দিয়ে শুরু করুন। ধাপে ধাপে আত্মবিশ্বাস গড়ে তুলুন।',
      primaryBtn: 'বিনামূল্যে শুরু করুন',
      primaryBtnSignedIn: 'আপনার ওয়ার্কস্পেস খুলুন',
      secondaryBtn: 'লাইভ বাক্য ডেমো দেখুন',
      contactPrefix: 'প্রশ্ন বা অংশীদারিত্বের জন্য প্লেসহোল্ডার ইমেইল:',
      contactEmail: PLACEHOLDER_CONTACT_EMAIL,
      contactSuffix: '(লঞ্চের আগে প্রোডাকশন ইমেইল দিয়ে পরিবর্তন করুন)।',
    },
    footer: {
      tagline: 'শুধু ইংরেজি শিখবেন না—স্বাভাবিকভাবে নিজেকে প্রকাশ করুন।',
      productTitle: 'প্রোডাক্ট',
      learningTitle: 'শেখা ও আস্থা',
      infoTitle: 'অ্যাকাউন্ট ও তথ্য',
      links: {
        howItWorks: 'কীভাবে কাজ করে',
        liveDemo: 'ইন্টারঅ্যাক্টিভ ডেমো',
        intelligence: 'ছয়টি ইন্টেলিজেন্স সিস্টেম',
        speakingStudio: 'স্পিকিং স্টুডিও',
        transferLab: 'ট্রান্সফার ল্যাব',
        banglaMethod: 'বাংলা-ফার্স্ট পদ্ধতি',
        journey: 'শেখার যাত্রা',
        privacy: 'আস্থা ও প্রাইভেসি',
        pricing: 'প্ল্যান',
        faq: 'প্রশ্নোত্তর',
        contactPlaceholder: 'যোগাযোগ (প্লেসহোল্ডার)',
        login: 'লগ ইন',
        createAccount: 'ফ্রি অ্যাকাউন্ট খুলুন',
      },
      copyrightSuffix: 'LINGUAVERSE AI। সর্বস্বত্ব সংরক্ষিত।',
      subline: 'বাস্তব জীবনের যোগাযোগের জন্য নির্মিত।',
    },
  },
};

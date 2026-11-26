import type { UILanguage } from '../types/domain';

export const translations = {
  en: {
    brand: 'LINGUAVERSE AI',
    nav: {
      home: 'Home',
      features: 'Features',
      howItWorks: 'How It Works',
      pricing: 'Pricing',
      login: 'Login',
      startLearning: 'Start Learning',
      openWorkspace: 'Open Workspace',
      logout: 'Log Out',
    },
    learnerNav: {
      home: 'Home',
      learn: 'Learn',
      speak: 'Speak',
      improve: 'Improve',
      progress: 'Progress',
      transferLab: 'Transfer Lab',
      settings: 'Settings',
    },
    hero: {
      kicker: 'Built for Bangla-speaking English learners · Voice-first & evidence-based',
      headline: 'Stop Studying English. Start Speaking It.',
      subheadline:
        'Learn smarter, practice real conversations, fix recurring mistakes, and see how your communication improves.',
      primaryCta: 'Start Learning Free',
      secondaryCta: 'See the 8-Step Loop',
      honestyNote:
        'No fake streaks, no inflated XP, and no fabricated CEFR scores — every signal comes from your completed work.',
    },
    samplePreview: {
      badge: 'Interactive Sample Preview',
      subtitle: 'Mistake Memory Engine · Bangla L1 Interference Detector',
      inputLabel: 'Try a Bangla-influenced English sentence',
      inputPlaceholder: 'Type a sentence, e.g. I go to market yesterday',
      analyzeBtn: 'Inspect',
      detectedLabel: 'Recurring Pattern Detected',
      cleanLabel: 'Sample Check Clear',
      originalLabel: 'Spoken / Written Input',
      naturalLabel: 'Natural English Correction',
      banglaReasonLabel: 'Why this happens for Bangla speakers',
      ruleLabel: 'Explanation',
      applyFixBtn: 'Apply Correction & Compare',
      resetBtn: 'Reset to Sample',
      compareDone: 'Fixed sentence applied — notice how the verb form aligns with finished past context.',
      explanationToggle: {
        bn: 'বাংলা',
        both: 'Both',
        en: 'EN',
      },
    },
    whyFails: {
      kicker: 'The Core Problem',
      title: 'Why Traditional English Learning Fails Bangla Speakers',
      subtitle:
        'Most learners spend over 10 years memorizing grammar rules in school yet freeze during a 2-minute job interview. The problem is not your effort — it is how English is taught.',
      columns: {
        oldWay: 'Passive Study Trap',
        newWay: 'Communication Intelligence',
      },
      items: [
        {
          index: '01',
          problemTitle: 'Rule memorization without spoken retrieval',
          problemDesc:
            'You can pass fill-in-the-blank tense worksheets, yet revert to "I go yesterday" when speaking under real-time pressure.',
          solutionTitle: 'Active voice-first practice under realistic timing',
          solutionDesc:
            'Train your brain to retrieve accurate English structures in conversation, not just recognize them on paper.',
        },
        {
          index: '02',
          problemTitle: 'Generic apps ignore Bangla-to-English interference',
          problemDesc:
            'Global apps never address why Bangla speakers say "discuss about", "am working since 2022", or drop articles.',
          solutionTitle: 'Bangla-first diagnosis of recurring L1 patterns',
          solutionDesc:
            'Every mistake is explained clearly in Bangla or English so you understand the exact mental translation habit causing it.',
        },
        {
          index: '03',
          problemTitle: 'Fake gamification hides stagnant speaking ability',
          problemDesc:
            '300-day streaks and XP leaderboards reward tapping flashcards while your real-world clarity never moves.',
          solutionTitle: 'Evidence-based progress backed by real tasks',
          solutionDesc:
            'Your dashboard stays honestly empty until you complete real assessments, voice practices, and transfer checks.',
        },
        {
          index: '04',
          problemTitle: 'Zero verification that lessons transfer to real life',
          problemDesc:
            'Finishing a grammar module rarely proves you can use that structure naturally during an unscripted interview.',
          solutionTitle: 'Transfer Lab proves skill retention in speech',
          solutionDesc:
            'You only clear a Mistake Memory pattern once you produce the natural phrasing spontaneously in new contexts.',
        },
      ],
    },
    loopSection: {
      kicker: 'Methodology',
      title: 'The 8-Step Communication Improvement Loop',
      subtitle:
        'A closed-loop system designed to turn passive English knowledge into reliable spoken fluency.',
      selectPrompt: 'Select any step to inspect how it works',
      steps: [
        {
          num: '01',
          title: 'Evidence Baseline',
          shortDesc: 'Calibrate starting gaps honestly without false scores.',
          detail:
            'Start with a focused diagnostic across vocabulary, grammar, sentence construction, and reading. You get a transparent starting profile with explicit coverage limits — never a fabricated CEFR certificate.',
          outcome: 'Clear starting priorities tailored to your actual goal.',
        },
        {
          num: '02',
          title: 'Targeted Micro-Lesson',
          shortDesc: 'Learn only the phrasing and structures you need next.',
          detail:
            'Instead of 40-minute grammar lectures, each micro-lesson isolates one high-impact communication pattern with natural examples relevant to interviews, work, or daily life.',
          outcome: 'High comprehension in 5–8 minutes with zero fluff.',
        },
        {
          num: '03',
          title: 'Guided Voice Practice',
          shortDesc: 'Speak aloud in structured, realistic dialogue turns.',
          detail:
            'Immediately put the pattern into spoken output. Practice forming thoughts directly in English without stopping to translate word-for-word from Bangla.',
          outcome: 'Builds automatic spoken muscle memory.',
        },
        {
          num: '04',
          title: 'Real-Time Mistake Capture',
          shortDesc: 'Catch recurring slips without breaking your confidence.',
          detail:
            'Captures exact tense drift, preposition transfer, article omissions, and unnatural collocations while keeping the conversation flowing naturally.',
          outcome: 'Complete, objective record of your actual spoken habits.',
        },
        {
          num: '05',
          title: 'Bangla-First Diagnosis',
          shortDesc: 'Understand the "why" in the language you think in.',
          detail:
            'Receive side-by-side explanations in Bangla, English, or both, showing why a literal Bangla phrasing sounds unnatural in English and how native/fluent speakers say it.',
          outcome: 'Immediate clarity that stops guesswork.',
        },
        {
          num: '06',
          title: 'Mistake Memory Encoding',
          shortDesc: 'Log persistent errors until you truly outgrow them.',
          detail:
            'Every recurring mistake enters your personal Mistake Memory queue. The platform remembers what you struggle with across sessions instead of forgetting after one screen.',
          outcome: 'Eliminates repeating the same mistakes for years.',
        },
        {
          num: '07',
          title: 'Transfer Lab Application',
          shortDesc: 'Prove the fix works in an unscripted scenario.',
          detail:
            'Days later, Transfer Lab puts you in a fresh scenario where that exact structure naturally arises — verifying whether your brain transferred the correction into real speech.',
          outcome: 'Verified real-world mastery, not short-term memorization.',
        },
        {
          num: '08',
          title: 'Pressure Ladder Verification',
          shortDesc: 'Hold your clarity under realistic time pressure.',
          detail:
            'Gradually progress from untimed preparation to timed interview questions, workplace standups, and follow-up interruptions so you stay calm when stakes are real.',
          outcome: 'Confidence that holds up in actual interviews and meetings.',
        },
      ],
    },
    systemsSection: {
      kicker: 'Core Architecture',
      title: 'Six Differentiation Systems Built for Real Fluency',
      subtitle:
        'Every module in LINGUAVERSE AI serves one measurable goal: closing the gap between knowing English and speaking it clearly.',
      systems: [
        {
          id: 'dna',
          index: '01',
          name: 'Communication DNA',
          tagline: 'Multi-axis profile built strictly from observed work',
          description:
            'Maps your real clarity, grammatical accuracy, natural collocations, sentence construction, and comprehension over time — showing exact evidence coverage instead of opaque single scores.',
        },
        {
          id: 'mistake_memory',
          index: '02',
          name: 'Mistake Memory Engine',
          tagline: 'Detects and remembers Bangla-to-English interference',
          description:
            'Identifies recurring L1 habits — like past tense omission, redundant prepositions ("discuss about"), or duration aspect confusion — and tracks each pattern until resolved.',
        },
        {
          id: 'transfer_lab',
          index: '03',
          name: 'Transfer Lab',
          tagline: 'Tests whether studied skills survive unscripted speech',
          description:
            'A rule you pass in a quiz is not yet a skill. Transfer Lab re-tests your active mistakes inside fresh conversational contexts to prove lasting transfer.',
        },
        {
          id: 'pressure_ladder',
          index: '04',
          name: 'Pressure Ladder',
          tagline: 'Structured progression from untimed thought to live pressure',
          description:
            'Move steadily from planned responses to timed job interviews, client demos, and IELTS speaking turns so fluency never collapses under stress.',
        },
        {
          id: 'replay',
          index: '05',
          name: 'Communication Replay',
          tagline: 'Side-by-side comparison of your phrasing vs. natural upgrades',
          description:
            'Review exactly what you said alongside a cleaner, more natural English rewrite — paired with concise Bangla notes explaining every change.',
        },
        {
          id: 'evidence',
          index: '06',
          name: 'Evidence-Based Progress',
          tagline: 'Honest dashboards with zero artificial gamification',
          description:
            'No synthetic streaks, no meaningless XP, and no fabricated CEFR certificates. Every number on your dashboard traces directly to completed sessions and real answers.',
        },
      ],
    },
    pricing: {
      kicker: 'Transparent Pricing',
      title: 'Start Free. Upgrade When You Want Unlimited Voice & Transfer Labs.',
      subtitle:
        'Built to be accessible in Bangladesh and globally. Toggle currency and billing cadence below.',
      currencyLabel: 'Currency',
      billingMonthly: 'Monthly',
      billingAnnual: 'Annual (Save 20%)',
      perMonth: '/ month',
      billedAnnuallyNote: 'Billed annually',
      plans: {
        free: {
          audience: 'For learners building their honest baseline',
          name: 'Free',
          priceBdtMonthly: '৳0',
          priceBdtAnnual: '৳0',
          priceUsdMonthly: '$0',
          priceUsdAnnual: '$0',
          cta: 'Start Free Account',
          features: [
            'Full Bangla + English bilingual interface',
            '5-question diagnostic & honest starting profile',
            'Bangla-first grammar & phrasing explanations',
            'Foundational lessons & Mistake Memory (up to 15 patterns)',
            '3 guided speaking sessions per week',
          ],
        },
        pro: {
          audience: 'For serious interview, workplace & IELTS growth',
          name: 'Pro',
          priceBdtMonthly: '৳990',
          priceBdtAnnual: '৳790',
          priceUsdMonthly: '$9',
          priceUsdAnnual: '$7',
          cta: 'Start with Pro Track',
          features: [
            'Everything in Free, with zero weekly limits',
            'Unlimited Voice Practice & Communication Replay archive',
            'Full Mistake Memory Engine with cross-session tracking',
            'Transfer Lab & Pressure Ladder timed interview drills',
            'Dedicated Job Interview, Workplace & IELTS tracks',
          ],
        },
      },
    },
    faq: {
      kicker: 'Questions & Honesty',
      title: 'Frequently Asked Questions',
      items: [
        {
          q: 'Do I need strong English grammar before starting LINGUAVERSE AI?',
          a: 'No. You can start from Pre-A1 all the way to C1. During onboarding, you choose your UI language (Bangla or English) and whether you want explanations in Bangla, English, or both.',
        },
        {
          q: 'Why does the initial 5-question diagnostic say it is not a certified CEFR score?',
          a: 'Because claiming an official CEFR or IELTS band from 5 written questions is dishonest. Our diagnostic gives you an evidence-based starting estimate with 20% initial coverage so we know where to begin — confidence grows only as you complete real tasks.',
        },
        {
          q: 'Will using Bangla explanations slow down my ability to think in English?',
          a: 'Used properly, Bangla speeds up clarity. Instead of guessing why "discuss about" or "I am working since 2022" sounds wrong, a 10-second Bangla insight breaks the translation habit immediately so you spend more time speaking naturally in English.',
        },
        {
          q: 'Why does my dashboard show zeros when I first log in?',
          a: 'We strictly follow an Evidence-Based Progress philosophy: zero fake streaks, zero dummy XP, and zero pre-filled analytics. Your workspace records only what you genuinely complete.',
        },
        {
          q: 'Can I switch between English and Bangla interface anytime?',
          a: 'Yes. Use the EN / বাংলা toggle in the header or your Settings page at any moment — every screen, label, and explanation updates immediately and persists across sessions.',
        },
        {
          q: 'How is my account and learning history stored?',
          a: 'Your account, onboarding profile, diagnostic results, and Mistake Memory items persist across sessions using a modular storage layer designed for Cloudflare Workers + D1 integration.',
        },
      ],
    },
    footer: {
      tagline:
        'Voice-first, evidence-based English communication intelligence tailored for Bangla-speaking learners.',
      linksTitle: 'Platform',
      accountTitle: 'Account',
      copyright: '© 2026 LINGUAVERSE AI. Evidence over gamification.',
    },
    auth: {
      loginTitle: 'Welcome back to LINGUAVERSE AI',
      loginSubtitle: 'Sign in to continue your evidence-based communication training.',
      registerTitle: 'Create your LINGUAVERSE AI account',
      registerSubtitle:
        'Set your goals, take the 5-question diagnostic, and build your honest starting profile.',
      nameLabel: 'Full Name',
      namePlaceholder: 'e.g. Rafiqul Islam',
      emailLabel: 'Email Address',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'At least 8 characters',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Re-enter your password',
      loginBtn: 'Sign In',
      registerBtn: 'Create Account & Continue',
      switchToRegister: 'New to LINGUAVERSE AI?',
      switchToRegisterLink: 'Create an account',
      switchToLogin: 'Already have an account?',
      switchToLoginLink: 'Sign in',
      passwordMismatch: 'Passwords do not match.',
      selectedPlanNote: 'Selected track:',
      backHome: 'Back to Home',
    },
    onboarding: {
      stepOf: 'Step',
      of: 'of',
      title: 'Personalize Your Learning Environment',
      subtitle: 'Tell us how you prefer to learn so explanations and practice match your real goals.',
      backBtn: 'Back',
      nextBtn: 'Continue',
      finishBtn: 'Save & Start 5-Question Diagnostic',
      steps: {
        uiLang: {
          title: 'Choose your preferred interface language',
          desc: 'You can toggle between English and Bangla anytime from the header or settings.',
          enLabel: 'English Interface',
          enDesc: 'Menus, buttons, and progress labels in English.',
          bnLabel: 'বাংলা ইন্টারফেস (Bangla)',
          bnDesc: 'মেনু, বাটন এবং ড্যাশবোর্ডের সব লেখা বাংলায় দেখুন।',
        },
        expLang: {
          title: 'How should we explain grammar & speaking mistakes?',
          desc: 'Choose how Mistake Memory explains why a phrasing sounds unnatural.',
          bnLabel: 'Bangla Explanations (বাংলা ব্যাখ্যা)',
          bnDesc: 'Clear Bangla breakdown of English mistakes and L1 translation habits.',
          bothLabel: 'Both Bangla + English (উভয় ভাষা)',
          bothDesc: 'English precision paired side-by-side with Bangla clarity.',
          enLabel: 'English Only',
          enDesc: 'Immersive plain-English explanations without Bangla translation.',
        },
        level: {
          title: 'What is your current self-estimated English level?',
          desc: 'Be honest — our 5-question diagnostic will calibrate this right after.',
          options: {
            'Pre-A1': 'Just starting out — know basic words, struggle to form sentences.',
            A1: 'Beginner — can introduce myself and handle simple familiar phrases.',
            A2: 'Elementary — can hold short daily chats but hesitate often.',
            B1: 'Intermediate — can communicate ideas, but make recurring tense/phrasing slips.',
            B2: 'Upper-Intermediate — comfortable in work/study, want sharper fluency & precision.',
            C1: 'Advanced — fluent overall, refining nuance, executive clarity, and pressure control.',
          },
        },
        goal: {
          title: 'What is your primary communication goal?',
          desc: 'We anchor examples, scenarios, and transfer checks around this focus.',
          options: {
            job_interview: {
              label: 'Job Interview Preparation',
              desc: 'Answer behavioral and technical questions clearly under interview pressure.',
            },
            daily_speaking: {
              label: 'Daily Spoken Confidence',
              desc: 'Speak naturally in everyday conversations without mentally translating.',
            },
            academic_ielts: {
              label: 'Academic & IELTS Speaking/Writing',
              desc: 'Develop structured arguments, strong collocations, and timed clarity.',
            },
            workplace: {
              label: 'Workplace & Client Communication',
              desc: 'Lead meetings, give standup updates, and present clearly to teams.',
            },
          },
        },
        dailyTime: {
          title: 'Choose a realistic daily practice commitment',
          desc: 'Short, consistent active speaking beats irregular 2-hour cramming.',
          minutesLabel: 'min / day',
          options: {
            5: 'Micro habit — 1 short daily drill to build momentum',
            10: 'Light consistency — 1 micro-drill or voice prompt daily',
            15: 'Recommended — focused lesson + active speaking turn',
            20: 'Structured growth — lesson practice + Mistake Memory drill',
            25: 'Accelerated — voice practice + Mistake Memory review',
            30: 'Accelerated — full lesson + AI Speaking Studio session',
            45: 'Intensive — interview/IELTS pressure training',
          },
        },
      },
    },
    diagnostic: {
      kicker: 'Initial Diagnostic Assessment',
      title: '5-Question Evidence Baseline',
      subtitle:
        'Covers Vocabulary, Grammar, Sentence Construction, and Reading. Takes about 3 minutes.',
      honestyBanner:
        'Honest measurement notice: 5 items establish an initial starting estimate (~20% coverage) — never a certified CEFR or IELTS score.',
      questionLabel: 'Question',
      domains: {
        vocabulary: 'Vocabulary',
        grammar: 'Grammar',
        sentence_construction: 'Sentence Construction',
        reading: 'Reading Comprehension',
      },
      sentenceBuilderHint:
        'Click words below in order to build the natural English sentence. Click any placed word to remove it.',
      sentenceClearBtn: 'Clear sentence',
      sentenceEmptyPlaceholder: 'Your constructed English sentence will appear here...',
      prevBtn: 'Previous',
      nextBtn: 'Next Question',
      submitBtn: 'Calculate Starting Profile',
      unansweredWarning: 'Please answer this question before continuing.',
      results: {
        kicker: 'Evidence-Based Starting Profile',
        title: 'Your Initial Diagnostic Baseline',
        scoreLabel: 'Observed Accuracy',
        bandLabel: 'Estimated Starting Band',
        coverageLabel: 'Confidence Coverage',
        trackLabel: 'Recommended Focus Track',
        calibrationTitle: 'Self-Estimate Calibration',
        domainTitle: 'Domain Breakdown',
        reviewTitle: 'Item-by-Item Diagnostic Review',
        yourAnswer: 'Your answer',
        correctAnswer: 'Natural / Correct answer',
        correctBadge: 'Accurate',
        needsFixBadge: 'Logged to Mistake Memory',
        retakeBtn: 'Retake Diagnostic',
        enterWorkspaceBtn: 'Enter Learner Workspace',
      },
    },
    workspace: {
      welcome: 'Welcome back',
      noFakeDataNotice:
        'Honest Evidence Ledger: All metrics below reflect only activities you have actually completed. Zero simulated streaks or XP.',
      stats: {
        diagnosticBaseline: 'Diagnostic Baseline',
        activeMistakes: 'Tracked Mistake Patterns',
        speakingSessions: 'Speaking Sessions',
        activeStreak: 'Active Streak',
        notTaken: 'Not taken yet',
        days: 'days',
        completed: 'completed',
        patterns: 'patterns',
      },
      home: {
        profileSummaryTitle: 'Your Learner Profile',
        goalLabel: 'Primary Goal',
        dailyTargetLabel: 'Daily Commitment',
        explanationPrefLabel: 'Explanation Language',
        selfLevelLabel: 'Self-Estimated Level',
        startDiagnosticTitle: 'Complete Your 5-Question Diagnostic',
        startDiagnosticDesc:
          'Before starting modules, complete the 5-item diagnostic so LINGUAVERSE AI can map your real baseline.',
        startDiagnosticBtn: 'Take 5-Question Diagnostic',
        retakeDiagnosticBtn: 'Retake Diagnostic',
        diagnosticCardTitle: 'Latest Evidence Baseline',
        recentMistakesTitle: 'Mistake Memory Starter Queue',
        noMistakesPerfect:
          'You scored 5/5 on your initial diagnostic, so no baseline errors were logged. New mistakes will appear here once you complete speaking or writing tasks.',
        noMistakesUntaken:
          'No mistakes tracked yet. Complete your initial diagnostic to detect baseline Bangla-to-English patterns.',
        viewAllMistakes: 'Open Improve (Mistake Memory)',
        editPreferences: 'Edit in Settings',
      },
      modules: {
        learnTitle: 'Learn',
        learnSubtitle: 'Targeted micro-lessons aligned with your starting baseline and goal.',
        learnEmptyTitle: 'No completed lessons yet (0 logged)',
        learnEmptyDesc:
          'Phase 1 establishes your foundation, diagnostic baseline, and learner profile. Once you begin Phase 2 guided micro-lessons, every completed lesson and mastery check will be recorded here with zero fake progress.',
        speakTitle: 'Speak',
        speakSubtitle: 'Voice-first conversation practice and real-time phrasing feedback.',
        speakEmptyTitle: 'No speaking sessions recorded yet (0 sessions)',
        speakEmptyDesc:
          'Your voice history stays honestly empty until you complete your first live spoken practice turn. Your primary focus track is configured for:',
        improveTitle: 'Improve — Mistake Memory',
        improveSubtitle:
          'Every recurring Bangla-to-English pattern captured from your real work.',
        improveEmptyTitle: 'Your Mistake Memory queue is currently clear',
        improveEmptyDesc:
          'No active mistakes have been logged yet. Take or retake the diagnostic, or complete upcoming speaking sessions to populate real patterns.',
        progressTitle: 'Progress & Communication DNA',
        progressSubtitle:
          'Transparent, auditable skill coverage based strictly on completed evidence.',
        progressEmptyTitle: 'No diagnostic evidence recorded yet',
        progressEmptyDesc:
          'Complete the 5-question diagnostic to initialize your 4-domain written baseline. Spoken fluency axes remain at 0% coverage until you complete real voice sessions.',
        transferTitle: 'Transfer Lab',
        transferSubtitle:
          'Verify whether fixed grammar and phrasing transfer into unscripted speech.',
        transferEmptyTitle: 'No transfer drills completed yet (0 verified)',
        transferEmptyDesc:
          'Transfer Lab draws directly from active items in your Mistake Memory queue. Currently tracking:',
        activePatternsCount: 'active diagnostic pattern(s) ready for transfer testing.',
        goToDiagnostic: 'Go to Diagnostic Assessment',
        goToSettings: 'Adjust Learning Goals',
      },
      settings: {
        title: 'Settings & Preferences',
        subtitle: 'Manage your bilingual interface, explanation style, goals, and account session.',
        accountSection: 'Account Details',
        nameLabel: 'Display Name',
        emailLabel: 'Email Address',
        planLabel: 'Active Plan Track',
        storageLabel: 'Persistence Adapter',
        preferencesSection: 'Learning & Language Preferences',
        uiLangLabel: 'Interface Language',
        expLangLabel: 'Explanation Language',
        levelLabel: 'Self-Estimated Level',
        goalLabel: 'Primary Goal',
        dailyTimeLabel: 'Daily Time Goal',
        saveBtn: 'Save Preferences',
        savedNotice: 'Preferences saved and persisted.',
        actionsSection: 'Diagnostic & Session Actions',
        retakeDiagBtn: 'Retake 5-Question Diagnostic',
        logoutBtn: 'Sign Out',
        deleteDataBtn: 'Delete Local Account & Reset',
        deleteConfirmPrompt:
          'Are you sure? This permanently clears your local profile, diagnostic attempts, and session.',
        confirmDeleteBtn: 'Yes, Delete Account',
        cancelBtn: 'Cancel',
      },
    },
  },
  bn: {
    brand: 'LINGUAVERSE AI',
    nav: {
      home: 'হোম',
      features: 'বৈশিষ্ট্য',
      howItWorks: 'কীভাবে কাজ করে',
      pricing: 'মূল্য তালিকা',
      login: 'লগইন',
      startLearning: 'শেখা শুরু করুন',
      openWorkspace: 'ওয়ার্কস্পেস খুলুন',
      logout: 'লগআউট',
    },
    learnerNav: {
      home: 'হোম',
      learn: 'শিখুন',
      speak: 'বলুন',
      improve: 'সংশোধন',
      progress: 'অগ্রগতি',
      transferLab: 'ট্রান্সফার ল্যাব',
      settings: 'সেটিংস',
    },
    hero: {
      kicker: 'বাংলাভাষী ইংরেজি শিক্ষার্থীদের জন্য তৈরি · ভয়েস-ফার্স্ট ও প্রমাণ-ভিত্তিক',
      headline: 'ইংরেজি মুখস্থ করা বন্ধ করুন। এবার কথা বলা শুরু করুন।',
      subheadline:
        'আরও স্মার্টভাবে শিখুন, বাস্তব কথোপকথন অনুশীলন করুন, বারবার হওয়া ভুল শুধরে নিন এবং আপনার যোগাযোগ দক্ষতার প্রকৃত উন্নতি দেখুন।',
      primaryCta: 'ফ্রিতে শেখা শুরু করুন',
      secondaryCta: '৮-ধাপের পদ্ধতি দেখুন',
      honestyNote:
        'কোনো ভুয়া স্ট্রিক, কৃত্রিম XP বা বানানো CEFR স্কোর নেই — প্রতিটি তথ্য কেবল আপনার সম্পন্ন করা কাজ থেকেই তৈরি হয়।',
    },
    samplePreview: {
      badge: 'ইন্টারঅ্যাক্টিভ নমুনা প্রিভিউ',
      subtitle: 'Mistake Memory Engine · বাংলা-প্রভাবিত ইংরেজি ভুল শনাক্তকারী',
      inputLabel: 'বাংলা-প্রভাবিত একটি ইংরেজি বাক্য পরীক্ষা করে দেখুন',
      inputPlaceholder: 'যেমন লিখুন: I go to market yesterday',
      analyzeBtn: 'বিশ্লেষণ করুন',
      detectedLabel: 'পুনরাবৃত্ত ভুলের ধরন ধরা পড়েছে',
      cleanLabel: 'নমুনা যাচাই সম্পন্ন',
      originalLabel: 'আপনার লেখা / বলা বাক্য',
      naturalLabel: 'স্বাভাবিক ও শুদ্ধ ইংরেজি',
      banglaReasonLabel: 'বাংলাভাষীদের এই ভুলটি কেন হয়',
      ruleLabel: 'ব্যাখ্যা',
      applyFixBtn: 'শুদ্ধ রূপ প্রয়োগ ও তুলনা করুন',
      resetBtn: 'মূল নমুনায় ফিরুন',
      compareDone: 'শুদ্ধ বাক্যটি প্রয়োগ করা হয়েছে — লক্ষ্য করুন অতীত কালের সাথে Verb কীভাবে বদলাল।',
      explanationToggle: {
        bn: 'বাংলা',
        both: 'উভয়',
        en: 'EN',
      },
    },
    whyFails: {
      kicker: 'মূল সমস্যা',
      title: 'প্রচলিত পদ্ধতিতে ইংরেজি শিখেও বাংলাভাষীরা কেন কথা বলতে পারেন না',
      subtitle:
        'অনেকেই ১০ বছরের বেশি সময় ব্যাকরণ মুখস্থ করেও ২ মিনিটের চাকরির ইন্টারভিউতে আটকে যান। সমস্যা আপনার চেষ্টায় নয় — সমস্যা শেখার পদ্ধতিতে।',
      columns: {
        oldWay: 'নিষ্ক্রিয় পড়াশোনার ফাঁদ',
        newWay: 'যোগাযোগ বুদ্ধিমত্তা',
      },
      items: [
        {
          index: '01',
          problemTitle: 'বলার অনুশীলন ছাড়া শুধু নিয়ম মুখস্থ করা',
          problemDesc:
            'খাতায় Tense-এর শূন্যস্থান পূরণ করতে পারলেও কথা বলার সময় চাপের মুখে "I go yesterday" বলে ফেলেন।',
          solutionTitle: 'বাস্তব সময়ের মধ্যে সক্রিয় ভয়েস অনুশীলন',
          solutionDesc:
            'খাতার নিয়ম নয়, সরাসরি কথা বলার সময় সঠিক ইংরেজি বাক্য দ্রুত মনে করার অভ্যাস গড়ে তুলুন।',
        },
        {
          index: '02',
          problemTitle: 'সাধারণ অ্যাপগুলো বাংলা-থেকে-ইংরেজি অনুবাদের ভুল বোঝে না',
          problemDesc:
            'বিদেশি অ্যাপগুলো কখনোই ব্যাখ্যা করে না কেন বাংলাভাষীরা "discuss about" বা "am working since 2022" বলেন।',
          solutionTitle: 'বাংলায় সহজ ব্যাখ্যাসহ মাতৃভাষার প্রভাব সংশোধন',
          solutionDesc:
            'প্রতিটি ভুলের পেছনের বাংলা চিন্তার অভ্যাসটি বাংলা বা ইংরেজিতে পরিষ্কারভাবে বুঝিয়ে দেওয়া হয়।',
        },
        {
          index: '03',
          problemTitle: 'ভুয়া গেমিফিকেশন প্রকৃত দুর্বলতা ঢেকে রাখে',
          problemDesc:
            '৩০০ দিনের স্ট্রিক আর XP পয়েন্ট বাড়লেও বাস্তব মিটিং বা ইন্টারভিউতে বলার সাবলীলতা একটুও বাড়ে না।',
          solutionTitle: 'প্রকৃত কাজের ওপর ভিত্তি করে সৎ অগ্রগতি',
          solutionDesc:
            'আপনি নিজে কাজ সম্পন্ন না করা পর্যন্ত আপনার ড্যাশবোর্ডে কোনো বানানো সংখ্যা দেখানো হবে না।',
        },
        {
          index: '04',
          problemTitle: 'শেখা নিয়ম বাস্তবে কাজে লাগছে কিনা তার কোনো পরীক্ষা নেই',
          problemDesc:
            'একটি গ্রামার লেসন শেষ করলেই প্রমাণ হয় না যে অপ্রস্তুত কথোপকথনে আপনি সেটি ঠিকমতো বলতে পারবেন।',
          solutionTitle: 'Transfer Lab বাস্তব কথায় দক্ষতা যাচাই করে',
          solutionDesc:
            'নতুন পরিস্থিতিতে স্বাভাবিকভাবে শুদ্ধ বাক্য বলতে না পারা পর্যন্ত কোনো ভুলকে "সমাধান হয়েছে" ধরা হয় না।',
        },
      ],
    },
    loopSection: {
      kicker: 'শিক্ষা পদ্ধতি',
      title: 'যোগাযোগ উন্নতির ৮-ধাপের কার্যকর চক্র',
      subtitle:
        'আপনার নিষ্ক্রিয় ইংরেজি জ্ঞানকে আত্মবিশ্বাসী কথোপকথনে রূপান্তর করার প্রমাণ-ভিত্তিক প্রক্রিয়া।',
      selectPrompt: 'যেকোনো ধাপে ক্লিক করে বিস্তারিত দেখুন',
      steps: [
        {
          num: '01',
          title: 'প্রমাণ-ভিত্তিক প্রাথমিক মূল্যায়ন',
          shortDesc: 'ভুয়া স্কোর ছাড়াই প্রকৃত অবস্থান নির্ণয়।',
          detail:
            'শব্দভান্ডার, ব্যাকরণ, বাক্য গঠন ও পঠন দক্ষতার ওপর একটি সংক্ষিপ্ত ডায়াগনস্টিক দিন। স্বচ্ছ কভারেজ সীমাবদ্ধতাসহ আপনার প্রকৃত শুরুর প্রোফাইল তৈরি হবে।',
          outcome: 'আপনার লক্ষ্য অনুযায়ী স্পষ্ট প্রাথমিক পরিকল্পনা।',
        },
        {
          num: '02',
          title: 'লক্ষ্যভিত্তিক মাইক্রো-লেসন',
          shortDesc: 'অপ্রয়োজনীয় তত্ত্ব বাদ দিয়ে ঠিক যা দরকার তাই শিখুন।',
          detail:
            '৪০ মিনিটের দীর্ঘ লেকচার নয়—ইন্টারভিউ, অফিস বা দৈনন্দিন জীবনের একটি নির্দিষ্ট প্রকাশভঙ্গি ৫–৮ মিনিটে আয়ত্ত করুন।',
          outcome: 'কম সময়ে পরিষ্কার ও কার্যকর ধারণা।',
        },
        {
          num: '03',
          title: 'নির্দেশিত ভয়েস অনুশীলন',
          shortDesc: 'বাস্তব সংলাপের মাধ্যমে জোরে বলার চর্চা।',
          detail:
            'শেখা বাক্যগঠন তৎক্ষণাৎ মুখ দিয়ে বলুন। বাংলা থেকে শব্দে-শব্দে অনুবাদ না করে সরাসরি ইংরেজিতে ভাব প্রকাশের অভ্যাস তৈরি করুন।',
          outcome: 'কথা বলার স্বতঃস্ফূর্ততা ও জড়তা মুক্তি।',
        },
        {
          num: '04',
          title: 'তাৎক্ষণিক ভুল শনাক্তকরণ',
          shortDesc: 'আত্মবিশ্বাস নষ্ট না করেই সূক্ষ্ম ভুলগুলো ধরা।',
          detail:
            'কথা বলার স্বাভাবিক গতি বজায় রেখেই Tense, Preposition, Article এবং অস্বাভাবিক শব্দচয়ন নির্ভুলভাবে চিহ্নিত করা হয়।',
          outcome: 'আপনার বলার অভ্যাসের নিরপেক্ষ ও নির্ভুল রেকর্ড।',
        },
        {
          num: '05',
          title: 'বাংলা-ফার্স্ট বিশ্লেষণ',
          shortDesc: 'আপনি যে ভাষায় ভাবেন, সেই ভাষাতেই "কেন" বুঝুন।',
          detail:
            'বাংলা, ইংরেজি অথবা উভয় ভাষায় পাশাপাশি তুলনা করে বুঝুন কেন সরাসরি বাংলা অনুবাদ ইংরেজিতে বেমানান শোনায়।',
          outcome: 'অনুমান নয়, সম্পূর্ণ স্পষ্ট ধারণা।',
        },
        {
          num: '06',
          title: 'Mistake Memory সংরক্ষণ',
          shortDesc: 'পুরোনো ভুলগুলো মনে রেখে স্থায়ীভাবে দূর করা।',
          detail:
            'বারবার করা ভুলগুলো আপনার ব্যক্তিগত Mistake Memory-তে জমা থাকে। এক সেশন পরেই হারিয়ে যায় না—স্থায়ী সমাধান না হওয়া পর্যন্ত নজরে থাকে।',
          outcome: 'একই ভুল বছরের পর বছর পুনরাবৃত্তি বন্ধ হয়।',
        },
        {
          num: '07',
          title: 'Transfer Lab প্রয়োগ',
          shortDesc: 'অপ্রস্তুত নতুন পরিস্থিতিতে শুদ্ধ রূপটি ব্যবহার করুন।',
          detail:
            'কিছুদিন পর নতুন একটি কথোপকথনে সেই একই কাঠামো আবার সামনে আনা হয়—যাচাই করতে যে সংশোধনটি আপনার অভ্যাসে পরিণত হয়েছে কিনা।',
          outcome: 'ক্ষণস্থায়ী মুখস্থ নয়, প্রকৃত দক্ষতার প্রমাণ।',
        },
        {
          num: '08',
          title: 'Pressure Ladder যাচাই',
          shortDesc: 'সময়ের চাপের মধ্যেও স্পষ্টতা ধরে রাখুন।',
          detail:
            'ধীরে ধীরে সময়সীমাহীন অনুশীলন থেকে সময়বদ্ধ চাকরির ইন্টারভিউ, অফিস মিটিং ও IELTS প্রশ্নের চাপে সাবলীল থাকার দক্ষতা অর্জন করুন।',
          outcome: 'বাস্তব ইন্টারভিউ ও মিটিংয়ে স্থির আত্মবিশ্বাস।',
        },
      ],
    },
    systemsSection: {
      kicker: 'মূল স্থাপত্য',
      title: 'বাস্তব সাবলীলতার জন্য ৬টি স্বতন্ত্র সিস্টেম',
      subtitle:
        'LINGUAVERSE AI-এর প্রতিটি অংশের একটাই লক্ষ্য: ইংরেজি "জানা" এবং স্পষ্টভাবে "বলার" মধ্যকার দূরত্ব দূর করা।',
      systems: [
        {
          id: 'dna',
          index: '01',
          name: 'Communication DNA',
          tagline: 'শুধুমাত্র প্রকৃত কাজের প্রমাণে গড়া বহুমাত্রিক প্রোফাইল',
          description:
            'আপনার স্পষ্টতা, ব্যাকরণগত নির্ভুলতা, স্বাভাবিক শব্দচয়ন, বাক্য গঠন ও অনুধাবন দক্ষতা সময়ের সাথে কীভাবে বদলাচ্ছে তা স্বচ্ছ কভারেজসহ দেখায়।',
        },
        {
          id: 'mistake_memory',
          index: '02',
          name: 'Mistake Memory Engine',
          tagline: 'বাংলা-থেকে-ইংরেজি অনুবাদের ভুল মনে রাখে ও দূর করে',
          description:
            'অতীত কালের Verb বাদ পড়া, "discuss about"-এর মতো অতিরিক্ত Preposition কিংবা "since"-এর সাথে ভুল Tense ব্যবহার শনাক্ত করে সমাধান না হওয়া পর্যন্ত অনুসরণ করে।',
        },
        {
          id: 'transfer_lab',
          index: '03',
          name: 'Transfer Lab',
          tagline: 'শেখা নিয়ম বাস্তব কথায় কাজে লাগছে কিনা তা পরীক্ষা করে',
          description:
            'কুইজে সঠিক উত্তর দেওয়া মানেই দক্ষতা অর্জন নয়। Transfer Lab নতুন অপ্রস্তুত পরিস্থিতিতে আপনার পুরোনো ভুলগুলো পুনরায় যাচাই করে।',
        },
        {
          id: 'pressure_ladder',
          index: '04',
          name: 'Pressure Ladder',
          tagline: 'ধীরে ধীরে বাস্তব সময়ের চাপে কথা বলার প্রস্তুতি',
          description:
            'সময় নিয়ে ভাবার ধাপ থেকে ধীরে ধীরে সময়বদ্ধ জব ইন্টারভিউ, ক্লায়েন্ট ডেমো এবং IELTS কিউ কার্ড অনুশীলনে এগিয়ে যান।',
        },
        {
          id: 'replay',
          index: '05',
          name: 'Communication Replay',
          tagline: 'আপনার বলা বাক্য বনাম স্বাভাবিক ইংরেজির পাশাপাশি তুলনা',
          description:
            'আপনি ঠিক কী বলেছিলেন এবং আরও সাবলীল ও পেশাদারভাবে কীভাবে বলা যেত—তা সংক্ষিপ্ত বাংলা ব্যাখ্যাসহ পাশাপাশি দেখুন।',
        },
        {
          id: 'evidence',
          index: '06',
          name: 'Evidence-Based Progress',
          tagline: 'কৃত্রিম গেমিফিকেশন ছাড়া সম্পূর্ণ সৎ ড্যাশবোর্ড',
          description:
            'কোনো ভুয়া স্ট্রিক, অর্থহীন XP বা বানানো CEFR সার্টিফিকেট নেই। ড্যাশবোর্ডের প্রতিটি সংখ্যা আপনার সম্পন্ন করা বাস্তব কাজের প্রমাণ।',
        },
      ],
    },
    pricing: {
      kicker: 'স্বচ্ছ মূল্য তালিকা',
      title: 'ফ্রিতে শুরু করুন। সীমাহীন ভয়েস ও ট্রান্সফার ল্যাবের জন্য প্রো নিন।',
      subtitle:
        'বাংলাদেশ ও আন্তর্জাতিক শিক্ষার্থীদের জন্য সহজলভ্য। নিচে মুদ্রা ও বিলিং সময়কাল পরিবর্তন করে দেখুন।',
      currencyLabel: 'মুদ্রা',
      billingMonthly: 'মাসিক',
      billingAnnual: 'বার্ষিক (২০% সাশ্রয়)',
      perMonth: '/ মাস',
      billedAnnuallyNote: 'বার্ষিক বিলিং',
      plans: {
        free: {
          audience: 'সৎ ভিত্তি দিয়ে শুরু করতে ইচ্ছুক শিক্ষার্থীদের জন্য',
          name: 'ফ্রি (Free)',
          priceBdtMonthly: '৳০',
          priceBdtAnnual: '৳০',
          priceUsdMonthly: '$0',
          priceUsdAnnual: '$0',
          cta: 'ফ্রি অ্যাকাউন্ট খুলুন',
          features: [
            'সম্পূর্ণ বাংলা ও ইংরেজি দ্বিভাষিক ইন্টারফেস',
            '৫-প্রশ্নের ডায়াগনস্টিক ও সৎ প্রাথমিক প্রোফাইল',
            'বাংলা-ফার্স্ট ব্যাকরণ ও বাক্য ব্যাখ্যা',
            'মৌলিক লেসন ও Mistake Memory (সর্বোচ্চ ১৫টি ধরন)',
            'প্রতি সপ্তাহে ৩টি নির্দেশিত ভয়েস অনুশীলন',
          ],
        },
        pro: {
          audience: 'চাকরির ইন্টারভিউ, অফিস ও IELTS প্রস্তুতির জন্য',
          name: 'প্রো (Pro)',
          priceBdtMonthly: '৳৯৯০',
          priceBdtAnnual: '৳৭৯০',
          priceUsdMonthly: '$9',
          priceUsdAnnual: '$7',
          cta: 'প্রো ট্র্যাক দিয়ে শুরু করুন',
          features: [
            'ফ্রি প্ল্যানের সব সুবিধা, সাপ্তাহিক কোনো সীমা ছাড়াই',
            'সীমাহীন ভয়েস অনুশীলন ও Communication Replay আর্কাইভ',
            'সম্পূর্ণ Mistake Memory Engine ও সেশন-ব্যাপী ট্র্যাকিং',
            'Transfer Lab ও সময়বদ্ধ Pressure Ladder ইন্টারভিউ ড্রিল',
            'চাকরির ইন্টারভিউ, কর্মক্ষেত্র ও IELTS-এর আলাদা ট্র্যাক',
          ],
        },
      },
    },
    faq: {
      kicker: 'সাধারণ প্রশ্নাবলী',
      title: 'প্রায়শই জিজ্ঞাসিত প্রশ্ন',
      items: [
        {
          q: 'LINGUAVERSE AI ব্যবহার করতে কি আগে থেকেই ভালো ইংরেজি জানতে হবে?',
          a: 'একদমই না। আপনি Pre-A1 থেকে C1 যেকোনো স্তর থেকে শুরু করতে পারবেন। অনবোর্ডিংয়ের সময়ই ইন্টারফেস ও ব্যাখ্যার ভাষা বাংলা বা ইংরেজি নির্বাচন করা যায়।',
        },
        {
          q: '৫টি প্রশ্নের ডায়াগনস্টিক কেন সনদপ্রাপ্ত CEFR স্কোর দেয় না?',
          a: 'মাত্র ৫টি লিখিত প্রশ্ন থেকে আনুষ্ঠানিক CEFR বা IELTS স্কোর দাবি করা অসৎ। আমাদের ডায়াগনস্টিক প্রায় ২০% প্রাথমিক কভারেজসহ একটি সৎ শুরুর ধারণা দেয়—বাস্তব কাজ সম্পন্ন করার সাথে সাথে নির্ভরযোগ্যতা বাড়ে।',
        },
        {
          q: 'বাংলায় ব্যাখ্যা পড়লে কি ইংরেজিতে ভাবতে অসুবিধা হবে?',
          a: 'সঠিকভাবে ব্যবহার করলে বাংলা বোঝার গতি বাড়ায়। কেন "discuss about" বা "I am working since 2022" ভুল—তা বাংলায় ১০ সেকেন্ডে পরিষ্কার হয়ে গেলে অনুবাদের ভুল অভ্যাস দ্রুত ভাঙে এবং আপনি ইংরেজিতে বেশি কথা বলতে পারেন।',
        },
        {
          q: 'প্রথমবার লগইন করার পর আমার ড্যাশবোর্ডে সব সংখ্যা ০ (শূন্য) কেন দেখাচ্ছে?',
          a: 'আমরা সম্পূর্ণ প্রমাণ-ভিত্তিক অগ্রগতিতে বিশ্বাসী। কোনো ভুয়া স্ট্রিক, ডামি XP বা আগে থেকে বানানো ডেটা দেখানো হয় না। আপনি যা বাস্তবে করবেন কেবল তাই এখানে যুক্ত হবে।',
        },
        {
          q: 'আমি কি যেকোনো সময় বাংলা ও ইংরেজি ইন্টারফেস পরিবর্তন করতে পারব?',
          a: 'হ্যাঁ। উপরের মেনু বা সেটিংস থেকে এক ক্লিকেই EN / বাংলা পরিবর্তন করতে পারবেন এবং আপনার পছন্দ সংরক্ষিত থাকবে।',
        },
        {
          q: 'আমার অ্যাকাউন্ট ও শেখার তথ্য কীভাবে সংরক্ষিত থাকে?',
          a: 'আপনার অ্যাকাউন্ট, অনবোর্ডিং প্রোফাইল, ডায়াগনস্টিক ফলাফল এবং Mistake Memory তথ্য একটি মডুলার স্টোরেজ লেয়ারে সংরক্ষিত হয়, যা Cloudflare Workers + D1 ইন্টিগ্রেশনের জন্য প্রস্তুত।',
        },
      ],
    },
    footer: {
      tagline:
        'বাংলাভাষী শিক্ষার্থীদের জন্য ভয়েস-ফার্স্ট ও প্রমাণ-ভিত্তিক ইংরেজি যোগাযোগ বুদ্ধিমত্তা প্ল্যাটফর্ম।',
      linksTitle: 'প্ল্যাটফর্ম',
      accountTitle: 'অ্যাকাউন্ট',
      copyright: '© ২০২৬ LINGUAVERSE AI। গেমিফিকেশন নয়, প্রকৃত প্রমাণ।',
    },
    auth: {
      loginTitle: 'LINGUAVERSE AI-এ স্বাগতম',
      loginSubtitle: 'আপনার প্রমাণ-ভিত্তিক ইংরেজি অনুশীলন চালিয়ে যেতে সাইন ইন করুন।',
      registerTitle: 'আপনার LINGUAVERSE AI অ্যাকাউন্ট তৈরি করুন',
      registerSubtitle:
        'আপনার লক্ষ্য নির্ধারণ করুন, ৫-প্রশ্নের ডায়াগনস্টিক দিন এবং সৎ প্রাথমিক প্রোফাইল তৈরি করুন।',
      nameLabel: 'পূর্ণ নাম',
      namePlaceholder: 'যেমন: রফিকুল ইসলাম',
      emailLabel: 'ইমেইল ঠিকানা',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'পাসওয়ার্ড',
      passwordPlaceholder: 'কমপক্ষে ৮ অক্ষর',
      confirmPasswordLabel: 'পাসওয়ার্ড নিশ্চিত করুন',
      confirmPasswordPlaceholder: 'পুনরায় পাসওয়ার্ড লিখুন',
      loginBtn: 'সাইন ইন করুন',
      registerBtn: 'অ্যাকাউন্ট তৈরি করে এগিয়ে যান',
      switchToRegister: 'LINGUAVERSE AI-এ নতুন?',
      switchToRegisterLink: 'নতুন অ্যাকাউন্ট খুলুন',
      switchToLogin: 'ইতিমধ্যেই অ্যাকাউন্ট আছে?',
      switchToLoginLink: 'সাইন ইন করুন',
      passwordMismatch: 'পাসওয়ার্ড দুটি মেলেনি।',
      selectedPlanNote: 'নির্বাচিত প্ল্যান:',
      backHome: 'হোমে ফিরে যান',
    },
    onboarding: {
      stepOf: 'ধাপ',
      of: '/',
      title: 'আপনার শেখার পরিবেশ সাজিয়ে নিন',
      subtitle: 'আপনার পছন্দ ও লক্ষ্য জানালে ব্যাখ্যা ও অনুশীলন আপনার প্রয়োজন অনুযায়ী সাজানো হবে।',
      backBtn: 'পেছনে',
      nextBtn: 'পরবর্তী',
      finishBtn: 'সংরক্ষণ করে ৫-প্রশ্নের ডায়াগনস্টিক শুরু করুন',
      steps: {
        uiLang: {
          title: 'আপনার পছন্দের ইন্টারফেস ভাষা নির্বাচন করুন',
          desc: 'যেকোনো সময় হেডার বা সেটিংস থেকে বাংলা ও ইংরেজি পরিবর্তন করা যাবে।',
          enLabel: 'English Interface',
          enDesc: 'সব মেনু, বাটন ও অগ্রগতির তথ্য ইংরেজিতে দেখুন।',
          bnLabel: 'বাংলা ইন্টারফেস (Bangla)',
          bnDesc: 'মেনু, বাটন এবং ড্যাশবোর্ডের সব লেখা বাংলায় দেখুন।',
        },
        expLang: {
          title: 'ব্যাকরণ ও বলার ভুলের ব্যাখ্যা কোন ভাষায় দেখতে চান?',
          desc: 'Mistake Memory কোন ভাষায় আপনাকে ভুলের কারণ বোঝাবে তা বেছে নিন।',
          bnLabel: 'বাংলা ব্যাখ্যা (Bangla Explanations)',
          bnDesc: 'ইংরেজি ভুল ও বাংলা অনুবাদের অভ্যাসের সহজ বাংলা ব্যাখ্যা।',
          bothLabel: 'উভয় ভাষা (Bangla + English)',
          bothDesc: 'ইংরেজি ব্যাখ্যার পাশাপাশি বাংলায় স্পষ্ট বিশ্লেষণ।',
          enLabel: 'শুধুমাত্র ইংরেজি (English Only)',
          enDesc: 'বাংলা অনুবাদ ছাড়া সরাসরি সহজ ইংরেজিতে ব্যাখ্যা।',
        },
        level: {
          title: 'আপনার বর্তমান ইংরেজি দক্ষতার নিজস্ব মূল্যায়ন কী?',
          desc: 'সৎভাবে বেছে নিন — এর পরপরই ৫টি প্রশ্নের ডায়াগনস্টিক এটি যাচাই করবে।',
          options: {
            'Pre-A1': 'একদম নতুন — সাধারণ কিছু শব্দ জানি, বাক্য বানাতে কষ্ট হয়।',
            A1: 'প্রাথমিক — নিজের পরিচয় ও খুব সহজ পরিচিত বাক্য বলতে পারি।',
            A2: 'এলিমেন্টারি — দৈনন্দিন ছোট কথা বলতে পারি কিন্তু প্রায়ই আটকে যাই।',
            B1: 'ইন্টারমিডিয়েট — মনের ভাব বোঝাতে পারি, তবে Tense ও বাক্যগঠনে ভুল হয়।',
            B2: 'আপার-ইন্টারমিডিয়েট — কাজ বা পড়াশোনায় ইংরেজি ব্যবহার করি, আরও সাবলীলতা চাই।',
            C1: 'অ্যাডভান্সড — ভালো সাবলীলতা আছে, সূক্ষ্ম প্রকাশভঙ্গি ও চাপের নিয়ন্ত্রণ বাড়াতে চাই।',
          },
        },
        goal: {
          title: 'ইংরেজি শেখার আপনার প্রধান লক্ষ্য কী?',
          desc: 'আপনার লক্ষ্য অনুযায়ী উদাহরণ, পরিস্থিতি ও অনুশীলনের ধরন নির্ধারিত হবে।',
          options: {
            job_interview: {
              label: 'চাকরির ইন্টারভিউ প্রস্তুতি',
              desc: 'ইন্টারভিউয়ের চাপের মধ্যে পরিষ্কার ও গুছিয়ে উত্তর দেওয়া।',
            },
            daily_speaking: {
              label: 'দৈনন্দিন কথা বলার আত্মবিশ্বাস',
              desc: 'মনে মনে অনুবাদ না করে স্বাভাবিক ইংরেজিতে কথোপকথন চালানো।',
            },
            academic_ielts: {
              label: 'একাডেমিক ও IELTS প্রস্তুতি',
              desc: 'গুছানো যুক্তি, স্বাভাবিক শব্দচয়ন ও সময়বদ্ধ স্পষ্টতা তৈরি।',
            },
            workplace: {
              label: 'কর্মক্ষেত্র ও ক্লায়েন্ট যোগাযোগ',
              desc: 'অফিস মিটিং, স্ট্যান্ডআপ আপডেট ও প্রেজেন্টেশনে সাবলীল হওয়া।',
            },
          },
        },
        dailyTime: {
          title: 'প্রতিদিন কতটুকু সময় অনুশীলন করতে পারবেন?',
          desc: 'হঠাৎ একদিন ২ ঘণ্টা পড়ার চেয়ে প্রতিদিন নিয়মিত অল্প অনুশীলন অনেক বেশি কার্যকর।',
          minutesLabel: 'মিনিট / দিন',
          options: {
            5: 'ক্ষুদ্র অভ্যাস — প্রতিদিন ১টি ছোট অনুশীলন দিয়ে শুরু',
            10: 'হালকা নিয়মিততা — প্রতিদিন ১টি ছোট অনুশীলন',
            15: 'প্রস্তাবিত — ১টি ফোকাসড লেসন ও সক্রিয় বলার চর্চা',
            20: 'সংগঠিত উন্নতি — লেসন অনুশীলন ও মিস্টেক মেমোরি ড্রিল',
            25: 'দ্রুত উন্নতি — ভয়েস অনুশীলন ও Mistake Memory রিভিউ',
            30: 'দ্রুত অগ্রগতি — পূর্ণ লেসন ও AI স্পিকিং স্টুডিও সেশন',
            45: 'নিবিড় প্রস্তুতি — ইন্টারভিউ/IELTS সময়বদ্ধ অনুশীলন',
          },
        },
      },
    },
    diagnostic: {
      kicker: 'প্রাথমিক ডায়াগনস্টিক মূল্যায়ন',
      title: '৫-প্রশ্নের প্রমাণ-ভিত্তিক বেসলাইন',
      subtitle:
        'শব্দভান্ডার, ব্যাকরণ, বাক্য গঠন ও পঠন দক্ষতা যাচাই করবে। সময় লাগবে প্রায় ৩ মিনিট।',
      honestyBanner:
        'স্বচ্ছ মূল্যায়ন বিজ্ঞপ্তি: ৫টি প্রশ্ন শুধুমাত্র একটি প্রাথমিক শুরুর ধারণা (প্রায় ২০% কভারেজ) দেয় — এটি কখনোই সনদপ্রাপ্ত CEFR বা IELTS স্কোর নয়।',
      questionLabel: 'প্রশ্ন',
      domains: {
        vocabulary: 'শব্দভান্ডার (Vocabulary)',
        grammar: 'ব্যাকরণ (Grammar)',
        sentence_construction: 'বাক্য গঠন (Sentence Construction)',
        reading: 'পঠন অনুধাবন (Reading)',
      },
      sentenceBuilderHint:
        'শুদ্ধ ইংরেজি বাক্য তৈরি করতে নিচের শব্দগুলোতে সঠিক ক্রমে ক্লিক করুন। বাদ দিতে বসানো শব্দে ক্লিক করুন।',
      sentenceClearBtn: 'মুছে ফেলুন',
      sentenceEmptyPlaceholder: 'আপনার সাজানো ইংরেজি বাক্য এখানে দেখাবে...',
      prevBtn: 'পূর্ববর্তী',
      nextBtn: 'পরবর্তী প্রশ্ন',
      submitBtn: 'প্রাথমিক প্রোফাইল তৈরি করুন',
      unansweredWarning: 'এগিয়ে যাওয়ার আগে অনুগ্রহ করে এই প্রশ্নটির উত্তর দিন।',
      results: {
        kicker: 'প্রমাণ-ভিত্তিক শুরুর প্রোফাইল',
        title: 'আপনার প্রাথমিক ডায়াগনস্টিক ফলাফল',
        scoreLabel: 'পর্যবেক্ষিত নির্ভুলতা',
        bandLabel: 'আনুমানিক শুরুর স্তর',
        coverageLabel: 'নির্ভরযোগ্যতা কভারেজ',
        trackLabel: 'প্রস্তাবিত ফোকাস ট্র্যাক',
        calibrationTitle: 'নিজস্ব মূল্যায়নের সাথে তুলনা',
        domainTitle: 'দক্ষতাভিত্তিক বিশ্লেষণ',
        reviewTitle: 'প্রতিটি প্রশ্নের বিস্তারিত পর্যালোচনা',
        yourAnswer: 'আপনার উত্তর',
        correctAnswer: 'শুদ্ধ / স্বাভাবিক উত্তর',
        correctBadge: 'সঠিক',
        needsFixBadge: 'Mistake Memory-তে যুক্ত হয়েছে',
        retakeBtn: 'পুনরায় ডায়াগনস্টিক দিন',
        enterWorkspaceBtn: 'লার্নার ওয়ার্কস্পেসে প্রবেশ করুন',
      },
    },
    workspace: {
      welcome: 'স্বাগতম',
      noFakeDataNotice:
        'সৎ প্রমাণের খতিয়ান: নিচের প্রতিটি সংখ্যা কেবল আপনার সম্পন্ন করা কাজের ভিত্তিতে তৈরি। কোনো ভুয়া স্ট্রিক বা XP নেই।',
      stats: {
        diagnosticBaseline: 'ডায়াগনস্টিক বেসলাইন',
        activeMistakes: 'সংরক্ষিত ভুলের ধরন',
        speakingSessions: 'ভয়েস সেশন',
        activeStreak: 'সক্রিয় ধারাবাহিকতা',
        notTaken: 'এখনো দেওয়া হয়নি',
        days: 'দিন',
        completed: 'সম্পন্ন',
        patterns: 'টি ধরন',
      },
      home: {
        profileSummaryTitle: 'আপনার লার্নার প্রোফাইল',
        goalLabel: 'প্রধান লক্ষ্য',
        dailyTargetLabel: 'দৈনিক সময় লক্ষ্য',
        explanationPrefLabel: 'ব্যাখ্যার ভাষা',
        selfLevelLabel: 'নিজস্ব মূল্যায়ন স্তর',
        startDiagnosticTitle: 'আপনার ৫-প্রশ্নের ডায়াগনস্টিক সম্পন্ন করুন',
        startDiagnosticDesc:
          'মডিউল শুরু করার আগে ৫-প্রশ্নের ডায়াগনস্টিক দিন যাতে LINGUAVERSE AI আপনার প্রকৃত ভিত্তি বুঝতে পারে।',
        startDiagnosticBtn: '৫-প্রশ্নের ডায়াগনস্টিক দিন',
        retakeDiagnosticBtn: 'পুনরায় ডায়াগনস্টিক দিন',
        diagnosticCardTitle: 'সর্বশেষ প্রমাণ-ভিত্তিক বেসলাইন',
        recentMistakesTitle: 'Mistake Memory প্রাথমিক তালিকা',
        noMistakesPerfect:
          'আপনি প্রাথমিক ডায়াগনস্টিকে ৫/৫ পেয়েছেন, তাই কোনো ভুল যোগ হয়নি। পরবর্তী ভয়েস বা লেখার অনুশীলনে কোনো ভুল হলে তা এখানে যুক্ত হবে।',
        noMistakesUntaken:
          'এখনো কোনো ভুল রেকর্ড হয়নি। বাংলা-প্রভাবিত ভুল শনাক্ত করতে প্রাথমিক ডায়াগনস্টিক দিন।',
        viewAllMistakes: 'সংশোধন (Mistake Memory) দেখুন',
        editPreferences: 'সেটিংসে পরিবর্তন করুন',
      },
      modules: {
        learnTitle: 'শিখুন (Learn)',
        learnSubtitle: 'আপনার প্রাথমিক স্তর ও লক্ষ্য অনুযায়ী সাজানো মাইক্রো-লেসন।',
        learnEmptyTitle: 'এখনো কোনো লেসন সম্পন্ন হয়নি (০ সম্পন্ন)',
        learnEmptyDesc:
          'ফেজ ১ আপনার ফাউন্ডেশন, ডায়াগনস্টিক বেসলাইন ও লার্নার প্রোফাইল তৈরি করেছে। ফেজ ২-এ মাইক্রো-লেসন শুরু করলে আপনার প্রতিটি সম্পন্ন লেসন এখানে নির্ভুলভাবে যুক্ত হবে।',
        speakTitle: 'বলুন (Speak)',
        speakSubtitle: 'ভয়েস-ফার্স্ট কথোপকথন অনুশীলন ও তাৎক্ষণিক ফিডব্যাক।',
        speakEmptyTitle: 'এখনো কোনো ভয়েস সেশন রেকর্ড হয়নি (০ সেশন)',
        speakEmptyDesc:
          'আপনার প্রথম বাস্তব ভয়েস অনুশীলন সম্পন্ন না করা পর্যন্ত এই তালিকা সৎভাবে ফাঁকা থাকবে। আপনার নির্বাচিত ফোকাস ট্র্যাক:',
        improveTitle: 'সংশোধন — Mistake Memory',
        improveSubtitle:
          'আপনার বাস্তব কাজ থেকে শনাক্ত হওয়া বাংলা-থেকে-ইংরেজি ভুলের ধরনসমূহ।',
        improveEmptyTitle: 'আপনার Mistake Memory তালিকা এখন পরিষ্কার',
        improveEmptyDesc:
          'এখনো কোনো সক্রিয় ভুল যুক্ত হয়নি। প্রাথমিক ডায়াগনস্টিক দিন অথবা পরবর্তী ভয়েস সেশন সম্পন্ন করলে প্রকৃত ভুলগুলো এখানে জমা হবে।',
        progressTitle: 'অগ্রগতি ও Communication DNA',
        progressSubtitle:
          'শুধুমাত্র সম্পন্ন করা কাজের প্রমাণের ওপর ভিত্তি করে স্বচ্ছ দক্ষতা বিশ্লেষণ।',
        progressEmptyTitle: 'এখনো কোনো ডায়াগনস্টিক প্রমাণ নেই',
        progressEmptyDesc:
          '৪টি দক্ষতার লিখিত বেসলাইন শুরু করতে ৫-প্রশ্নের ডায়াগনস্টিক দিন। বাস্তব ভয়েস সেশন সম্পন্ন না করা পর্যন্ত বলার দক্ষতার কভারেজ ০% থাকবে।',
        transferTitle: 'ট্রান্সফার ল্যাব',
        transferSubtitle:
          'সংশোধিত ব্যাকরণ ও বাক্যগঠন অপ্রস্তুত কথায় কাজে লাগছে কিনা তা যাচাই করুন।',
        transferEmptyTitle: 'এখনো কোনো ট্রান্সফার ড্রিল সম্পন্ন হয়নি (০ যাচাইকৃত)',
        transferEmptyDesc:
          'Transfer Lab সরাসরি আপনার Mistake Memory-র সক্রিয় ভুলগুলো নিয়ে কাজ করে। বর্তমানে প্রস্তুত রয়েছে:',
        activePatternsCount: 'টি সক্রিয় ডায়াগনস্টিক ধরন ট্রান্সফার পরীক্ষার জন্য প্রস্তুত।',
        goToDiagnostic: 'ডায়াগনস্টিক মূল্যায়নে যান',
        goToSettings: 'শেখার লক্ষ্য পরিবর্তন করুন',
      },
      settings: {
        title: 'সেটিংস ও পছন্দসমূহ',
        subtitle: 'আপনার দ্বিভাষিক ইন্টারফেস, ব্যাখ্যার ভাষা, লক্ষ্য এবং অ্যাকাউন্ট পরিচালনা করুন।',
        accountSection: 'অ্যাকাউন্টের তথ্য',
        nameLabel: 'প্রদর্শিত নাম',
        emailLabel: 'ইমেইল ঠিকানা',
        planLabel: 'সক্রিয় প্ল্যান ট্র্যাক',
        storageLabel: 'স্টোরেজ অ্যাডাপ্টার',
        preferencesSection: 'ভাষা ও শেখার পছন্দসমূহ',
        uiLangLabel: 'ইন্টারফেস ভাষা',
        expLangLabel: 'ব্যাখ্যার ভাষা',
        levelLabel: 'নিজস্ব মূল্যায়ন স্তর',
        goalLabel: 'প্রধান লক্ষ্য',
        dailyTimeLabel: 'দৈনিক সময় লক্ষ্য',
        saveBtn: 'পছন্দ সংরক্ষণ করুন',
        savedNotice: 'আপনার পছন্দসমূহ সফলভাবে সংরক্ষিত হয়েছে।',
        actionsSection: 'ডায়াগনস্টিক ও সেশন পরিচালনা',
        retakeDiagBtn: '৫-প্রশ্নের ডায়াগনস্টিক আবার দিন',
        logoutBtn: 'সাইন আউট করুন',
        deleteDataBtn: 'স্থানীয় অ্যাকাউন্ট মুছে রিসেট করুন',
        deleteConfirmPrompt:
          'আপনি কি নিশ্চিত? এতে আপনার প্রোফাইল, ডায়াগনস্টিক ফলাফল এবং সেশন স্থায়ীভাবে মুছে যাবে।',
        confirmDeleteBtn: 'হ্যাঁ, অ্যাকাউন্ট মুছুন',
        cancelBtn: 'বাতিল করুন',
      },
    },
  },
} as const;

export type TranslationTree = (typeof translations)[UILanguage];

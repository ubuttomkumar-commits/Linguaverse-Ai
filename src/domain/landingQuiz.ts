export type QuizComfortLevel = 'freeze_basic' | 'understand_hesitate' | 'speak_with_errors';
export type QuizPrimaryGoal = 'job_interview' | 'office_meetings' | 'daily_confidence';

export interface StartingLevelRecommendation {
  cefrBand: string;
  trackTitleEn: string;
  trackTitleBn: string;
  startingPressureEn: string;
  startingPressureBn: string;
  firstFocusEn: string;
  firstFocusBn: string;
  summaryEn: string;
  summaryBn: string;
  ctaPath: string;
}

export function recommendStartingPath(
  comfort: QuizComfortLevel,
  goal: QuizPrimaryGoal
): StartingLevelRecommendation {
  if (comfort === 'freeze_basic') {
    return {
      cefrBand: 'Pre-A1 → A1 Foundation',
      trackTitleEn:
        goal === 'job_interview'
          ? 'Calm Interview Sentence Builder'
          : goal === 'office_meetings'
            ? 'Core Workplace Survival Speaking'
            : 'Zero-Fear Daily Speaking Foundation',
      trackTitleBn:
        goal === 'job_interview'
          ? 'আত্মবিশ্বাসী ইন্টারভিউ বাক্য গঠন'
          : goal === 'office_meetings'
            ? 'অফিসের জরুরি ইংরেজি ভিত্তি'
            : 'ভয়হীন দৈনন্দিন কথা বলার ভিত্তি',
      startingPressureEn: 'Level 1 · Controlled Practice (0.75x audio + Bangla templates)',
      startingPressureBn: 'লেভেল ১ · নিয়ন্ত্রিত অনুশীলন (০.৭৫x অডিও + বাংলা টেমপ্লেট)',
      firstFocusEn: 'Break Bangla word-order translation and build smooth 1-sentence replies.',
      firstFocusBn: 'বাংলা থেকে শব্দে-শব্দে অনুবাদ বাদ দিয়ে সহজে ছোট ইংরেজি বাক্য বলা শুরু করা।',
      summaryEn:
        'Start with untimed guided templates, 0.75x slow audio, and full Bangla explanations so you never feel put on the spot.',
      summaryBn:
        'কোনো টাইমার ছাড়াই বাংলা টেমপ্লেট, ০.৭৫x ধীর অডিও এবং স্পষ্ট বাংলা ব্যাখ্যা দিয়ে শুরু করুন—যাতে কখনো আটকে না যান।',
      ctaPath: `/register?track=foundation&goal=${goal}`,
    };
  }

  if (comfort === 'understand_hesitate') {
    return {
      cefrBand: 'A2 → B1 Bridge',
      trackTitleEn:
        goal === 'job_interview'
          ? 'Structured Interview Fluency Track'
          : goal === 'office_meetings'
            ? 'Clear Standup & Client Update Track'
            : 'Spontaneous Conversation Track',
      trackTitleBn:
        goal === 'job_interview'
          ? 'গুছিয়ে ইন্টারভিউ দেওয়ার ট্র্যাক'
          : goal === 'office_meetings'
            ? 'অফিস মিটিং ও আপডেট দেওয়ার ট্র্যাক'
            : 'স্বতঃস্ফূর্ত কথোপকথন ট্র্যাক',
      startingPressureEn: 'Level 2 → 3 · Guided Cues to Unassisted Turns',
      startingPressureBn: 'লেভেল ২ → ৩ · বুলেট গাইড থেকে নিজে কথা বলা',
      firstFocusEn: 'Eliminate mid-sentence freezing and fix recurring past-tense & preposition habits.',
      firstFocusBn: 'কথার মাঝখানে আটকে যাওয়া দূর করা এবং Tense ও Preposition-এর স্থায়ী ভুল ঠিক করা।',
      summaryEn:
        'Your listening is already ahead of your speaking. We pair Mistake Memory drills with bullet-cue voice rounds to unlock smooth retrieval.',
      summaryBn:
        'আপনি শুনলে বুঝতে পারেন কিন্তু বলার সময় থেমে যান। Mistake Memory ও বুলেট-গাইডেড ভয়েস প্র্যাকটিসের মাধ্যমে দ্রুত জড়তা কাটবে।',
      ctaPath: `/register?track=bridge&goal=${goal}`,
    };
  }

  return {
    cefrBand: 'B1 → B2+ Polish',
    trackTitleEn:
      goal === 'job_interview'
        ? 'High-Stakes Interview & Follow-Up Mastery'
        : goal === 'office_meetings'
          ? 'Executive Clarity & Persuasive Meetings'
          : 'Natural Idiomatic Fluency Track',
    trackTitleBn:
      goal === 'job_interview'
        ? 'হাই-স্টেকস ইন্টারভিউ ও ফলো-আপ মাস্টারি'
        : goal === 'office_meetings'
          ? 'পেশাদার মিটিং ও স্পষ্ট উপস্থাপনা'
          : 'স্বাভাবিক ও সাবলীল ইংরেজি ট্র্যাক',
    startingPressureEn: 'Level 4 → 5 · Unexpected Twists & Timed Transfer Lab',
    startingPressureBn: 'লেভেল ৪ → ৫ · অপ্রত্যাশিত প্রশ্ন ও টাইমড Transfer Lab',
    firstFocusEn: 'Replace stiff literal phrasing with crisp professional English under time pressure.',
    firstFocusBn: 'আড়ষ্ট বাক্য বদলে সময়ের চাপের মধ্যেও স্বাভাবিক ও পেশাদার ইংরেজি বলা।',
    summaryEn:
      'Skip basic grammar lectures. Go straight to Transfer Lab twist challenges and Communication Replay to sharpen tone and precision.',
    summaryBn:
      'সাধারণ গ্রামার ক্লাস বাদ দিয়ে সরাসরি Transfer Lab-এর অপ্রত্যাশিত প্রশ্ন ও Communication Replay দিয়ে আপনার বলার মান নিখুঁত করুন।',
    ctaPath: `/register?track=polish&goal=${goal}`,
  };
}

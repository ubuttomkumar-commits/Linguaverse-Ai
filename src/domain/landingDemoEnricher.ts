import type { SampleMistakeAnalysis } from './sampleAnalyzer';

export interface EnrichedDemoGuidance {
  naturalAlternatives: readonly string[];
  contextLabelEn: string;
  contextLabelBn: string;
  contextUsageEn: string;
  contextUsageBn: string;
}

/**
 * Provides deterministic, context-aware natural alternatives and usage framing
 * for interactive landing page sentence analysis without fabricating AI claims.
 */
export function buildEnrichedDemoGuidance(
  analysis: SampleMistakeAnalysis
): EnrichedDemoGuidance {
  const originalLower = analysis.originalSentence.toLowerCase();

  if (/\b(am|is|are)\s+(not\s+)?agree\b/.test(originalLower)) {
    return {
      naturalAlternatives: [
        'I completely agree with your point.',
        'That makes a lot of sense to me.',
        'I share the same view on this.',
      ],
      contextLabelEn: 'Workplace & Team Discussions',
      contextLabelBn: 'কর্মক্ষেত্র ও টিম আলোচনা',
      contextUsageEn:
        'Use "I agree with you" in meetings, interviews, or daily conversations when aligning with someone’s idea—never insert "am" before "agree".',
      contextUsageBn:
        'মিটিং, ইন্টারভিউ বা দৈনন্দিন আলোচনায় কারও মতের সাথে একমত হতে সরাসরি "I agree with you" বলুন—কখনোই "agree"-এর আগে "am" বসাবেন না।',
    };
  }

  if (/\byesterday\b|\blast\s+(night|week|month|year)\b/.test(originalLower) && /\bgo\b/.test(originalLower)) {
    return {
      naturalAlternatives: [
        'Yesterday, I went to university for my afternoon lecture.',
        'I headed to campus yesterday morning.',
        'I attended my university classes yesterday.',
      ],
      contextLabelEn: 'Everyday & Academic Storytelling',
      contextLabelBn: 'দৈনন্দিন ও বিশ্ববিদ্যালয়ের কথোপকথন',
      contextUsageEn:
        'Pair past time markers ("yesterday", "last week") with the Past Simple form ("went") so listeners immediately know the event is finished.',
      contextUsageBn:
        '"yesterday" বা "last week"-এর মতো অতীত সময়ের সাথে সবসময় Past Simple ("went") ব্যবহার করলে শ্রোতা স্পষ্টভাবে সময়টি বুঝতে পারেন।',
    };
  }

  if (/\b(am|is|are)\s+\w+ing\b/.test(originalLower) && /\b(since|for)\b/.test(originalLower)) {
    return {
      naturalAlternatives: [
        'I have been working here for two years.',
        'I have worked with this team since 2024.',
        'I have been part of this department for two years now.',
      ],
      contextLabelEn: 'Job Interviews & Professional Introductions',
      contextLabelBn: 'চাকরির ইন্টারভিউ ও পেশাদার পরিচয়',
      contextUsageEn:
        'Use Present Perfect Continuous ("have been working") for ongoing experience that began in the past, and pair "for" with durations (2 years) vs. "since" with starting points (2024).',
      contextUsageBn:
        'অতীতে শুরু হয়ে এখনও চলছে এমন অভিজ্ঞতার জন্য "have been working" ব্যবহার করুন; সময়কালের আগে "for" এবং নির্দিষ্ট শুরুর সময়ের আগে "since" বসান।',
    };
  }

  if (/\bdiscuss(ed|ing)?\s+about\b/.test(originalLower)) {
    return {
      naturalAlternatives: [
        'We discussed the new project timeline.',
        'We talked about the new project during our standup.',
        'Let us review the project scope together.',
      ],
      contextLabelEn: 'Meetings & Client Updates',
      contextLabelBn: 'মিটিং ও ক্লায়েন্ট আপডেট',
      contextUsageEn:
        '"Discuss" already means "talk about", so connect it directly to its topic ("discussed the project") for crisp, professional English.',
      contextUsageBn:
        '"Discuss" শব্দের মধ্যেই "বিষয়ে আলোচনা" নিহিত থাকে, তাই সরাসরি "discussed the project" বললে বাক্যটি প্রাঞ্জল ও পেশাদার শোনায়।',
    };
  }

  if (!analysis.hasDetectedMistake) {
    return {
      naturalAlternatives: [
        analysis.correctedSentence,
        'Try adding a brief reason or example to make your response richer in conversation.',
      ],
      contextLabelEn: 'Everyday & Professional Conversation',
      contextLabelBn: 'দৈনন্দিন ও পেশাদার যোগাযোগ',
      contextUsageEn:
        'Your structure looks clear in this quick check. Inside Speaking Studio, you can expand this thought across multi-turn follow-up questions.',
      contextUsageBn:
        'এই প্রাথমিক যাচাইয়ে আপনার বাক্যটি স্পষ্ট দেখাচ্ছে। স্পিকিং স্টুডিওতে আপনি ফলো-আপ প্রশ্নের মাধ্যমে উত্তরটি আরও বিস্তারিতভাবে অনুশীলন করতে পারবেন।',
    };
  }

  return {
    naturalAlternatives: [
      analysis.correctedSentence,
      `Focus pattern: ${analysis.patternNameEn}`,
    ],
    contextLabelEn: 'Real-World Conversation Practice',
    contextLabelBn: 'বাস্তব কথোপকথন অনুশীলন',
    contextUsageEn:
      'Once you notice why this pattern occurs, practice reusing the corrected phrasing in a new sentence so it sticks during live conversations.',
    contextUsageBn:
      'ভুলটি কেন হচ্ছে তা বোঝার পর নতুন একটি বাক্যে সঠিক কাঠামোটি ব্যবহার করুন—তাহলে বাস্তব কথা বলার সময় তা স্বাভাবিকভাবে মনে আসবে।',
  };
}

export function validateLandingDemoSentence(input: string): {
  valid: boolean;
  errorEn?: string;
  errorBn?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      valid: false,
      errorEn: 'Please enter an English sentence to analyze.',
      errorBn: 'অনুগ্রহ করে যাচাই করার জন্য একটি ইংরেজি বাক্য লিখুন।',
    };
  }
  if (trimmed.length < 4) {
    return {
      valid: false,
      errorEn: 'Please write at least a short phrase (4+ characters) for meaningful feedback.',
      errorBn: 'কার্যকর ফিডব্যাক পেতে অন্তত একটি ছোট বাক্যাংশ (৪+ অক্ষর) লিখুন।',
    };
  }
  if (trimmed.length > 260) {
    return {
      valid: false,
      errorEn: 'Please keep sample sentences under 260 characters.',
      errorBn: 'নমুনা বাক্যটি ২৬০ অক্ষরের মধ্যে রাখুন।',
    };
  }
  return { valid: true };
}

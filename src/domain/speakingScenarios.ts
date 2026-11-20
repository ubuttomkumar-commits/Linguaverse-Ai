import type {
  PressureLadderLevelId,
  SpeakingModeId,
  SpeakingPressureLevel,
} from '../types/domain';
import {
  normalizePressureLevel,
  PRESSURE_LADDER_TIERS,
} from './pressureLadder.ts';

export interface SpeakingScenario {
  id: SpeakingModeId;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  aiPersonaEn: string;
  aiPersonaBn: string;
  openingPromptEn: string;
  openingPromptBnHint: string;
  guidedHintsEn: string[];
  guidedHintsBn: string[];
  cefrFit: string;
}

export interface PressureLevelConfig {
  id: PressureLadderLevelId;
  levelNumber: 1 | 2 | 3 | 4 | 5;
  shortLabelEn: string;
  shortLabelBn: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  showTemplates: boolean;
  showHints: boolean;
  introducesTwist: boolean;
  timeLimitSeconds: number | null;
}

export const SPEAKING_PRESSURE_LEVELS: PressureLevelConfig[] = PRESSURE_LADDER_TIERS.map(
  (tier) => ({
    id: tier.id,
    levelNumber: tier.levelNumber,
    shortLabelEn: tier.shortLabelEn,
    shortLabelBn: tier.shortLabelBn,
    titleEn: `${tier.shortLabelEn}: ${tier.titleEn}`,
    titleBn: `${tier.shortLabelBn}: ${tier.titleBn}`,
    descEn: tier.descEn,
    descBn: tier.descBn,
    showTemplates: tier.showTemplates,
    showHints: tier.showBulletCues,
    introducesTwist: tier.introducesTwist,
    timeLimitSeconds: tier.speakingTimeLimitSeconds,
  })
);

export const SPEAKING_SCENARIOS: SpeakingScenario[] = [
  {
    id: 'daily_conversations',
    titleEn: 'Daily Conversations',
    titleBn: 'দৈনন্দিন কথোপকথন',
    subtitleEn: 'Natural small talk about your day, weekend plans, and neighborhood routines.',
    subtitleBn: 'সারাদিনের কাজ, ছুটির দিনের পরিকল্পনা ও দৈনন্দিন জীবনের স্বাভাবিক আলাপচারিতা।',
    aiPersonaEn: 'Friendly colleague meeting you for coffee in Dhaka',
    aiPersonaBn: 'কফির আড্ডায় আপনার একজন বন্ধুসুলভ সহকর্মী',
    openingPromptEn:
      'Hey! Good to see you today. How did your week go, and did you get any time to relax over the weekend?',
    openingPromptBnHint:
      'হ্যালো! আপনার সপ্তাহটি কেমন গেল, আর ছুটির দিনে একটু বিশ্রাম নেওয়ার সময় পেলেন কি?',
    guidedHintsEn: [
      'My week was quite busy because...',
      'Last weekend, I went to... / stayed home and...',
      'What about you? How was your weekend?',
    ],
    guidedHintsBn: [
      'অতীতের ঘটনার জন্য Past Simple ব্যবহার করুন ("I went...", "It was...")।',
      '২–৩টি বাক্যে উত্তর দিয়ে শেষে পাল্টা প্রশ্ন জুড়ে দিন।',
    ],
    cefrFit: 'A1 – B1',
  },
  {
    id: 'self_introduction',
    titleEn: 'Self-Introduction',
    titleBn: 'নিজের পরিচয় দেওয়া',
    subtitleEn: 'Introduce your background, work or studies, and goals clearly without memorizing scripts.',
    subtitleBn: 'মুখস্থ না করে নিজের পড়াশোনা, কাজ এবং লক্ষ্য স্পষ্ট ও স্বাভাবিক ইংরেজিতে উপস্থাপন করুন।',
    aiPersonaEn: 'Host at a professional networking seminar',
    aiPersonaBn: 'একটি পেশাদার নেটওয়ার্কিং সেমিনারের আয়োজক',
    openingPromptEn:
      'Welcome to the event! I do not think we have met before — could you tell me a little bit about yourself and what you are currently working on?',
    openingPromptBnHint:
      'অনুষ্ঠানে স্বাগতম! আপনার সম্পর্কে এবং আপনি বর্তমানে কী নিয়ে কাজ করছেন তা একটু বলবেন কি?',
    guidedHintsEn: [
      'Hi, I am [Name], and I have been working/studying in... for...',
      'Right now, my main focus is...',
      'I joined this event because I want to...',
    ],
    guidedHintsBn: [
      'চলমান সময়কাল বোঝাতে "I have been working / studying... since / for..." ব্যবহার করুন।',
      '"Myself [Name]" না বলে "I am [Name]" বলুন।',
    ],
    cefrFit: 'A1 – B2',
  },
  {
    id: 'job_interviews',
    titleEn: 'Job Interviews',
    titleBn: 'চাকরির ইন্টারভিউ',
    subtitleEn: 'Practice behavioral answers, achievements, and follow-up probing questions with crisp collocations.',
    subtitleBn: 'নিজের অভিজ্ঞতা, সাফল্য এবং ইন্টারভিউয়ারের পাল্টা প্রশ্নের আত্মবিশ্বাসী উত্তর অনুশীলন করুন।',
    aiPersonaEn: 'Hiring Manager conducting a first-round interview',
    aiPersonaBn: 'প্রথম ধাপের ইন্টারভিউ নিচ্ছেন একজন হায়ারিং ম্যানেজার',
    openingPromptEn:
      'Thanks for joining today. To get started, tell me about a challenging project or responsibility you handled recently and how you approached it.',
    openingPromptBnHint:
      'আজ যোগ দেওয়ার জন্য ধন্যবাদ। সম্প্রতি আপনি সামলেছেন এমন একটি চ্যালেঞ্জিং কাজ এবং আপনার সমাধানের পদ্ধতি সম্পর্কে বলুন।',
    guidedHintsEn: [
      'Recently, I was responsible for...',
      'The main challenge was that..., so I decided to...',
      'As a result, we managed to...',
    ],
    guidedHintsBn: [
      'STAR কাঠামো (Situation → Action → Result) মেনে Past Tense-এ বলুন।',
      '"discuss about" নয়, শুধু "discuss" ব্যবহার করুন।',
    ],
    cefrFit: 'A2 – C1',
  },
  {
    id: 'workplace_communication',
    titleEn: 'Workplace Communication',
    titleBn: 'কর্মক্ষেত্রের যোগাযোগ',
    subtitleEn: 'Give concise standup updates, raise blockers politely, and align with teammates or clients.',
    subtitleBn: 'টিম মিটিং, স্ট্যান্ডআপ আপডেট, ডেডলাইন ও ক্লায়েন্টের সাথে পেশাদারভাবে কথা বলার অনুশীলন।',
    aiPersonaEn: 'Project Lead checking in before a client deadline',
    aiPersonaBn: 'ক্লায়েন্ট ডেডলাইনের আগে প্রজেক্ট লিডের সাথে আপডেট মিটিং',
    openingPromptEn:
      'Hi, thanks for jumping on a quick call. Where do we stand on the deliverable for Thursday, and is there anything blocking your progress?',
    openingPromptBnHint:
      'বৃহস্পতিবারের ডেলিভারেবলের অগ্রগতি কতদূর, আর কোনো প্রতিবন্ধকতা আছে কি না জানান।',
    guidedHintsEn: [
      'So far, I have completed..., and I am currently working on...',
      'One minor blocker is..., so I need...',
      'I expect to share the final draft by...',
    ],
    guidedHintsBn: [
      'ইতিমধ্যে শেষ হয়েছে এমন কাজের জন্য Present Perfect ("I have completed...") ব্যবহার করুন।',
      'স্পষ্টভাবে সময়সীমা বা সহায়তার প্রয়োজন উল্লেখ করুন।',
    ],
    cefrFit: 'B1 – B2',
  },
  {
    id: 'travel',
    titleEn: 'Travel & Airport',
    titleBn: 'ভ্রমণ ও এয়ারপোর্ট',
    subtitleEn: 'Handle immigration questions, hotel check-ins, flight changes, and asking for directions abroad.',
    subtitleBn: 'বিদেশ ভ্রমণে ইমিগ্রেশন, হোটেল চেক-ইন, ফ্লাইট পরিবর্তন ও দিকনির্দেশনা চাওয়ার অনুশীলন।',
    aiPersonaEn: 'Hotel Front Desk Agent during evening check-in',
    aiPersonaBn: 'সন্ধ্যায় হোটেলের ফ্রন্ট ডেস্ক কর্মকর্তা',
    openingPromptEn:
      'Good evening and welcome to Grand Harbor Hotel! Do you have a reservation with us tonight, and is there anything special you need for your stay?',
    openingPromptBnHint:
      'শুভ সন্ধ্যা! আপনার কি আজ রাতের জন্য বুকিং আছে, এবং থাকার জন্য বিশেষ কোনো অনুরোধ আছে কি?',
    guidedHintsEn: [
      'Good evening, I have a reservation under the name...',
      'I will be staying for... nights.',
      'Could you let me know what time breakfast starts / if early check-out is possible?',
    ],
    guidedHintsBn: [
      'ভদ্র অনুরোধের জন্য "Could you please..." বা "Would it be possible to..." ব্যবহার করুন।',
    ],
    cefrFit: 'A1 – B1',
  },
  {
    id: 'customer_service',
    titleEn: 'Customer Service',
    titleBn: 'কাস্টমার সার্ভিস ও সমাধান',
    subtitleEn: 'Explain a billing error, delayed delivery, or product return calmly and assertively.',
    subtitleBn: 'বিলিং সমস্যা, ডেলিভারি বিলম্ব বা পণ্য ফেরত দেওয়ার বিষয়টি ভদ্র ও স্পষ্টভাবে ব্যাখ্যা করুন।',
    aiPersonaEn: 'Support Specialist handling an order inquiry',
    aiPersonaBn: 'অর্ডার সমস্যা সমাধানকারী একজন কাস্টমার সাপোর্ট প্রতিনিধি',
    openingPromptEn:
      'Hello, thank you for reaching out to Customer Support. Could you explain the issue with your recent order and how you would like us to resolve it?',
    openingPromptBnHint:
      'কাস্টমার সাপোর্টে যোগাযোগের জন্য ধন্যবাদ। আপনার সাম্প্রতিক অর্ডারের সমস্যা এবং প্রত্যাশিত সমাধানটি বলুন।',
    guidedHintsEn: [
      'I placed an order three days ago, but...',
      'I was charged twice / received the wrong item.',
      'I would appreciate a refund or a replacement by...',
    ],
    guidedHintsBn: [
      'কখন অর্ডার করেছিলেন তা Past Simple-এ বলুন ("I ordered...", "It arrived...")।',
      '"return back" না বলে শুধু "return" ব্যবহার করুন।',
    ],
    cefrFit: 'A2 – B2',
  },
  {
    id: 'unexpected_questions',
    titleEn: 'Unexpected Questions',
    titleBn: 'অপ্রত্যাশিত ও তাৎক্ষণিক প্রশ্ন',
    subtitleEn: 'Think on your feet when surprised with spontaneous opinions, hypotheticals, or curveball prompts.',
    subtitleBn: 'পূর্বপ্রস্তুতি ছাড়া হঠাৎ করা প্রশ্ন বা মতামত জানতে চাওয়া হলে গুছিয়ে উত্তর দেওয়ার অনুশীলন।',
    aiPersonaEn: 'Panel Moderator throwing an impromptu curveball question',
    aiPersonaBn: 'একজন সঞ্চালক যিনি তাৎক্ষণিক অপ্রত্যাশিত প্রশ্ন করছেন',
    openingPromptEn:
      'Here is a spontaneous one for you: If you could redesign one everyday habit or system in your city starting tomorrow, what would you change first and why?',
    openingPromptBnHint:
      'একটি তাৎক্ষণিক প্রশ্ন: আগামীকাল থেকেই আপনার শহরের একটি দৈনন্দিন ব্যবস্থা বদলাতে পারলে কোনটি আগে বদলাতেন এবং কেন?',
    guidedHintsEn: [
      'That is an interesting question — the first thing I would change is...',
      'The main reason is that it affects...',
      'For example, if we..., people could save...',
    ],
    guidedHintsBn: [
      'কাল্পনিক পরিস্থিতির জন্য "If I could..., I would..." ব্যবহার করুন।',
      'সময় নিতে "That is a great question..." দিয়ে শুরু করতে পারেন।',
    ],
    cefrFit: 'B1 – C1',
  },
];

export function getSpeakingScenario(id: SpeakingModeId): SpeakingScenario {
  return SPEAKING_SCENARIOS.find((s) => s.id === id) ?? SPEAKING_SCENARIOS[0];
}

export function getPressureLevelConfig(id: SpeakingPressureLevel): PressureLevelConfig {
  const normalized = normalizePressureLevel(id);
  return SPEAKING_PRESSURE_LEVELS.find((p) => p.id === normalized) ?? SPEAKING_PRESSURE_LEVELS[1];
}

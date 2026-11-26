import type {
  PressureLadderLevelId,
  SpeakingModeId,
  SpeakingPressureLevel,
  SpeakingScenarioCategory,
} from '../types/domain';
import {
  normalizePressureLevel,
  PRESSURE_LADDER_TIERS,
} from './pressureLadder.ts';

export type SpeakingDifficultyBand = 'beginner' | 'intermediate' | 'advanced';

export interface SpeakingScenario {
  id: SpeakingModeId;
  category: SpeakingScenarioCategory;
  difficultyBand: SpeakingDifficultyBand;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  learningObjectiveEn: string;
  learningObjectiveBn: string;
  contextEn: string;
  contextBn: string;
  communicationGoalEn: string;
  communicationGoalBn: string;
  suggestedVocabulary: string[];
  aiPersonaEn: string;
  aiPersonaBn: string;
  openingPromptEn: string;
  openingPromptBnHint: string;
  guidedHintsEn: string[];
  guidedHintsBn: string[];
  cefrFit: string;
  estimatedMinutes: number;
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
    category: 'everyday',
    difficultyBand: 'beginner',
    titleEn: 'Daily Conversations',
    titleBn: 'দৈনন্দিন কথোপকথন',
    subtitleEn: 'Natural small talk about your day, weekend plans, and neighborhood routines.',
    subtitleBn: 'সারাদিনের কাজ, ছুটির দিনের পরিকল্পনা ও দৈনন্দিন জীবনের স্বাভাবিক আলাপচারিতা।',
    learningObjectiveEn: 'Use natural Past Simple and Present Continuous verbs to share daily stories and keep casual conversations flowing.',
    learningObjectiveBn: 'দৈনন্দিন অভিজ্ঞতা বলতে স্বাভাবিক Past Simple ও Present Continuous ব্যবহার করে কথোপকথন এগিয়ে নেওয়া।',
    contextEn: 'You meet a friendly colleague for coffee after a busy workweek and exchange weekend stories.',
    contextBn: 'ব্যস্ত সপ্তাহ শেষে কফির আড্ডায় একজন বন্ধুসুলভ সহকর্মীর সাথে ছুটির দিনের গল্প করছেন।',
    communicationGoalEn: 'Answer warmly in 2–3 natural sentences and return a follow-up question.',
    communicationGoalBn: '২–৩টি স্বাভাবিক বাক্যে উত্তর দিয়ে বন্ধুসুলভ একটি পাল্টা প্রশ্ন করা।',
    suggestedVocabulary: ['catch up', 'quite hectic', 'ran errands', 'unwind', 'how about you'],
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
    estimatedMinutes: 5,
  },
  {
    id: 'self_introduction',
    category: 'everyday',
    difficultyBand: 'beginner',
    titleEn: 'Self-Introduction',
    titleBn: 'নিজের পরিচয় দেওয়া',
    subtitleEn: 'Introduce your background, work or studies, and goals clearly without memorizing scripts.',
    subtitleBn: 'মুখস্থ না করে নিজের পড়াশোনা, কাজ এবং লক্ষ্য স্পষ্ট ও স্বাভাবিক ইংরেজিতে উপস্থাপন করুন।',
    learningObjectiveEn: 'Introduce yourself smoothly using Present Perfect Continuous and natural personal background framing.',
    learningObjectiveBn: 'স্বাভাবিক বাক্যগঠনে নিজের পরিচয়, অভিজ্ঞতা ও লক্ষ্য স্পষ্টভাবে উপস্থাপন করা।',
    contextEn: 'You are attending a networking seminar and someone welcomes you and asks about your background.',
    contextBn: 'একটি পেশাদার নেটওয়ার্কিং সেমিনারে আয়োজক আপনার পরিচয় এবং বর্তমান কাজ সম্পর্কে জানতে চাইছেন।',
    communicationGoalEn: 'Share your name, current role or studies, and one clear goal concisely.',
    communicationGoalBn: 'নিজের নাম, বর্তমান কাজ বা পড়াশোনা এবং একটি স্পষ্ট লক্ষ্য সংক্ষেপে বলা।',
    suggestedVocabulary: ['currently focused on', 'background in', 'have been working on', 'looking forward to', 'specialize in'],
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
    estimatedMinutes: 5,
  },
  {
    id: 'job_interviews',
    category: 'professional',
    difficultyBand: 'intermediate',
    titleEn: 'Job Interviews',
    titleBn: 'চাকরির ইন্টারভিউ',
    subtitleEn: 'Practice behavioral answers, achievements, and follow-up probing questions with crisp collocations.',
    subtitleBn: 'নিজের অভিজ্ঞতা, সাফল্য এবং ইন্টারভিউয়ারের পাল্টা প্রশ্নের আত্মবিশ্বাসী উত্তর অনুশীলন করুন।',
    learningObjectiveEn: 'Structure clear STAR behavioral answers using accurate Past Tense and confident action verbs.',
    learningObjectiveBn: 'STAR কাঠামো মেনে Past Tense ও পেশাদার ক্রিয়াপদে ইন্টারভিউয়ের উত্তর গুছিয়ে বলা।',
    contextEn: 'You are in a first-round video interview with a Hiring Manager evaluating your problem-solving track record.',
    contextBn: 'প্রথম ধাপের অনলাইন চাকরির ইন্টারভিউয়ে একজন হায়ারিং ম্যানেজার আপনার কাজের অভিজ্ঞতা যাচাই করছেন।',
    communicationGoalEn: 'Describe a real challenge, your concrete actions, and the measurable result clearly.',
    communicationGoalBn: 'একটি বাস্তব চ্যালেঞ্জ, আপনার পদক্ষেপ এবং ফলাফল স্পষ্টভাবে তুলে ধরা।',
    suggestedVocabulary: ['responsible for', 'took ownership of', 'resolved the bottleneck', 'as a result', 'collaborated with'],
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
    estimatedMinutes: 8,
  },
  {
    id: 'workplace_communication',
    category: 'professional',
    difficultyBand: 'intermediate',
    titleEn: 'Workplace Meetings & Standups',
    titleBn: 'কর্মক্ষেত্রের মিটিং ও আপডেট',
    subtitleEn: 'Give concise standup updates, raise blockers politely, and align with teammates or clients.',
    subtitleBn: 'টিম মিটিং, স্ট্যান্ডআপ আপডেট, ডেডলাইন ও ক্লায়েন্টের সাথে পেশাদারভাবে কথা বলার অনুশীলন।',
    learningObjectiveEn: 'Communicate project progress, blockers, and next steps politely using Present Perfect and clear timelines.',
    learningObjectiveBn: 'Present Perfect ও স্পষ্ট সময়সীমা ব্যবহার করে কাজের অগ্রগতি ও প্রতিবন্ধকতা পেশাদারভাবে জানানো।',
    contextEn: 'Your Project Lead hops on a quick check-in call ahead of a Thursday client milestone.',
    contextBn: 'বৃহস্পতিবারের ক্লায়েন্ট ডেডলাইনের আগে প্রজেক্ট লিড আপনার সাথে দ্রুত স্ট্যাটাস মিটিং করছেন।',
    communicationGoalEn: 'Summarize completed work, flag any blocker constructively, and commit to a clear ETA.',
    communicationGoalBn: 'সম্পন্ন কাজ, বর্তমান বাধা এবং পরবর্তী ডেডলাইন স্পষ্টভাবে তুলে ধরা।',
    suggestedVocabulary: ['on track for', 'minor blocker', 'aligned with', 'wrap up by', 'need sign-off on'],
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
    estimatedMinutes: 7,
  },
  {
    id: 'presentation_pitch',
    category: 'professional',
    difficultyBand: 'advanced',
    titleEn: 'Client Presentation & Pitch',
    titleBn: 'প্রেজেন্টেশন ও ক্লায়েন্ট পিচ',
    subtitleEn: 'Open a presentation with authority, signpost key points, and handle live stakeholder Q&A.',
    subtitleBn: 'আত্মবিশ্বাসের সাথে প্রেজেন্টেশন শুরু করা, মূল পয়েন্ট সাজানো এবং ক্লায়েন্টের প্রশ্নের উত্তর দেওয়া।',
    learningObjectiveEn: 'Use structured signposting language and persuasive phrasing under stakeholder questioning.',
    learningObjectiveBn: 'পেশাদার সাইনপোস্টিং ও যুক্তিপূর্ণ বাক্যগঠনে প্রেজেন্টেশন ও প্রশ্নোত্তর পর্ব পরিচালনা করা।',
    contextEn: 'You are presenting a quarterly proposal to a client panel who expects a crisp executive summary.',
    contextBn: 'একজন ক্লায়েন্ট স্টেকহোল্ডারের সামনে আপনি একটি নতুন প্রস্তাবনার মূল সারাংশ উপস্থাপন করছেন।',
    communicationGoalEn: 'State the core problem, your proposed solution, and one expected benefit concisely.',
    communicationGoalBn: 'মূল সমস্যা, প্রস্তাবিত সমাধান এবং প্রত্যাশিত সুফল সংক্ষেপে ও স্পষ্টভাবে উপস্থাপন করা।',
    suggestedVocabulary: ['to begin with', 'key takeaway', 'addresses the core issue', 'expected impact', 'happy to clarify'],
    aiPersonaEn: 'Client Stakeholder listening to your pitch and asking follow-up questions',
    aiPersonaBn: 'আপনার প্রেজেন্টেশন শুনছেন এমন একজন ক্লায়েন্ট স্টেকহোল্ডার',
    openingPromptEn:
      'Thanks for preparing this presentation. Before we dive into the slides, could you give me a 30-second overview of your proposal and why it matters right now?',
    openingPromptBnHint:
      'স্লাইডে যাওয়ার আগে ৩০ সেকেন্ডে আপনার প্রস্তাবনার মূল বিষয় এবং এটি কেন গুরুত্বপূর্ণ তা বলুন।',
    guidedHintsEn: [
      'Today I would like to walk you through...',
      'The main problem we are solving is..., which currently slows down...',
      'Our key recommendation is to..., so that we can...',
    ],
    guidedHintsBn: [
      'প্রেজেন্টেশন শুরুর জন্য "Today I would like to..." বা "The key takeaway is..." ব্যবহার করুন।',
      'দীর্ঘ জটিল বাক্যের বদলে স্পষ্ট ২–৩টি যুক্তিপূর্ণ বাক্যে মূল বার্তা দিন।',
    ],
    cefrFit: 'B1 – C1',
    estimatedMinutes: 8,
  },
  {
    id: 'academic_discussion',
    category: 'academic',
    difficultyBand: 'intermediate',
    titleEn: 'Academic Seminar & Oral Exam',
    titleBn: 'একাডেমিক আলোচনা ও মৌখিক পরীক্ষা',
    subtitleEn: 'Defend a reasoned viewpoint, cite examples, and respond politely to seminar questions.',
    subtitleBn: 'ক্লাসরুম আলোচনা বা মৌখিক পরীক্ষায় যুক্তিসহ নিজের মতামত ও উদাহরণ উপস্থাপন করুন।',
    learningObjectiveEn: 'Express balanced academic arguments with linking phrases ("on the other hand", "for instance") and hedging.',
    learningObjectiveBn: 'সঠিক সংযোগকারী শব্দ ব্যবহার করে ভারসাম্যপূর্ণ একাডেমিক যুক্তি ও উদাহরণ উপস্থাপন করা।',
    contextEn: 'A university seminar instructor asks for your evidence-backed perspective on AI tools in modern education.',
    contextBn: 'বিশ্ববিদ্যালয়ের সেমিনারে শিক্ষক আধুনিক শিক্ষায় প্রযুক্তির ভূমিকা নিয়ে আপনার মতামত জানতে চাইছেন।',
    communicationGoalEn: 'State a clear thesis, provide one concrete example, and acknowledge a counter-consideration.',
    communicationGoalBn: 'একটি স্পষ্ট মতামত দিয়ে বাস্তব উদাহরণ ও ভারসাম্যপূর্ণ দিক উল্লেখ করা।',
    suggestedVocabulary: ['from my perspective', 'for instance', 'on the other hand', 'evidence suggests', 'it depends on'],
    aiPersonaEn: 'University Seminar Professor leading a discussion and oral check',
    aiPersonaBn: 'সেমিনার পরিচালনা করছেন একজন বিশ্ববিদ্যালয়ের অধ্যাপক',
    openingPromptEn:
      'Let us start our seminar discussion: Do you think digital tools improve independent thinking for university students, or do they create over-reliance? Please share your reasoning.',
    openingPromptBnHint:
      'আপনার মতে ডিজিটাল টুল কি শিক্ষার্থীদের স্বাধীন চিন্তাশক্তি বাড়ায়, নাকি অতিরিক্ত নির্ভরতা তৈরি করে? যুক্তিসহ বলুন।',
    guidedHintsEn: [
      'From my perspective, digital tools can be very helpful when...',
      'For instance, students can use them to...',
      'On the other hand, there is a risk of... if we do not...',
    ],
    guidedHintsBn: [
      'মতামত দিতে "In my opinion..." বা "From my perspective..." ব্যবহার করুন ("According to me" এড়িয়ে চলুন)।',
      'একটি বাস্তব উদাহরণ যোগ করলে উত্তর আরও শক্তিশালী হয়।',
    ],
    cefrFit: 'B1 – C1',
    estimatedMinutes: 7,
  },
  {
    id: 'travel',
    category: 'travel',
    difficultyBand: 'beginner',
    titleEn: 'Hotel Check-In & Stay',
    titleBn: 'হোটেল চেক-ইন ও ভ্রমণ',
    subtitleEn: 'Handle hotel check-ins, room requests, breakfast inquiries, and checkout details politely.',
    subtitleBn: 'বিদেশ ভ্রমণে হোটেল চেক-ইন, রুমের অনুরোধ ও সময়সূচি সম্পর্কে ভদ্রভাবে কথা বলার অনুশীলন।',
    learningObjectiveEn: 'Use polite modal requests ("Could you...", "Would it be possible...") smoothly in hospitality settings.',
    learningObjectiveBn: 'হোটেল ও ভ্রমণ পরিবেশে ভদ্র অনুরোধ ("Could you...", "Would it be possible...") সাবলীলভাবে বলা।',
    contextEn: 'You arrive at Grand Harbor Hotel in the evening and speak with the front desk agent.',
    contextBn: 'সন্ধ্যায় একটি হোটেলে পৌঁছে ফ্রন্ট ডেস্ক কর্মকর্তার সাথে চেক-ইন প্রক্রিয়া সম্পন্ন করছেন।',
    communicationGoalEn: 'Confirm your reservation details and ask one polite question about your stay.',
    communicationGoalBn: 'আপনার বুকিং নিশ্চিত করে থাকা বা নাস্তা সম্পর্কে একটি ভদ্র প্রশ্ন করা।',
    suggestedVocabulary: ['reservation under the name', 'staying for three nights', 'early check-out', 'complimentary breakfast', 'would it be possible'],
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
    estimatedMinutes: 5,
  },
  {
    id: 'travel_airport_assistance',
    category: 'travel',
    difficultyBand: 'beginner',
    titleEn: 'Airport & Travel Assistance',
    titleBn: 'এয়ারপোর্ট ও ভ্রমণ সহায়তা',
    subtitleEn: 'Navigate boarding gates, tight flight connections, baggage checks, and asking for directions.',
    subtitleBn: 'এয়ারপোর্টে বোর্ডিং গেট, কানেক্টিং ফ্লাইট, লাগেজ ও দিকনির্দেশনা চাওয়ার বাস্তব অনুশীলন।',
    learningObjectiveEn: 'Ask clear, concise travel questions and confirm time/gate instructions accurately under travel time pressure.',
    learningObjectiveBn: 'ভ্রমণের সময় দ্রুত ও স্পষ্টভাবে ফ্লাইট, গেট ও দিকনির্দেশনা সম্পর্কে প্রশ্ন ও তথ্য নিশ্চিত করা।',
    contextEn: 'Your first flight arrived slightly late and you ask an airline desk agent for help reaching your connecting gate.',
    contextBn: 'আপনার প্রথম ফ্লাইট কিছুটা দেরিতে পৌঁছানোয় আপনি এয়ারলাইন ডেস্ক থেকে কানেক্টিং ফ্লাইটের তথ্য জানতে চাইছেন।',
    communicationGoalEn: 'Explain your destination, ask about gate directions or rebooking, and confirm the boarding time.',
    communicationGoalBn: 'গন্তব্য জানিয়ে গেটের দিকনির্দেশনা বা বোর্ডিং সময় স্পষ্টভাবে জেনে নেওয়া।',
    suggestedVocabulary: ['connecting flight', 'boarding pass', 'delayed arrival', 'which terminal', 'checked baggage'],
    aiPersonaEn: 'Airline Transfer Desk Agent assisting international passengers',
    aiPersonaBn: 'আন্তর্জাতিক এয়ারপোর্টের ট্রান্সফার ডেস্ক কর্মকর্তা',
    openingPromptEn:
      'Hello! Welcome to the Transfer Desk. May I see your boarding pass? Which flight are you trying to catch today?',
    openingPromptBnHint:
      'হ্যালো! ট্রান্সফার ডেস্কে স্বাগতম। আজ আপনি কোন কানেক্টিং ফ্লাইটটি ধরতে চাইছেন?',
    guidedHintsEn: [
      'Hi, my previous flight was delayed, and I have a connecting flight to...',
      'Could you tell me which terminal and gate I need to go to?',
      'Will my checked luggage be transferred automatically?',
    ],
    guidedHintsBn: [
      'দিকনির্দেশনা চাইতে "Could you tell me how to get to..." বা "Which gate does..." ব্যবহার করুন।',
    ],
    cefrFit: 'A1 – B1',
    estimatedMinutes: 5,
  },
  {
    id: 'customer_service',
    category: 'everyday',
    difficultyBand: 'intermediate',
    titleEn: 'Customer Service & Resolution',
    titleBn: 'কাস্টমার সার্ভিস ও সমাধান',
    subtitleEn: 'Explain a billing error, delayed delivery, or product return calmly and assertively.',
    subtitleBn: 'বিলিং সমস্যা, ডেলিভারি বিলম্ব বা পণ্য ফেরত দেওয়ার বিষয়টি ভদ্র ও স্পষ্টভাবে ব্যাখ্যা করুন।',
    learningObjectiveEn: 'Describe an issue chronologically in Past Simple and request a concrete resolution politely without redundant prepositions.',
    learningObjectiveBn: 'ঘটনার ধারাবাহিকতা Past Simple-এ ব্যাখ্যা করে ভদ্র ও দৃঢ়ভাবে সমাধান চাওয়া।',
    contextEn: 'You received a damaged or incorrect online order and called Customer Support for a refund or replacement.',
    contextBn: 'অনলাইন অর্ডারে ভুল পণ্য পাওয়ায় আপনি কাস্টমার সাপোর্টে রিফান্ড বা পরিবর্তনের জন্য কথা বলছেন।',
    communicationGoalEn: 'State when you ordered, explain what went wrong, and request a specific resolution.',
    communicationGoalBn: 'অর্ডারের সময় ও সমস্যাটি স্পষ্টভাবে জানিয়ে নির্দিষ্ট সমাধান (রিফান্ড/রিপ্লেসমেন্ট) চাওয়া।',
    suggestedVocabulary: ['placed an order', 'wrong item', 'billing issue', 'would appreciate a refund', 'order confirmation'],
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
    estimatedMinutes: 6,
  },
  {
    id: 'unexpected_questions',
    category: 'academic',
    difficultyBand: 'advanced',
    titleEn: 'Spontaneous & Impromptu Speaking',
    titleBn: 'তাৎক্ষণিক ও অপ্রত্যাশিত প্রশ্ন',
    subtitleEn: 'Think on your feet when surprised with spontaneous opinions, hypotheticals, or curveball prompts.',
    subtitleBn: 'পূর্বপ্রস্তুতি ছাড়া হঠাৎ করা প্রশ্ন বা মতামত জানতে চাওয়া হলে গুছিয়ে উত্তর দেওয়ার অনুশীলন।',
    learningObjectiveEn: 'Use natural buying-time openers and Second Conditional ("If I could..., I would...") for fluent impromptu speech.',
    learningObjectiveBn: 'হঠাৎ প্রশ্নে স্বাভাবিক সূচনা ও Second Conditional ব্যবহার করে সাবলীলভাবে মতামত দেওয়া।',
    contextEn: 'A live panel moderator throws an unprepared hypothetical question to test your fluency and poise.',
    contextBn: 'একজন সঞ্চালক আপনার তাৎক্ষণিক চিন্তাশক্তি ও ইংরেজি সাবলীলতা যাচাই করতে অপ্রত্যাশিত প্রশ্ন করছেন।',
    communicationGoalEn: 'Open naturally, state one clear choice, and back it up with a concrete reason.',
    communicationGoalBn: 'স্বাভাবিকভাবে শুরু করে একটি স্পষ্ট পছন্দ এবং তার বাস্তব কারণ ব্যাখ্যা করা।',
    suggestedVocabulary: ['that is a great question', 'if I could change', 'the biggest reason is', 'for example', 'in the long run'],
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
    estimatedMinutes: 6,
  },
];

export const VALID_SPEAKING_MODE_IDS = new Set<SpeakingModeId>(
  SPEAKING_SCENARIOS.map((s) => s.id)
);

export function isValidSpeakingModeId(value: unknown): value is SpeakingModeId {
  return typeof value === 'string' && VALID_SPEAKING_MODE_IDS.has(value as SpeakingModeId);
}

export function getSpeakingScenario(id: SpeakingModeId): SpeakingScenario {
  return SPEAKING_SCENARIOS.find((s) => s.id === id) ?? SPEAKING_SCENARIOS[0];
}

export function getPressureLevelConfig(id: SpeakingPressureLevel): PressureLevelConfig {
  const normalized = normalizePressureLevel(id);
  return SPEAKING_PRESSURE_LEVELS.find((p) => p.id === normalized) ?? SPEAKING_PRESSURE_LEVELS[1];
}

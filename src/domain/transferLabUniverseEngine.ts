import type {
  LessonMasteryRecord,
  MistakeFilterCategory,
  MistakeMemoryItem,
  PressureLadderLevelId,
  SpeakingDetectedMistake,
  TransferAttemptRecord,
  TransferConversationTurn,
  TransferDifficultyLevel,
  TransferDimensionEvaluation,
  TransferEightDimensionKey,
  TransferInteractionMode,
  TransferObjectiveProgress,
  TransferObjectiveStatus,
  TransferRubricEvaluation,
  TransferScenarioCategory,
  TransferScenarioId,
  TransferSessionDraft,
  TransferSessionEvaluationReport,
} from '../types/domain';
import { classifyMistakeCategory, getMistakeCategoryMeta } from './mistakeMemoryEngine.ts';
import type { DnaSkillNode } from './communicationDnaLabEngine.ts';

export interface TransferCategoryMeta {
  id: TransferScenarioCategory;
  code: string;
  labelEn: string;
  labelBn: string;
  shortEn: string;
  descriptionEn: string;
  descriptionBn: string;
  accentHex: string;
}

export const TRANSFER_CATEGORIES: TransferCategoryMeta[] = [
  {
    id: 'daily_life',
    code: 'A',
    labelEn: 'Daily Life',
    labelBn: 'দৈনন্দিন জীবন',
    shortEn: 'Daily Life',
    descriptionEn: 'Everyday conversations, hospitality, shopping, and local errands.',
    descriptionBn: 'দৈনন্দিন কথোপকথন, রেস্টুরেন্ট, কেনাকাটা ও অ্যাপয়েন্টমেন্ট।',
    accentHex: '#00D9FF',
  },
  {
    id: 'travel_international',
    code: 'B',
    labelEn: 'Travel & International',
    labelBn: 'ভ্রমণ ও আন্তর্জাতিক',
    shortEn: 'Travel',
    descriptionEn: 'Airports, immigration counters, hotels, and cross-border logistics.',
    descriptionBn: 'এয়ারপোর্ট, ইমিগ্রেশন, হোটেল ও আন্তর্জাতিক ভ্রমণ যোগাযোগ।',
    accentHex: '#38BDF8',
  },
  {
    id: 'professional',
    code: 'C',
    labelEn: 'Professional Communication',
    labelBn: 'পেশাদার যোগাযোগ',
    shortEn: 'Professional',
    descriptionEn: 'Interviews, workplace meetings, presentations, negotiations, and networking.',
    descriptionBn: 'চাকরির ইন্টারভিউ, মিটিং, প্রেজেন্টেশন, নেগোসিয়েশন ও নেটওয়ার্কিং।',
    accentHex: '#873BFF',
  },
  {
    id: 'customer_communication',
    code: 'D',
    labelEn: 'Customer Communication',
    labelBn: 'কাস্টমার যোগাযোগ',
    shortEn: 'Customer',
    descriptionEn: 'Support escalation, complaints, refunds, and handling high-tension clients.',
    descriptionBn: 'কাস্টমার সাপোর্ট, অভিযোগ জানানো, রিফান্ড ও কঠিন পরিস্থিতি সামলানো।',
    accentHex: '#6366F1',
  },
  {
    id: 'education',
    code: 'E',
    labelEn: 'Education',
    labelBn: 'শিক্ষা ও একাডেমিক',
    shortEn: 'Education',
    descriptionEn: 'Classroom dialogue, asking sharp questions, academic talks, and team projects.',
    descriptionBn: 'ক্লাসরুম আলোচনা, প্রশ্ন করা, একাডেমিক প্রেজেন্টেশন ও গ্রুপ প্রজেক্ট।',
    accentHex: '#3B82F6',
  },
  {
    id: 'emergency_practical',
    code: 'F',
    labelEn: 'Emergency & Practical Situations',
    labelBn: 'জরুরি ও বাস্তব পরিস্থিতি',
    shortEn: 'Emergency',
    descriptionEn: 'Urgent help requests, medical symptoms, lost items, and critical clarity.',
    descriptionBn: 'জরুরি সাহায্য চাওয়া, চিকিৎসা সহায়তা, হারানো জিনিস ও দ্রুত সমস্যা ব্যাখ্যা।',
    accentHex: '#F59E0B',
  },
];

export interface TransferScenarioObjectiveSpec {
  id: string;
  labelEn: string;
  labelBn: string;
  criteriaEn: string;
}

export interface TransferUniverseScenario {
  id: TransferScenarioId;
  category: TransferScenarioCategory;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  difficulty: TransferDifficultyLevel;
  estimatedMinutes: number;
  environmentNameEn: string;
  environmentNameBn: string;
  aiParticipantName: string;
  aiParticipantRoleEn: string;
  aiParticipantRoleBn: string;
  learnerRoleEn: string;
  learnerRoleBn: string;
  targetSkills: string[];
  learningObjectivesEn: string[];
  learningObjectivesBn: string[];
  requiredTaskEn: string;
  requiredTaskBn: string;
  completionCriteriaEn: string;
  completionCriteriaBn: string;
  supportedModes: TransferInteractionMode[];
  openingMessageEn: string;
  openingMessageBn: string;
  objectives: TransferScenarioObjectiveSpec[];
  helpfulPhrasesEn: string[];
  targetMistakeCategories: MistakeFilterCategory[];
  linkedLessonIds: string[];
  /** Optional Phase 5 legacy alias so prior attempts map seamlessly */
  legacyAliasId?: TransferScenarioId;
  accentHex: string;
}

export const TRANSFER_EIGHT_DIMENSIONS: Array<{
  key: TransferEightDimensionKey;
  labelEn: string;
  labelBn: string;
  descriptionEn: string;
}> = [
  {
    key: 'task_completion',
    labelEn: 'Task Completion',
    labelBn: 'কাজের পূর্ণতা',
    descriptionEn: 'Whether the learner achieved the scenario objectives against explicit criteria.',
  },
  {
    key: 'communication_clarity',
    labelEn: 'Communication Clarity',
    labelBn: 'যোগাযোগের স্পষ্টতা',
    descriptionEn: 'How clearly and unambiguously the listener can understand the intended message.',
  },
  {
    key: 'grammar_application',
    labelEn: 'Grammar Application',
    labelBn: 'ব্যাকরণের প্রয়োগ',
    descriptionEn: 'Accuracy of verb tenses, articles, prepositions, and sentence structure in live use.',
  },
  {
    key: 'vocabulary_application',
    labelEn: 'Vocabulary Application',
    labelBn: 'শব্দভাণ্ডারের প্রয়োগ',
    descriptionEn: 'Precision and natural collocations suited to the real-world domain.',
  },
  {
    key: 'contextual_appropriateness',
    labelEn: 'Contextual Appropriateness',
    labelBn: 'পরিস্থিতিগত উপযোগিতা',
    descriptionEn: 'Politeness, register, and cultural tone appropriate for the interlocutor.',
  },
  {
    key: 'response_relevance',
    labelEn: 'Response Relevance',
    labelBn: 'উত্তরের প্রাসঙ্গিকতা',
    descriptionEn: 'How directly each turn addresses the partner’s actual question or situation.',
  },
  {
    key: 'conversation_coherence',
    labelEn: 'Conversation Coherence',
    labelBn: 'কথোপকথনের ধারাবাহিকতা',
    descriptionEn: 'Logical flow, transitions, and continuity across multi-turn exchanges.',
  },
  {
    key: 'problem_solving_communication',
    labelEn: 'Problem-Solving Communication',
    labelBn: 'সমস্যা সমাধানমূলক যোগাযোগ',
    descriptionEn: 'Ability to clarify misunderstandings, negotiate options, and reach a resolution.',
  },
];

interface CompactScenarioSeed {
  id: string;
  category: TransferScenarioCategory;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  difficulty: TransferDifficultyLevel;
  estimatedMinutes: number;
  environmentNameEn: string;
  environmentNameBn: string;
  aiParticipantName: string;
  aiParticipantRoleEn: string;
  aiParticipantRoleBn: string;
  learnerRoleEn: string;
  learnerRoleBn: string;
  targetSkills: string[];
  requiredTaskEn: string;
  requiredTaskBn: string;
  completionCriteriaEn: string;
  completionCriteriaBn: string;
  openingMessageEn: string;
  openingMessageBn: string;
  objectives: Array<{ id: string; labelEn: string; labelBn: string; criteriaEn: string }>;
  helpfulPhrasesEn: string[];
  targetMistakeCategories: MistakeFilterCategory[];
  linkedLessonIds: string[];
  legacyAliasId?: TransferScenarioId;
}

const CATEGORY_COLOR_MAP: Record<TransferScenarioCategory, string> = {
  daily_life: '#00D9FF',
  travel_international: '#38BDF8',
  professional: '#873BFF',
  customer_communication: '#6366F1',
  education: '#3B82F6',
  emergency_practical: '#F59E0B',
};

const COMPACT_SCENARIO_SEEDS: CompactScenarioSeed[] = [
  // ======================== A. DAILY LIFE (6) ========================
  {
    id: 'daily_introducing_yourself',
    category: 'daily_life',
    titleEn: 'Introducing Yourself',
    titleBn: 'নিজের পরিচয় দেওয়া',
    descriptionEn:
      'Introduce yourself naturally at a community meetup, sharing your background, current work or study, and a personal interest.',
    descriptionBn:
      'একটি কমিউনিটি মিটআপে স্বাভাবিকভাবে নিজের পরিচয়, কাজ বা পড়াশোনা এবং আগ্রহের বিষয় শেয়ার করুন।',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    environmentNameEn: 'Evening Community Lounge',
    environmentNameBn: 'কমিউনিটি লাউঞ্জ',
    aiParticipantName: 'Maya Chen',
    aiParticipantRoleEn: 'Community Event Host',
    aiParticipantRoleBn: 'কমিউনিটি ইভেন্ট হোস্ট',
    learnerRoleEn: 'First-Time Attendee',
    learnerRoleBn: 'নতুন অংশগ্রহণকারী',
    targetSkills: ['Self-Introduction', 'Present Simple', 'Small Talk', 'Follow-up Questions'],
    requiredTaskEn: 'Greet the host, introduce your name and background, mention what you do, and ask a friendly follow-up question.',
    requiredTaskBn: 'হোস্টকে শুভেচ্ছা জানান, নিজের নাম ও কাজ/পড়াশোনা বলুন এবং একটি বন্ধুত্বপূর্ণ পাল্টা প্রশ্ন করুন।',
    completionCriteriaEn: 'Complete at least 3 of 4 objectives with clear present-tense statements and polite reciprocity.',
    completionCriteriaBn: '৪টির মধ্যে অন্তত ৩টি লক্ষ্য স্পষ্ট Present Tense ও ভদ্র সৌজন্যসহ পূরণ করুন।',
    openingMessageEn:
      "Hi there! Welcome to tonight's community meetup. I'm Maya, one of the hosts. I don't think we've met yet — what brings you here tonight?",
    openingMessageBn:
      'হ্যালো! আজকের কমিউনিটি মিটআপে স্বাগতম। আমি মায়া। আপনার পরিচয় দিন এবং কী উদ্দেশ্যে এসেছেন তা বলুন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Greet politely & state your name', labelBn: 'ভদ্রভাবে শুভেচ্ছা ও নাম বলা', criteriaEn: 'Greets Maya warmly and clearly states their name.' },
      { id: 'obj_2', labelEn: 'Describe current work or study', labelBn: 'বর্তমান কাজ বা পড়াশোনা জানানো', criteriaEn: 'Explains what they study or do for work using accurate present tense.' },
      { id: 'obj_3', labelEn: 'Share one personal interest or goal', labelBn: 'একটি ব্যক্তিগত আগ্রহ বা লক্ষ্য বলা', criteriaEn: 'Shares a specific hobby, skill, or reason for attending.' },
      { id: 'obj_4', labelEn: 'Ask Maya a reciprocal question', labelBn: 'পাল্টা একটি ভদ্র প্রশ্ন করা', criteriaEn: 'Keeps the conversation going by asking Maya an appropriate question.' },
    ],
    helpfulPhrasesEn: [
      'Nice to meet you, Maya. My name is...',
      'I currently work as... / I am studying...',
      'I joined tonight because I want to...',
      'How long have you been hosting this group?',
    ],
    targetMistakeCategories: ['sentence_structure', 'articles'],
    linkedLessonIds: ['les_svo_order'],
  },
  {
    id: 'daily_meeting_new_people',
    category: 'daily_life',
    titleEn: 'Meeting New People',
    titleBn: 'নতুন মানুষের সাথে পরিচিত হওয়া',
    descriptionEn:
      'Build rapport with a new neighbor over coffee, finding shared interests and keeping a natural two-way conversation flowing.',
    descriptionBn:
      'কফি শপে নতুন প্রতিবেশীর সাথে সৌজন্যমূলক আলাপ জমান এবং স্বাভাবিক দুই-পক্ষীয় কথোপকথন চালিয়ে যান।',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    environmentNameEn: 'Neighborhood Coffee Roastery',
    environmentNameBn: 'স্থানীয় কফি শপ',
    aiParticipantName: 'Daniel Brooks',
    aiParticipantRoleEn: 'Friendly New Neighbor',
    aiParticipantRoleBn: 'নতুন প্রতিবেশী',
    learnerRoleEn: 'Local Resident',
    learnerRoleBn: 'স্থানীয় বাসিন্দা',
    targetSkills: ['Rapport Building', 'Question Formation', 'Active Listening'],
    requiredTaskEn: 'Welcome Daniel, recommend a local spot, respond to his questions, and wrap up politely.',
    requiredTaskBn: 'ড্যানিয়েলকে স্বাগত জানান, এলাকার একটি ভালো জায়গার পরামর্শ দিন এবং ভদ্রভাবে আলাপ শেষ করুন।',
    completionCriteriaEn: 'Maintain relevant two-way turns with accurate English question word order.',
    completionCriteriaBn: 'সঠিক প্রশ্নের শব্দক্রমসহ প্রাসঙ্গিক দুই-পক্ষীয় কথোপকথন বজায় রাখুন।',
    openingMessageEn:
      "Excuse me, is this seat taken? Thanks! I just moved into the apartment block down the street last week — I'm Daniel. Have you lived in this neighborhood long?",
    openingMessageBn:
      'ড্যানিয়েল গত সপ্তাহে আপনার এলাকায় নতুন এসেছেন। তার সাথে আলাপ শুরু করুন এবং এলাকার অভিজ্ঞতা শেয়ার করুন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Respond warmly & welcome Daniel', labelBn: 'আন্তরিকভাবে স্বাগত জানানো', criteriaEn: 'Gives a warm greeting and answers how long they have lived in the area.' },
      { id: 'obj_2', labelEn: 'Ask about his move or background', labelBn: 'তার নতুন বাসা বা পটভূমি জানতে চাওয়া', criteriaEn: 'Uses correct auxiliary verb order to ask a natural follow-up question.' },
      { id: 'obj_3', labelEn: 'Recommend a local place or tip', labelBn: 'এলাকার একটি ভালো জায়গার পরামর্শ দেওয়া', criteriaEn: 'Offers one concrete neighborhood recommendation with a reason.' },
      { id: 'obj_4', labelEn: 'Close the chat naturally', labelBn: 'স্বাভাবিকভাবে বিদায় নেওয়া', criteriaEn: 'Ends the exchange politely with a warm closing remark.' },
    ],
    helpfulPhrasesEn: [
      'Not at all, please go ahead!',
      'Welcome to the neighborhood! Where did you move from?',
      'If you need a good place for groceries or food, I recommend...',
      'It was really nice chatting with you.',
    ],
    targetMistakeCategories: ['word_order', 'verb_tense'],
    linkedLessonIds: ['les_questions_do_does', 'les_present_perfect_since'],
  },
  {
    id: 'daily_asking_directions',
    category: 'daily_life',
    titleEn: 'Asking for Directions',
    titleBn: 'রাস্তা বা দিকনির্দেশনা চাওয়া',
    descriptionEn:
      'You are in an unfamiliar city trying to reach the central railway station before your train departs. Ask clearly and confirm every step.',
    descriptionBn:
      'অপরিচিত শহরে ট্রেনের আগে সেন্ট্রাল স্টেশনে পৌঁছাতে দিকনির্দেশনা চান এবং প্রতিটি ধাপ নিশ্চিত করুন।',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    environmentNameEn: 'City Transit Plaza',
    environmentNameBn: 'সিটি ট্রানজিট প্লাজা',
    aiParticipantName: 'Hannah Patel',
    aiParticipantRoleEn: 'Local Commuter',
    aiParticipantRoleBn: 'স্থানীয় পথচারী',
    learnerRoleEn: 'Traveler on Foot',
    learnerRoleBn: 'পথিক / ভ্রমণকারী',
    targetSkills: ['Polite Requests', 'Clarification', 'Prepositions of Place'],
    requiredTaskEn: 'Get attention politely, ask how to reach Central Station, clarify a landmark or walking time, and confirm the route.',
    requiredTaskBn: 'ভদ্রভাবে দৃষ্টি আকর্ষণ করুন, সেন্ট্রাল স্টেশনের পথ ও হাঁটার সময় জেনে নিন এবং রাস্তা নিশ্চিত করুন।',
    completionCriteriaEn: 'Use polite indirect requests and confirm understanding before thanking.',
    completionCriteriaBn: 'ভদ্র অনুরোধ ব্যবহার করে রাস্তা বুঝে নিশ্চিত করুন এবং ধন্যবাদ জানান।',
    openingMessageEn:
      "Oh, hi! You look like you're checking your map — are you trying to find somewhere nearby? I know this area pretty well.",
    openingMessageBn:
      'একজন স্থানীয় পথচারী আপনাকে সাহায্য করতে চাইছেন। সেন্ট্রাল স্টেশনের রাস্তা ও সময় জানতে চান।',
    objectives: [
      { id: 'obj_1', labelEn: 'Ask politely for Central Station', labelBn: 'ভদ্রভাবে স্টেশনের পথ চাওয়া', criteriaEn: 'Uses polite phrasing (e.g., "Could you tell me...") to ask for Central Station.' },
      { id: 'obj_2', labelEn: 'Ask about walking time or transit option', labelBn: 'হাঁটার সময় বা বাস/মেট্রো জানতে চাওয়া', criteriaEn: 'Asks how long it takes or whether walking/bus is faster.' },
      { id: 'obj_3', labelEn: 'Clarify or repeat back key directions', labelBn: 'মূল দিকনির্দেশনা পুনরাবৃত্তি করে নিশ্চিত করা', criteriaEn: 'Confirms a turn, street, or landmark to avoid getting lost.' },
      { id: 'obj_4', labelEn: 'Thank the commuter politely', labelBn: 'ভদ্রভাবে ধন্যবাদ জানানো', criteriaEn: 'Closes with natural gratitude.' },
    ],
    helpfulPhrasesEn: [
      'Excuse me, could you tell me how to get to Central Station?',
      'How long does it take to walk from here?',
      'Just to make sure I understood — I turn left after the bridge, right?',
      'Thank you so much for your help!',
    ],
    targetMistakeCategories: ['prepositions', 'word_order'],
    linkedLessonIds: ['les_questions_do_does', 'les_prepositions_workplace'],
  },
  {
    id: 'daily_shopping',
    category: 'daily_life',
    titleEn: 'Shopping',
    titleBn: 'কেনাকাটা ও পণ্যের তথ্য জানা',
    descriptionEn:
      'Shop for a work laptop backpack, compare size and durability, ask about warranty and return policy, and complete the purchase.',
    descriptionBn:
      'অফিসের জন্য ল্যাপটপ ব্যাকপ্যাক কেনার সময় সাইজ, মান, ওয়ারেন্টি ও রিটার্ন পলিসি জেনে সিদ্ধান্ত নিন।',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    environmentNameEn: 'Modern Urban Gear Store',
    environmentNameBn: 'আধুনিক গিয়ার স্টোর',
    aiParticipantName: 'Lucas Meyer',
    aiParticipantRoleEn: 'Retail Specialist',
    aiParticipantRoleBn: 'বিক্রয় প্রতিনিধি',
    learnerRoleEn: 'Shopper',
    learnerRoleBn: 'ক্রেতা',
    targetSkills: ['Product Inquiries', 'Comparing Options', 'Articles & Quantities'],
    requiredTaskEn: 'State your needs and budget, compare two options, ask about return/warranty terms, and decide whether to buy.',
    requiredTaskBn: 'আপনার চাহিদা ও বাজেট বলুন, দুটি অপশন তুলনা করুন, ওয়ারেন্টি জেনে সিদ্ধান্ত নিন।',
    completionCriteriaEn: 'Clearly express requirements, ask about policy, and finalize a coherent buying decision.',
    completionCriteriaBn: 'চাহিদা স্পষ্টভাবে জানিয়ে পলিসি সম্পর্কে প্রশ্ন করুন এবং স্পষ্ট সিদ্ধান্ত নিন।',
    openingMessageEn:
      "Welcome in! Feel free to browse, or let me know if you're looking for anything specific today — maybe a work bag or travel pack?",
    openingMessageBn:
      'দোকানে স্বাগতম! আপনার প্রয়োজনীয় ল্যাপটপ ব্যাকপ্যাকের চাহিদা, সাইজ ও বাজেট জানান।',
    objectives: [
      { id: 'obj_1', labelEn: 'State what you need & laptop size', labelBn: 'প্রয়োজনীয় ব্যাগ ও সাইজ জানানো', criteriaEn: 'Specifies item needed, laptop fit or capacity, and practical use.' },
      { id: 'obj_2', labelEn: 'Ask about price, durability, or options', labelBn: 'দাম ও মান তুলনা করে প্রশ্ন করা', criteriaEn: 'Compares features or asks about price/water resistance.' },
      { id: 'obj_3', labelEn: 'Check return or warranty policy', labelBn: 'রিটার্ন বা ওয়ারেন্টি নীতি জানা', criteriaEn: 'Asks a clear question about returns, exchanges, or warranty.' },
      { id: 'obj_4', labelEn: 'Make a clear purchase decision', labelBn: 'স্পষ্ট কেনার সিদ্ধান্ত জানানো', criteriaEn: 'Confirms which item to buy or politely declines with a reason.' },
    ],
    helpfulPhrasesEn: [
      "I'm looking for a backpack that fits a 15-inch laptop.",
      'Is this material water-resistant?',
      'What is your return policy if it does not fit comfortably?',
      "I'll take the navy one, please.",
    ],
    targetMistakeCategories: ['articles', 'vocabulary'],
    linkedLessonIds: ['les_svo_order'],
  },
  {
    id: 'daily_restaurant_conversations',
    category: 'daily_life',
    titleEn: 'Restaurant Conversations',
    titleBn: 'রেস্টুরেন্টে কথোপকথন ও অর্ডার',
    descriptionEn:
      'Navigate a complete sit-down dining experience: request a table, order food, check ingredients for allergies, resolve an order mix-up, and wrap up politely.',
    descriptionBn:
      'রেস্টুরেন্টে টেবিল চাওয়া, খাবার অর্ডার করা, উপকরণ সম্পর্কে জানা, অর্ডারের ভুল জানানো এবং ভদ্রভাবে বিল মিটিয়ে বিদায় নেওয়ার সম্পূর্ণ অনুশীলন।',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    environmentNameEn: 'Harbor Bistro Dining Room',
    environmentNameBn: 'হারবার বিস্ট্রো ডাইনিং রুম',
    aiParticipantName: 'Sofia Alvarez',
    aiParticipantRoleEn: 'Restaurant Host & Server',
    aiParticipantRoleBn: 'রেস্টুরেন্ট হোস্ট ও সার্ভার',
    learnerRoleEn: 'Dining Guest',
    learnerRoleBn: 'অতিথি',
    targetSkills: ['Polite Requests', 'Food Vocabulary', 'Dietary Clarification', 'Problem Resolution'],
    requiredTaskEn: 'Request a table, order your meal, ask about ingredients/allergens, politely explain a mix-up with your dish, and conclude courteously.',
    requiredTaskBn: 'টেবিল চান, খাবার অর্ডার করুন, উপকরণ জেনে নিন, অর্ডারের একটি সমস্যা ভদ্রভাবে বলুন এবং সৌজন্যসহ শেষ করুন।',
    completionCriteriaEn: 'Achieve at least 4 of the 5 dining objectives with polite tone and accurate articles/requests.',
    completionCriteriaBn: '৫টির মধ্যে অন্তত ৪টি রেস্টুরেন্ট লক্ষ্য ভদ্র স্বর ও নির্ভুল বাক্যগঠনে পূরণ করুন।',
    openingMessageEn:
      "Good evening and welcome to Harbor Bistro! Do you have a reservation with us tonight, or are you looking for a table?",
    openingMessageBn:
      'শুভ সন্ধ্যা! হারবার বিস্ট্রোতে স্বাগতম। প্রথমে একটি টেবিল চান এবং ধীরে ধীরে অর্ডার ও উপকরণ নিয়ে কথা বলুন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Ask for a table', labelBn: 'একটি টেবিল চাওয়া', criteriaEn: 'Requests a table politely specifying party size or seating preference.' },
      { id: 'obj_2', labelEn: 'Order food & a drink', labelBn: 'খাবার ও পানীয় অর্ডার করা', criteriaEn: 'Places a clear food/drink order without redundant prepositions ("order for").' },
      { id: 'obj_3', labelEn: 'Ask about ingredients or allergens', labelBn: 'খাবারের উপকরণ বা অ্যালার্জি জানা', criteriaEn: 'Asks specifically what ingredients or allergens are in a dish.' },
      { id: 'obj_4', labelEn: 'Explain a problem with an order', labelBn: 'অর্ডারের সমস্যা ভদ্রভাবে জানানো', criteriaEn: 'Politely reports a mistake (wrong dish, cold food, or missing item) and asks for a fix.' },
      { id: 'obj_5', labelEn: 'Complete the interaction politely', labelBn: 'ভদ্রভাবে বিল চেয়ে আলাপ শেষ করা', criteriaEn: 'Asks for the check or thanks the server courteously at the end.' },
    ],
    helpfulPhrasesEn: [
      'Could we have a table for two near the window, please?',
      'Does the grilled salmon sauce contain peanuts or dairy?',
      "I'd like to order the herb chicken and a sparkling water.",
      'Excuse me, I think there was a mix-up — I ordered the vegetarian pasta.',
      'Could I have the check when you have a moment? Thank you!',
    ],
    targetMistakeCategories: ['articles', 'prepositions', 'word_order'],
    linkedLessonIds: ['les_svo_order', 'les_questions_do_does'],
    legacyAliasId: 'order_issue_resolution',
  },
  {
    id: 'daily_making_appointments',
    category: 'daily_life',
    titleEn: 'Making Appointments',
    titleBn: 'অ্যাপয়েন্টমেন্ট নির্ধারণ ও পরিবর্তন',
    descriptionEn:
      'Schedule a dental check-up by phone, negotiate an available time slot around your work hours, and confirm date, time, and documents needed.',
    descriptionBn:
      'ফোনে ডেন্টাল চেক-আপের সময় নির্ধারণ করুন, অফিসের সময়ের সাথে মিলিয়ে স্লট বেছে নিন এবং তারিখ-সময় নিশ্চিত করুন।',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    environmentNameEn: 'City Dental Clinic Reception',
    environmentNameBn: 'ক্লিনিক রিসেপশন ডেস্ক',
    aiParticipantName: 'Claire Bennett',
    aiParticipantRoleEn: 'Clinic Receptionist',
    aiParticipantRoleBn: 'ক্লিনিক রিসেপশনিস্ট',
    learnerRoleEn: 'Patient Calling to Book',
    learnerRoleBn: 'রোগী / কলার',
    targetSkills: ['Time & Date Prepositions', 'Scheduling', 'Confirmation'],
    requiredTaskEn: 'State the reason for your visit, negotiate a suitable day/time, ask what to bring, and confirm the final slot.',
    requiredTaskBn: 'অ্যাপয়েন্টমেন্টের কারণ জানান, সুবিধাজনক দিন-সময় ঠিক করুন এবং কী কাগজ আনতে হবে তা নিশ্চিত করুন।',
    completionCriteriaEn: 'Use accurate time/day prepositions (on Tuesday, at 4 PM) and confirm the exact booking.',
    completionCriteriaBn: 'সময় ও দিনের সঠিক প্রিপজিশন (on/at) ব্যবহার করে অ্যাপয়েন্টমেন্ট নিশ্চিত করুন।',
    openingMessageEn:
      'Good morning, City Dental Care, Claire speaking. How can I help you today?',
    openingMessageBn:
      'সিটি ডেন্টাল কেয়ার থেকে ক্লেয়ার বলছেন। আপনার অ্যাপয়েন্টমেন্টের কারণ ও সুবিধাজনক সময় জানান।',
    objectives: [
      { id: 'obj_1', labelEn: 'State the reason for the appointment', labelBn: 'অ্যাপয়েন্টমেন্টের কারণ বলা', criteriaEn: 'Clearly requests a check-up or specific dental appointment.' },
      { id: 'obj_2', labelEn: 'Negotiate a date & time slot', labelBn: 'তারিখ ও সময় নির্ধারণ করা', criteriaEn: 'States availability and responds to offered slots accurately.' },
      { id: 'obj_3', labelEn: 'Ask about preparation or documents', labelBn: 'কী আনতে হবে তা জানতে চাওয়া', criteriaEn: 'Asks whether ID, insurance, or early arrival is required.' },
      { id: 'obj_4', labelEn: 'Confirm the final appointment details', labelBn: 'চূড়ান্ত তারিখ ও সময় নিশ্চিত করা', criteriaEn: 'Repeats or confirms the exact booked day and time politely.' },
    ],
    helpfulPhrasesEn: [
      "I'd like to schedule a routine dental check-up.",
      'I work until 5 PM on weekdays — do you have anything in the late afternoon?',
      'Do I need to bring my ID or arrive early?',
      'Great, so I am confirmed for Thursday at 5:30 PM. Thank you!',
    ],
    targetMistakeCategories: ['prepositions', 'verb_tense'],
    linkedLessonIds: ['les_prepositions_workplace'],
  },

  // ======================== B. TRAVEL & INTERNATIONAL (5) ========================
  {
    id: 'travel_airport_checkin',
    category: 'travel_international',
    titleEn: 'Airport Check-in',
    titleBn: 'এয়ারপোর্ট চেক-ইন ও ব্যাগেজ',
    descriptionEn:
      'Check in for an international flight, resolve a slightly overweight suitcase, request a seat preference, and confirm boarding gate details.',
    descriptionBn:
      'আন্তর্জাতিক ফ্লাইটে চেক-ইন করুন, অতিরিক্ত ব্যাগেজ ওজন সামলান, সিট পছন্দ জানান এবং বোর্ডিং গেটের তথ্য নিশ্চিত করুন।',
    difficulty: 'intermediate',
    estimatedMinutes: 7,
    environmentNameEn: 'International Departure Terminal',
    environmentNameBn: 'আন্তর্জাতিক ডিপারচার টার্মিনাল',
    aiParticipantName: 'Omar Farooq',
    aiParticipantRoleEn: 'Airline Check-in Agent',
    aiParticipantRoleBn: 'এয়ারলাইন চেক-ইন অফিসার',
    learnerRoleEn: 'International Passenger',
    learnerRoleBn: 'আন্তর্জাতিক যাত্রী',
    targetSkills: ['Travel Logistics', 'Polite Negotiation', 'Clarifying Instructions'],
    requiredTaskEn: 'Check in with destination details, handle a 2 kg luggage overweight issue, ask for a seat preference, and confirm boarding time and gate.',
    requiredTaskBn: 'ফ্লাইট চেক-ইন করুন, ২ কেজি অতিরিক্ত ওজনের সমাধান করুন, সিট পছন্দ বলুন এবং বোর্ডিং গেট জেনে নিন।',
    completionCriteriaEn: 'Resolve the baggage issue practically and confirm seat and boarding time clearly.',
    completionCriteriaBn: 'ব্যাগেজ সমস্যা বাস্তবসম্মতভাবে সমাধান করুন এবং বোর্ডিং তথ্য নিশ্চিত করুন।',
    openingMessageEn:
      "Good afternoon! Welcome to the international check-in counter. May I see your passport and know your final destination today? Also, how many bags are you checking in?",
    openingMessageBn:
      'আন্তর্জাতিক চেক-ইন কাউন্টারে স্বাগতম। আপনার গন্তব্য ও কয়টি ব্যাগ চেক-ইন করছেন তা জানান।',
    objectives: [
      { id: 'obj_1', labelEn: 'Confirm destination & baggage count', labelBn: 'গন্তব্য ও ব্যাগের সংখ্যা জানানো', criteriaEn: 'States destination and checked/carry-on baggage clearly.' },
      { id: 'obj_2', labelEn: 'Handle an overweight luggage issue', labelBn: 'অতিরিক্ত ব্যাগেজ ওজন সমাধান করা', criteriaEn: 'Responds constructively when told a bag is overweight (repack or ask fee).' },
      { id: 'obj_3', labelEn: 'Request a seat preference politely', labelBn: 'পছন্দের সিট (উইন্ডো/আইল) চাওয়া', criteriaEn: 'Makes a polite request for an aisle or window seat.' },
      { id: 'obj_4', labelEn: 'Confirm gate & boarding time', labelBn: 'বোর্ডিং সময় ও গেট নিশ্চিত করা', criteriaEn: 'Asks for or confirms the boarding gate and boarding time.' },
    ],
    helpfulPhrasesEn: [
      "I'm flying to London today, and I have one checked suitcase and one carry-on.",
      'Could I move a few items into my carry-on to reduce the weight?',
      'Would it be possible to get an aisle seat if one is available?',
      'Which gate does my flight depart from, and what time does boarding start?',
    ],
    targetMistakeCategories: ['articles', 'word_order'],
    linkedLessonIds: ['les_questions_do_does'],
  },
  {
    id: 'travel_immigration_conversation',
    category: 'travel_international',
    titleEn: 'Immigration Conversation',
    titleBn: 'ইমিগ্রেশন কাউন্টারে কথোপকথন',
    descriptionEn:
      'Answer border control questions calmly and accurately regarding your purpose of visit, length of stay, accommodation, and return plans.',
    descriptionBn:
      'ইমিগ্রেশন অফিসারের প্রশ্নের উত্তর শান্ত ও স্পষ্টভাবে দিন — ভ্রমণের উদ্দেশ্য, থাকার সময়, ঠিকানা এবং ফেরার পরিকল্পনা।',
    difficulty: 'intermediate',
    estimatedMinutes: 6,
    environmentNameEn: 'International Arrivals Border Control',
    environmentNameBn: 'ইমিগ্রেশন বর্ডার কন্ট্রোল',
    aiParticipantName: 'Officer Elena Novak',
    aiParticipantRoleEn: 'Border Immigration Officer',
    aiParticipantRoleBn: 'ইমিগ্রেশন অফিসার',
    learnerRoleEn: 'Arriving Visitor',
    learnerRoleBn: 'আগত ভ্রমণকারী',
    targetSkills: ['Concise Answers', 'Future Plans', 'Formal Register'],
    requiredTaskEn: 'State purpose of visit clearly, give exact duration and accommodation details, confirm return flight, and declare items honestly.',
    requiredTaskBn: 'ভ্রমণের উদ্দেশ্য, থাকার মেয়াদ, হোটেল/ঠিকানা এবং ফিরতি ফ্লাইটের তথ্য স্পষ্টভাবে বলুন।',
    completionCriteriaEn: 'Give consistent, direct, calm answers without drifting off-topic.',
    completionCriteriaBn: 'প্রাসঙ্গিক ও স্পষ্ট উত্তরে ভ্রমণের সব তথ্য সঠিকভাবে দিন।',
    openingMessageEn:
      'Next, please. Good morning. Passport and arrival card, please. What is the purpose of your visit today, and how long will you be staying?',
    openingMessageBn:
      'ইমিগ্রেশন অফিসার আপনার ভ্রমণের উদ্দেশ্য এবং কতদিন থাকবেন তা জানতে চাইছেন। স্পষ্ট উত্তর দিন।',
    objectives: [
      { id: 'obj_1', labelEn: 'State purpose of visit clearly', labelBn: 'ভ্রমণের উদ্দেশ্য স্পষ্ট করা', criteriaEn: 'Clearly states business, conference, study, or tourism purpose.' },
      { id: 'obj_2', labelEn: 'Provide duration & accommodation', labelBn: 'থাকার মেয়াদ ও ঠিকানা বলা', criteriaEn: 'Gives exact number of days and where they are staying.' },
      { id: 'obj_3', labelEn: 'Confirm return ticket & funding', labelBn: 'ফিরতি টিকিট ও ভ্রমণ পরিকল্পনা নিশ্চিত করা', criteriaEn: 'Answers follow-up questions about return flight or profession accurately.' },
      { id: 'obj_4', labelEn: 'Maintain formal, calm register', labelBn: 'পেশাদার ও শান্ত স্বর বজায় রাখা', criteriaEn: 'Keeps responses concise, respectful, and directly relevant.' },
    ],
    helpfulPhrasesEn: [
      "I'm here for a five-day technology conference and sightseeing.",
      "I'll be staying at the Riverside Hotel downtown for six nights.",
      'Yes, I have my return ticket booked for next Sunday.',
      'I work as a software engineer in Dhaka.',
    ],
    targetMistakeCategories: ['verb_tense', 'prepositions'],
    linkedLessonIds: ['les_prepositions_workplace'],
  },
  {
    id: 'travel_hotel_checkin',
    category: 'travel_international',
    titleEn: 'Hotel Check-in',
    titleBn: 'হোটেল চেক-ইন ও রুম অনুরোধ',
    descriptionEn:
      'Check into your hotel after a long flight, handle a room-type discrepancy politely, and ask about Wi-Fi, breakfast, and late checkout.',
    descriptionBn:
      'দীর্ঘ ফ্লাইটের পর হোটেলে চেক-ইন করুন, রুম সংক্রান্ত ভুল বোঝাবুঝি সমাধান করুন এবং ওয়াই-ফাই, ব্রেকফাস্ট ও লেট চেকআউট জানুন।',
    difficulty: 'intermediate',
    estimatedMinutes: 6,
    environmentNameEn: 'Grand Meridian Hotel Lobby',
    environmentNameBn: 'হোটেল রিসেপশন লবি',
    aiParticipantName: 'Marcus Reid',
    aiParticipantRoleEn: 'Front Desk Manager',
    aiParticipantRoleBn: 'ফ্রন্ট ডেস্ক ম্যানেজার',
    learnerRoleEn: 'Hotel Guest',
    learnerRoleBn: 'হোটেল অতিথি',
    targetSkills: ['Polite Requests', 'Clarifying Bookings', 'Hospitality English'],
    requiredTaskEn: 'Confirm your reservation, politely resolve a room preference mismatch, and confirm hotel amenities and checkout time.',
    requiredTaskBn: 'বুকিং নিশ্চিত করুন, রুম পছন্দের অমিল ভদ্রভাবে ঠিক করুন এবং ব্রেকফাস্ট ও চেকআউট সময় জেনে নিন।',
    completionCriteriaEn: 'Resolve the room issue calmly and gather all required stay details.',
    completionCriteriaBn: 'শান্তভাবে রুম সমস্যা সমাধান করুন এবং অবস্থানের প্রয়োজনীয় তথ্য জেনে নিন।',
    openingMessageEn:
      "Good evening and welcome to the Grand Meridian Hotel! Checking in tonight? May I have the name on your reservation, please?",
    openingMessageBn:
      'গ্র্যান্ড মেরিডিয়ান হোটেলে স্বাগতম। আপনার রিজার্ভেশন ও রুমের চাহিদা জানান।',
    objectives: [
      { id: 'obj_1', labelEn: 'Provide reservation details', labelBn: 'বুকিংয়ের তথ্য দেওয়া', criteriaEn: 'Gives name and reservation duration/room type booked.' },
      { id: 'obj_2', labelEn: 'Address a room preference mismatch', labelBn: 'রুম পছন্দের অমিল ভদ্রভাবে জানানো', criteriaEn: 'Politely clarifies non-smoking/quiet/bed type mismatch and asks for options.' },
      { id: 'obj_3', labelEn: 'Ask about breakfast & Wi-Fi', labelBn: 'ব্রেকফাস্ট ও ওয়াই-ফাই সম্পর্কে জানা', criteriaEn: 'Inquires clearly about included breakfast hours or Wi-Fi access.' },
      { id: 'obj_4', labelEn: 'Check late checkout policy', labelBn: 'লেট চেকআউট নীতি জানা', criteriaEn: 'Asks politely about checkout time or late checkout availability.' },
    ],
    helpfulPhrasesEn: [
      'I have a reservation for three nights under my name.',
      'I believe I requested a quiet non-smoking room with a queen bed.',
      'Is breakfast included with my booking, and what hours is it served?',
      'Would it be possible to request a late checkout on Friday?',
    ],
    targetMistakeCategories: ['articles', 'word_order'],
    linkedLessonIds: ['les_questions_do_does'],
  },
  {
    id: 'travel_booking_transportation',
    category: 'travel_international',
    titleEn: 'Booking Transportation',
    titleBn: 'যাতায়াত ও টিকিট বুকিং',
    descriptionEn:
      'Book an intercity express train ticket at the station desk, ask about direct vs. transfer routes, luggage space, and flexible return options.',
    descriptionBn:
      'স্টেশন কাউন্টারে ইন্টারসিটি ট্রেনের টিকিট বুক করুন, সরাসরি রুট, ব্যাগেজ ও ফিরতি টিকিটের নিয়ম জানুন।',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    environmentNameEn: 'Central Rail Ticket Desk',
    environmentNameBn: 'রেলওয়ে টিকিট কাউন্টার',
    aiParticipantName: 'Nadia Kowalski',
    aiParticipantRoleEn: 'Transit Ticket Agent',
    aiParticipantRoleBn: 'টিকিট কাউন্টার এজেন্ট',
    learnerRoleEn: 'Traveler',
    learnerRoleBn: 'যাত্রী',
    targetSkills: ['Schedules & Times', 'Comparing Fares', 'Confirming Details'],
    requiredTaskEn: 'State destination and travel time, compare direct vs. off-peak fare, ask about luggage or refunds, and complete the booking.',
    requiredTaskBn: 'গন্তব্য ও সময় জানান, ভাড়া ও সরাসরি রুট তুলনা করুন এবং টিকিট বুকিং চূড়ান্ত করুন।',
    completionCriteriaEn: 'Confirm departure time, platform/route type, and fare terms clearly.',
    completionCriteriaBn: 'ছাড়ার সময়, রুট ও ভাড়ার শর্ত স্পষ্টভাবে নিশ্চিত করুন।',
    openingMessageEn:
      'Hello! Welcome to Central Rail Ticketing. Where are you heading today, and are you looking for a one-way or return ticket?',
    openingMessageBn:
      'সেন্ট্রাল রেল টিকিটিং-এ স্বাগতম। আপনার গন্তব্য, সময় এবং ওয়ান-ওয়ে না রিটার্ন টিকিট প্রয়োজন তা জানান।',
    objectives: [
      { id: 'obj_1', labelEn: 'State destination & ticket type', labelBn: 'গন্তব্য ও টিকিটের ধরন বলা', criteriaEn: 'Specifies destination city, travel date/time, and one-way or return.' },
      { id: 'obj_2', labelEn: 'Compare direct vs. cheaper options', labelBn: 'সরাসরি ও সাশ্রয়ী রুটের তুলনা করা', criteriaEn: 'Asks about direct trains, travel duration, or fare difference.' },
      { id: 'obj_3', labelEn: 'Ask about ticket change or luggage rules', labelBn: 'টিকিট পরিবর্তন বা ব্যাগেজ নিয়ম জানা', criteriaEn: 'Checks exchange/refund flexibility or suitcase storage.' },
      { id: 'obj_4', labelEn: 'Confirm final departure details', labelBn: 'চূড়ান্ত যাত্রার সময় নিশ্চিত করা', criteriaEn: 'Confirms chosen departure time and payment/ticket pickup.' },
    ],
    helpfulPhrasesEn: [
      "I'd like a return ticket to Manchester leaving tomorrow morning.",
      'Is the 9:15 train direct, or do I need to change stations?',
      'Can I change the return time if my meeting finishes late?',
      "I'll book the 9:15 direct train, please.",
    ],
    targetMistakeCategories: ['prepositions', 'word_order'],
    linkedLessonIds: ['les_questions_do_does'],
  },
  {
    id: 'travel_asking_information',
    category: 'travel_international',
    titleEn: 'Asking for Travel Information',
    titleBn: 'ভ্রমণ তথ্য ও রুট পরামর্শ চাওয়া',
    descriptionEn:
      'Your connecting flight was delayed by three hours. Speak with the transfer desk to understand rebooking options, meal vouchers, and baggage transfer.',
    descriptionBn:
      'কানেক্টিং ফ্লাইট ৩ ঘণ্টা বিলম্বিত হয়েছে। ট্রান্সফার ডেস্কে রিবুকিং, মিল ভাউচার ও ব্যাগেজ ট্রান্সফার সম্পর্কে জানুন।',
    difficulty: 'intermediate',
    estimatedMinutes: 7,
    environmentNameEn: 'Airport Transfer Information Desk',
    environmentNameBn: 'এয়ারপোর্ট ট্রান্সফার ইনফরমেশন ডেস্ক',
    aiParticipantName: 'David Park',
    aiParticipantRoleEn: 'Airport Transfer Desk Specialist',
    aiParticipantRoleBn: 'ট্রান্সফার ডেস্ক স্পেশালিস্ট',
    learnerRoleEn: 'Connecting Passenger',
    learnerRoleBn: 'কানেক্টিং যাত্রী',
    targetSkills: ['Clarifying Disruptions', 'Polite Persistence', 'Information Gathering'],
    requiredTaskEn: 'Explain your delayed connection, ask about rebooking or connection risk, check whether luggage transfers automatically, and confirm next steps.',
    requiredTaskBn: 'ফ্লাইট বিলম্বের কথা জানান, রিবুকিং ও ব্যাগেজ ট্রান্সফার নিশ্চিত করুন এবং পরবর্তী পদক্ষেপ জেনে নিন।',
    completionCriteriaEn: 'Gather concrete rebooking and baggage confirmation while keeping a calm, polite register.',
    completionCriteriaBn: 'শান্ত ও ভদ্র স্বরে রিবুকিং এবং ব্যাগেজ সম্পর্কে নিশ্চিত তথ্য সংগ্রহ করুন।',
    openingMessageEn:
      "Hello, welcome to the Transfer Assistance Desk. I see a few flights were delayed by weather this morning — how can I help with your connection?",
    openingMessageBn:
      'ট্রান্সফার অ্যাসিস্ট্যান্স ডেস্কে স্বাগতম। আপনার ফ্লাইট বিলম্ব ও কানেক্টিং ফ্লাইটের সমস্যাটি জানান।',
    objectives: [
      { id: 'obj_1', labelEn: 'Explain the flight delay clearly', labelBn: 'ফ্লাইট বিলম্ব স্পষ্টভাবে জানানো', criteriaEn: 'Explains current flight delay and concern about missing the connection.' },
      { id: 'obj_2', labelEn: 'Ask about rebooking alternatives', labelBn: 'বিকল্প ফ্লাইট বা রিবুকিং জানতে চাওয়া', criteriaEn: 'Asks what happens if the connection is missed or requests next available flight.' },
      { id: 'obj_3', labelEn: 'Verify checked baggage transfer', labelBn: 'ব্যাগেজ ট্রান্সফার নিশ্চিত করা', criteriaEn: 'Confirms whether checked luggage will transfer automatically.' },
      { id: 'obj_4', labelEn: 'Ask about lounge/meal voucher or gate', labelBn: 'মিল ভাউচার বা গেটের তথ্য জানা', criteriaEn: 'Politely checks meal assistance or updated gate information.' },
    ],
    helpfulPhrasesEn: [
      'Excuse me, my flight is delayed and I am worried about missing my connection.',
      'If I miss it, could you rebook me on the next available flight?',
      'Will my checked suitcase be transferred automatically, or do I need to collect it?',
      'Thank you — could you also confirm which gate I should monitor?',
    ],
    targetMistakeCategories: ['verb_tense', 'word_order'],
    linkedLessonIds: ['les_questions_do_does', 'les_present_perfect_since'],
  },

  // ======================== C. PROFESSIONAL COMMUNICATION (6) ========================
  {
    id: 'pro_job_interview',
    category: 'professional',
    titleEn: 'Job Interview',
    titleBn: 'চাকরির ইন্টারভিউ সিমুলেশন',
    descriptionEn:
      'Answer behavioral and role-fit questions in a modern office interview using clear Past Simple STAR storytelling and measurable outcomes.',
    descriptionBn:
      'আধুনিক অফিস ইন্টারভিউয়ে Past Simple ও STAR কাঠামোয় নিজের অভিজ্ঞতা, চ্যালেঞ্জ সমাধান এবং ফলাফল পেশাদারভাবে উপস্থাপন করুন।',
    difficulty: 'professional',
    estimatedMinutes: 10,
    environmentNameEn: 'Executive Office Interview Room',
    environmentNameBn: 'এক্সিকিউটিভ ইন্টারভিউ রুম',
    aiParticipantName: 'Rachel Lin',
    aiParticipantRoleEn: 'Senior Engineering & Hiring Manager',
    aiParticipantRoleBn: 'সিনিয়র হায়ারিং ম্যানেজার',
    learnerRoleEn: 'Job Candidate',
    learnerRoleBn: 'চাকরি প্রার্থী',
    targetSkills: ['STAR Storytelling', 'Past Simple Control', 'Professional Clarity', 'Strategic Questions'],
    requiredTaskEn: 'Introduce your value proposition, walk through a real past challenge with concrete actions and results, handle a probing follow-up, and ask a thoughtful role question.',
    requiredTaskBn: 'নিজের দক্ষতা তুলে ধরুন, অতীতের একটি চ্যালেঞ্জ ও ফলাফল ব্যাখ্যা করুন, ফলো-আপ প্রশ্নের উত্তর দিন এবং একটি মানসম্মত প্রশ্ন করুন।',
    completionCriteriaEn: 'Demonstrate consistent Past Simple narration, specific evidence, and professional composure across objectives.',
    completionCriteriaBn: 'নির্ভুল Past Simple, সুনির্দিষ্ট উদাহরণ ও পেশাদার স্বর বজায় রেখে লক্ষ্যগুলো পূরণ করুন।',
    openingMessageEn:
      "Thanks for coming in today — I'm Rachel, the hiring manager for this role. To get started, could you briefly introduce your background and walk me through a challenging project you personally helped turn around?",
    openingMessageBn:
      'আজকের ইন্টারভিউয়ে স্বাগতম। র‍্যাচেল আপনার অভিজ্ঞতা এবং অতীতের একটি কঠিন প্রজেক্ট কীভাবে সামলেছেন তা জানতে চাইছেন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Present concise professional summary', labelBn: 'সংক্ষিপ্ত পেশাদার পরিচয় দেওয়া', criteriaEn: 'Connects background and skills directly to the role.' },
      { id: 'obj_2', labelEn: 'Explain a past challenge & personal actions', labelBn: 'অতীতের সমস্যা ও ব্যক্তিগত পদক্ষেপ বলা', criteriaEn: 'Uses consistent Past Simple to explain what went wrong and what they personally did.' },
      { id: 'obj_3', labelEn: 'Share measurable outcome or learning', labelBn: 'পরিমাপযোগ্য ফলাফল বা শিক্ষা বলা', criteriaEn: 'Gives a concrete result, metric, or clear takeaway.' },
      { id: 'obj_4', labelEn: 'Handle a probing follow-up calmly', labelBn: 'পাল্টা কঠিন প্রশ্নের শান্ত উত্তর দেওয়া', criteriaEn: 'Answers Rachel’s probing question directly without becoming defensive.' },
      { id: 'obj_5', labelEn: 'Ask a thoughtful question about the team/role', labelBn: 'টিম বা পদ সম্পর্কে মানসম্মত প্রশ্ন করা', criteriaEn: 'Asks an insightful question about expectations, team goals, or growth.' },
    ],
    helpfulPhrasesEn: [
      'Last quarter, our team faced a bottleneck because...',
      'I took ownership by coordinating with... and simplifying...',
      'As a result, we cut delivery delays by...',
      'What would success in the first 90 days look like for this role?',
    ],
    targetMistakeCategories: ['verb_tense', 'sentence_structure'],
    linkedLessonIds: ['les_past_simple_stories', 'les_interview_star'],
    legacyAliasId: 'job_interview_followup',
  },
  {
    id: 'pro_workplace_meeting',
    category: 'professional',
    titleEn: 'Workplace Meeting',
    titleBn: 'অফিস মিটিং ও প্রজেক্ট আপডেট',
    descriptionEn:
      'Deliver an honest project status update when a dependency slips, propose a realistic recovery milestone, and align with your delivery director.',
    descriptionBn:
      'প্রজেক্ট বিলম্বের বাস্তব আপডেট দিন, অজুহাত ছাড়া কারণ ব্যাখ্যা করুন এবং পুনরুদ্ধার পরিকল্পনায় একমত হন।',
    difficulty: 'advanced',
    estimatedMinutes: 8,
    environmentNameEn: 'Product Strategy Conference Room',
    environmentNameBn: 'প্রোডাক্ট কনফারেন্স রুম',
    aiParticipantName: 'Victor Sterling',
    aiParticipantRoleEn: 'Client Delivery Director',
    aiParticipantRoleBn: 'ক্লায়েন্ট ডেলিভারি ডিরেক্টর',
    learnerRoleEn: 'Project Lead',
    learnerRoleBn: 'প্রজেক্ট লিড',
    targetSkills: ['Status Updates', 'Accountability', 'Preposition Accuracy', 'Present Perfect'],
    requiredTaskEn: 'Report the blocker transparently, explain actions already taken, negotiate a revised milestone, and confirm the next check-in.',
    requiredTaskBn: 'বাধাটি স্বচ্ছভাবে জানান, ইতিমধ্যে নেওয়া পদক্ষেপ বলুন এবং নতুন মাইলস্টোন ও পরবর্তী আপডেট সময় ঠিক করুন।',
    completionCriteriaEn: 'Avoid redundant prepositions ("discuss about"), maintain executive tone, and commit to an actionable plan.',
    completionCriteriaBn: 'বাড়তি প্রিপজিশন এড়িয়ে পেশাদার স্বরে বাস্তবসম্মত সমাধান পরিকল্পনায় একমত হন।',
    openingMessageEn:
      "Morning everyone. Let's jump straight into Thursday's client demo. I heard we hit a blocker with the external API — can you give me an honest status update and tell me where we stand?",
    openingMessageBn:
      'ডেলিভারি ডিরেক্টর বৃহস্পতিবারের ডেমো ও API ব্লকার সম্পর্কে স্পষ্ট আপডেট এবং রিকভারি প্ল্যান চাইছেন।',
    objectives: [
      { id: 'obj_1', labelEn: 'State current status & root cause honestly', labelBn: 'বর্তমান অবস্থা ও মূল কারণ স্পষ্ট বলা', criteriaEn: 'Reports the delay transparently without blaming colleagues.' },
      { id: 'obj_2', labelEn: 'Summarize actions already taken', labelBn: 'ইতিমধ্যে নেওয়া পদক্ষেপ জানানো', criteriaEn: 'Uses Present Perfect accurately ("We have discussed...", "We have tested...").' },
      { id: 'obj_3', labelEn: 'Propose a concrete recovery milestone', labelBn: 'বাস্তব পুনরুদ্ধার পরিকল্পনা দেওয়া', criteriaEn: 'Proposes a specific interim deliverable and revised deadline.' },
      { id: 'obj_4', labelEn: 'Confirm next stakeholder check-in', labelBn: 'পরবর্তী চেক-ইন সময় নিশ্চিত করা', criteriaEn: 'Agrees on an exact time and format for the next update.' },
    ],
    helpfulPhrasesEn: [
      'We have been waiting on the vendor endpoint since Tuesday morning.',
      'We already discussed a fallback plan with the backend lead.',
      'We can demo the core workflow on Thursday and ship the final sync by Friday noon.',
      "I'll send a written checkpoint tomorrow at 10 AM.",
    ],
    targetMistakeCategories: ['prepositions', 'verb_tense'],
    linkedLessonIds: ['les_prepositions_workplace', 'les_present_perfect_since'],
    legacyAliasId: 'workplace_project_delay',
  },
  {
    id: 'pro_presentation',
    category: 'professional',
    titleEn: 'Presentation',
    titleBn: 'পেশাদার প্রেজেন্টেশন ও প্রশ্নোত্তর',
    descriptionEn:
      'Pitch a new workflow improvement to leadership, signpost your key points clearly, and answer a skeptical budget question during Q&A.',
    descriptionBn:
      'টিম লিডারশিপের সামনে নতুন কাজের প্রক্রিয়া উপস্থাপন করুন এবং বাজেট-সংক্রান্ত কঠিন প্রশ্নের যুক্তিসঙ্গত উত্তর দিন।',
    difficulty: 'advanced',
    estimatedMinutes: 8,
    environmentNameEn: 'Executive Briefing Auditorium',
    environmentNameBn: 'ব্রিফিং অডিটোরিয়াম',
    aiParticipantName: 'Priya Nair',
    aiParticipantRoleEn: 'VP of Operations',
    aiParticipantRoleBn: 'অপারেশনস ভিপি',
    learnerRoleEn: 'Presenter',
    learnerRoleBn: 'প্রেজেন্টার',
    targetSkills: ['Signposting', 'Persuasive Framing', 'Q&A Defense'],
    requiredTaskEn: 'Open with a clear problem statement, present two structured benefits, handle a budget pushback, and close with a next-step call to action.',
    requiredTaskBn: 'সমস্যার সারাংশ দিয়ে শুরু করুন, দুটি মূল সুবিধা বলুন, বাজেট প্রশ্নের উত্তর দিন এবং পরবর্তী পদক্ষেপ প্রস্তাব করুন।',
    completionCriteriaEn: 'Use clear transitions, concrete evidence, and diplomatic Q&A handling.',
    completionCriteriaBn: 'স্পষ্ট সংযোগকারী শব্দ ও যুক্তিসঙ্গত প্রমাণসহ প্রশ্নোত্তর সামলান।',
    openingMessageEn:
      "Thanks for putting this proposal together. The leadership team has ten minutes before our next review — please walk us through the problem you're solving and why we should prioritize it now.",
    openingMessageBn:
      'অপারেশনস ভিপি আপনার প্রস্তাবনাটি শুনতে প্রস্তুত। সমস্যার গুরুত্ব, সমাধান ও লাভ স্পষ্টভাবে উপস্থাপন করুন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Frame the core business problem', labelBn: 'মূল সমস্যা স্পষ্টভাবে উপস্থাপন', criteriaEn: 'States the bottleneck and why it matters in concise business language.' },
      { id: 'obj_2', labelEn: 'Present structured benefits with signposting', labelBn: 'ধারাবাহিকভাবে মূল সুবিধা বলা', criteriaEn: 'Uses clear transitions (First, Second, As a result) to outline impact.' },
      { id: 'obj_3', labelEn: 'Respond calmly to Q&A pushback', labelBn: 'বাজেট বা ঝুঁকি প্রশ্নের যুক্তিপূর্ণ উত্তর', criteriaEn: 'Addresses Priya’s skeptical question with evidence or a low-risk pilot.' },
      { id: 'obj_4', labelEn: 'Close with a clear next step', labelBn: 'স্পষ্ট পরবর্তী পদক্ষেপ প্রস্তাব করা', criteriaEn: 'Asks for a specific decision or pilot approval.' },
    ],
    helpfulPhrasesEn: [
      "Today I'd like to highlight two quick wins that can cut manual review time.",
      'That is a fair concern about upfront cost — we can test this with a two-week pilot.',
      'To summarize, the expected payoff is...',
      'If this looks solid, could we approve the pilot starting Monday?',
    ],
    targetMistakeCategories: ['sentence_structure', 'vocabulary'],
    linkedLessonIds: ['les_interview_star'],
  },
  {
    id: 'pro_email_discussion',
    category: 'professional',
    titleEn: 'Email Discussion',
    titleBn: 'পেশাদার ইমেইল ও লিখিত আলোচনা',
    descriptionEn:
      'Follow up on an ambiguous client email thread to clarify scope boundaries, confirm deliverables in writing, and avoid miscommunication.',
    descriptionBn:
      'অস্পষ্ট ক্লায়েন্ট ইমেইলের পরিপ্রেক্ষিতে কাজের সীমা, সময়সূচি ও ডেলিভারেবল লিখিতভাবে স্পষ্ট করুন।',
    difficulty: 'intermediate',
    estimatedMinutes: 7,
    environmentNameEn: 'Async Client Communication Desk',
    environmentNameBn: 'ক্লায়েন্ট ইমেইল ওয়ার্কস্পেস',
    aiParticipantName: 'Thomas Grant',
    aiParticipantRoleEn: 'External Client Account Lead',
    aiParticipantRoleBn: 'ক্লায়েন্ট অ্যাকাউন্ট লিড',
    learnerRoleEn: 'Account Specialist',
    learnerRoleBn: 'অ্যাকাউন্ট স্পেশালিস্ট',
    targetSkills: ['Written Tone', 'Scope Clarification', 'Actionable Summaries'],
    requiredTaskEn: 'Acknowledge the client message, clarify an out-of-scope request diplomatically, confirm exact deliverables, and align on dates.',
    requiredTaskBn: 'ক্লায়েন্টের বার্তা গ্রহণ করুন, বাড়তি কাজের সীমা ভদ্রভাবে স্পষ্ট করুন এবং চূড়ান্ত ডেলিভারেবল নিশ্চিত করুন।',
    completionCriteriaEn: 'Maintain crisp, polite written register with unambiguous action items.',
    completionCriteriaBn: 'স্পষ্ট, ভদ্র ও পেশাদার লিখিত ভাষায় চূড়ান্ত কর্মপরিকল্পনা নিশ্চিত করুন।',
    openingMessageEn:
      "Hi! Thanks for sending the draft timeline earlier. Just to clarify — does this include the extra analytics dashboard we briefly mentioned last week, and can everything go live by Friday?",
    openingMessageBn:
      'ক্লায়েন্ট জানতে চাইছেন বাড়তি ড্যাশবোর্ডটি এই সপ্তাহের স্কোপে আছে কি না। ভদ্র ও স্পষ্টভাবে স্কোপ ব্যাখ্যা করুন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Acknowledge client message professionally', labelBn: 'পেশাদারভাবে বার্তার উত্তর শুরু করা', criteriaEn: 'Opens politely and directly addresses the client’s question.' },
      { id: 'obj_2', labelEn: 'Clarify scope boundaries diplomatically', labelBn: 'কাজের সীমা ভদ্রভাবে স্পষ্ট করা', criteriaEn: 'Distinguishes Phase 1 deliverables from the extra dashboard request without friction.' },
      { id: 'obj_3', labelEn: 'Offer an actionable option for the add-on', labelBn: 'বাড়তি কাজের জন্য বাস্তব বিকল্প দেওয়া', criteriaEn: 'Proposes a timeline or follow-up estimate for the additional dashboard.' },
      { id: 'obj_4', labelEn: 'Summarize confirmed next steps clearly', labelBn: 'পরবর্তী ধাপগুলো সংক্ষেপে নিশ্চিত করা', criteriaEn: 'Closes with clear confirmation of Friday’s deliverables.' },
    ],
    helpfulPhrasesEn: [
      'Thank you for checking in on this.',
      'To keep Friday’s launch on track, Phase 1 covers..., while the analytics dashboard would be a separate add-on.',
      'I would be happy to share an estimate for the dashboard by tomorrow afternoon.',
      'Please let me know if this plan works for your team.',
    ],
    targetMistakeCategories: ['prepositions', 'sentence_structure'],
    linkedLessonIds: ['les_prepositions_workplace'],
  },
  {
    id: 'pro_negotiation',
    category: 'professional',
    titleEn: 'Negotiation',
    titleBn: 'পেশাদার নেগোসিয়েশন ও শর্ত আলোচনা',
    descriptionEn:
      'Negotiate project scope, timeline, and compensation for a freelance or consulting contract while preserving long-term partnership trust.',
    descriptionBn:
      'প্রজেক্টের সময়সীমা, কাজের পরিধি ও বাজেট নিয়ে পারস্পরিক লাভজনক শর্তে পেশাদার নেগোসিয়েশন করুন।',
    difficulty: 'professional',
    estimatedMinutes: 9,
    environmentNameEn: 'Executive Negotiation Suite',
    environmentNameBn: 'নেগোসিয়েশন সুইট',
    aiParticipantName: 'Claire Vance',
    aiParticipantRoleEn: 'Procurement & Partnerships Director',
    aiParticipantRoleBn: 'পার্টনারশিপ ডিরেক্টর',
    learnerRoleEn: 'Lead Consultant',
    learnerRoleBn: 'লিড কনসালট্যান্ট',
    targetSkills: ['Conditional Framing', 'Value Justification', 'Diplomatic Counter-Offers'],
    requiredTaskEn: 'Acknowledge budget constraints, justify your rate with value, propose a phased trade-off, and secure mutual agreement.',
    requiredTaskBn: 'বাজেট সীমাবদ্ধতা বুঝে নিজের কাজের মূল্য যুক্তিসহ তুলে ধরুন এবং ধাপে ধাপে সমঝোতার প্রস্তাব দিন।',
    completionCriteriaEn: 'Use diplomatic conditional phrasing ("If we adjust scope, we can...") without sounding combative.',
    completionCriteriaBn: 'কূটনৈতিক শর্তসাপেক্ষ বাক্য ব্যবহার করে উভয়পক্ষের গ্রহণযোগ্য সমাধানে পৌঁছান।',
    openingMessageEn:
      "We really liked your proposal and want to work together. The only sticking point is budget — our approved cap is 20% below your quote, and we still need the full rollout within four weeks. Can you meet us there?",
    openingMessageBn:
      'ক্লায়েন্ট আপনার প্রস্তাব পছন্দ করেছেন কিন্তু বাজেট ২০% কম এবং ৪ সপ্তাহে পুরো কাজ চান। কৌশলী ও পেশাদারভাবে নেগোসিয়েট করুন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Express enthusiasm while holding value', labelBn: 'আগ্রহ দেখিয়ে কাজের মান তুলে ধরা', criteriaEn: 'Affirms partnership interest while explaining what drives the quoted value.' },
      { id: 'obj_2', labelEn: 'Propose a structured scope/timeline trade-off', labelBn: 'স্কোপ বা সময়সূচির ভারসাম্য প্রস্তাব করা', criteriaEn: 'Uses conditional framing to offer a phased scope or adjusted timeline.' },
      { id: 'obj_3', labelEn: 'Explore the partner’s top priority', labelBn: 'অপর পক্ষের মূল অগ্রাধিকার জানা', criteriaEn: 'Asks which deliverable matters most in the first four weeks.' },
      { id: 'obj_4', labelEn: 'Confirm agreed terms professionally', labelBn: 'সমঝোতার শর্ত স্পষ্টভাবে নিশ্চিত করা', criteriaEn: 'Summarizes the mutually acceptable terms clearly.' },
    ],
    helpfulPhrasesEn: [
      "I'm excited about partnering with your team on this rollout.",
      'To stay within your budget cap without compromising quality, we could prioritize Phase 1 first.',
      'Which two deliverables are non-negotiable for the four-week launch?',
      'If we lock Phase 1 at that figure, we can review Phase 2 once results are live.',
    ],
    targetMistakeCategories: ['sentence_structure', 'vocabulary'],
    linkedLessonIds: ['les_interview_star', 'les_prepositions_workplace'],
  },
  {
    id: 'pro_networking',
    category: 'professional',
    titleEn: 'Networking',
    titleBn: 'পেশাদার নেটওয়ার্কিং ও সংযোগ স্থাপন',
    descriptionEn:
      'Connect with an industry speaker at a conference mixer, share your work concisely, ask an informed question, and propose a natural follow-up.',
    descriptionBn:
      'একটি কনফারেন্সে ইন্ডাস্ট্রি স্পিকারের সাথে পরিচিত হন, নিজের কাজ সংক্ষেপে বলুন এবং পরবর্তী যোগাযোগের সূত্র তৈরি করুন।',
    difficulty: 'intermediate',
    estimatedMinutes: 6,
    environmentNameEn: 'Tech & Innovation Summit Lounge',
    environmentNameBn: 'ইন্ডাস্ট্রি সামিট লাউঞ্জ',
    aiParticipantName: 'Dr. Kenji Sato',
    aiParticipantRoleEn: 'Keynote Speaker & AI Product Lead',
    aiParticipantRoleBn: 'কিনোট স্পিকার ও প্রোডাক্ট লিড',
    learnerRoleEn: 'Conference Attendee',
    learnerRoleBn: 'কনফারেন্স অংশগ্রহণকারী',
    targetSkills: ['Elevator Pitch', 'Insightful Questions', 'Professional Follow-up'],
    requiredTaskEn: 'Reference the speaker’s talk, deliver a 2-sentence introduction of your work, ask a specific question, and suggest staying connected.',
    requiredTaskBn: 'স্পিকারের বক্তব্যের প্রশংসা করুন, ২ বাক্যে নিজের কাজ বলুন, নির্দিষ্ট প্রশ্ন করুন এবং যোগাযোগ রাখার প্রস্তাব দিন।',
    completionCriteriaEn: 'Keep the pitch crisp, natural, and respectful of the speaker’s time.',
    completionCriteriaBn: 'সংক্ষিপ্ত, স্বাভাবিক ও পেশাদার ভঙ্গিতে অর্থবহ সংযোগ স্থাপন করুন।',
    openingMessageEn:
      "Thanks for stopping by! Glad you caught the afternoon panel — it was a lively discussion. What brought you to the summit this year?",
    openingMessageBn:
      'কিনোট স্পিকার ড. কেনজি সাতো আপনার সাথে কথা বলতে আগ্রহী। নিজের কাজ সংক্ষেপে বলুন এবং প্রাসঙ্গিক প্রশ্ন করুন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Reference a takeaway & introduce yourself', labelBn: 'আলাপ শুরু ও সংক্ষিপ্ত পরিচয় দেওয়া', criteriaEn: 'Connects to the talk and gives a concise professional intro.' },
      { id: 'obj_2', labelEn: 'Ask a thoughtful domain question', labelBn: 'বিষয়ভিত্তিক মানসম্মত প্রশ্ন করা', criteriaEn: 'Asks a relevant question showing genuine engagement.' },
      { id: 'obj_3', labelEn: 'Respond smoothly to his follow-up', labelBn: 'তার পাল্টা প্রশ্নের সাবলীল উত্তর দেওয়া', criteriaEn: 'Shares relevant experience clearly without rambling.' },
      { id: 'obj_4', labelEn: 'Propose a natural follow-up connection', labelBn: 'পরবর্তী যোগাযোগের ভদ্র প্রস্তাব দেওয়া', criteriaEn: 'Politely asks to connect on LinkedIn or exchange emails.' },
    ],
    helpfulPhrasesEn: [
      'Your point about practical adoption really resonated with our team.',
      'I work on... and we are currently exploring...',
      'How did your team approach the early rollout challenges?',
      'Would you mind if I connected with you on LinkedIn to follow your work?',
    ],
    targetMistakeCategories: ['verb_tense', 'vocabulary'],
    linkedLessonIds: ['les_present_perfect_since'],
  },

  // ======================== D. CUSTOMER COMMUNICATION (5) ========================
  {
    id: 'cust_customer_support',
    category: 'customer_communication',
    titleEn: 'Customer Support',
    titleBn: 'কাস্টমার সাপোর্ট সহায়তা',
    descriptionEn:
      'Contact technical support because your online subscription billed twice and locked your account. Provide clear facts and get both issues resolved.',
    descriptionBn:
      'অ্যাকাউন্ট লক হওয়া এবং দুবার চার্জ কাটার সমস্যা সমাধানে কাস্টমার সাপোর্টের সাথে স্পষ্ট ও কার্যকরভাবে কথা বলুন।',
    difficulty: 'intermediate',
    estimatedMinutes: 7,
    environmentNameEn: 'Live Customer Support Desk',
    environmentNameBn: 'কাস্টমার সাপোর্ট ডেস্ক',
    aiParticipantName: 'Jordan Ellis',
    aiParticipantRoleEn: 'Senior Support Specialist',
    aiParticipantRoleBn: 'সিনিয়র সাপোর্ট স্পেশালিস্ট',
    learnerRoleEn: 'Account Holder',
    learnerRoleBn: 'গ্রাহক',
    targetSkills: ['Describing Issues Clearly', 'Providing Evidence', 'Confirming Timelines'],
    requiredTaskEn: 'Explain both the duplicate charge and account lock clearly, answer verification questions, and confirm refund and access restoration timelines.',
    requiredTaskBn: 'দ্বিগুণ বিল ও অ্যাকাউন্ট লকের সমস্যা স্পষ্ট করে বলুন এবং সমাধানের সময়সীমা নিশ্চিত করুন।',
    completionCriteriaEn: 'Present facts chronologically and obtain concrete next steps and a ticket reference.',
    completionCriteriaBn: 'ধারাবাহিকভাবে তথ্য উপস্থাপন করে সমাধানের সময় ও টিকিট নম্বর নিশ্চিত করুন।',
    openingMessageEn:
      "Hello, thank you for reaching CloudSuite Support — my name is Jordan. I see you flagged an urgent billing and access issue. Could you walk me through what happened?",
    openingMessageBn:
      'কাস্টমার সাপোর্ট এজেন্ট জর্ডান আপনার বিলিং ও অ্যাকাউন্ট লকের সমস্যাটি জানতে চাইছেন। স্পষ্টভাবে ব্যাখ্যা করুন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Describe both billing & access issues', labelBn: 'দ্বিগুণ চার্জ ও লক সমস্যা ব্যাখ্যা করা', criteriaEn: 'Clearly states both the double charge and the locked account.' },
      { id: 'obj_2', labelEn: 'Provide specific dates or transaction details', labelBn: 'তারিখ ও লেনদেনের তথ্য দেওয়া', criteriaEn: 'Answers Jordan’s verification/timeline questions accurately.' },
      { id: 'obj_3', labelEn: 'Confirm refund & unlock timeline', labelBn: 'রিফান্ড ও অ্যাকাউন্ট আনলকের সময় জানা', criteriaEn: 'Asks how soon access is restored and when the duplicate charge is refunded.' },
      { id: 'obj_4', labelEn: 'Request written confirmation or ticket ID', labelBn: 'লিখিত নিশ্চয়তা বা টিকিট আইডি চাওয়া', criteriaEn: 'Asks for an email confirmation or case number before closing.' },
    ],
    helpfulPhrasesEn: [
      'Yesterday I was charged twice for my monthly plan, and now my account is locked.',
      'Both charges appeared on my statement on May 14.',
      'How long will it take to restore my access and refund the duplicate charge?',
      'Could you email me the support ticket number for reference?',
    ],
    targetMistakeCategories: ['verb_tense', 'articles'],
    linkedLessonIds: ['les_past_simple_stories'],
  },
  {
    id: 'cust_making_complaint',
    category: 'customer_communication',
    titleEn: 'Making a Complaint',
    titleBn: 'পেশাদারভাবে অভিযোগ জানানো',
    descriptionEn:
      'Report a damaged online appliance delivery firmly but respectfully, documenting the defect and requesting a prompt replacement.',
    descriptionBn:
      'ক্ষতিগ্রস্ত ডেলিভারি পণ্যের ব্যাপারে শান্ত কিন্তু দৃঢ়ভাবে অভিযোগ জানান এবং দ্রুত রিপ্লেসমেন্ট চান।',
    difficulty: 'intermediate',
    estimatedMinutes: 7,
    environmentNameEn: 'Retail Resolution Center',
    environmentNameBn: 'কাস্টমার রেজোলিউশন সেন্টার',
    aiParticipantName: 'Hannah Brooks',
    aiParticipantRoleEn: 'Customer Resolution Supervisor',
    aiParticipantRoleBn: 'রেজোলিউশন সুপারভাইজার',
    learnerRoleEn: 'Dissatisfied Customer',
    learnerRoleBn: 'অসন্তুষ্ট গ্রাহক',
    targetSkills: ['Assertive Politeness', 'Problem Description', 'Negotiating Resolution'],
    requiredTaskEn: 'State what arrived damaged, stay calm when offered an insufficient voucher, and assertively secure a replacement or pickup.',
    requiredTaskBn: 'ক্ষতির বিবরণ দিন, অপ্রতুল ভাউচার প্রত্যাখ্যান করে ভদ্রভাবে রিপ্লেসমেন্ট ও পিকআপ নিশ্চিত করুন।',
    completionCriteriaEn: 'Maintain firm, respectful tone while securing a fair concrete resolution.',
    completionCriteriaBn: 'ভদ্র কিন্তু দৃঢ় স্বরে ন্যায্য রিপ্লেসমেন্ট বা সমাধান আদায় করুন।',
    openingMessageEn:
      "Good afternoon, Resolution Center, Hannah speaking. I understand there was an issue with your recent delivery — could you tell me what happened?",
    openingMessageBn:
      'ডেলিভারি সমস্যার সুপারভাইজার হান্না আপনার অভিযোগ শুনতে প্রস্তুত। শান্ত ও দৃঢ়ভাবে ক্ষতির বিবরণ দিন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Explain the defect & delivery details', labelBn: 'পণ্যের ক্ষতির স্পষ্ট বিবরণ দেওয়া', criteriaEn: 'Clearly describes the item, when it arrived, and the exact damage.' },
      { id: 'obj_2', labelEn: 'Express dissatisfaction firmly yet politely', labelBn: 'ভদ্র কিন্তু দৃঢ়ভাবে অসন্তোষ জানানো', criteriaEn: 'Communicates frustration constructively without aggressive language.' },
      { id: 'obj_3', labelEn: 'Push back on an inadequate partial offer', labelBn: 'অপ্রতুল সমাধানে ভদ্র আপত্তি জানানো', criteriaEn: 'Politely declines a small store voucher and explains why replacement is needed.' },
      { id: 'obj_4', labelEn: 'Confirm pickup & replacement schedule', labelBn: 'রিপ্লেসমেন্ট ও পিকআপ সময় নিশ্চিত করা', criteriaEn: 'Confirms return shipping cost waiver and delivery timeline.' },
    ],
    helpfulPhrasesEn: [
      'My order arrived yesterday with a cracked housing and will not power on.',
      'I appreciate the voucher offer, but I really need a working replacement at no extra cost.',
      'Could you arrange a free courier pickup for the damaged unit?',
      'When can I expect the replacement to arrive?',
    ],
    targetMistakeCategories: ['articles', 'word_order'],
    linkedLessonIds: ['les_svo_order', 'les_questions_do_does'],
  },
  {
    id: 'cust_requesting_refund',
    category: 'customer_communication',
    titleEn: 'Requesting a Refund',
    titleBn: 'রিফান্ড অনুরোধ করা',
    descriptionEn:
      'Request a full refund for a canceled workshop whose rescheduled date conflicts with your schedule, navigating policy pushback gracefully.',
    descriptionBn:
      'বাতিল হওয়া ওয়ার্কশপের পুনর্নির্ধারিত তারিখে অংশ নেওয়া সম্ভব না হওয়ায় পলিসি বুঝিয়ে সম্পূর্ণ রিফান্ড চান।',
    difficulty: 'intermediate',
    estimatedMinutes: 7,
    environmentNameEn: 'Event Billing & Refunds Desk',
    environmentNameBn: 'বিলিং ও রিফান্ড ডেস্ক',
    aiParticipantName: 'Kevin Morales',
    aiParticipantRoleEn: 'Billing Representative',
    aiParticipantRoleBn: 'বিলিং প্রতিনিধি',
    learnerRoleEn: 'Ticket Purchaser',
    learnerRoleBn: 'টিকিট ক্রেতা',
    targetSkills: ['Policy Reasoning', 'Polite Persistence', 'Clear Requests'],
    requiredTaskEn: 'State your booking and the organizer’s date change, politely decline credit-only policy, and confirm refund method and timeframe.',
    requiredTaskBn: 'তারিখ পরিবর্তনের কারণ তুলে ধরে ক্রেডিটের বদলে পূর্ণ রিফান্ড চান এবং সময়সীমা নিশ্চিত করুন।',
    completionCriteriaEn: 'Present logical grounds for a refund and verify exact processing days.',
    completionCriteriaBn: 'যুক্তিসহ রিফান্ডের দাবি জানিয়ে প্রক্রিয়াকরণের সময় নিশ্চিত করুন।',
    openingMessageEn:
      "Hi there, this is Kevin in Billing. I see you're contacting us regarding your registration for next month's Design Systems Workshop. How can I assist you?",
    openingMessageBn:
      'বিলিং প্রতিনিধি কেভিন আপনার ওয়ার্কশপ রেজিস্ট্রেশন নিয়ে কথা বলছেন। রিফান্ডের কারণ ও অনুরোধ স্পষ্টভাবে জানান।',
    objectives: [
      { id: 'obj_1', labelEn: 'Explain why you are requesting a refund', labelBn: 'রিফান্ড চাওয়ার কারণ ব্যাখ্যা করা', criteriaEn: 'Explains that the organizer changed the date and the new date conflicts.' },
      { id: 'obj_2', labelEn: 'Counter a credit-only offer logically', labelBn: 'ক্রেডিট অফারের বিপরীতে যুক্তি দেওয়া', criteriaEn: 'Politely explains why store credit does not resolve an organizer-initiated change.' },
      { id: 'obj_3', labelEn: 'Confirm full refund to original payment method', labelBn: 'মূল পেমেন্ট মাধ্যমে রিফান্ড নিশ্চিত করা', criteriaEn: 'Verifies full amount and original card/bank return.' },
      { id: 'obj_4', labelEn: 'Verify processing timeframe & receipt', labelBn: 'সময়সীমা ও ইমেইল রসিদ নিশ্চিত করা', criteriaEn: 'Confirms how many business days it takes and asks for email proof.' },
    ],
    helpfulPhrasesEn: [
      'Since the workshop date was moved by the organizer, I can no longer attend.',
      'I understand your standard credit policy, but because the schedule changed on your end, I would like a full refund.',
      'Will the refund go back to my original card, and how many business days will it take?',
    ],
    targetMistakeCategories: ['prepositions', 'sentence_structure'],
    linkedLessonIds: ['les_prepositions_workplace'],
  },
  {
    id: 'cust_explaining_problem',
    category: 'customer_communication',
    titleEn: 'Explaining a Problem',
    titleBn: 'জটিল সমস্যা স্পষ্টভাবে ব্যাখ্যা করা',
    descriptionEn:
      'Explain a recurring home internet outage to an ISP technician in clear, structured steps so they can diagnose and schedule a repair.',
    descriptionBn:
      'বারবার ইন্টারনেট সংযোগ বিচ্ছিন্ন হওয়ার সমস্যাটি টেকনিশিয়ানকে ধাপে ধাপে স্পষ্ট করে বুঝিয়ে দিন।',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    environmentNameEn: 'Technical Diagnostics Call',
    environmentNameBn: 'টেকনিক্যাল সাপোর্ট কল',
    aiParticipantName: 'Samira Hassan',
    aiParticipantRoleEn: 'Network Support Technician',
    aiParticipantRoleBn: 'নেটওয়ার্ক টেকনিশিয়ান',
    learnerRoleEn: 'Home Internet Customer',
    learnerRoleBn: 'গ্রাহক',
    targetSkills: ['Cause & Effect', 'Chronological Clarity', 'Troubleshooting Vocabulary'],
    requiredTaskEn: 'Describe when and how often the outage happens, explain troubleshooting steps already tried, and schedule a technician visit.',
    requiredTaskBn: 'কখন ও কতবার সংযোগ বিচ্ছিন্ন হয়, কী কী সমাধান চেষ্টা করেছেন তা বলুন এবং টেকনিশিয়ান ভিজিট ঠিক করুন।',
    completionCriteriaEn: 'Give precise symptoms, past troubleshooting steps, and confirm a visit slot.',
    completionCriteriaBn: 'সঠিক লক্ষণ ও আগে করা চেষ্টা ব্যাখ্যা করে টেকনিশিয়ান আসার সময় ঠিক করুন।',
    openingMessageEn:
      "Hello, Samira here from FiberNet Technical Support. I see your line has been dropping intermittently — can you describe exactly what happens and what you've already tried?",
    openingMessageBn:
      'টেকনিশিয়ান সামিরা জানতে চাইছেন আপনার ইন্টারনেট সমস্যাটি ঠিক কীভাবে হচ্ছে এবং আপনি ইতিমধ্যে কী চেষ্টা করেছেন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Describe exact symptoms & frequency', labelBn: 'সমস্যার লক্ষণ ও সময়কাল বলা', criteriaEn: 'Clearly states when the connection drops and what indicator lights show.' },
      { id: 'obj_2', labelEn: 'State troubleshooting already attempted', labelBn: 'ইতিমধ্যে করা চেষ্টা জানানো', criteriaEn: 'Explains restarting router or testing cables using accurate past/present perfect.' },
      { id: 'obj_3', labelEn: 'Clarify impact & urgency', labelBn: 'সমস্যার প্রভাব ও গুরুত্ব বলা', criteriaEn: 'Explains why reliable service is needed (e.g., remote work calls).' },
      { id: 'obj_4', labelEn: 'Confirm technician appointment window', labelBn: 'টেকনিশিয়ান ভিজিটের সময় নিশ্চিত করা', criteriaEn: 'Agrees on an appointment window and contact number.' },
    ],
    helpfulPhrasesEn: [
      'Our connection has been dropping every evening around 8 PM for the past three days.',
      'I already restarted the router and checked the fiber cable, but the red light stays on.',
      'I work remotely, so I really need a stable line before Monday.',
      'Tomorrow morning between 9 and 11 AM works best for me.',
    ],
    targetMistakeCategories: ['verb_tense', 'prepositions'],
    linkedLessonIds: ['les_present_perfect_since', 'les_past_simple_stories'],
  },
  {
    id: 'cust_handling_difficult_customers',
    category: 'customer_communication',
    titleEn: 'Handling Difficult Customers',
    titleBn: 'অসন্তুষ্ট বা কঠিন ক্লায়েন্ট সামলানো',
    descriptionEn:
      'Step into the role of a service lead de-escalating a frustrated client whose shipment missed an event deadline — listen, validate, and restore trust.',
    descriptionBn:
      'সার্ভিস লিড হিসেবে ক্ষুব্ধ একজন ক্লায়েন্টের বিলম্বিত ডেলিভারির অভিযোগ শান্তভাবে শুনে সমস্যার সমাধান ও আস্থা পুনরুদ্ধার করুন।',
    difficulty: 'professional',
    estimatedMinutes: 9,
    environmentNameEn: 'Client Escalation Desk',
    environmentNameBn: 'ক্লায়েন্ট এসকেলেশন ডেস্ক',
    aiParticipantName: 'Gregory Vance',
    aiParticipantRoleEn: 'Frustrated Corporate Client',
    aiParticipantRoleBn: 'অসন্তুষ্ট কর্পোরেট ক্লায়েন্ট',
    learnerRoleEn: 'Customer Success Lead',
    learnerRoleBn: 'কাস্টমার সাকসেস লিড',
    targetSkills: ['De-Escalation', 'Empathy Statements', 'Ownership Language', 'Solution Framing'],
    requiredTaskEn: 'Acknowledge the client’s frustration empathetically, take ownership without excuses, offer a concrete fast-track fix, and confirm follow-through.',
    requiredTaskBn: 'ক্লায়েন্টের বিরক্তি সহানুভূতির সাথে স্বীকার করুন, অজুহাত না দেখিয়ে দায়িত্ব নিন এবং দ্রুত সমাধান দিন।',
    completionCriteriaEn: 'De-escalate tension through empathetic validation and concrete corrective commitments.',
    completionCriteriaBn: 'সহানুভূতিশীল ভাষা ও সুনির্দিষ্ট সমাধানের মাধ্যমে পরিস্থিতি শান্ত করে আস্থা ফিরিয়ে আনুন।',
    openingMessageEn:
      "Honestly, this is completely unacceptable! We paid extra for guaranteed delivery before tomorrow's trade show, and your tracking portal just pushed our materials to next Monday. What are you going to do about this?",
    openingMessageBn:
      'কর্পোরেট ক্লায়েন্ট গ্রেগরি খুবই ক্ষুব্ধ কারণ তার ট্রেড শো-এর মালামাল দেরি হচ্ছে। শান্ত, সহানুভূতিশীল ও সমাধানমুখী উত্তর দিন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Validate frustration with genuine empathy', labelBn: 'সহানুভূতির সাথে বিরক্তি স্বীকার করা', criteriaEn: 'Acknowledges the high stakes of the trade show without sounding defensive.' },
      { id: 'obj_2', labelEn: 'Take clear ownership without blaming others', labelBn: 'অজুহাত ছাড়া দায়িত্ব নেওয়া', criteriaEn: 'Avoids blaming the courier and owns solving the problem.' },
      { id: 'obj_3', labelEn: 'Offer an immediate recovery option', labelBn: 'তাৎক্ষণিক সমাধান বিকল্প দেওয়া', criteriaEn: 'Proposes express courier, local print backup, or fee waiver concretely.' },
      { id: 'obj_4', labelEn: 'Commit to proactive follow-up', labelBn: 'নিয়মিত আপডেটের প্রতিশ্রুতি দেওয়া', criteriaEn: 'Commits to calling/emailing back by an exact hour with tracking proof.' },
    ],
    helpfulPhrasesEn: [
      'I completely understand why you are frustrated — missing a trade show deadline is serious.',
      'You have my full attention, and I am taking personal ownership of fixing this today.',
      'Here is what I can arrange right now: same-day express dispatch plus a full shipping refund.',
      'I will personally call you back within 45 minutes with the courier confirmation.',
    ],
    targetMistakeCategories: ['sentence_structure', 'vocabulary'],
    linkedLessonIds: ['les_prepositions_workplace', 'les_interview_star'],
  },

  // ======================== E. EDUCATION (4) ========================
  {
    id: 'edu_classroom_discussion',
    category: 'education',
    titleEn: 'Classroom Discussion',
    titleBn: 'ক্লাসরুম ও সেমিনার আলোচনা',
    descriptionEn:
      'Contribute to a university seminar debating whether AI tutoring tools improve or weaken independent critical thinking.',
    descriptionBn:
      'বিশ্ববিদ্যালয় সেমিনারে AI টিউটরিং টুলস নিয়ে যুক্তিনির্ভর মতামত দিন এবং সহপাঠীর মতের সাথে ভদ্রভাবে সহমত বা দ্বিমত প্রকাশ করুন।',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    environmentNameEn: 'University Seminar Room',
    environmentNameBn: 'বিশ্ববিদ্যালয় সেমিনার কক্ষ',
    aiParticipantName: 'Prof. Amara Okafor',
    aiParticipantRoleEn: 'Seminar Instructor',
    aiParticipantRoleBn: 'সেমিনার অধ্যাপক',
    learnerRoleEn: 'Seminar Student',
    learnerRoleBn: 'শিক্ষার্থী',
    targetSkills: ['Opinion Framing', 'Polite Disagreement', 'Evidence Connectors'],
    requiredTaskEn: 'State a clear position, support it with one real example, respond respectfully to an opposing viewpoint, and summarize your stance.',
    requiredTaskBn: 'নিজের অবস্থান স্পষ্ট করুন, উদাহরণ দিন এবং বিপরীত যুক্তির ভদ্র জবাব দিন।',
    completionCriteriaEn: 'Use discourse markers ("However", "On the other hand") and respectful academic register.',
    completionCriteriaBn: 'একাডেমিক সংযোগকারী শব্দ ব্যবহার করে ভারসাম্যপূর্ণ যুক্তি উপস্থাপন করুন।',
    openingMessageEn:
      "Welcome back to seminar, everyone. Today we're examining AI study assistants in higher education. One classmate just argued they make students lazy — what's your perspective?",
    openingMessageBn:
      'অধ্যাপক আমারা AI স্টাডি অ্যাসিস্ট্যান্ট নিয়ে আপনার মতামত ও যুক্তি জানতে চাইছেন।',
    objectives: [
      { id: 'obj_1', labelEn: 'State a clear, nuanced position', labelBn: 'স্পষ্ট ও ভারসাম্যপূর্ণ মতামত দেওয়া', criteriaEn: 'Takes a clear stance rather than a vague one-word reply.' },
      { id: 'obj_2', labelEn: 'Support with a concrete example', labelBn: 'বাস্তব উদাহরণ দিয়ে যুক্তি দেওয়া', criteriaEn: 'Provides a specific learning scenario illustrating their point.' },
      { id: 'obj_3', labelEn: 'Address a counter-argument respectfully', labelBn: 'বিপরীত যুক্তির ভদ্র জবাব দেওয়া', criteriaEn: 'Acknowledges the opposing risk and responds thoughtfully.' },
      { id: 'obj_4', labelEn: 'Use academic connectors coherently', labelBn: 'একাডেমিক সংযোগকারী শব্দ ব্যবহার', criteriaEn: 'Links ideas smoothly using connectors like "although", "however", or "for instance".' },
    ],
    helpfulPhrasesEn: [
      'I partially agree with that concern, although it depends heavily on how the tool is used.',
      'For instance, when students use feedback to revise their own work, retention improves.',
      'On the other hand, relying on generated answers without reflection does weaken skills.',
    ],
    targetMistakeCategories: ['sentence_structure', 'vocabulary'],
    linkedLessonIds: ['les_svo_order'],
  },
  {
    id: 'edu_asking_questions',
    category: 'education',
    titleEn: 'Asking Questions',
    titleBn: 'ক্লাস বা অফিস আওয়ারে প্রশ্ন করা',
    descriptionEn:
      'Visit your professor during office hours to ask targeted clarification questions about an upcoming research assignment and grading rubric.',
    descriptionBn:
      'অফিস আওয়ারে অধ্যাপকের কাছে রিসার্চ অ্যাসাইনমেন্ট ও মূল্যায়ন রুব্রিক সম্পর্কে সুনির্দিষ্ট প্রশ্ন করুন।',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    environmentNameEn: 'Faculty Office Hours',
    environmentNameBn: 'ফ্যাকাল্টি অফিস আওয়ার',
    aiParticipantName: 'Dr. Liam Gallagher',
    aiParticipantRoleEn: 'Course Lecturer',
    aiParticipantRoleBn: 'কোর্স লেকচারার',
    learnerRoleEn: 'Student',
    learnerRoleBn: 'শিক্ষার্থী',
    targetSkills: ['Question Word Order', 'Clarification', 'Paraphrasing'],
    requiredTaskEn: 'Explain which part of the brief is unclear, ask two specific questions about scope/sources, paraphrase the professor’s guidance, and thank them.',
    requiredTaskBn: 'অস্পষ্ট অংশটি বলুন, দুটি সুনির্দিষ্ট প্রশ্ন করুন এবং অধ্যাপকের নির্দেশনা নিজের ভাষায় নিশ্চিত করুন।',
    completionCriteriaEn: 'Form grammatically accurate direct/indirect questions and confirm understanding.',
    completionCriteriaBn: 'সঠিক প্রশ্নবোধক বাক্যগঠনে নির্দেশনা বুঝে নিশ্চিত করুন।',
    openingMessageEn:
      "Come on in! Glad you stopped by office hours before the paper is due next week. Which part of the research assignment would you like to go over?",
    openingMessageBn:
      'লেকচারার ড. লিয়াম অফিস আওয়ারে আপনার রিসার্চ অ্যাসাইনমেন্টের প্রশ্ন শুনতে প্রস্তুত।',
    objectives: [
      { id: 'obj_1', labelEn: 'Pinpoint the confusing requirement', labelBn: 'অস্পষ্ট অংশটি নির্দিষ্ট করা', criteriaEn: 'Identifies a specific section of the assignment rather than saying "everything".' },
      { id: 'obj_2', labelEn: 'Ask about sources or methodology', labelBn: 'উৎস বা পদ্ধতি সম্পর্কে প্রশ্ন করা', criteriaEn: 'Uses accurate question word order to ask about sources, length, or citations.' },
      { id: 'obj_3', labelEn: 'Paraphrase guidance to verify accuracy', labelBn: 'নির্দেশনা নিজের ভাষায় নিশ্চিত করা', criteriaEn: 'Summarizes what Dr. Gallagher explained to check understanding.' },
      { id: 'obj_4', labelEn: 'Close courteously', labelBn: 'ভদ্রভাবে ধন্যবাদ জানানো', criteriaEn: 'Thanks the professor for their time politely.' },
    ],
    helpfulPhrasesEn: [
      'Could you clarify how many peer-reviewed sources we need to include?',
      'Should we focus on one local case study or compare two regions?',
      'So if I understand correctly, the literature review should be around 500 words?',
      'That makes much more sense — thank you for your time!',
    ],
    targetMistakeCategories: ['word_order', 'articles'],
    linkedLessonIds: ['les_questions_do_does'],
  },
  {
    id: 'edu_academic_presentation',
    category: 'education',
    titleEn: 'Academic Presentation',
    titleBn: 'একাডেমিক প্রেজেন্টেশন ও ভর্তি সাক্ষাৎকার',
    descriptionEn:
      'Present your research proposal to a graduate admissions & thesis panel, explaining your methodology, motivation, and real-world impact.',
    descriptionBn:
      'স্নাতকোত্তর ভর্তি বা থিসিস কমিটির সামনে আপনার গবেষণার বিষয়, পদ্ধতি ও বাস্তব প্রভাব একাডেমিক ইংরেজিতে তুলে ধরুন।',
    difficulty: 'advanced',
    estimatedMinutes: 9,
    environmentNameEn: 'Graduate Research Colloquium',
    environmentNameBn: 'গ্র্যাজুয়েট রিসার্চ কলোকিয়াম',
    aiParticipantName: 'Prof. Catherine Wu',
    aiParticipantRoleEn: 'Graduate Admissions & Thesis Chair',
    aiParticipantRoleBn: 'গ্র্যাজুয়েট অ্যাডমিশন ও থিসিস চেয়ার',
    learnerRoleEn: 'Research Presenter / Applicant',
    learnerRoleBn: 'গবেষক / প্রার্থী',
    targetSkills: ['Academic Collocations', 'Complex Clauses', 'Defending Methodology'],
    requiredTaskEn: 'Introduce your research question, connect past preparation, defend a methodological limitation, and articulate expected impact.',
    requiredTaskBn: 'গবেষণার মূল প্রশ্ন, পূর্বের প্রস্তুতি, সীমাবদ্ধতার উত্তর এবং প্রত্যাশিত প্রভাব ব্যাখ্যা করুন।',
    completionCriteriaEn: 'Use precise academic vocabulary and coherent multi-clause reasoning.',
    completionCriteriaBn: 'সঠিক একাডেমিক শব্দভাণ্ডার ও যুক্তিসংগত জটিল বাক্যে উপস্থাপনা সম্পন্ন করুন।',
    openingMessageEn:
      "Welcome to the colloquium! We read your abstract with interest. In your own words, what exact research problem are you investigating, and how has your background prepared you to tackle it?",
    openingMessageBn:
      'অধ্যাপক ক্যাথরিন উ আপনার গবেষণার মূল সমস্যা এবং আপনার প্রস্তুতি নিজের ভাষায় শুনতে চাইছেন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Define research problem concisely', labelBn: 'গবেষণার সমস্যা স্পষ্টভাবে বলা', criteriaEn: 'States a clear, focused research question or thesis topic.' },
      { id: 'obj_2', labelEn: 'Connect past academic or practical work', labelBn: 'পূর্বের অভিজ্ঞতা যুক্ত করা', criteriaEn: 'Links prior coursework, projects, or work using accurate tenses.' },
      { id: 'obj_3', labelEn: 'Respond to a methodology critique', labelBn: 'গবেষণা পদ্ধতির প্রশ্নের উত্তর দেওয়া', criteriaEn: 'Addresses sample size, scope, or weakness honestly and constructively.' },
      { id: 'obj_4', labelEn: 'Articulate real-world or scholarly impact', labelBn: 'বাস্তব বা একাডেমিক প্রভাব ব্যাখ্যা করা', criteriaEn: 'Explains why the findings matter using precise academic collocations.' },
    ],
    helpfulPhrasesEn: [
      'My research examines how... affects...',
      'I have been investigating this area for two years through...',
      'That is an important methodological limitation; to mitigate it, I plan to...',
      'Ultimately, this work aims to make a practical contribution to...',
    ],
    targetMistakeCategories: ['vocabulary', 'sentence_structure'],
    linkedLessonIds: ['les_present_perfect_since', 'les_interview_star'],
    legacyAliasId: 'university_admission_interview',
  },
  {
    id: 'edu_group_project_discussion',
    category: 'education',
    titleEn: 'Group Project Discussion',
    titleBn: 'গ্রুপ প্রজেক্ট ও দলগত সমন্বয়',
    descriptionEn:
      'Coordinate with a university project teammate to divide tasks fairly, address a missed milestone diplomatically, and lock the rehearsal plan.',
    descriptionBn:
      'বিশ্ববিদ্যালয় গ্রুপ প্রজেক্টে কাজ বণ্টন করুন, বিলম্বিত অংশটি ভদ্রভাবে সমাধান করুন এবং চূড়ান্ত অনুশীলনের সময় ঠিক করুন।',
    difficulty: 'intermediate',
    estimatedMinutes: 7,
    environmentNameEn: 'Campus Innovation Library Pod',
    environmentNameBn: 'ক্যাম্পাস লাইব্রেরি স্টাডি পড',
    aiParticipantName: 'Tariq Rahman',
    aiParticipantRoleEn: 'Project Teammate',
    aiParticipantRoleBn: 'প্রজেক্ট সহপাঠী',
    learnerRoleEn: 'Team Coordinator',
    learnerRoleBn: 'টিম সমন্বয়কারী',
    targetSkills: ['Collaborative Suggestions', 'Diplomatic Feedback', 'Task Ownership'],
    requiredTaskEn: 'Check progress kindly, rebalance remaining workload fairly, agree on a draft review deadline, and confirm presentation roles.',
    requiredTaskBn: 'অগ্রগতি জানুন, বাকি কাজ ন্যায্যভাবে ভাগ করুন এবং ড্রাফট ও প্রেজেন্টেশন দায়িত্ব চূড়ান্ত করুন।',
    completionCriteriaEn: 'Use constructive collaborative phrasing ("How about we...", "Could you take...") to reach concrete alignment.',
    completionCriteriaBn: 'সহযোগিতামূলক ভাষায় সকলের দায়িত্ব ও সময়সূচি চূড়ান্ত করুন।',
    openingMessageEn:
      "Hey! Sorry I'm running five minutes behind. Our group presentation is in four days and I haven't finished the data slides yet — where are we with the rest of the project?",
    openingMessageBn:
      'সহপাঠী তারিক ডেটা স্লাইড এখনো শেষ করেননি আর প্রেজেন্টেশন ৪ দিন পর। ভদ্রভাবে কাজ ভাগ করে সময়সূচি ঠিক করুন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Share your progress & check blockers kindly', labelBn: 'অগ্রগতি জানানো ও বাধা বোঝা', criteriaEn: 'Reports their own completed part and asks what is blocking Tariq without hostility.' },
      { id: 'obj_2', labelEn: 'Propose fair task division', labelBn: 'ন্যায্য কাজ বণ্টন প্রস্তাব করা', criteriaEn: 'Suggests a clear, realistic split of remaining slides/research.' },
      { id: 'obj_3', labelEn: 'Set a concrete draft deadline', labelBn: 'ড্রাফট জমা দেওয়ার নির্দিষ্ট সময় ঠিক করা', criteriaEn: 'Agrees on an exact day and hour to merge slides.' },
      { id: 'obj_4', labelEn: 'Schedule a quick practice run', labelBn: 'সংক্ষিপ্ত অনুশীলনের সময় ঠিক করা', criteriaEn: 'Confirms when to rehearse together before presentation day.' },
    ],
    helpfulPhrasesEn: [
      'No worries — I finished the introduction and case study sections.',
      'Would it help if I format the charts while you finalize the key takeaways?',
      'How about we combine everything by Wednesday at 6 PM?',
      'Let’s do a quick 15-minute dry run on Thursday morning.',
    ],
    targetMistakeCategories: ['word_order', 'prepositions'],
    linkedLessonIds: ['les_prepositions_workplace'],
  },

  // ======================== F. EMERGENCY & PRACTICAL SITUATIONS (4) ========================
  {
    id: 'emerg_asking_for_help',
    category: 'emergency_practical',
    titleEn: 'Asking for Help',
    titleBn: 'জরুরি সাহায্য চাওয়া',
    descriptionEn:
      'Your phone battery died and your transit card stopped working at an unfamiliar evening station. Ask station staff clearly for immediate practical assistance.',
    descriptionBn:
      'অপরিচিত স্টেশনে ফোনের চার্জ শেষ ও ট্রানজিট কার্ড কাজ না করলে স্টেশন কর্মীর কাছ থেকে স্পষ্ট ও শান্তভাবে সাহায্য চান।',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    environmentNameEn: 'Metro Station Help Booth',
    environmentNameBn: 'মেট্রো স্টেশন হেল্প বুথ',
    aiParticipantName: 'Officer Ben Carter',
    aiParticipantRoleEn: 'Station Assistance Officer',
    aiParticipantRoleBn: 'স্টেশন অ্যাসিস্ট্যান্স অফিসার',
    learnerRoleEn: 'Stranded Commuter',
    learnerRoleBn: 'বিপদে পড়া যাত্রী',
    targetSkills: ['Urgent Clarity', 'Polite Direct Requests', 'Following Instructions'],
    requiredTaskEn: 'State your urgent problem clearly, ask for both a charging/phone option and a single-ride ticket solution, and confirm directions.',
    requiredTaskBn: 'আপনার জরুরি সমস্যা স্পষ্ট করুন, ফোন চার্জ ও টিকিটের সমাধান চান এবং দিকনির্দেশনা নিশ্চিত করুন।',
    completionCriteriaEn: 'Communicate urgent practical needs clearly and accurately without panic.',
    completionCriteriaBn: 'আতঙ্কিত না হয়ে স্পষ্ট ও সংক্ষিপ্ত বাক্যে প্রয়োজনীয় সহায়তা নিন।',
    openingMessageEn:
      "Evening! You look a bit worried — everything alright? I'm Ben at the Station Help Desk. How can I help you right now?",
    openingMessageBn:
      'স্টেশন অফিসার বেন আপনাকে সাহায্য করতে এগিয়ে এসেছেন। আপনার ফোন ও ট্রানজিট কার্ডের সমস্যা স্পষ্টভাবে জানান।',
    objectives: [
      { id: 'obj_1', labelEn: 'Explain the urgent situation clearly', labelBn: 'জরুরি পরিস্থিতি স্পষ্ট বলা', criteriaEn: 'States clearly that phone is dead and transit card failed.' },
      { id: 'obj_2', labelEn: 'Request a specific practical solution', labelBn: 'নির্দিষ্ট বাস্তব সাহায্য চাওয়া', criteriaEn: 'Asks how to buy an emergency single ticket or where to charge/call.' },
      { id: 'obj_3', labelEn: 'Confirm instructions accurately', labelBn: 'নির্দেশনা সঠিকভাবে নিশ্চিত করা', criteriaEn: 'Verifies platform, machine location, or steps Ben gives.' },
      { id: 'obj_4', labelEn: 'Express appreciation clearly', labelBn: 'কৃতজ্ঞতা প্রকাশ করা', criteriaEn: 'Thanks the officer courteously.' },
    ],
    helpfulPhrasesEn: [
      'Excuse me, I really need some help — my phone died and my transit card is not scanning.',
      'Is there a ticket machine that accepts cash, or a charging point nearby?',
      'Which platform goes toward Downtown?',
      'Thank you so much — I really appreciate your help.',
    ],
    targetMistakeCategories: ['word_order', 'articles'],
    linkedLessonIds: ['les_questions_do_does'],
  },
  {
    id: 'emerg_medical_assistance',
    category: 'emergency_practical',
    titleEn: 'Medical Assistance Communication',
    titleBn: 'চিকিৎসা সহায়তা ও উপসর্গ ব্যাখ্যা',
    descriptionEn:
      'Visit an urgent care clinic while traveling abroad to describe symptoms accurately, report duration and allergies, and understand dosage instructions.',
    descriptionBn:
      'ভ্রমণকালে ক্লিনিকে নিজের শারীরিক উপসর্গ, সময়কাল, অ্যালার্জি স্পষ্ট করে বলুন এবং ওষুধের নির্দেশনা বুঝে নিন।',
    difficulty: 'intermediate',
    estimatedMinutes: 7,
    environmentNameEn: 'Urgent Care Triage Room',
    environmentNameBn: 'আর্জেন্ট কেয়ার ট্রায়াজ রুম',
    aiParticipantName: 'Nurse Maya Singh',
    aiParticipantRoleEn: 'Triage Nurse',
    aiParticipantRoleBn: 'ট্রায়াজ নার্স',
    learnerRoleEn: 'Patient',
    learnerRoleBn: 'রোগী',
    targetSkills: ['Symptom Precision', 'Duration (Since/For)', 'Confirming Safety Instructions'],
    requiredTaskEn: 'Describe main symptoms and severity, state how long they have lasted, share medication allergies, and confirm next steps/dosage.',
    requiredTaskBn: 'উপসর্গ ও তীব্রতা বলুন, কতদিন ধরে হচ্ছে জানান, অ্যালার্জি উল্লেখ করুন এবং চিকিৎসার নির্দেশনা নিশ্চিত করুন।',
    completionCriteriaEn: 'Use accurate duration expressions ("for two days / since yesterday") and verify medical advice.',
    completionCriteriaBn: 'সঠিক সময়কাল (since/for) ও স্পষ্ট উপসর্গ জানিয়ে চিকিৎসার নির্দেশনা নিশ্চিত করুন।',
    openingMessageEn:
      "Hello, please have a seat. I'm Maya, the triage nurse. Take your time — what symptoms brought you in today, and when did they first start?",
    openingMessageBn:
      'ট্রায়াজ নার্স মায়া আপনার শারীরিক উপসর্গ ও কখন থেকে শুরু হয়েছে তা জানতে চাইছেন। স্পষ্ট করে বলুন।',
    objectives: [
      { id: 'obj_1', labelEn: 'Describe symptoms & severity clearly', labelBn: 'উপসর্গ ও তীব্রতা স্পষ্ট করা', criteriaEn: 'Names specific symptoms (fever, sore throat, dizziness, pain) clearly.' },
      { id: 'obj_2', labelEn: 'State exact duration using since/for', labelBn: 'since/for দিয়ে সময়কাল বলা', criteriaEn: 'States how long symptoms have persisted accurately.' },
      { id: 'obj_3', labelEn: 'Report allergies or current medications', labelBn: 'অ্যালার্জি বা চলমান ওষুধ জানানো', criteriaEn: 'Answers clearly about any drug allergies or medications already taken.' },
      { id: 'obj_4', labelEn: 'Confirm dosage or follow-up instructions', labelBn: 'ওষুধের নিয়ম ও পরবর্তী নির্দেশনা নিশ্চিত করা', criteriaEn: 'Asks or confirms when to take medicine or when to seek emergency care.' },
    ],
    helpfulPhrasesEn: [
      'I have had a high fever and a sharp sore throat since yesterday afternoon.',
      'I took paracetamol four hours ago, and I have no known drug allergies.',
      'Should I take this medicine after meals, and how many times a day?',
      'What warning signs mean I should come back immediately?',
    ],
    targetMistakeCategories: ['verb_tense', 'prepositions'],
    linkedLessonIds: ['les_present_perfect_since'],
  },
  {
    id: 'emerg_reporting_lost_item',
    category: 'emergency_practical',
    titleEn: 'Reporting a Lost Item',
    titleBn: 'হারানো জিনিস রিপোর্ট করা',
    descriptionEn:
      'You left your laptop bag containing your passport folder on an airport shuttle. Report exact details, appearance, and contact steps to Lost & Found.',
    descriptionBn:
      'এয়ারপোর্ট শাটলে হারিয়ে যাওয়া ল্যাপটপ ব্যাগ ও গুরুত্বপূর্ণ কাগজপত্রের বিস্তারিত তথ্য লস্ট অ্যান্ড ফাউন্ড ডেস্কে রিপোর্ট করুন।',
    difficulty: 'intermediate',
    estimatedMinutes: 7,
    environmentNameEn: 'Airport Lost & Found Office',
    environmentNameBn: 'এয়ারপোর্ট লস্ট অ্যান্ড ফাউন্ড অফিস',
    aiParticipantName: 'Carlos Mendez',
    aiParticipantRoleEn: 'Lost & Found Coordinator',
    aiParticipantRoleBn: 'লস্ট অ্যান্ড ফাউন্ড কোঅর্ডিনেটর',
    learnerRoleEn: 'Passenger Filing Report',
    learnerRoleBn: 'অভিযোগকারী যাত্রী',
    targetSkills: ['Descriptive Precision', 'Past Narrative', 'Reference Tracking'],
    requiredTaskEn: 'Report when and where the bag was last seen, describe distinguishing features and contents, provide contact details, and obtain a report reference.',
    requiredTaskBn: 'কখন ও কোথায় ব্যাগটি শেষ দেখেছেন, ব্যাগের বিবরণ ও ভেতরের জিনিস বলুন এবং রিপোর্ট নম্বর সংগ্রহ করুন।',
    completionCriteriaEn: 'Give exact past-tense timeline and vivid, identifiable description.',
    completionCriteriaBn: 'নির্ভুল Past Tense সময়ক্রম ও শনাক্তযোগ্য বিবরণ দিয়ে রিপোর্ট সম্পন্ন করুন।',
    openingMessageEn:
      "Airport Lost and Found, Carlos speaking. Don't panic — let's log this quickly so we can radio the shuttle drivers. What did you lose, and where did you last have it?",
    openingMessageBn:
      'লস্ট অ্যান্ড ফাউন্ড অফিসার কার্লোস দ্রুত রিপোর্ট করতে চাইছেন। কী হারিয়েছে এবং শেষ কোথায় দেখেছেন তা বলুন।',
    objectives: [
      { id: 'obj_1', labelEn: 'State what was lost, where & when', labelBn: 'কী, কখন ও কোথায় হারিয়েছে বলা', criteriaEn: 'Uses clear Past Simple to explain item, shuttle/terminal location, and approximate time.' },
      { id: 'obj_2', labelEn: 'Give distinguishing visual description', labelBn: 'ব্যাগের স্পষ্ট শনাক্তকারী বিবরণ দেওয়া', criteriaEn: 'Describes color, brand, size, or unique tag/sticker.' },
      { id: 'obj_3', labelEn: 'List critical contents safely', labelBn: 'গুরুত্বপূর্ণ জিনিসের তালিকা দেওয়া', criteriaEn: 'Mentions key items inside (laptop, folder, charger) clearly.' },
      { id: 'obj_4', labelEn: 'Confirm contact info & reference number', labelBn: 'যোগাযোগের তথ্য ও রেফারেন্স নম্বর নিশ্চিত করা', criteriaEn: 'Provides contact method and asks for the official case/report number.' },
    ],
    helpfulPhrasesEn: [
      'I left my dark gray backpack on the Terminal 2 shuttle about twenty minutes ago.',
      'It has a silver zipper and a blue luggage tag with my initials.',
      'Inside there is a 14-inch laptop and a black travel folder.',
      'Could I get the report reference number and know how you will contact me?',
    ],
    targetMistakeCategories: ['verb_tense', 'articles'],
    linkedLessonIds: ['les_past_simple_stories'],
    legacyAliasId: 'storytelling_under_pressure',
  },
  {
    id: 'emerg_explaining_urgent_problem',
    category: 'emergency_practical',
    titleEn: 'Explaining an Urgent Problem',
    titleBn: 'জরুরি সমস্যা দ্রুত ও স্পষ্টভাবে ব্যাখ্যা করা',
    descriptionEn:
      'Water is leaking rapidly from the ceiling pipe in your rented apartment. Call emergency building maintenance, convey urgency clearly, and follow safety steps.',
    descriptionBn:
      'ভাড়া বাসার সিলিং পাইপ থেকে দ্রুত পানি পড়ছে। জরুরি মেইনটেন্যান্স টিমকে পরিস্থিতি, ঝুঁকি ও ঠিকানা স্পষ্টভাবে জানিয়ে দ্রুত পদক্ষেপ নিন।',
    difficulty: 'advanced',
    estimatedMinutes: 7,
    environmentNameEn: '24/7 Building Emergency Dispatch',
    environmentNameBn: '২৪/৭ ইমার্জেন্সি মেইনটেন্যান্স ডিসপ্যাচ',
    aiParticipantName: 'Elena Brooks',
    aiParticipantRoleEn: 'Emergency Maintenance Dispatcher',
    aiParticipantRoleBn: 'ইমার্জেন্সি মেইনটেন্যান্স ডিসপ্যাচার',
    learnerRoleEn: 'Apartment Resident',
    learnerRoleBn: 'বাসিন্দা',
    targetSkills: ['Crisis Clarity', 'Location & Risk Reporting', 'Action Confirmation'],
    requiredTaskEn: 'Report the active leak and exact unit immediately, explain electrical/damage risks, respond to shutoff valve instructions, and confirm technician ETA.',
    requiredTaskBn: 'পাইপ লিক ও ফ্ল্যাটের অবস্থান দ্রুত জানান, বৈদ্যুতিক ঝুঁকি ব্যাখ্যা করুন এবং টেকনিশিয়ানের আসার সময় নিশ্চিত করুন।',
    completionCriteriaEn: 'Prioritize critical safety facts immediately and confirm concrete dispatch ETA.',
    completionCriteriaBn: 'সর্বোচ্চ জরুরি তথ্য প্রথমে দিয়ে নিরাপত্তা নির্দেশনা ও টেকনিশিয়ানের সময় নিশ্চিত করুন।',
    openingMessageEn:
      "24-hour Emergency Maintenance Dispatch, Elena speaking. What is your building and apartment number, and what is the urgent issue?",
    openingMessageBn:
      'ইমার্জেন্সি ডিসপ্যাচার এলেনা লাইনে আছেন। দ্রুত ফ্ল্যাট নম্বর, পানির লিকের অবস্থা ও ঝুঁকি জানান।',
    objectives: [
      { id: 'obj_1', labelEn: 'Report unit location & active leak', labelBn: 'ফ্ল্যাট নম্বর ও লিকের তীব্রতা বলা', criteriaEn: 'Immediately provides unit location and active water leak details.' },
      { id: 'obj_2', labelEn: 'Highlight safety or electrical hazards', labelBn: 'বৈদ্যুতিক বা ক্ষতির ঝুঁকি জানানো', criteriaEn: 'Alerts dispatcher to nearby power outlets, ceiling bulge, or spreading water.' },
      { id: 'obj_3', labelEn: 'Confirm interim safety step', labelBn: 'তাৎক্ষণিক নিরাপত্তা পদক্ষেপ নিশ্চিত করা', criteriaEn: 'Responds clearly to shutoff valve or breaker instructions.' },
      { id: 'obj_4', labelEn: 'Confirm emergency plumber ETA', labelBn: 'টেকনিশিয়ান পৌঁছানোর সময় নিশ্চিত করা', criteriaEn: 'Verifies exact estimated arrival time and access instructions.' },
    ],
    helpfulPhrasesEn: [
      "I'm in Building B, Apartment 402, and water is pouring from the kitchen ceiling pipe.",
      'It is spreading toward the electrical outlets, so we need someone urgently.',
      'I just turned off the main switch under the sink and placed buckets underneath.',
      'How soon can the emergency plumber arrive, and should I leave the lobby buzzer on?',
    ],
    targetMistakeCategories: ['verb_tense', 'sentence_structure'],
    linkedLessonIds: ['les_svo_order', 'les_past_simple_stories'],
  },
];

export const TRANSFER_UNIVERSE_SCENARIOS: TransferUniverseScenario[] =
  COMPACT_SCENARIO_SEEDS.map((seed) => ({
    ...seed,
    learningObjectivesEn: seed.objectives.map((o) => o.labelEn),
    learningObjectivesBn: seed.objectives.map((o) => o.labelBn),
    supportedModes: ['text', 'voice'],
    accentHex: CATEGORY_COLOR_MAP[seed.category],
  }));

export function getTransferCategoryMeta(category: TransferScenarioCategory): TransferCategoryMeta {
  return TRANSFER_CATEGORIES.find((c) => c.id === category) ?? TRANSFER_CATEGORIES[0];
}

export function getTransferUniverseScenario(
  id: TransferScenarioId
): TransferUniverseScenario | undefined {
  return TRANSFER_UNIVERSE_SCENARIOS.find(
    (s) => s.id === id || (s.legacyAliasId !== undefined && s.legacyAliasId === id)
  );
}

export function isValidTransferUniverseScenarioId(id: unknown): id is TransferScenarioId {
  if (typeof id !== 'string' || !id.trim()) return false;
  return Boolean(getTransferUniverseScenario(id));
}

export function createInitialObjectives(
  scenario: TransferUniverseScenario
): TransferObjectiveProgress[] {
  return scenario.objectives.map((obj) => ({
    objectiveId: obj.id,
    labelEn: obj.labelEn,
    labelBn: obj.labelBn,
    criteriaEn: obj.criteriaEn,
    status: 'not_started',
  }));
}

// ============================================================================
// Strictly Real Dashboard Metrics (Zero Fabricated Numbers)
// ============================================================================

export interface TransferDashboardMetrics {
  scenariosCompleted: number;
  totalAttempts: number;
  successfulTaskOutcomes: number;
  taskSuccessRatePercent: number | null;
  practiceMinutes: number;
  skillsAppliedCount: number;
  appliedSkillLabels: string[];
  recentImprovementDelta: number | null;
  hasSufficientImprovementData: boolean;
  uniqueCompletedScenarioIds: string[];
}

export function computeTransferDashboardMetrics(
  transferAttempts: TransferAttemptRecord[]
): TransferDashboardMetrics {
  if (transferAttempts.length === 0) {
    return {
      scenariosCompleted: 0,
      totalAttempts: 0,
      successfulTaskOutcomes: 0,
      taskSuccessRatePercent: null,
      practiceMinutes: 0,
      skillsAppliedCount: 0,
      appliedSkillLabels: [],
      recentImprovementDelta: null,
      hasSufficientImprovementData: false,
      uniqueCompletedScenarioIds: [],
    };
  }

  const completedIds = new Set<string>();
  const skillsSet = new Set<string>();
  let successfulTaskOutcomes = 0;
  let totalSeconds = 0;

  for (const att of transferAttempts) {
    const resolved = getTransferUniverseScenario(att.scenarioId);
    const canonicalId = resolved?.id ?? att.scenarioId;
    completedIds.add(canonicalId);
    totalSeconds += Math.max(0, att.durationSeconds || 0);

    const taskPassed =
      att.evaluation.part11Report?.taskOutcomeStatus === 'achieved' ||
      (att.passed && att.evaluation.task_completion.score >= 70);
    if (taskPassed) {
      successfulTaskOutcomes += 1;
    }

    if (resolved) {
      for (const skill of resolved.targetSkills) {
        skillsSet.add(skill);
      }
    } else if (att.targetSkillLabelEn) {
      skillsSet.add(att.targetSkillLabelEn);
    }
  }

  // Chronological oldest -> newest for honest recent improvement delta (requires >= 2 attempts)
  const chronological = [...transferAttempts].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  let recentImprovementDelta: number | null = null;
  const hasSufficientImprovementData = chronological.length >= 2;
  if (hasSufficientImprovementData) {
    const mid = Math.floor(chronological.length / 2);
    const earlier = chronological.slice(0, mid);
    const recent = chronological.slice(mid);
    const avg = (list: TransferAttemptRecord[]) =>
      list.reduce((sum, item) => sum + item.evaluation.overall_score, 0) / list.length;
    recentImprovementDelta = Math.round(avg(recent) - avg(earlier));
  }

  return {
    scenariosCompleted: completedIds.size,
    totalAttempts: transferAttempts.length,
    successfulTaskOutcomes,
    taskSuccessRatePercent: Math.round((successfulTaskOutcomes / transferAttempts.length) * 100),
    practiceMinutes: Math.max(1, Math.round(totalSeconds / 60)),
    skillsAppliedCount: skillsSet.size,
    appliedSkillLabels: Array.from(skillsSet),
    recentImprovementDelta,
    hasSufficientImprovementData,
    uniqueCompletedScenarioIds: Array.from(completedIds),
  };
}

// ============================================================================
// Scenario Universe Discovery: Status, Filtering, Search & Sorting
// ============================================================================

export type ScenarioProgressStatus = 'completed' | 'in_progress' | 'not_started';
export type ScenarioDurationFilter = 'all' | 'short' | 'medium' | 'extended';
export type ScenarioSortOption = 'recommended' | 'difficulty_asc' | 'duration_asc' | 'title_asc';

export interface ScenarioUniverseCardModel {
  scenario: TransferUniverseScenario;
  status: ScenarioProgressStatus;
  attemptCount: number;
  passedCount: number;
  bestScore: number | null;
  lastAttemptAt: string | null;
  isPersonalizedMatch: boolean;
  adaptationPriority: number;
  adaptationReasonEn: string | null;
  adaptationReasonBn: string | null;
}

export interface ScenarioFilterState {
  category: TransferScenarioCategory | 'all';
  difficulty: TransferDifficultyLevel | 'all';
  skill: string;
  duration: ScenarioDurationFilter;
  status: ScenarioProgressStatus | 'all';
  search: string;
  sortBy: ScenarioSortOption;
}

const DIFFICULTY_RANK: Record<TransferDifficultyLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  professional: 4,
};

export interface PersonalizedAdaptationBrief {
  recommendedScenario: TransferUniverseScenario;
  recommendedPressure: PressureLadderLevelId;
  sourceType: 'mistake_memory' | 'communication_dna' | 'academy_lesson' | 'baseline';
  sourceId?: string;
  targetSkillLabelEn: string;
  targetSkillLabelBn: string;
  headlineEn: string;
  headlineBn: string;
  rationaleEn: string;
  rationaleBn: string;
  inRoomCoachingCuesEn: string[];
  inRoomCoachingCuesBn: string[];
  linkedMistakePattern?: string;
  weakDnaSkillLabelEn?: string;
}

/**
 * Connects real Mistake Memory + Communication DNA + Academy Mastery into concrete,
 * honest Transfer Lab scenario recommendations and in-room adaptation guidance.
 */
export function buildPersonalizedTransferAdaptation(input: {
  mistakes: MistakeMemoryItem[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  transferAttempts: TransferAttemptRecord[];
  dnaSkills?: DnaSkillNode[];
}): PersonalizedAdaptationBrief {
  const { mistakes, lessonMastery, transferAttempts, dnaSkills = [] } = input;
  const activeMistakes = mistakes
    .filter((m) => !m.falseCorrectionReported && m.status !== 'resolved')
    .sort((a, b) => b.occurrences - a.occurrences);

  const weakDna = dnaSkills
    .filter((s) => s.scorePercent !== null && (s.visualState === 'needs_attention' || s.visualState === 'developing'))
    .sort((a, b) => (a.scorePercent ?? 100) - (b.scorePercent ?? 100));

  const recentLessons = Object.values(lessonMastery).sort(
    (a, b) => new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime()
  );

  // Determine pressure level progression safely
  const getRecommendedPressure = (scenarioId: TransferScenarioId): PressureLadderLevelId => {
    const passes = transferAttempts.filter((a) => {
      const resolved = getTransferUniverseScenario(a.scenarioId);
      return (resolved?.id === scenarioId || a.scenarioId === scenarioId) && a.passed;
    });
    if (passes.length === 0) return 'level_2_guided';
    if (passes.length === 1) return 'level_3_open';
    if (passes.length === 2) return 'level_4_twist';
    return 'level_5_timed_high_stakes';
  };

  // 1. Highest priority: Verified recurring Mistake Memory pattern
  if (activeMistakes.length > 0) {
    const topMistake = activeMistakes[0];
    const cat = classifyMistakeCategory(topMistake.category, topMistake.domain);
    const catMeta = getMistakeCategoryMeta(cat);

    // Pick a matching scenario (preferring uncompleted or lowest attempts)
    const matchingScenarios = TRANSFER_UNIVERSE_SCENARIOS.filter((s) =>
      s.targetMistakeCategories.includes(cat)
    ).sort((a, b) => {
      const aCount = transferAttempts.filter((t) => t.scenarioId === a.id).length;
      const bCount = transferAttempts.filter((t) => t.scenarioId === b.id).length;
      return aCount - bCount;
    });

    const chosen = matchingScenarios[0] ?? TRANSFER_UNIVERSE_SCENARIOS[0];
    const cuesEn: string[] = [
      `Target Mistake Pattern: "${topMistake.userExample}" → "${topMistake.correctedExample}"`,
      cat === 'verb_tense'
        ? 'The AI partner will prompt past, present, and future follow-ups so you practice tense accuracy live.'
        : cat === 'vocabulary'
          ? 'The AI partner will encourage precise domain vocabulary instead of generic filler words.'
          : cat === 'prepositions'
            ? 'Watch transitive verbs (discuss, order, return) and time/place prepositions during this dialogue.'
            : 'Focus on clear, polite sentence structure while completing each scenario objective.',
    ];
    const cuesBn: string[] = [
      `সংশোধনের লক্ষ্য: "${topMistake.userExample}" → "${topMistake.correctedExample}"`,
      `এই সিনারিওতে ${catMeta.labelBn} নির্ভুলভাবে প্রয়োগ করার বাস্তব সুযোগ তৈরি করা হবে।`,
    ];

    return {
      recommendedScenario: chosen,
      recommendedPressure: getRecommendedPressure(chosen.id),
      sourceType: 'mistake_memory',
      sourceId: topMistake.id,
      targetSkillLabelEn: `${catMeta.labelEn} Transfer ("${topMistake.correctedExample}")`,
      targetSkillLabelBn: `${catMeta.labelBn} প্রয়োগ ("${topMistake.correctedExample}")`,
      headlineEn: `Targeted for your ${catMeta.labelEn} pattern`,
      headlineBn: `আপনার ${catMeta.labelBn} ভুলের ওপর ভিত্তি করে বাছাইকৃত`,
      rationaleEn: `Verified from Mistake Memory (${topMistake.occurrences} logged ${
        topMistake.occurrences === 1 ? 'occurrence' : 'occurrences'
      }): practice replacing "${topMistake.userExample}" with "${topMistake.correctedExample}" inside a live ${chosen.titleEn} simulation.`,
      rationaleBn: `Mistake Memory থেকে সংযুক্ত (${topMistake.occurrences} বার রেকর্ডকৃত): "${topMistake.userExample}"-এর বদলে "${topMistake.correctedExample}" বাস্তব ${chosen.titleBn} কথোপকথনে প্রয়োগ করুন।`,
      inRoomCoachingCuesEn: cuesEn,
      inRoomCoachingCuesBn: cuesBn,
      linkedMistakePattern: `"${topMistake.userExample}" -> "${topMistake.correctedExample}" (${catMeta.labelEn})`,
      weakDnaSkillLabelEn: weakDna[0]?.titleEn,
    };
  }

  // 2. Second priority: Measured Communication DNA opportunity
  if (weakDna.length > 0) {
    const weakest = weakDna[0];
    const targetCat: MistakeFilterCategory =
      weakest.id === 'vocabulary'
        ? 'vocabulary'
        : weakest.id === 'contextual_appropriateness'
          ? 'word_order'
          : weakest.id === 'grammar'
            ? 'verb_tense'
            : 'sentence_structure';

    const chosen =
      TRANSFER_UNIVERSE_SCENARIOS.find((s) => s.targetMistakeCategories.includes(targetCat)) ??
      TRANSFER_UNIVERSE_SCENARIOS[4]; // Restaurant Conversations

    return {
      recommendedScenario: chosen,
      recommendedPressure: getRecommendedPressure(chosen.id),
      sourceType: 'communication_dna',
      sourceId: weakest.id,
      targetSkillLabelEn: `Communication DNA Focus: ${weakest.titleEn} (${weakest.scorePercent}%)`,
      targetSkillLabelBn: `Communication DNA ফোকাস: ${weakest.titleBn} (${weakest.scorePercent}%)`,
      headlineEn: `Strengthen ${weakest.titleEn} in real conversation`,
      headlineBn: `বাস্তব কথোপকথনে ${weakest.titleBn} আরও শক্তিশালী করুন`,
      rationaleEn: `Your Communication DNA currently measures ${weakest.titleEn} at ${weakest.scorePercent}%. Use ${chosen.titleEn} to practice polite clarification, context fit, and clear task execution.`,
      rationaleBn: `আপনার Communication DNA-তে ${weakest.titleBn} বর্তমানে ${weakest.scorePercent}%। ${chosen.titleBn} সিনারিওতে বাস্তব প্রয়োগের মাধ্যমে দক্ষতা বাড়ান।`,
      inRoomCoachingCuesEn: [
        `Communication DNA Focus: ${weakest.titleEn} (currently ${weakest.scorePercent}%).`,
        'Aim for clear, complete responses that directly satisfy every objective criterion.',
      ],
      inRoomCoachingCuesBn: [
        `Communication DNA ফোকাস: ${weakest.titleBn} (বর্তমান ${weakest.scorePercent}%)।`,
        'প্রতিটি লক্ষ্য স্পষ্ট ও প্রাসঙ্গিক উত্তরে পূরণ করুন।',
      ],
      weakDnaSkillLabelEn: weakest.titleEn,
    };
  }

  // 3. Third priority: Recent Academy lesson transfer bridge
  if (recentLessons.length > 0) {
    const latestLesson = recentLessons[0];
    const chosen =
      TRANSFER_UNIVERSE_SCENARIOS.find((s) => s.linkedLessonIds.includes(latestLesson.lessonId)) ??
      TRANSFER_UNIVERSE_SCENARIOS[0];
    return {
      recommendedScenario: chosen,
      recommendedPressure: getRecommendedPressure(chosen.id),
      sourceType: 'academy_lesson',
      sourceId: latestLesson.lessonId,
      targetSkillLabelEn: `Academy Skill Transfer (${latestLesson.masteryPercent}% mastery)`,
      targetSkillLabelBn: `একাডেমি দক্ষতা প্রয়োগ (${latestLesson.masteryPercent}% মাস্টারি)`,
      headlineEn: 'Apply your recent Academy study in real life',
      headlineBn: 'আপনার সাম্প্রতিক একাডেমি লেসন বাস্তবে প্রয়োগ করুন',
      rationaleEn: `Transfer what you practiced in Academy (${latestLesson.masteryPercent}% mastery) into an interactive ${chosen.titleEn} simulation.`,
      rationaleBn: `একাডেমিতে শেখা নিয়ম (${latestLesson.masteryPercent}% মাস্টারি) এবার ${chosen.titleBn} সিমুলেশনে ব্যবহার করুন।`,
      inRoomCoachingCuesEn: [
        'Apply the sentence patterns from your recent Academy lesson naturally across multi-turn replies.',
      ],
      inRoomCoachingCuesBn: [
        'সাম্প্রতিক একাডেমি লেসনে শেখা বাক্যগঠন স্বাভাবিকভাবে কথোপকথনে ব্যবহার করুন।',
      ],
    };
  }

  // 4. Honest baseline for new learners (zero fake personalization claims)
  const baselineScenario =
    TRANSFER_UNIVERSE_SCENARIOS.find((s) => s.id === 'daily_restaurant_conversations') ??
    TRANSFER_UNIVERSE_SCENARIOS[0];
  return {
    recommendedScenario: baselineScenario,
    recommendedPressure: 'level_2_guided',
    sourceType: 'baseline',
    targetSkillLabelEn: baselineScenario.targetSkills.slice(0, 2).join(' · '),
    targetSkillLabelBn: 'বাস্তব যোগাযোগের প্রথম অনুশীলন',
    headlineEn: 'Start your first real-world communication simulation',
    headlineBn: 'আপনার প্রথম বাস্তব যোগাযোগ সিমুলেশন শুরু করুন',
    rationaleEn:
      'No prior Mistake Memory or Transfer Lab history is recorded yet. Start with Restaurant Conversations to establish verified transfer evidence across 5 structured objectives.',
    rationaleBn:
      'এখনো কোনো পূর্ববর্তী ট্রান্সফার ইতিহাস নেই। ৫টি স্পষ্ট লক্ষ্যসহ রেস্টুরেন্ট সিনারিও দিয়ে আপনার প্রথম বাস্তব মূল্যায়ন শুরু করুন।',
    inRoomCoachingCuesEn: [
      'Complete all 5 scenario objectives naturally — grammar accuracy and task completion are evaluated separately.',
    ],
    inRoomCoachingCuesBn: [
      '৫টি লক্ষ্য স্বাভাবিকভাবে পূরণ করুন — ব্যাকরণ ও কাজের পূর্ণতা আলাদাভাবে মূল্যায়ন করা হবে।',
    ],
  };
}

export function buildScenarioUniverseModels(input: {
  transferAttempts: TransferAttemptRecord[];
  activeDraft: TransferSessionDraft | null;
  mistakes: MistakeMemoryItem[];
}): ScenarioUniverseCardModel[] {
  const { transferAttempts, activeDraft, mistakes } = input;
  const activeMistakeCategories = new Set<MistakeFilterCategory>(
    mistakes
      .filter((m) => !m.falseCorrectionReported && m.status !== 'resolved')
      .map((m) => classifyMistakeCategory(m.category, m.domain))
  );

  return TRANSFER_UNIVERSE_SCENARIOS.map((scenario) => {
    const matchingAttempts = transferAttempts.filter((a) => {
      const resolved = getTransferUniverseScenario(a.scenarioId);
      return resolved?.id === scenario.id || a.scenarioId === scenario.id;
    });

    const isDraftActive =
      Boolean(activeDraft) &&
      (activeDraft?.scenarioId === scenario.id ||
        getTransferUniverseScenario(activeDraft?.scenarioId ?? '')?.id === scenario.id);

    const passedCount = matchingAttempts.filter((a) => a.passed).length;
    const bestScore =
      matchingAttempts.length > 0
        ? Math.max(...matchingAttempts.map((a) => a.evaluation.overall_score))
        : null;
    const lastAttemptAt =
      matchingAttempts.length > 0
        ? [...matchingAttempts].sort(
            (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
          )[0].completedAt
        : null;

    const status: ScenarioProgressStatus = isDraftActive
      ? 'in_progress'
      : matchingAttempts.length > 0
        ? 'completed'
        : 'not_started';

    const matchedCat = scenario.targetMistakeCategories.find((c) => activeMistakeCategories.has(c));
    const isPersonalizedMatch = Boolean(matchedCat);
    const catMeta = matchedCat ? getMistakeCategoryMeta(matchedCat) : null;

    return {
      scenario,
      status,
      attemptCount: matchingAttempts.length,
      passedCount,
      bestScore,
      lastAttemptAt,
      isPersonalizedMatch,
      adaptationPriority: (isDraftActive ? 200 : 0) + (isPersonalizedMatch ? 100 : 0) + (passedCount === 0 ? 15 : 0),
      adaptationReasonEn: catMeta ? `Targets your active ${catMeta.labelEn} pattern` : null,
      adaptationReasonBn: catMeta ? `আপনার ${catMeta.labelBn} অনুশীলনের উপযোগী` : null,
    };
  });
}

export function filterAndSortTransferScenarios(
  models: ScenarioUniverseCardModel[],
  filters: ScenarioFilterState
): ScenarioUniverseCardModel[] {
  const q = filters.search.trim().toLowerCase();
  const skillFilter = filters.skill.trim().toLowerCase();

  const filtered = models.filter((item) => {
    const sc = item.scenario;
    if (filters.category !== 'all' && sc.category !== filters.category) return false;
    if (filters.difficulty !== 'all' && sc.difficulty !== filters.difficulty) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;

    if (filters.duration === 'short' && sc.estimatedMinutes > 5) return false;
    if (filters.duration === 'medium' && (sc.estimatedMinutes < 6 || sc.estimatedMinutes > 7)) {
      return false;
    }
    if (filters.duration === 'extended' && sc.estimatedMinutes < 8) return false;

    if (skillFilter && skillFilter !== 'all') {
      const hasSkill = sc.targetSkills.some((s) => s.toLowerCase().includes(skillFilter));
      if (!hasSkill) return false;
    }

    if (q) {
      const haystack = [
        sc.titleEn,
        sc.titleBn,
        sc.descriptionEn,
        sc.descriptionBn,
        sc.aiParticipantRoleEn,
        sc.learnerRoleEn,
        ...sc.targetSkills,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sortBy === 'difficulty_asc') {
      return (
        DIFFICULTY_RANK[a.scenario.difficulty] - DIFFICULTY_RANK[b.scenario.difficulty] ||
        a.scenario.titleEn.localeCompare(b.scenario.titleEn)
      );
    }
    if (filters.sortBy === 'duration_asc') {
      return (
        a.scenario.estimatedMinutes - b.scenario.estimatedMinutes ||
        a.scenario.titleEn.localeCompare(b.scenario.titleEn)
      );
    }
    if (filters.sortBy === 'title_asc') {
      return a.scenario.titleEn.localeCompare(b.scenario.titleEn);
    }
    // Default: recommended priority
    return (
      b.adaptationPriority - a.adaptationPriority ||
      DIFFICULTY_RANK[a.scenario.difficulty] - DIFFICULTY_RANK[b.scenario.difficulty]
    );
  });
}

export function getAllScenarioSkillTags(): string[] {
  const set = new Set<string>();
  for (const sc of TRANSFER_UNIVERSE_SCENARIOS) {
    for (const skill of sc.targetSkills) {
      set.add(skill);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// ============================================================================
// Task & Objective Engine + Evidence-Based 8-Dimension Evaluation Normalizer
// ============================================================================

const VALID_OBJECTIVE_STATUSES = new Set<TransferObjectiveStatus>([
  'not_started',
  'in_progress',
  'achieved',
  'partially_achieved',
  'not_achieved',
  'not_evaluated',
]);

export function computeObjectiveProgressSummary(objectives: TransferObjectiveProgress[]): {
  total: number;
  achieved: number;
  partiallyAchieved: number;
  inProgress: number;
  notAchieved: number;
  notEvaluated: number;
  completionPercent: number;
} {
  const total = objectives.length;
  let achieved = 0;
  let partiallyAchieved = 0;
  let inProgress = 0;
  let notAchieved = 0;
  let notEvaluated = 0;

  for (const obj of objectives) {
    if (obj.status === 'achieved') achieved += 1;
    else if (obj.status === 'partially_achieved') partiallyAchieved += 1;
    else if (obj.status === 'in_progress') inProgress += 1;
    else if (obj.status === 'not_achieved') notAchieved += 1;
    else if (obj.status === 'not_evaluated') notEvaluated += 1;
  }

  const completionPercent =
    total > 0 ? Math.round(((achieved + partiallyAchieved * 0.5) / total) * 100) : 0;

  return {
    total,
    achieved,
    partiallyAchieved,
    inProgress,
    notAchieved,
    notEvaluated,
    completionPercent,
  };
}

/**
 * Merges live AI objective criteria evaluations safely without allowing unearned completions
 * when the learner has sent zero substantive turns.
 */
export function mergeObjectiveUpdates(
  current: TransferObjectiveProgress[],
  updates: Array<{
    objectiveId?: unknown;
    status?: unknown;
    evidenceQuote?: unknown;
    rationaleEn?: unknown;
    rationaleBn?: unknown;
  }>,
  learnerTurnCount: number
): TransferObjectiveProgress[] {
  if (learnerTurnCount <= 0 || !Array.isArray(updates) || updates.length === 0) {
    return current;
  }

  const updateMap = new Map<
    string,
    {
      status: TransferObjectiveStatus;
      evidenceQuote?: string;
      rationaleEn?: string;
      rationaleBn?: string;
    }
  >();

  for (const u of updates) {
    if (!u || typeof u.objectiveId !== 'string') continue;
    const rawStatus = typeof u.status === 'string' ? (u.status as TransferObjectiveStatus) : null;
    if (!rawStatus || !VALID_OBJECTIVE_STATUSES.has(rawStatus)) continue;
    const evidenceQuote =
      typeof u.evidenceQuote === 'string' && u.evidenceQuote.trim()
        ? u.evidenceQuote.trim().slice(0, 220)
        : undefined;

    // Anti-fabrication guard: never mark an objective 'achieved' without supporting quote evidence
    const verifiedStatus: TransferObjectiveStatus =
      rawStatus === 'achieved' && !evidenceQuote ? 'in_progress' : rawStatus;

    updateMap.set(u.objectiveId, {
      status: verifiedStatus,
      evidenceQuote,
      rationaleEn:
        typeof u.rationaleEn === 'string' && u.rationaleEn.trim()
          ? u.rationaleEn.trim().slice(0, 240)
          : undefined,
      rationaleBn:
        typeof u.rationaleBn === 'string' && u.rationaleBn.trim()
          ? u.rationaleBn.trim().slice(0, 240)
          : undefined,
    });
  }

  return current.map((obj) => {
    const patch = updateMap.get(obj.objectiveId);
    if (!patch) return obj;
    return {
      ...obj,
      status: patch.status,
      evidenceQuote: patch.evidenceQuote ?? obj.evidenceQuote,
      rationaleEn: patch.rationaleEn ?? obj.rationaleEn,
      rationaleBn: patch.rationaleBn ?? obj.rationaleBn,
    };
  });
}

function clampOptionalScore(val: unknown): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  return Math.max(0, Math.min(100, Math.round(val)));
}

function scoreToVerdict(score: number | null): TransferDimensionEvaluation['verdict'] {
  if (score === null) return 'not_evaluated';
  if (score >= 82) return 'strong';
  if (score >= 70) return 'adequate';
  if (score >= 50) return 'developing';
  return 'needs_work';
}

export function normalizePart11SessionEvaluation(input: {
  raw: unknown;
  sessionId: string;
  scenario: TransferUniverseScenario;
  transcript: TransferConversationTurn[];
  currentObjectives: TransferObjectiveProgress[];
  evaluatedAt?: string;
}): {
  report: TransferSessionEvaluationReport;
  rubricEvaluation: TransferRubricEvaluation;
} {
  const { raw, sessionId, scenario, transcript, currentObjectives } = input;
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const learnerTurns = transcript.filter((t) => t.role === 'learner' && t.text.trim().length > 0);
  const learnerTurnCount = learnerTurns.length;

  // 1. Objective-level evaluation against explicit criteria
  const rawObjectives = Array.isArray(obj.objectives) ? obj.objectives : [];
  const objectives: TransferObjectiveProgress[] = currentObjectives.map((spec) => {
    if (learnerTurnCount === 0) {
      return {
        ...spec,
        status: 'not_evaluated',
        rationaleEn: 'No learner response was recorded to evaluate this objective.',
        rationaleBn: 'এই লক্ষ্য মূল্যায়নের জন্য শিক্ষার্থীর কোনো উত্তর পাওয়া যায়নি।',
      };
    }

    const found = rawObjectives.find(
      (item): item is Record<string, unknown> =>
        Boolean(item && typeof item === 'object' && (item as Record<string, unknown>).objectiveId === spec.objectiveId)
    );

    if (!found) {
      return {
        ...spec,
        status: spec.status === 'not_started' ? 'not_evaluated' : spec.status,
      };
    }

    const cleanOptionalText = (val: unknown, maxLen: number): string => {
      if (typeof val !== 'string') return '';
      const trimmed = val.trim();
      if (!trimmed || /^(n\/a|none|null|-|—)$/i.test(trimmed)) return '';
      return trimmed.slice(0, maxLen);
    };

    const rawStatus =
      typeof found.status === 'string' && VALID_OBJECTIVE_STATUSES.has(found.status as TransferObjectiveStatus)
        ? (found.status as TransferObjectiveStatus)
        : 'not_evaluated';
    const evidenceQuote =
      cleanOptionalText(found.evidenceQuote, 240) || spec.evidenceQuote;

    // Never award achieved without evidence quote
    const finalStatus: TransferObjectiveStatus =
      rawStatus === 'achieved' && !evidenceQuote ? 'partially_achieved' : rawStatus;

    return {
      ...spec,
      status: finalStatus,
      evidenceQuote,
      rationaleEn:
        typeof found.rationaleEn === 'string' && found.rationaleEn.trim()
          ? found.rationaleEn.trim().slice(0, 280)
          : spec.rationaleEn,
      rationaleBn:
        typeof found.rationaleBn === 'string' && found.rationaleBn.trim()
          ? found.rationaleBn.trim().slice(0, 280)
          : spec.rationaleBn,
    };
  });

  // 2. 8-Dimension Evidence-Based Evaluation (missing evidence MUST stay not_evaluated with score: null)
  const rawDimensions = Array.isArray(obj.dimensions) ? obj.dimensions : [];
  const dimensions: TransferDimensionEvaluation[] = TRANSFER_EIGHT_DIMENSIONS.map((meta) => {
    const found = rawDimensions.find(
      (d): d is Record<string, unknown> =>
        Boolean(d && typeof d === 'object' && (d as Record<string, unknown>).dimension === meta.key)
    );

    const evidenceFromConversation =
      found && typeof found.evidenceFromConversation === 'string'
        ? found.evidenceFromConversation.trim().slice(0, 320)
        : '';
    const supportingLearnerResponse =
      found && typeof found.supportingLearnerResponse === 'string'
        ? found.supportingLearnerResponse.trim().slice(0, 260)
        : '';

    const rawEvaluated = found ? Boolean(found.evaluated) : false;
    const rawScore = found ? clampOptionalScore(found.score) : null;

    // Honest evidence gate: if conversation lacks learner turns or dimension lacks evidence/score -> not_evaluated
    const evaluated =
      learnerTurnCount > 0 &&
      rawEvaluated &&
      rawScore !== null &&
      (evidenceFromConversation.length > 0 || supportingLearnerResponse.length > 0);

    const score = evaluated ? rawScore : null;

    return {
      dimension: meta.key,
      labelEn: meta.labelEn,
      labelBn: meta.labelBn,
      evaluated,
      score,
      verdict: scoreToVerdict(score),
      evidenceFromConversation:
        evidenceFromConversation ||
        (evaluated
          ? 'Observed in the learner conversation transcript.'
          : 'Not evaluated — insufficient evidence in this session transcript.'),
      supportingLearnerResponse:
        supportingLearnerResponse ||
        (evaluated ? learnerTurns[learnerTurns.length - 1]?.text.slice(0, 220) ?? '' : ''),
      identifiedProblemEn:
        found && typeof found.identifiedProblemEn === 'string' && found.identifiedProblemEn.trim()
          ? found.identifiedProblemEn.trim().slice(0, 260)
          : evaluated
            ? 'No major blocker identified in this dimension.'
            : 'Insufficient conversation evidence to evaluate this dimension.',
      identifiedProblemBn:
        found && typeof found.identifiedProblemBn === 'string' && found.identifiedProblemBn.trim()
          ? found.identifiedProblemBn.trim().slice(0, 260)
          : evaluated
            ? 'এই মাত্রায় বড় কোনো সমস্যা শনাক্ত হয়নি।'
            : 'এই মাত্রা মূল্যায়নের জন্য পর্যাপ্ত তথ্য পাওয়া যায়নি।',
      explanationEn:
        found && typeof found.explanationEn === 'string' && found.explanationEn.trim()
          ? found.explanationEn.trim().slice(0, 360)
          : evaluated
            ? meta.descriptionEn
            : 'Complete more turns demonstrating this communication skill so it can be evaluated with evidence.',
      explanationBn:
        found && typeof found.explanationBn === 'string' && found.explanationBn.trim()
          ? found.explanationBn.trim().slice(0, 360)
          : evaluated
            ? 'কথোপকথনের প্রমাণের ভিত্তিতে এই মাত্রাটি মূল্যায়ন করা হয়েছে।'
            : 'পর্যাপ্ত প্রমাণ না থাকায় এটি মূল্যায়ন করা হয়নি।',
      suggestedCorrection:
        found && typeof found.suggestedCorrection === 'string' && !/^(n\/a|none|null|-|—)$/i.test(found.suggestedCorrection.trim())
          ? found.suggestedCorrection.trim().slice(0, 260)
          : '',
      betterExample:
        found && typeof found.betterExample === 'string' && !/^(n\/a|none|null|-|—)$/i.test(found.betterExample.trim())
          ? found.betterExample.trim().slice(0, 280)
          : '',
      confidence:
        found && typeof found.confidence === 'number' && Number.isFinite(found.confidence)
          ? Math.max(0, Math.min(1, Math.round(found.confidence * 100) / 100))
          : evaluated
            ? 0.78
            : 0,
      limitationsNoteEn:
        found && typeof found.limitationsNoteEn === 'string' && found.limitationsNoteEn.trim()
          ? found.limitationsNoteEn.trim().slice(0, 240)
          : 'Evaluated strictly from text/transcript evidence; acoustic pronunciation and body language are not measured.',
      limitationsNoteBn:
        found && typeof found.limitationsNoteBn === 'string' && found.limitationsNoteBn.trim()
          ? found.limitationsNoteBn.trim().slice(0, 240)
          : 'শুধুমাত্র ট্রান্সক্রিপ্ট প্রমাণের ভিত্তিতে মূল্যায়িত; অ্যাকোস্টিক উচ্চারণ পরিমাপ করা হয়নি।',
    };
  });

  // Documented scoring methodology: arithmetic mean of evaluated dimensions ONLY (null if 0 evaluated)
  const evaluatedDims = dimensions.filter((d) => d.evaluated && d.score !== null);
  const overallScore =
    evaluatedDims.length > 0
      ? Math.round(
          evaluatedDims.reduce((sum, d) => sum + (d.score ?? 0), 0) / evaluatedDims.length
        )
      : null;

  const objSummary = computeObjectiveProgressSummary(objectives);
  const taskDim = dimensions.find((d) => d.dimension === 'task_completion');
  const grammarDim = dimensions.find((d) => d.dimension === 'grammar_application');
  const contextDim = dimensions.find((d) => d.dimension === 'contextual_appropriateness');
  const relevanceDim = dimensions.find((d) => d.dimension === 'response_relevance');

  const taskOutcomeStatus: TransferSessionEvaluationReport['taskOutcomeStatus'] =
    objSummary.total > 0 && objSummary.achieved >= Math.ceil(objSummary.total * 0.75)
      ? 'achieved'
      : objSummary.achieved > 0 || objSummary.partiallyAchieved > 0
        ? 'partially_achieved'
        : 'not_achieved';

  // Strict evidence-based pass bar:
  // overallScore >= 70 AND task_completion >= 65 AND grammar_application >= 60 AND taskOutcomeStatus !== 'not_achieved'
  const passed =
    overallScore !== null &&
    overallScore >= 70 &&
    (taskDim?.score ?? 0) >= 65 &&
    (grammarDim?.score ?? 0) >= 60 &&
    taskOutcomeStatus !== 'not_achieved';

  const rawMistakes = Array.isArray(obj.detectedMistakes) ? obj.detectedMistakes : [];
  const detectedMistakes: SpeakingDetectedMistake[] = rawMistakes
    .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
    .map((m): SpeakingDetectedMistake => ({
      category: typeof m.category === 'string' && m.category.trim() ? m.category.trim() : 'Grammar',
      original: typeof m.original === 'string' ? m.original.trim().slice(0, 260) : '',
      corrected: typeof m.corrected === 'string' ? m.corrected.trim().slice(0, 260) : '',
      explanation_en:
        typeof m.explanation_en === 'string' && m.explanation_en.trim()
          ? m.explanation_en.trim().slice(0, 300)
          : 'Refine this structure for clearer real-world communication.',
      explanation_bn:
        typeof m.explanation_bn === 'string' && m.explanation_bn.trim()
          ? m.explanation_bn.trim().slice(0, 300)
          : 'বাস্তব যোগাযোগে আরও নির্ভুল হতে এই অংশটি সংশোধন করুন।',
      confidence:
        typeof m.confidence === 'number' && Number.isFinite(m.confidence)
          ? Math.max(0, Math.min(1, Math.round(m.confidence * 100) / 100))
          : 0.78,
      severity:
        m.severity === 'high' || m.severity === 'medium' || m.severity === 'low'
          ? m.severity
          : 'medium',
    }))
    .filter(
      (m) =>
        m.original.length > 0 &&
        m.corrected.length > 0 &&
        m.original.toLowerCase() !== m.corrected.toLowerCase()
    );

  const strengths = Array.isArray(obj.strengths)
    ? obj.strengths
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 220))
    : [];

  const scoringMethodologyEn =
    evaluatedDims.length > 0
      ? `Arithmetic mean across ${evaluatedDims.length} evaluated communication dimensions (0–100 each). Dimensions lacking transcript evidence remain Not Evaluated and are excluded from the average. Pass requires overall ≥ 70%, Task Completion ≥ 65%, Grammar Application ≥ 60%, and verified objective progress.`
      : 'No dimensions had sufficient transcript evidence for numerical scoring.';
  const scoringMethodologyBn =
    evaluatedDims.length > 0
      ? `${evaluatedDims.length}টি মূল্যায়িত মাত্রার গড় হিসাব (০–১০০)। প্রমাণহীন মাত্রা "মূল্যায়িত নয়" হিসেবে গড় থেকে বাদ রাখা হয়েছে। উত্তীর্ণ হতে গড় ৭০%+, কাজের পূর্ণতা ৬৫%+, এবং ব্যাকরণ ৬০%+ প্রয়োজন।`
      : 'পর্যাপ্ত ট্রান্সক্রিপ্ট প্রমাণ না থাকায় কোনো সংখ্যাগত স্কোর তৈরি করা হয়নি।';

  const taskVsLanguageDistinctionEn =
    typeof obj.taskVsLanguageDistinctionEn === 'string' && obj.taskVsLanguageDistinctionEn.trim()
      ? obj.taskVsLanguageDistinctionEn.trim().slice(0, 360)
      : taskOutcomeStatus === 'achieved' && (grammarDim?.score ?? 0) < 70
        ? 'You achieved the practical scenario objective even though several grammar patterns need repair — task success and language accuracy are tracked separately.'
        : taskOutcomeStatus !== 'achieved' && (grammarDim?.score ?? 0) >= 75
          ? 'Your sentences were largely grammatical, but key scenario objectives were left incomplete — grammatical correctness alone does not guarantee task completion.'
          : 'Task outcome (achieving scenario goals) and language accuracy (grammar/vocabulary precision) were evaluated independently against explicit criteria.';

  const taskVsLanguageDistinctionBn =
    typeof obj.taskVsLanguageDistinctionBn === 'string' && obj.taskVsLanguageDistinctionBn.trim()
      ? obj.taskVsLanguageDistinctionBn.trim().slice(0, 360)
      : 'বাস্তব লক্ষ্য পূরণ (Task Completion) এবং ভাষার নির্ভুলতা (Language Accuracy) আলাদা মানদণ্ডে মূল্যায়ন করা হয়েছে।';

  const report: TransferSessionEvaluationReport = {
    sessionId,
    scenarioId: scenario.id,
    evaluatedAt,
    taskOutcomeStatus,
    languageCorrectnessNoteEn:
      typeof obj.languageCorrectnessNoteEn === 'string' && obj.languageCorrectnessNoteEn.trim()
        ? obj.languageCorrectnessNoteEn.trim().slice(0, 260)
        : `Grammar Application: ${grammarDim?.score !== null && grammarDim?.score !== undefined ? `${grammarDim.score}%` : 'Not evaluated'} · Vocabulary: ${
            dimensions.find((d) => d.dimension === 'vocabulary_application')?.score ?? 'Not evaluated'
          }${dimensions.find((d) => d.dimension === 'vocabulary_application')?.score !== null ? '%' : ''}.`,
    languageCorrectnessNoteBn:
      typeof obj.languageCorrectnessNoteBn === 'string' && obj.languageCorrectnessNoteBn.trim()
        ? obj.languageCorrectnessNoteBn.trim().slice(0, 260)
        : 'ব্যাকরণ ও শব্দভাণ্ডারের প্রয়োগ কথোপকথনের সরাসরি উদাহরণ থেকে যাচাই করা হয়েছে।',
    taskVsLanguageDistinctionEn,
    taskVsLanguageDistinctionBn,
    scoringMethodologyEn,
    scoringMethodologyBn,
    evaluatedDimensionCount: evaluatedDims.length,
    overallScore,
    passed,
    objectives,
    dimensions,
    strengths,
    detectedMistakes,
    naturalModelResponse:
      typeof obj.naturalModelResponse === 'string' && obj.naturalModelResponse.trim()
        ? obj.naturalModelResponse.trim().slice(0, 700)
        : scenario.helpfulPhrasesEn.join(' '),
    coachSummaryEn:
      typeof obj.coachSummaryEn === 'string' && obj.coachSummaryEn.trim()
        ? obj.coachSummaryEn.trim().slice(0, 420)
        : passed
          ? 'Strong practical communication transfer with verified objective completion.'
          : 'Review the objective criteria and evidence cards below, then retest this scenario to strengthen transfer.',
    coachSummaryBn:
      typeof obj.coachSummaryBn === 'string' && obj.coachSummaryBn.trim()
        ? obj.coachSummaryBn.trim().slice(0, 420)
        : passed
          ? 'বাস্তব যোগাযোগে আপনার দক্ষতার প্রয়োগ সফলভাবে যাচাই হয়েছে।'
          : 'নিচের প্রমাণভিত্তিক বিশ্লেষণ দেখে আবার অনুশীলন করুন।',
    nextRecommendedActionEn:
      typeof obj.nextRecommendedActionEn === 'string' && obj.nextRecommendedActionEn.trim()
        ? obj.nextRecommendedActionEn.trim().slice(0, 260)
        : passed
          ? 'Step up to the next Pressure Ladder tier or try a related scenario.'
          : 'Practice the flagged mistakes in Mistake Memory, then retest this scenario.',
    nextRecommendedActionBn:
      typeof obj.nextRecommendedActionBn === 'string' && obj.nextRecommendedActionBn.trim()
        ? obj.nextRecommendedActionBn.trim().slice(0, 260)
        : passed
          ? 'পরবর্তী প্রেসার লেভেলে চেষ্টা করুন অথবা নতুন সিনারিও বেছে নিন।'
          : 'Mistake Memory-তে চিহ্নিত ভুলগুলো ঝালাই করে আবার এই সিনারিওটি পরীক্ষা দিন।',
  };

  // Unified bridge to existing TransferRubricEvaluation (keeps Part 10 DNA, XP Ledger & History 100% synced)
  const rubricEvaluation: TransferRubricEvaluation = {
    task_completion: {
      score: taskDim?.score ?? 0,
      feedbackEn: taskDim?.explanationEn ?? 'Evaluated against scenario objectives.',
      feedbackBn: taskDim?.explanationBn ?? 'সিনারিওর লক্ষ্যের ভিত্তিতে মূল্যায়িত।',
    },
    target_grammar_application: {
      score: grammarDim?.score ?? 0,
      feedbackEn: grammarDim?.explanationEn ?? 'Evaluated for live grammar accuracy.',
      feedbackBn: grammarDim?.explanationBn ?? 'বাস্তব কথোপকথনে ব্যাকরণের সঠিকতায় মূল্যায়িত।',
    },
    contextual_appropriateness: {
      score: contextDim?.score ?? 0,
      feedbackEn: contextDim?.explanationEn ?? 'Evaluated for tone and situational register.',
      feedbackBn: contextDim?.explanationBn ?? 'পরিস্থিতি অনুযায়ী ভদ্রতা ও স্বরে মূল্যায়িত।',
    },
    response_relevance: {
      score: relevanceDim?.score ?? 0,
      feedbackEn: relevanceDim?.explanationEn ?? 'Evaluated for relevance across conversation turns.',
      feedbackBn: relevanceDim?.explanationBn ?? 'কথোপকথনের প্রাসঙ্গিকতার ভিত্তিতে মূল্যায়িত।',
    },
    overall_score: overallScore ?? 0,
    passed,
    strengths,
    detected_mistakes: detectedMistakes,
    natural_model_response: report.naturalModelResponse,
    coach_summary_en: report.coachSummaryEn,
    coach_summary_bn: report.coachSummaryBn,
    part11Report: report,
  };

  return { report, rubricEvaluation };
}

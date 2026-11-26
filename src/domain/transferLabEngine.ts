import type {
  ExplanationLanguage,
  LessonMasteryRecord,
  MistakeFilterCategory,
  MistakeMemoryItem,
  PressureLadderLevelId,
  SelfEstimatedLevel,
  SpeakingDetectedMistake,
  SpeakingInputChannel,
  TransferAttemptRecord,
  TransferRubricDimensionScore,
  TransferRubricEvaluation,
  TransferScenarioId,
} from '../types/domain';
import { getLessonById } from './curriculumData.ts';
import { classifyMistakeCategory, getMistakeCategoryMeta } from './mistakeMemoryEngine.ts';
import { getPressureLadderTier } from './pressureLadder.ts';
import { getTransferUniverseScenario } from './transferLabUniverseEngine.ts';

export interface TransferScenarioDefinition {
  id: TransferScenarioId;
  titleEn: string;
  titleBn: string;
  contextTagEn: string;
  contextTagBn: string;
  rolePersonaEn: string;
  rolePersonaBn: string;
  briefEn: string;
  briefBn: string;
  openingPromptEn: string;
  openingPromptBn: string;
  /** Level 1: Controlled Practice templates */
  level1TemplatesEn: string[];
  level1TemplatesBn: string;
  /** Level 2: Guided Conversation bullet cues */
  level2BulletCuesEn: string[];
  level2BulletCuesBn: string[];
  /** Level 4: Default twist fallback if AI doesn't supply one */
  fallbackTwistEn: string;
  fallbackTwistBn: string;
  /** Level 5: Extra high-stakes constraint shown under countdown */
  level5ConstraintEn: string;
  level5ConstraintBn: string;
  targetCategories: MistakeFilterCategory[];
  linkedLessonIds: string[];
  defaultTargetGrammarEn: string;
  defaultTargetGrammarBn: string;
}

export const TRANSFER_SCENARIOS: TransferScenarioDefinition[] = [
  {
    id: 'job_interview_followup',
    titleEn: 'Job Interview Follow-ups',
    titleBn: 'চাকরির ইন্টারভিউ ফলো-আপ প্রশ্ন',
    contextTagEn: 'Career & Behavioral',
    contextTagBn: 'ক্যারিয়ার ও ইন্টারভিউ',
    rolePersonaEn: 'Senior Hiring Panelist probing your past achievement',
    rolePersonaBn: 'আপনার পূর্বের সাফল্য যাচাই করছেন একজন সিনিয়র ইন্টারভিউয়ার',
    briefEn:
      'You mentioned leading a team deliverable last quarter. Now the interviewer probes specifically on what broke, what actions you took, and what measurable outcome happened.',
    briefBn:
      'আপনি গত কোয়ার্টারে একটি টিম ডেলিভারেবল নেতৃত্ব দেওয়ার কথা বলেছেন। এখন ইন্টারভিউয়ার জানতে চাইছেন কী সমস্যা হয়েছিল, আপনি কী পদক্ষেপ নিয়েছিলেন এবং ফলাফল কী ছিল।',
    openingPromptEn:
      'You mentioned you turned around a struggling deliverable last quarter. Walk me through what specifically went wrong, what actions you personally took, and what changed as a result.',
    openingPromptBn:
      'গত কোয়ার্টারে কোন নির্দিষ্ট সমস্যা হয়েছিল, আপনি ব্যক্তিগতভাবে কী পদক্ষেপ নিয়েছিলেন এবং তার ফলাফল কী ছিল তা বলুন।',
    level1TemplatesEn: [
      'Last quarter, our team faced [problem] because [cause].',
      'First, I [past-tense action verb] and discussed [topic without "about"] with the team.',
      'As a result, we delivered [outcome] on time.',
    ],
    level1TemplatesBn:
      'অতীতের সব কাজে Past Simple (faced, coordinated, resolved) ব্যবহার করুন এবং "discuss about" এড়িয়ে চলুন।',
    level2BulletCuesEn: [
      'State the exact past problem with a clear time marker',
      'Describe 2 concrete actions you personally took (Past Simple)',
      'Share one measurable outcome or lesson learned',
    ],
    level2BulletCuesBn: [
      'নির্দিষ্ট সময়সহ অতীতের সমস্যাটি বলুন',
      'আপনার নেওয়া ২টি সুনির্দিষ্ট পদক্ষেপ Past Simple-এ বলুন',
      'একটি বাস্তব ফলাফল বা শেখা বিষয় উল্লেখ করুন',
    ],
    fallbackTwistEn:
      'Wait — if a senior teammate strongly disagreed with your plan mid-way, how did you handle their pushback without missing the deadline?',
    fallbackTwistBn:
      'এক মিনিট — মাঝপথে একজন সিনিয়র সহকর্মী আপনার পরিকল্পনার বিরোধিতা করলে আপনি ডেডলাইন না হারিয়ে কীভাবে তা সামলেছিলেন?',
    level5ConstraintEn:
      'High-stakes constraint (60s): Include (1) the root cause, (2) one tough trade-off you made, and (3) a quantified result in 3–4 crisp sentences.',
    level5ConstraintBn:
      'উচ্চচাপের শর্ত (৬০ সেকেন্ড): ৩–৪টি স্পষ্ট বাক্যে (১) মূল কারণ, (২) আপনার নেওয়া একটি কঠিন সিদ্ধান্ত, এবং (৩) সংখ্যাসহ ফলাফল বলুন।',
    targetCategories: ['verb_tense', 'sentence_structure'],
    linkedLessonIds: ['les_past_simple_stories', 'les_interview_star'],
    defaultTargetGrammarEn: 'Consistent Past Simple narration & clean SVO clause structure',
    defaultTargetGrammarBn: 'সঠিক Past Simple ক্রিয়ার কাল ও স্পষ্ট SVO বাক্য গঠন',
  },
  {
    id: 'workplace_project_delay',
    titleEn: 'Explaining a Project Delay at Work',
    titleBn: 'কর্মক্ষেত্রে প্রজেক্ট বিলম্বের ব্যাখ্যা',
    contextTagEn: 'Workplace Accountability',
    contextTagBn: 'অফিস ও ক্লায়েন্ট যোগাযোগ',
    rolePersonaEn: 'Client Delivery Director expecting your Thursday milestone',
    rolePersonaBn: 'বৃহস্পতিবারের মাইলস্টোন প্রত্যাশা করছেন একজন ক্লায়েন্ট ডিরেক্টর',
    briefEn:
      'An external vendor API delay means your team will miss Thursday’s deadline by 48 hours. Explain the situation professionally without sounding defensive, and propose a concrete recovery plan.',
    briefBn:
      'বাইরের একটি ভেন্ডরের বিলম্বের কারণে বৃহস্পতিবারের ডেডলাইন ৪৮ ঘণ্টা পেছাতে হচ্ছে। অজুহাত না দেখিয়ে পেশাদারভাবে পরিস্থিতি ব্যাখ্যা করুন এবং স্পষ্ট সমাধান প্রস্তাব করুন।',
    openingPromptEn:
      'We promised the stakeholder demo for Thursday afternoon. I just heard we might slip — can you tell me honestly what caused the delay and how we recover trust?',
    openingPromptBn:
      'বৃহস্পতিবারের ডেমো পিছিয়ে যাওয়ার মূল কারণ কী এবং কীভাবে আমরা সময়মতো পুনরুদ্ধার করব তা স্পষ্টভাবে জানান।',
    level1TemplatesEn: [
      'I want to update you on the Thursday deliverable: we have been waiting for [dependency] since [day].',
      'We already discussed [the workaround — no "about"] with the engineering lead.',
      'To protect the launch, we can share [partial milestone] on Thursday and deliver the final build on Saturday.',
    ],
    level1TemplatesBn:
      'চলমান অপেক্ষার জন্য "have been waiting since/for" এবং "discuss + object" (about ছাড়া) ব্যবহার করুন।',
    level2BulletCuesEn: [
      'Acknowledge the deadline clearly and state how long the blocker has lasted',
      'Explain what your team has already done (Present Perfect)',
      'Propose a concrete revised timeline + interim deliverable',
    ],
    level2BulletCuesBn: [
      'ডেডলাইন স্বীকার করুন এবং সমস্যাটি কতদিন ধরে চলছে তা বলুন',
      'টিম ইতিমধ্যে কী পদক্ষেপ নিয়েছে তা Present Perfect-এ বলুন',
      'সংশোধিত সময়সীমা ও অন্তর্বর্তী ডেলিভারেবল প্রস্তাব করুন',
    ],
    fallbackTwistEn:
      'The client VP is flying out on Friday morning and says Saturday is too late. What realistic alternative can you commit to right now?',
    fallbackTwistBn:
      'ক্লায়েন্ট ভিপি শুক্রবার সকালে ফ্লাইটে চলে যাচ্ছেন — শনিবার অনেক দেরি হয়ে যাবে। এখনই কোন বাস্তবসম্মত বিকল্প দিতে পারবেন?',
    level5ConstraintEn:
      'High-stakes constraint (60s): Take ownership without blaming colleagues, avoid redundant prepositions (discuss/explain/inform), and commit to an exact hour for the next check-in.',
    level5ConstraintBn:
      'উচ্চচাপের শর্ত (৬০ সেকেন্ড): সহকর্মীকে দোষ না দিয়ে দায়িত্ব নিন, বাড়তি প্রিপজিশন এড়িয়ে চলুন এবং পরবর্তী আপডেটের নির্দিষ্ট সময় জানান।',
    targetCategories: ['prepositions', 'verb_tense'],
    linkedLessonIds: ['les_prepositions_workplace', 'les_present_perfect_since'],
    defaultTargetGrammarEn: 'Zero redundant prepositions (discuss/order/return) & Present Perfect with since/for',
    defaultTargetGrammarBn: 'বাড়তি প্রিপজিশন বর্জন (discuss/return) ও since/for-সহ Present Perfect',
  },
  {
    id: 'order_issue_resolution',
    titleEn: 'Ordering & Resolving an Issue',
    titleBn: 'অর্ডার ও সার্ভিস সমস্যা সমাধান',
    contextTagEn: 'Service & Daily Assertiveness',
    contextTagBn: 'দৈনন্দিন ও কাস্টমার সার্ভিস',
    rolePersonaEn: 'Restaurant Manager / Service Supervisor at a busy counter',
    rolePersonaBn: 'ব্যস্ত কাউন্টারে একজন রেস্টুরেন্ট ম্যানেজার বা সার্ভিস সুপারভাইজার',
    briefEn:
      'Your group’s order arrived 35 minutes late, one dish is wrong, and you were billed twice for a drink. Politely but firmly ask for a correction, replacement, and updated bill.',
    briefBn:
      'আপনার অর্ডার ৩৫ মিনিট দেরিতে এসেছে, একটি খাবার ভুল এবং পানীয়ের বিল দুবার যোগ হয়েছে। ভদ্র কিন্তু দৃঢ়ভাবে সঠিক খাবার ও সংশোধিত বিল চান।',
    openingPromptEn:
      'Good evening — I heard there was an issue with your order and receipt. Could you tell me exactly what happened so I can fix it right away?',
    openingPromptBn:
      'শুভ সন্ধ্যা — আপনার অর্ডার ও বিলের কী সমস্যা হয়েছে তা বিস্তারিত বলুন যাতে এখনই ঠিক করে দিতে পারি।',
    level1TemplatesEn: [
      'Thank you for coming over. We ordered [items] thirty-five minutes ago, but [issue].',
      'Also, the receipt charged us twice for [the item].',
      'Could you please replace [the wrong dish] and adjust the bill?',
    ],
    level1TemplatesBn:
      'নির্দিষ্ট খাবারের আগে "the" আর্টিকেল ব্যবহার করুন এবং "order for" না বলে শুধু "order" বলুন।',
    level2BulletCuesEn: [
      'State clearly what you ordered and what went wrong (with accurate articles a/the)',
      'Point out the duplicate charge politely without losing composure',
      'Make a direct, polite request using "Could you please..."',
    ],
    level2BulletCuesBn: [
      'সঠিক আর্টিকেল (a/the) দিয়ে অর্ডারের ভুলটি স্পষ্টভাবে বলুন',
      'বিলের দ্বিগুণ চার্জ ভদ্রভাবে উল্লেখ করুন',
      '"Could you please..." ব্যবহার করে স্পষ্ট সমাধান চান',
    ],
    fallbackTwistEn:
      'Our kitchen just ran out of that specific dish, and our card terminal takes 3 days for partial refunds. How would you like us to make this right tonight?',
    fallbackTwistBn:
      'আমাদের রান্নাঘরে ওই নির্দিষ্ট খাবারটি শেষ হয়ে গেছে, আর কার্ড রিফান্ডে ৩ দিন লাগবে। আজ রাতেই কীভাবে সমাধান চান?',
    level5ConstraintEn:
      'High-stakes constraint (60s): Keep your tone calm and respectful, use accurate question word order ("Could you tell me when..."), and negotiate an immediate fair resolution.',
    level5ConstraintBn:
      'উচ্চচাপের শর্ত (৬০ সেকেন্ড): শান্ত ও ভদ্র স্বর বজায় রাখুন, প্রশ্নের সঠিক শব্দক্রম ব্যবহার করুন এবং তাৎক্ষণিক ন্যায্য সমাধান নিন।',
    targetCategories: ['articles', 'word_order'],
    linkedLessonIds: ['les_svo_order', 'les_questions_do_does'],
    defaultTargetGrammarEn: 'Accurate articles (a/an/the) & polite indirect question word order',
    defaultTargetGrammarBn: 'সঠিক আর্টিকেল (a/an/the) ও ভদ্র প্রশ্নের শব্দক্রম',
  },
  {
    id: 'university_admission_interview',
    titleEn: 'University Admission Interview',
    titleBn: 'বিশ্ববিদ্যালয় ভর্তি ইন্টারভিউ',
    contextTagEn: 'Academic & Scholarship',
    contextTagBn: 'উচ্চশিক্ষা ও স্কলারশিপ',
    rolePersonaEn: 'Graduate Admissions Committee Professor',
    rolePersonaBn: 'স্নাতকোত্তর ভর্তি কমিটির একজন অধ্যাপক',
    briefEn:
      'Explain why you chose this specific program, how your past academic or practical work prepared you, and what real-world problem in Bangladesh or globally you plan to research.',
    briefBn:
      'কেন এই নির্দিষ্ট প্রোগ্রামটি বেছে নিয়েছেন, আপনার পূর্বের পড়াশোনা বা অভিজ্ঞতা কীভাবে আপনাকে প্রস্তুত করেছে এবং ভবিষ্যতে কোন সমস্যা নিয়ে গবেষণা করতে চান তা ব্যাখ্যা করুন।',
    openingPromptEn:
      'Welcome! We reviewed your transcripts, but we want to hear in your own words: why this exact program, and how does it connect to the work you have been doing?',
    openingPromptBn:
      'স্বাগতম! কেন ঠিক এই প্রোগ্রামটি বেছে নিয়েছেন এবং এটি আপনার বর্তমান কাজ বা পড়াশোনার সাথে কীভাবে যুক্ত তা নিজের ভাষায় বলুন।',
    level1TemplatesEn: [
      'I have been focusing on [field] for [duration], which motivated me to apply to this program.',
      'Your faculty’s research on [topic] directly matches my goal to solve [problem].',
      'After graduating, I plan to apply these skills to [impact].',
    ],
    level1TemplatesBn:
      'সঠিক academic collocations ("conduct research", "make a contribution", "apply knowledge") ব্যবহার করুন।',
    level2BulletCuesEn: [
      'Connect your ongoing academic/work journey (Present Perfect Continuous)',
      'Name one concrete reason this specific program fits your goal',
      'State your post-graduation impact with precise vocabulary',
    ],
    level2BulletCuesBn: [
      'আপনার চলমান পড়াশোনা বা কাজের অভিজ্ঞতা যুক্ত করুন',
      'এই নির্দিষ্ট প্রোগ্রাম বেছে নেওয়ার একটি স্পষ্ট কারণ বলুন',
      'স্নাতকোত্তর শেষে আপনার লক্ষ্য সুনির্দিষ্ট শব্দে বলুন',
    ],
    fallbackTwistEn:
      'Many strong applicants say they want to make an impact. What is one academic weakness in your background, and how have you actively closed that gap?',
    fallbackTwistBn:
      'অনেক প্রার্থীই প্রভাব রাখার কথা বলেন। আপনার একাডেমিক পটভূমিতে একটি দুর্বলতা কী, এবং সেটি কাটিয়ে উঠতে আপনি কী করেছেন?',
    level5ConstraintEn:
      'High-stakes constraint (60s): Avoid generic clichés, use at least one complex connector (although / because / whereas), and keep every sentence focused on concrete evidence.',
    level5ConstraintBn:
      'উচ্চচাপের শর্ত (৬০ সেকেন্ড): গতানুগতিক কথা এড়িয়ে অন্তত একটি সংযুক্ত বাক্য (although / because / whereas) ব্যবহার করে সুনির্দিষ্ট প্রমাণ দিন।',
    targetCategories: ['vocabulary', 'sentence_structure'],
    linkedLessonIds: ['les_present_perfect_since', 'les_interview_star'],
    defaultTargetGrammarEn: 'Precise academic collocations & complex cause-effect sentence structures',
    defaultTargetGrammarBn: 'সঠিক একাডেমিক কলোকেশন ও জটিল কারণ-ফলাফল বাক্য গঠন',
  },
  {
    id: 'storytelling_under_pressure',
    titleEn: 'Storytelling Under Pressure',
    titleBn: 'চাপের মধ্যে গল্প ও অভিজ্ঞতা বলা',
    contextTagEn: 'Spontaneous Fluency',
    contextTagBn: 'তাৎক্ষণিক সাবলীলতা',
    rolePersonaEn: 'Live Audience Moderator at a Storytelling Night',
    rolePersonaBn: 'লাইভ স্টোরিটেলিং অনুষ্ঠানের সঞ্চালক',
    briefEn:
      'Tell a vivid 4-sentence story about an unexpected travel, work, or everyday mishap that turned into a memorable lesson — keeping the sequence clear from start to finish.',
    briefBn:
      'ভ্রমণ, কর্মক্ষেত্র বা দৈনন্দিন জীবনের একটি অপ্রত্যাশিত বিপত্তি কীভাবে স্মরণীয় শিক্ষায় পরিণত হলো তা ৪টি স্পষ্ট বাক্যে ধারাবাহিকভাবে বর্ণনা করুন।',
    openingPromptEn:
      'The mic is yours! Tell us about a moment when plans completely fell apart on you — what happened first, how did you react, and what stuck with you afterward?',
    openingPromptBn:
      'মাইক আপনার হাতে! এমন একটি মুহূর্তের কথা বলুন যখন আপনার পরিকল্পনা পুরোপুরি ভেস্তে গিয়েছিল — প্রথমে কী হলো, আপনি কীভাবে সামলালেন এবং কী শিখলেন?',
    level1TemplatesEn: [
      'Two years ago, I was traveling/preparing for [event] when suddenly [unexpected incident].',
      'At first I panicked, but then I [past-tense action].',
      'In the end, [resolution], and that experience taught me [lesson].',
    ],
    level1TemplatesBn:
      'ঘটনার পটভূমিতে Past Continuous ("was traveling") এবং মূল ঘটনায় Past Simple ("happened", "decided") ব্যবহার করুন।',
    level2BulletCuesEn: [
      'Set the scene clearly (when + where + what was happening)',
      'Describe the turning point in crisp chronological order',
      'Close with the outcome and takeaway without drifting back to present tense',
    ],
    level2BulletCuesBn: [
      'সময় ও স্থানসহ ঘটনার পটভূমি পরিষ্কারভাবে বলুন',
      'মূল মোড় ঘোরানো ঘটনাটি ধারাবাহিকভাবে বলুন',
      'অতীত কাল ধরে রেখে ফলাফল ও শিক্ষাটি বলুন',
    ],
    fallbackTwistEn:
      'Hold on — if the exact same mishap happened to your best friend tomorrow morning, what single piece of advice would you give them in two sentences?',
    fallbackTwistBn:
      'থামুন — আগামীকাল সকালে আপনার প্রিয় বন্ধুর সাথে ঠিক একই ঘটনা ঘটলে দুই বাক্যে তাকে কোন একটি পরামর্শ দেবেন?',
    level5ConstraintEn:
      'High-stakes constraint (60s): Keep a clear Beginning → Turning Point → Takeaway arc in unbroken past-tense narrative with natural English word order.',
    level5ConstraintBn:
      'উচ্চচাপের শর্ত (৬০ সেকেন্ড): শুরু → মোড় → শিক্ষা এই ক্রম বজায় রেখে নির্ভুল Past Tense ও স্বাভাবিক শব্দক্রমে গল্পটি বলুন।',
    targetCategories: ['verb_tense', 'word_order'],
    linkedLessonIds: ['les_past_simple_stories', 'les_svo_order'],
    defaultTargetGrammarEn: 'Chronological Past Simple / Past Continuous control & natural English word order',
    defaultTargetGrammarBn: 'ধারাবাহিক Past Simple / Past Continuous ও স্বাভাবিক ইংরেজি শব্দক্রম',
  },
];

export function getTransferScenario(id: TransferScenarioId): TransferScenarioDefinition {
  const direct = TRANSFER_SCENARIOS.find((s) => s.id === id);
  if (direct) return direct;

  const universe = getTransferUniverseScenario(id);
  if (universe) {
    return {
      id: universe.id,
      titleEn: universe.titleEn,
      titleBn: universe.titleBn,
      contextTagEn: universe.environmentNameEn,
      contextTagBn: universe.environmentNameBn,
      rolePersonaEn: `${universe.aiParticipantName} — ${universe.aiParticipantRoleEn}`,
      rolePersonaBn: `${universe.aiParticipantName} — ${universe.aiParticipantRoleBn}`,
      briefEn: universe.descriptionEn,
      briefBn: universe.descriptionBn,
      openingPromptEn: universe.openingMessageEn,
      openingPromptBn: universe.openingMessageBn,
      level1TemplatesEn: universe.helpfulPhrasesEn,
      level1TemplatesBn: universe.completionCriteriaBn,
      level2BulletCuesEn: universe.learningObjectivesEn,
      level2BulletCuesBn: universe.learningObjectivesBn,
      fallbackTwistEn:
        'Wait — could you clarify that point and explain how we should handle this unexpected constraint right now?',
      fallbackTwistBn:
        'এক মিনিট — বিষয়টি আরেকটু স্পষ্ট করবেন এবং এই অপ্রত্যাশিত শর্তটি এখন কীভাবে সামলাবেন?',
      level5ConstraintEn: `High-stakes constraint (60s): ${universe.completionCriteriaEn}`,
      level5ConstraintBn: `উচ্চচাপের শর্ত (৬০ সেকেন্ড): ${universe.completionCriteriaBn}`,
      targetCategories: universe.targetMistakeCategories,
      linkedLessonIds: universe.linkedLessonIds,
      defaultTargetGrammarEn: universe.targetSkills.slice(0, 2).join(' & '),
      defaultTargetGrammarBn: universe.requiredTaskBn,
    };
  }

  return TRANSFER_SCENARIOS[0];
}

export interface TransferScenarioRecommendation {
  scenario: TransferScenarioDefinition;
  isRecommended: boolean;
  priorityScore: number;
  linkedSourceType: 'mistake_memory' | 'academy_lesson' | 'baseline';
  linkedSourceId?: string;
  targetSkillLabelEn: string;
  targetSkillLabelBn: string;
  reasonEn: string;
  reasonBn: string;
  recommendedLevel: PressureLadderLevelId;
  highestPassedLevel: PressureLadderLevelId | null;
  passedCount: number;
}

/**
 * Connects Transfer Lab scenarios directly to the learner's real Mistake Memory
 * and completed/practiced Academy lessons — zero fabricated recommendations.
 */
export function buildTransferRecommendations(input: {
  mistakes: MistakeMemoryItem[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  transferAttempts: TransferAttemptRecord[];
}): TransferScenarioRecommendation[] {
  const { mistakes, lessonMastery, transferAttempts } = input;
  const activeMistakes = mistakes.filter(
    (m) => !m.falseCorrectionReported && m.status !== 'resolved'
  );

  const results: TransferScenarioRecommendation[] = TRANSFER_SCENARIOS.map((scenario) => {
    // 1. Check matching active mistakes
    const matchingMistakes = activeMistakes
      .filter((m) =>
        scenario.targetCategories.includes(classifyMistakeCategory(m.category, m.domain))
      )
      .sort((a, b) => b.occurrences - a.occurrences);

    // 2. Check matching studied Academy lessons
    const matchingLessons = scenario.linkedLessonIds
      .map((id) => lessonMastery[id])
      .filter((rec): rec is LessonMasteryRecord => Boolean(rec))
      .sort(
        (a, b) =>
          new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime()
      );

    // 3. Check past Transfer attempts for this scenario to suggest next Pressure Ladder tier
    const scenarioPasses = transferAttempts.filter(
      (a) => a.scenarioId === scenario.id && a.passed
    );
    const highestTierNum = scenarioPasses.reduce((max, a) => {
      const tier = getPressureLadderTier(a.pressureLevel).levelNumber;
      return Math.max(max, tier);
    }, 0);
    const highestPassedLevel: PressureLadderLevelId | null =
      highestTierNum > 0
        ? (scenarioPasses.find(
            (a) => getPressureLadderTier(a.pressureLevel).levelNumber === highestTierNum
          )?.pressureLevel ?? null)
        : null;

    const nextRecommendedTierNum = Math.min(5, Math.max(2, highestTierNum + 1));
    const recommendedLevel: PressureLadderLevelId =
      nextRecommendedTierNum === 1
        ? 'level_1_controlled'
        : nextRecommendedTierNum === 2
          ? 'level_2_guided'
          : nextRecommendedTierNum === 3
            ? 'level_3_open'
            : nextRecommendedTierNum === 4
              ? 'level_4_twist'
              : 'level_5_timed_high_stakes';

    if (matchingMistakes.length > 0) {
      const topMistake = matchingMistakes[0];
      const catMeta = getMistakeCategoryMeta(
        classifyMistakeCategory(topMistake.category, topMistake.domain)
      );
      const totalOcc = matchingMistakes.reduce((sum, m) => sum + Math.max(1, m.occurrences), 0);

      return {
        scenario,
        isRecommended: true,
        priorityScore: 100 + totalOcc * 10,
        linkedSourceType: 'mistake_memory',
        linkedSourceId: topMistake.id,
        targetSkillLabelEn: `${catMeta.labelEn} Transfer ("${topMistake.correctedExample}")`,
        targetSkillLabelBn: `${catMeta.labelBn} বাস্তব প্রয়োগ ("${topMistake.correctedExample}")`,
        reasonEn: `Recommended from Mistake Memory: you logged ${totalOcc} ${catMeta.labelEn} ${
          totalOcc === 1 ? 'error' : 'errors'
        } (e.g., "${topMistake.userExample}" → "${topMistake.correctedExample}"). Apply the fix here in a real scenario.`,
        reasonBn: `Mistake Memory থেকে সুপারিশকৃত: আপনার ${totalOcc}টি ${catMeta.labelBn} ভুল রেকর্ড হয়েছে ("${topMistake.userExample}" → "${topMistake.correctedExample}")। এবার নতুন বাস্তব পরিস্থিতিতে এটি নির্ভুলভাবে প্রয়োগ করুন।`,
        recommendedLevel: highestTierNum === 0 ? 'level_3_open' : recommendedLevel,
        highestPassedLevel,
        passedCount: scenarioPasses.length,
      };
    }

    if (matchingLessons.length > 0) {
      const recentLessonRec = matchingLessons[0];
      const lesson = getLessonById(recentLessonRec.lessonId);
      const titleEn = lesson?.titleEn ?? recentLessonRec.lessonId;
      const titleBn = lesson?.titleBn ?? recentLessonRec.lessonId;

      return {
        scenario,
        isRecommended: true,
        priorityScore: 70 + recentLessonRec.attemptCount * 5,
        linkedSourceType: 'academy_lesson',
        linkedSourceId: recentLessonRec.lessonId,
        targetSkillLabelEn: `Transfer from Academy: ${titleEn}`,
        targetSkillLabelBn: `একাডেমি থেকে ট্রান্সফার: ${titleBn}`,
        reasonEn: `Unlocked from your Academy lesson "${titleEn}" (${recentLessonRec.masteryPercent}% mastery). Bridge rule knowledge into unscripted communication.`,
        reasonBn: `আপনার একাডেমি লেসন "${titleBn}" (${recentLessonRec.masteryPercent}% মাস্টারি) থেকে আনলক হয়েছে — শেখা নিয়মটি বাস্তব কথোপকথনে প্রয়োগ করুন।`,
        recommendedLevel: highestTierNum === 0 ? 'level_3_open' : recommendedLevel,
        highestPassedLevel,
        passedCount: scenarioPasses.length,
      };
    }

    return {
      scenario,
      isRecommended: false,
      priorityScore: 10,
      linkedSourceType: 'baseline',
      targetSkillLabelEn: scenario.defaultTargetGrammarEn,
      targetSkillLabelBn: scenario.defaultTargetGrammarBn,
      reasonEn:
        'Available as an independent real-world transfer challenge. Complete Academy lessons or Speaking Studio sessions to personalize target grammar traps here.',
      reasonBn:
        'স্বাধীন বাস্তব যোগাযোগের চ্যালেঞ্জ হিসেবে উন্মুক্ত। আপনার ব্যক্তিগত ভুলের ভিত্তিতে টার্গেট পেতে একাডেমি লেসন বা স্পিকিং স্টুডিও সম্পন্ন করুন।',
      recommendedLevel: highestTierNum === 0 ? 'level_2_guided' : recommendedLevel,
      highestPassedLevel,
      passedCount: scenarioPasses.length,
    };
  });

  return results.sort((a, b) => b.priorityScore - a.priorityScore);
}

// ============================================================================
// Transfer Lab AI Rubric Prompting & Normalization
// ============================================================================

export interface TransferEvaluationRequest {
  scenarioId: TransferScenarioId;
  pressureLevel: PressureLadderLevelId;
  stage: 'initial' | 'twist_followup';
  userResponse: string;
  twistPromptShown?: string;
  twistResponse?: string;
  targetSkillLabelEn: string;
  linkedMistakePattern?: string;
  inputChannel: SpeakingInputChannel;
  learnerLevel: SelfEstimatedLevel;
  explanationLanguage: ExplanationLanguage;
  timedOut?: boolean;
}

export function buildTransferSystemInstruction(req: TransferEvaluationRequest): string {
  const scenario = getTransferScenario(req.scenarioId);
  const tier = getPressureLadderTier(req.pressureLevel);

  return [
    'You are LINGUAVERSE AI, a strict, evidence-based English Communication Evaluator grading a Transfer Lab real-world simulation for a Bangla-speaking English learner.',
    `Scenario: ${scenario.titleEn} — Role: ${scenario.rolePersonaEn}.`,
    `Pressure Ladder Tier: ${tier.shortLabelEn} (${tier.titleEn}).`,
    `Target Grammar / Skill Being Tested: ${req.targetSkillLabelEn}.`,
    req.linkedMistakePattern
      ? `Learner's Known Mistake Pattern to Watch Closely: ${req.linkedMistakePattern}.`
      : '',
    `Learner Self-Estimated Level: ${req.learnerLevel}.`,
    '',
    'STRICT 4-RUBRIC GRADING RULES (0 to 100 each — NEVER inflate scores):',
    '1. task_completion: Did the learner actually accomplish all required parts of the scenario brief (and Level 5 constraints if active)? Off-topic, one-word, or incomplete answers MUST score below 50.',
    '2. target_grammar_application: Did the learner correctly apply the target grammar/skill (tense consistency, preposition accuracy, articles, word order, etc.) without falling into common Bangla-L1 traps?',
    '3. contextual_appropriateness: Is the tone, politeness, and professional/everyday register appropriate for the interlocutor?',
    '4. response_relevance: Did the response directly answer the exact prompt (and the Level 4 unexpected twist if present) with logical coherence?',
    '',
    'ADDITIONAL HONESTY & BILINGUAL RULES:',
    '- Provide concise, concrete evidence in both `feedbackEn` and `feedbackBn` (proper Bengali script) for every rubric dimension.',
    '- Only list real errors in `detected_mistakes` (return `[]` if grammatically accurate). Every mistake MUST include `explanation_bn` in Bengali script.',
    '- Provide `natural_model_response` showing how a fluent speaker would handle the exact same scenario naturally.',
    req.pressureLevel === 'level_4_twist' && req.stage === 'initial'
      ? '- LEVEL 4 TWIST REQUIREMENT: You MUST generate a sharp, realistic in-character follow-up twist in `unexpected_twist_en` (1-2 sentences) and its Bangla gist in `unexpected_twist_bn` that forces the learner to adapt immediately.'
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildTransferPrompt(req: TransferEvaluationRequest): string {
  const scenario = getTransferScenario(req.scenarioId);
  const tier = getPressureLadderTier(req.pressureLevel);

  const lines = [
    `Scenario Brief: ${scenario.briefEn}`,
    `Opening Prompt Shown to Learner: "${scenario.openingPromptEn}"`,
    req.pressureLevel === 'level_5_timed_high_stakes'
      ? `Level 5 High-Stakes Constraint: ${scenario.level5ConstraintEn}`
      : '',
    `Pressure Tier: ${tier.shortLabelEn} — ${tier.titleEn}`,
    req.timedOut ? 'Timing Note: The 60-second high-stakes countdown expired before submission.' : '',
    `Learner's Initial Response: "${req.userResponse.trim()}"`,
  ];

  if (req.stage === 'twist_followup' && req.twistPromptShown && req.twistResponse) {
    lines.push(
      '',
      `Level 4 Unexpected Twist Asked: "${req.twistPromptShown}"`,
      `Learner's Response to the Twist: "${req.twistResponse.trim()}"`,
      'Grade BOTH responses together across all 4 rubrics, weighing adaptability to the unexpected twist heavily in Task Completion and Response Relevance.'
    );
  }

  lines.push('', 'Return strictly valid JSON following the configured responseSchema.');
  return lines.filter(Boolean).join('\n');
}

function clampScore(val: unknown, fallback = 50): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeRubricDim(
  raw: unknown,
  fallbackEn: string,
  fallbackBn: string
): TransferRubricDimensionScore {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    score: clampScore(obj.score, 55),
    feedbackEn:
      typeof obj.feedbackEn === 'string' && obj.feedbackEn.trim()
        ? obj.feedbackEn.trim()
        : fallbackEn,
    feedbackBn:
      typeof obj.feedbackBn === 'string' && obj.feedbackBn.trim()
        ? obj.feedbackBn.trim()
        : fallbackBn,
  };
}

export function normalizeTransferEvaluation(
  raw: unknown,
  req: TransferEvaluationRequest
): TransferRubricEvaluation {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const scenario = getTransferScenario(req.scenarioId);

  const taskCompletion = normalizeRubricDim(
    obj.task_completion,
    'Evaluated against the scenario goals.',
    'সিনারিওর মূল লক্ষ্য পূরণের ভিত্তিতে মূল্যায়িত।'
  );
  const targetGrammar = normalizeRubricDim(
    obj.target_grammar_application,
    'Evaluated for accurate application of the target grammar rule.',
    'টার্গেট ব্যাকরণের সঠিক প্রয়োগের ভিত্তিতে মূল্যায়িত।'
  );
  const contextualAppropriateness = normalizeRubricDim(
    obj.contextual_appropriateness,
    'Evaluated for tone and real-world situational register.',
    'পরিস্থিতি অনুযায়ী ভদ্রতা ও স্বরের উপযোগিতার ভিত্তিতে মূল্যায়িত।'
  );
  const responseRelevance = normalizeRubricDim(
    obj.response_relevance,
    'Evaluated for direct relevance and coherence with the prompt.',
    'প্রশ্নের সাথে সরাসরি প্রাসঙ্গিকতার ভিত্তিতে মূল্যায়িত।'
  );

  // Transparent arithmetic mean of the 4 rubric dimensions (never hidden/arbitrary)
  const overallScore = Math.round(
    (taskCompletion.score +
      targetGrammar.score +
      contextualAppropriateness.score +
      responseRelevance.score) /
      4
  );

  // Strict pass bar: overall >= 70 AND neither Task Completion nor Target Grammar below 60
  const passed =
    overallScore >= 70 &&
    taskCompletion.score >= 60 &&
    targetGrammar.score >= 60;

  const strengths = Array.isArray(obj.strengths)
    ? obj.strengths
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim())
    : [];

  const rawMistakes = Array.isArray(obj.detected_mistakes) ? obj.detected_mistakes : [];
  const detectedMistakes: SpeakingDetectedMistake[] = rawMistakes
    .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
    .map((m): SpeakingDetectedMistake => ({
      category:
        typeof m.category === 'string' && m.category.trim() ? m.category.trim() : 'Grammar',
      original:
        typeof m.original === 'string' && m.original.trim()
          ? m.original.trim()
          : req.userResponse.trim(),
      corrected:
        typeof m.corrected === 'string' && m.corrected.trim()
          ? m.corrected.trim()
          : req.userResponse.trim(),
      explanation_en:
        typeof m.explanation_en === 'string' && m.explanation_en.trim()
          ? m.explanation_en.trim()
          : 'Refine this structure for clearer real-world communication.',
      explanation_bn:
        typeof m.explanation_bn === 'string' && m.explanation_bn.trim()
          ? m.explanation_bn.trim()
          : 'বাস্তব যোগাযোগে আরও স্পষ্ট ও নির্ভুল হতে এই অংশটি সংশোধন করুন।',
      confidence:
        typeof m.confidence === 'number' && Number.isFinite(m.confidence)
          ? Math.max(0, Math.min(1, Math.round(m.confidence * 100) / 100))
          : 0.8,
      severity:
        m.severity === 'high' || m.severity === 'medium' || m.severity === 'low'
          ? m.severity
          : 'medium',
    }))
    .filter((m) => m.original.toLowerCase() !== m.corrected.toLowerCase());

  const naturalModelResponse =
    typeof obj.natural_model_response === 'string' && obj.natural_model_response.trim()
      ? obj.natural_model_response.trim()
      : req.userResponse.trim();

  const coachSummaryEn =
    typeof obj.coach_summary_en === 'string' && obj.coach_summary_en.trim()
      ? obj.coach_summary_en.trim()
      : passed
        ? 'Strong transfer performance across the four grading rubrics.'
        : 'Review the rubric breakdown below and retry to hit 70%+ with solid target grammar.';

  const coachSummaryBn =
    typeof obj.coach_summary_bn === 'string' && obj.coach_summary_bn.trim()
      ? obj.coach_summary_bn.trim()
      : passed
        ? 'চারটি মূল্যায়ন রুব্রিকেই আপনি ভালোভাবে বাস্তব প্রয়োগ দেখিয়েছেন।'
        : 'নিচের রুব্রিক বিশ্লেষণ দেখে আবার চেষ্টা করুন (উত্তীর্ণ হতে ৭০%+ ও টার্গেট ব্যাকরণে ৬০%+ প্রয়োজন)।';

  const needsTwist = req.pressureLevel === 'level_4_twist' && req.stage === 'initial';
  const unexpectedTwistEn = needsTwist
    ? typeof obj.unexpected_twist_en === 'string' && obj.unexpected_twist_en.trim()
      ? obj.unexpected_twist_en.trim()
      : scenario.fallbackTwistEn
    : undefined;
  const unexpectedTwistBn = needsTwist
    ? typeof obj.unexpected_twist_bn === 'string' && obj.unexpected_twist_bn.trim()
      ? obj.unexpected_twist_bn.trim()
      : scenario.fallbackTwistBn
    : undefined;

  return {
    task_completion: taskCompletion,
    target_grammar_application: targetGrammar,
    contextual_appropriateness: contextualAppropriateness,
    response_relevance: responseRelevance,
    overall_score: overallScore,
    passed,
    strengths,
    detected_mistakes: detectedMistakes,
    natural_model_response: naturalModelResponse,
    coach_summary_en: coachSummaryEn,
    coach_summary_bn: coachSummaryBn,
    unexpected_twist_en: unexpectedTwistEn,
    unexpected_twist_bn: unexpectedTwistBn,
  };
}

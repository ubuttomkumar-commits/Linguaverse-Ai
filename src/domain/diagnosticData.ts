import type { DiagnosticQuestion } from '../types/domain';

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'diag_q1_vocab',
    order: 1,
    domain: 'vocabulary',
    type: 'mcq',
    promptEn:
      'Choose the most natural verb to complete this workplace sentence:\n"Before we finalize the budget, we need to _____ a clear decision."',
    promptBn:
      'অফিসের এই বাক্যটি স্বাভাবিকভাবে সম্পূর্ণ করতে সঠিক Verb বেছে নিন:\n"Before we finalize the budget, we need to _____ a clear decision."',
    options: [
      { id: 'do', label: 'do' },
      { id: 'make', label: 'make' },
      { id: 'create', label: 'create' },
      { id: 'give', label: 'give' },
    ],
    correctAnswer: 'make',
    mistakeCategory: 'Collocation Transfer',
    mistakePatternEn: 'Non-natural verb + noun collocation with "decision"',
    mistakePatternBn: '"Decision"-এর সাথে ভুল Verb ব্যবহার (সিদ্ধান্ত নেওয়া/করা)',
    explanationEn:
      'In natural English, we say "make a decision" (or "reach a decision"), not "do a decision" or "give a decision".',
    explanationBn:
      'বাংলায় আমরা বলি "সিদ্ধান্ত করা" বা "সিদ্ধান্ত দেওয়া", তাই অনেকেই "do" বা "give" ব্যবহার করেন। কিন্তু স্বাভাবিক ইংরেজিতে "decision"-এর সাথে সবসময় "make a decision" বসে।',
  },
  {
    id: 'diag_q2_grammar_tense',
    order: 2,
    domain: 'grammar',
    type: 'mcq',
    promptEn:
      'Select the grammatically accurate option:\n"I _____ at this software company since March 2023."',
    promptBn:
      'ব্যাকরণগতভাবে সঠিক উত্তরটি বেছে নিন:\n"I _____ at this software company since March 2023."',
    options: [
      { id: 'am_working', label: 'am working' },
      { id: 'work', label: 'work' },
      { id: 'have_been_working', label: 'have been working' },
      { id: 'was_working', label: 'was working' },
    ],
    correctAnswer: 'have_been_working',
    mistakeCategory: 'Duration Tense Aspect',
    mistakePatternEn: 'Using Present Continuous instead of Present Perfect Continuous with "since"',
    mistakePatternBn: '"Since" থাকার পরও Present Continuous ("am working") ব্যবহার',
    explanationEn:
      'When an action started in the past ("since March 2023") and is still continuing now, English requires Present Perfect Continuous: "have been working".',
    explanationBn:
      'বাংলায় "আমি ২০২৩ সালের মার্চ থেকে কাজ করছি" বললে বর্তমান কাল হয়। কিন্তু ইংরেজিতে কাজ অতীতে শুরু হয়ে এখনও চলমান থাকলে এবং "since/for" থাকলে "have been working" বলতে হয়।',
  },
  {
    id: 'diag_q3_grammar_prep',
    order: 3,
    domain: 'grammar',
    type: 'mcq',
    promptEn:
      'Which sentence sounds completely natural and error-free?',
    promptBn:
      'নিচের কোন বাক্যটি সম্পূর্ণ শুদ্ধ ও স্বাভাবিক ইংরেজি?',
    options: [
      { id: 'opt_a', label: 'We will discuss about the client proposal tomorrow.' },
      { id: 'opt_b', label: 'We will discuss the client proposal tomorrow.' },
      { id: 'opt_c', label: 'We will discuss on the client proposal tomorrow.' },
      { id: 'opt_d', label: 'We will discussing the client proposal tomorrow.' },
    ],
    correctAnswer: 'opt_b',
    mistakeCategory: 'L1 Preposition Transfer',
    mistakePatternEn: 'Adding redundant "about/on" after the transitive verb "discuss"',
    mistakePatternBn: '"Discuss"-এর পরে অপ্রয়োজনীয় "about" বা "on" যোগ করা',
    explanationEn:
      '"Discuss" is a transitive verb that already includes the meaning of "about". Say "discuss the proposal", never "discuss about the proposal".',
    explanationBn:
      'বাংলায় "প্রস্তাবটি নিয়ে/সম্পর্কে আলোচনা করব" বলার কারণে অনেকেই "discuss about" বলেন। কিন্তু ইংরেজিতে "discuss"-এর পরে "about" বা "on" বসে না—সরাসরি বিষয়টি বসাতে হয়।',
  },
  {
    id: 'diag_q4_sentence',
    order: 4,
    domain: 'sentence_construction',
    type: 'sentence_builder',
    promptEn:
      'Arrange the words in order to express this Bangla thought naturally in English:\n"গতকাল বৃষ্টির কারণে আমি অফিসে যেতে পারিনি।"',
    promptBn:
      'নিচের বাংলা ভাবনাটি শুদ্ধ ইংরেজিতে প্রকাশ করতে শব্দগুলো সঠিক ক্রমে সাজান:\n"গতকাল বৃষ্টির কারণে আমি অফিসে যেতে পারিনি।"',
    wordBank: ['yesterday', 'because', 'I', 'the rain', 'to the office', 'go', 'of', "couldn't"],
    correctAnswer: "I couldn't go to the office yesterday because of the rain",
    acceptableAnswers: [
      "I couldn't go to the office yesterday because of the rain",
      "I couldn't go to the office because of the rain yesterday",
      "Because of the rain I couldn't go to the office yesterday",
      "Yesterday I couldn't go to the office because of the rain",
    ],
    mistakeCategory: 'Sentence Word Order',
    mistakePatternEn: 'Subject-Verb-Object ordering and "because of" + noun phrase construction',
    mistakePatternBn: 'ইংরেজি বাক্যের Subject-Verb-Object ক্রম এবং "because of" ব্যবহার',
    explanationEn:
      'English follows Subject ("I") + Modal/Verb ("couldn\'t go") + Place ("to the office") + Reason ("because of the rain"). Notice "because of" is followed by a noun phrase ("the rain").',
    explanationBn:
      'বাংলায় কারণ ও সময় শুরুতে বসলেও স্বাভাবিক ইংরেজিতে আগে কর্তা ও ক্রিয়া ("I couldn\'t go to the office") বসে, এরপর কারণ ("because of the rain")। বিশেষ্যের (noun) আগে "because" নয়, "because of" বসে।',
  },
  {
    id: 'diag_q5_reading',
    order: 5,
    domain: 'reading',
    type: 'mcq',
    passageEn:
      'Hi Team,\nOur client demo has been moved from Thursday 3:00 PM to Friday 10:30 AM because the Dhaka office has scheduled network maintenance on Thursday afternoon. Please upload your final slides to the shared folder by Thursday noon so we can run a quick rehearsal before the maintenance window starts.',
    passageBnHint:
      'উপরের সংক্ষিপ্ত অফিস ইমেইলটি মনোযোগ দিয়ে পড়ে নিচের প্রশ্নের উত্তর দিন।',
    promptEn: 'Why must the team upload their final slides by Thursday noon?',
    promptBn: 'দলটিকে কেন বৃহস্পতিবার দুপুরের মধ্যে ফাইনাল স্লাইড আপলোড করতে হবে?',
    options: [
      { id: 'r_a', label: 'Because the client demo was moved to Thursday afternoon.' },
      { id: 'r_b', label: 'So they can rehearse before the Thursday afternoon network maintenance.' },
      { id: 'r_c', label: 'Because the shared folder will be deleted on Friday morning.' },
      { id: 'r_d', label: 'So the Dhaka office can cancel the Friday presentation.' },
    ],
    correctAnswer: 'r_b',
    mistakeCategory: 'Reading Inference & Cause-Effect',
    mistakePatternEn: 'Linking deadline conditions with cause-and-effect clauses ("so we can...")',
    mistakePatternBn: 'ইংরেজি অনুচ্ছেদে কারণ ও উদ্দেশ্য ("because" / "so we can") সঠিকভাবে আলাদা করা',
    explanationEn:
      'The message explains that network maintenance happens Thursday afternoon, so slides are due Thursday noon specifically to run a rehearsal beforehand.',
    explanationBn:
      'ইমেইলে বলা হয়েছে বৃহস্পতিবার বিকেলে নেটওয়ার্ক রক্ষণাবেক্ষণ (maintenance) হবে, তাই তার আগেই রিহার্সাল করার জন্য ("so we can run a quick rehearsal") বৃহস্পতিবার দুপুরের মধ্যে স্লাইড জমা দিতে হবে।',
  },
];

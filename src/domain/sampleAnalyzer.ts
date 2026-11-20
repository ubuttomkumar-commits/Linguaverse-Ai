export interface SamplePreset {
  id: string;
  labelEn: string;
  labelBn: string;
  inputSentence: string;
  contextEn: string;
  contextBn: string;
}

export type SampleErrorCategory =
  | 'Verb Tense'
  | 'Preposition'
  | 'Redundancy'
  | 'Sentence Structure'
  | 'Auxiliary Verb'
  | 'Clean';

export interface SampleMistakeAnalysis {
  originalSentence: string;
  hasDetectedMistake: boolean;
  errorCategory: SampleErrorCategory;
  errorCategoryBn: string;
  errorSpan: string;
  correctionSpan: string;
  correctedSentence: string;
  patternNameEn: string;
  patternNameBn: string;
  l1TriggerEn: string;
  l1TriggerBn: string;
  explanationEn: string;
  explanationBn: string;
  memoryTag: string;
  analysisSource?: 'rule' | 'gemini';
}

export const HERO_SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'past_tense_market',
    labelEn: 'Past Tense Omission',
    labelBn: 'অতীত কালের ভুল',
    inputSentence: 'I go to market yesterday',
    contextEn: 'Daily storytelling',
    contextBn: 'দৈনন্দিন কথোপকথন',
  },
  {
    id: 'third_person_aux',
    labelEn: '3rd-Person Auxiliary',
    labelBn: 'Verb-এর সাথে Does/Do',
    inputSentence: "He don't know my brother name",
    contextEn: 'Conversation with colleague',
    contextBn: 'সহকর্মীর সাথে কথা',
  },
  {
    id: 'since_continuous',
    labelEn: 'Duration with "Since"',
    labelBn: 'Since ও সময়ের কাল',
    inputSentence: 'I am working here since 2022',
    contextEn: 'Job interview introduction',
    contextBn: 'চাকরির ইন্টারভিউ',
  },
];

export const SANDBOX_SAMPLE_CHIPS: SamplePreset[] = [
  {
    id: 'chip_yesterday_office',
    labelEn: 'Yesterday I go to office late because traffic jam',
    labelBn: 'Yesterday I go to office late because traffic jam',
    inputSentence: 'Yesterday I go to office late because traffic jam',
    contextEn: 'Office arrival explanation',
    contextBn: 'অফিসে দেরি হওয়ার ব্যাখ্যা',
  },
  {
    id: 'chip_am_agree',
    labelEn: 'I am agree with your decision',
    labelBn: 'I am agree with your decision',
    inputSentence: 'I am agree with your decision',
    contextEn: 'Team meeting discussion',
    contextBn: 'অফিস মিটিংয়ে মতামত',
  },
  {
    id: 'chip_senior_than',
    labelEn: 'He is senior than me',
    labelBn: 'He is senior than me',
    inputSentence: 'He is senior than me',
    contextEn: 'Workplace introduction',
    contextBn: 'কর্মক্ষেত্রে পরিচয়',
  },
  {
    id: 'chip_repeat_again',
    labelEn: 'Can you repeat again please?',
    labelBn: 'Can you repeat again please?',
    inputSentence: 'Can you repeat again please?',
    contextEn: 'Interview / call clarification',
    contextBn: 'ইন্টারভিউ বা কলে পুনরায় শোনা',
  },
];

interface RuleDefinition {
  id: string;
  memoryTag: string;
  test: (normalized: string) => boolean;
  build: (original: string) => SampleMistakeAnalysis;
}

function ensureTerminalPunctuation(text: string, original: string): string {
  const trimmed = text.trim();
  if (/[.!?]$/.test(trimmed)) return trimmed;
  if (original.trim().endsWith('?')) return `${trimmed}?`;
  return `${trimmed}.`;
}

const SAMPLE_RULES: RuleDefinition[] = [
  {
    id: 'past_go_office_traffic',
    memoryTag: 'L1-TENSE-STRUCT-06',
    test: (s) =>
      /\bi\s+go\b/.test(s) &&
      /\b(yesterday|last\s+(night|week|month|year)|ago)\b/.test(s) &&
      /\bbecause\s+(of\s+)?traffic\s+jam\b/.test(s),
    build: (original) => {
      const corrected = original
        .replace(/\bgo\b/i, 'went')
        .replace(/\bto office\b/i, 'to the office')
        .replace(/\bbecause\s+traffic\s+jam\b/i, 'because of a traffic jam');
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorCategory: 'Verb Tense',
        errorCategoryBn: 'Verb Tense ও বাক্য গঠন',
        errorSpan: 'go to office ... because traffic jam',
        correctionSpan: 'went to the office ... because of a traffic jam',
        correctedSentence: ensureTerminalPunctuation(corrected, original),
        patternNameEn: 'Past Tense Omission + "Because of" Before Noun Phrase',
        patternNameBn: 'অতীত কালের Verb বাদ পড়া এবং Noun-এর আগে "because of"',
        l1TriggerEn:
          'Bangla uses "গতকাল" for past time and "কারণ ট্রাফিক জ্যাম" directly without a connecting preposition like "of".',
        l1TriggerBn:
          'বাংলায় "গতকাল" শুরুতে থাকায় অনেকেই ইংরেজিতে "go"-কে "went" করতে ভুলে যান। আর বাংলায় "কারণ ট্রাফিক জ্যাম" বলা যায়, কিন্তু ইংরেজিতে Noun-এর আগে "because of" বসাতে হয়।',
        explanationEn:
          'Use past tense "went" with "yesterday", add "the" before "office", and use "because of + noun" ("because of a traffic jam") instead of bare "because + noun".',
        explanationBn:
          '"Yesterday" থাকায় "go"-এর বদলে "went" বসবে। পাশাপাশি "traffic jam" একটি Noun phrase হওয়ায় শুধু "because" নয়, "because of a traffic jam" বলতে হয়।',
        memoryTag: 'L1-TENSE-STRUCT-06',
        analysisSource: 'rule',
      };
    },
  },
  {
    id: 'past_go_yesterday',
    memoryTag: 'L1-TENSE-PAST-01',
    test: (s) =>
      /\bi\s+go\b/.test(s) && /\b(yesterday|last\s+(night|week|month|year)|ago)\b/.test(s),
    build: (original) => {
      const hasToThe = /\bto\s+the\s+market\b/i.test(original);
      const corrected = original
        .replace(/\bgo\b/i, 'went')
        .replace(/\bto market\b/i, hasToThe ? 'to the market' : 'to the market')
        .replace(/\bto office\b/i, 'to the office');
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorCategory: 'Verb Tense',
        errorCategoryBn: 'Verb Tense (কাল)',
        errorSpan: /to market/i.test(original) ? 'go to market' : 'go',
        correctionSpan: /to market/i.test(original) ? 'went to the market' : 'went',
        correctedSentence: ensureTerminalPunctuation(corrected, original),
        patternNameEn: 'Past Tense Marker Omission + Missing Article',
        patternNameBn: 'অতীত কালের Verb রূপ বাদ পড়া এবং Article ব্যবহার',
        l1TriggerEn:
          'Bangla relies on time words ("গতকাল") while verb inflection happens at the end; learners often keep the base English verb "go".',
        l1TriggerBn:
          'বাংলায় "গতকাল বাজারে গিয়েছিলাম" বলার সময় সময়ের শব্দ ("গতকাল") শুরুতেই থাকে। ইংরেজিতে অনুবাদ করতে গিয়ে অনেকেই মূল ক্রিয়ার (go) Past form (went) ব্যবহার করতে ভুলে যান।',
        explanationEn:
          'Because "yesterday" places the action in finished past time, use the simple past verb "went" instead of "go". In natural English, also include "the" before "market".',
        explanationBn:
          'বাক্যে "yesterday" (গতকাল) থাকায় কাজটি অতীতে শেষ হয়ে গেছে। তাই "go"-এর পরিবর্তে Past form "went" বসাতে হবে, এবং নির্দিষ্ট জায়গা বোঝাতে "the market" বলা বেশি স্বাভাবিক।',
        memoryTag: 'L1-TENSE-PAST-01',
        analysisSource: 'rule',
      };
    },
  },
  {
    id: 'am_agree',
    memoryTag: 'L1-STRUCT-AGREE-07',
    test: (s) => /\b(i\s+am|he\s+is|she\s+is|we\s+are|they\s+are|you\s+are)\s+(not\s+)?agree\b/.test(s),
    build: (original) => {
      const corrected = original
        .replace(/\bI\s+am\s+not\s+agree\b/i, "I don't agree")
        .replace(/\bI\s+am\s+agree\b/i, 'I agree')
        .replace(/\b(He|She)\s+is\s+not\s+agree\b/i, "$1 doesn't agree")
        .replace(/\b(He|She)\s+is\s+agree\b/i, '$1 agrees')
        .replace(/\b(We|They|You)\s+are\s+not\s+agree\b/i, "$1 don't agree")
        .replace(/\b(We|They|You)\s+are\s+agree\b/i, '$1 agree');
      const spanMatch = original.match(
        /\b(I\s+am|He\s+is|She\s+is|We\s+are|They\s+are|You\s+are)\s+(not\s+)?agree\b/i
      );
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorCategory: 'Sentence Structure',
        errorCategoryBn: 'Sentence Structure (বাক্য গঠন)',
        errorSpan: spanMatch?.[0] ?? 'I am agree',
        correctionSpan: corrected.match(/\b(I|He|She|We|They|You)\s+(don't\s+|doesn't\s+)?agrees?\b/i)?.[0] ?? 'I agree',
        correctedSentence: ensureTerminalPunctuation(corrected, original),
        patternNameEn: 'Extra "Be" Verb Before Action/State Verb ("Agree")',
        patternNameBn: '"Agree"-এর আগে অপ্রয়োজনীয় am/is/are ব্যবহার',
        l1TriggerEn:
          'In Bangla, "আমি একমত" ("I [am] in-agreement") feels like an adjective, prompting learners to insert "am" before "agree".',
        l1TriggerBn:
          'বাংলায় "আমি একমত" বা "আমি রাজি" বলার সময় "একমত" শব্দটিকে Adjective মনে হয়, তাই ইংরেজিতে অনেকেই ভুল করে "am/is/are" বসিয়ে "I am agree" বলেন।',
        explanationEn:
          '"Agree" is already a full verb, not an adjective. Say "I agree with your decision" directly without "am".',
        explanationBn:
          'ইংরেজিতে "agree" নিজেই একটি মূল Verb (ক্রিয়া), Adjective নয়। তাই এর আগে "am/is/are" বসবে না—সরাসরি "I agree with your decision" বলুন।',
        memoryTag: 'L1-STRUCT-AGREE-07',
        analysisSource: 'rule',
      };
    },
  },
  {
    id: 'senior_junior_than',
    memoryTag: 'L1-PREP-LATIN-08',
    test: (s) => /\b(senior|junior|superior|inferior|prefer)\s+than\b/.test(s),
    build: (original) => {
      const match = original.match(/\b(senior|junior|superior|inferior|prefer)\s+than\b/i);
      const word = match?.[1] ?? 'senior';
      const corrected = original.replace(
        /\b(senior|junior|superior|inferior|prefer)\s+than\b/i,
        `${word} to`
      );
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorCategory: 'Preposition',
        errorCategoryBn: 'Preposition (সঠিক অব্যয়)',
        errorSpan: match?.[0] ?? 'senior than',
        correctionSpan: `${word} to`,
        correctedSentence: ensureTerminalPunctuation(corrected, original),
        patternNameEn: 'Comparative Preposition: "Senior/Junior To" (Not "Than")',
        patternNameBn: 'Senior / Junior-এর পর "than" নয়, "to" বসে',
        l1TriggerEn:
          'In Bangla, comparison uses "চেয়ে" ("আমার চেয়ে বড়"), which learners map universally to English "than".',
        l1TriggerBn:
          'বাংলায় তুলনা বোঝাতে সব ক্ষেত্রেই "চেয়ে" ("আমার চেয়ে সিনিয়র") বলা হয়, যার সরাসরি অনুবাদ হিসেবে অনেকেই "than" বসিয়ে ফেলেন।',
        explanationEn:
          'Words ending in "-ior" like "senior", "junior", "superior", and "inferior" always take the preposition "to" rather than "than". Say "He is senior to me."',
        explanationBn:
          'ইংরেজিতে "senior", "junior", "superior", "inferior" এবং "prefer"-এর পর তুলনা করতে কখনো "than" বসে না—সবসময় "to" বসে। সঠিক বাক্য: "He is senior to me."',
        memoryTag: 'L1-PREP-LATIN-08',
        analysisSource: 'rule',
      };
    },
  },
  {
    id: 'third_person_dont',
    memoryTag: 'L1-AGREEMENT-3SG-02',
    test: (s) => /\b(he|she|it)\s+don'?t\b/.test(s),
    build: (original) => {
      const corrected = original
        .replace(/\b(he|she|it)\s+don'?t\b/i, (_, subj: string) => `${subj} doesn't`)
        .replace(/\bmy brother name\b/i, "my brother's name");
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorCategory: 'Auxiliary Verb',
        errorCategoryBn: 'Auxiliary Verb (সহায়ক ক্রিয়া)',
        errorSpan: /my brother name/i.test(original) ? "don't ... brother name" : "don't",
        correctionSpan: /my brother name/i.test(original)
          ? "doesn't ... brother's name"
          : "doesn't",
        correctedSentence: ensureTerminalPunctuation(corrected, original),
        patternNameEn: 'Third-Person Singular Auxiliary & Possessive Form',
        patternNameBn: 'Third-Person Singular-এ Doesn’t এবং অধিকারসূচক চিহ্ন (’s)',
        l1TriggerEn:
          'Bangla negation ("জানে না") does not change an auxiliary verb for He/She, and possessive ("ভাইয়ের নাম") often drops English "\'s" in rapid speech.',
        l1TriggerBn:
          'বাংলায় "সে জানে না" বলার সময় আলাদা Auxiliary Verb বদলায় না, তাই দ্রুত কথা বলার সময় He/She-এর পর "don\'t" চলে আসে। পাশাপাশি "ভাইয়ের নাম" বোঝাতে ইংরেজিতে "brother\'s name" দরকার।',
        explanationEn:
          'With singular third-person subjects (he, she, it), use "doesn\'t" + base verb ("know"). Use "\'s" ("brother\'s name") to show possession.',
        explanationBn:
          'He, She বা একবচন কর্তার সাথে নেতিবাচক বাক্যে "don\'t" নয়, "doesn\'t" বসে। আর কারও নাম বা অধিকার বোঝাতে "brother\'s name" ব্যবহার করতে হয়।',
        memoryTag: 'L1-AGREEMENT-3SG-02',
        analysisSource: 'rule',
      };
    },
  },
  {
    id: 'since_present_continuous',
    memoryTag: 'L1-ASPECT-SINCE-03',
    test: (s) => /\b(am|is|are)\s+\w+ing\b/.test(s) && /\b(since|for)\b/.test(s),
    build: (original) => {
      const hasDurationCount = /\bsince\s+(a|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(day|week|month|year|hour)s?\b/i.test(
        original
      );
      let corrected = original
        .replace(/\bI\s+am\s+(\w+ing)\b/i, 'I have been $1')
        .replace(/\b(He|She)\s+is\s+(\w+ing)\b/i, '$1 has been $2')
        .replace(/\b(We|They|You)\s+are\s+(\w+ing)\b/i, '$1 have been $2');
      if (hasDurationCount) {
        corrected = corrected.replace(/\bsince\b/i, 'for');
      }
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorCategory: 'Verb Tense',
        errorCategoryBn: 'Verb Tense ও সময়ের কাল',
        errorSpan: original.match(/\b(am|is|are)\s+\w+ing\b/i)?.[0] ?? 'am working',
        correctionSpan:
          corrected.match(/\b(have|has)\s+been\s+\w+ing\b/i)?.[0] ?? 'have been working',
        correctedSentence: ensureTerminalPunctuation(corrected, original),
        patternNameEn: 'Duration Aspect Transfer (Continuous vs. Present Perfect Continuous)',
        patternNameBn: 'চলমান সময়ের সাথে Present Perfect Continuous-এর ব্যবহার',
        l1TriggerEn:
          'Bangla uses the same present continuous form ("তিন বছর ধরে / ২০২২ থেকে কাজ করছি") for ongoing actions started in the past.',
        l1TriggerBn:
          'বাংলায় "আমি ২০২২ সাল থেকে এখানে কাজ করছি"—বর্তমান ঘটমান ক্রিয়াই যথেষ্ট। কিন্তু ইংরেজিতে কাজ অতীতে শুরু হয়ে এখনও চললে "am working" না বলে "have been working" বলতে হয়।',
        explanationEn: hasDurationCount
          ? 'Use Present Perfect Continuous ("have been working") for actions that began in the past and continue now, and use "for" (not "since") before a length of time like "three years".'
          : 'When an action started in the past and continues into the present with "since" or "for", English requires Present Perfect Continuous ("have/has been + verb-ing").',
        explanationBn: hasDurationCount
          ? 'অতীতে শুরু হয়ে এখনও চলছে এমন কাজে "am working"-এর বদলে "have been working" বসবে। আর নির্দিষ্ট সময়ের দৈর্ঘ্য ("three years") বোঝাতে "since" নয়, "for" বসে।'
          : 'কোনো কাজ অতীতে শুরু হয়ে এখনও চলছে এবং বাক্যে "since" বা "for" থাকলে ইংরেজিতে "am/is/are + ing"-এর বদলে "have/has been + verb-ing" ব্যবহার করতে হয়।',
        memoryTag: 'L1-ASPECT-SINCE-03',
        analysisSource: 'rule',
      };
    },
  },
  {
    id: 'discuss_about',
    memoryTag: 'L1-PREP-TRANSITIVE-04',
    test: (s) => /\bdiscuss\s+about\b/.test(s),
    build: (original) => {
      const corrected = original.replace(/\bdiscuss\s+about\b/i, 'discuss');
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorCategory: 'Preposition',
        errorCategoryBn: 'Preposition (অতিরিক্ত অব্যয়)',
        errorSpan: 'discuss about',
        correctionSpan: 'discuss',
        correctedSentence: ensureTerminalPunctuation(corrected, original),
        patternNameEn: 'Redundant Preposition After Transitive Verb',
        patternNameBn: 'Transitive Verb-এর পর অতিরিক্ত Preposition ("about")',
        l1TriggerEn:
          'Translated directly from Bangla "বিষয়ে আলোচনা করা" where "বিষয়ে" maps mentally to "about".',
        l1TriggerBn:
          'বাংলায় আমরা বলি "বিষয়টি নিয়ে/সম্পর্কে আলোচনা করা"। সেই অভ্যাস থেকে "discuss"-এর পর "about" বসে যায়, যা ইংরেজিতে অপ্রয়োজনীয়।',
        explanationEn:
          '"Discuss" already means "talk about". Remove "about" directly after "discuss" (e.g., "discuss the project").',
        explanationBn:
          '"Discuss" শব্দটির অর্থই হলো কোনো বিষয় নিয়ে আলোচনা করা। তাই এর পরে আলাদা করে "about" বসানো যাবে না—সরাসরি বিষয়টি বলুন।',
        memoryTag: 'L1-PREP-TRANSITIVE-04',
        analysisSource: 'rule',
      };
    },
  },
  {
    id: 'return_back',
    memoryTag: 'L1-REDUNDANCY-05',
    test: (s) => /\b(return|revert|repeat)\s+(back|again)\b/.test(s),
    build: (original) => {
      const match = original.match(/\b(return|revert|repeat)\s+(back|again)\b/i);
      const verb = match?.[1] ?? 'return';
      const isRepeatQuestion = /^can\s+you\s+repeat\s+again\b/i.test(original.trim());
      const corrected = isRepeatQuestion
        ? original
            .replace(/\brepeat\s+again\s+please\b/i, 'repeat that, please')
            .replace(/\brepeat\s+again\b/i, 'repeat that')
        : original.replace(/\b(return|revert|repeat)\s+(back|again)\b/i, verb);
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorCategory: 'Redundancy',
        errorCategoryBn: 'Redundancy (পুনরাবৃত্তি)',
        errorSpan: match?.[0] ?? 'repeat again',
        correctionSpan: isRepeatQuestion ? 'repeat that' : verb,
        correctedSentence: ensureTerminalPunctuation(corrected, original),
        patternNameEn: 'Redundant Directional / Repetition Modifier',
        patternNameBn: 'পুনরাবৃত্তিমূলক শব্দ ব্যবহার (Repeat Again / Return Back)',
        l1TriggerEn:
          'Mirrors Bangla phrasing like "আবার একটু বলবেন?" or "ফিরে আসা", causing learners to add "again" after "repeat" or "back" after "return".',
        l1TriggerBn:
          'বাংলায় "আবার একটু বলবেন?" বা "ফিরে আসা" বলার অভ্যাস থেকে ইংরেজিতে "repeat again" বা "return back" চলে আসে।',
        explanationEn: isRepeatQuestion
          ? '"Repeat" already means "say again", and it normally takes an object like "that". Say "Can you repeat that, please?" for crisp, polite English.'
          : `"${verb}" already contains the meaning of "back/again". Use "${verb}" by itself for crisp, natural English.`,
        explanationBn: isRepeatQuestion
          ? '"Repeat" শব্দের অর্থই হলো "আবার বলা"—তাই পাশে "again" বসানো ভুল। পাশাপাশি "repeat"-এর পর "that" যোগ করে বলুন: "Can you repeat that, please?"'
          : `"${verb}" শব্দের মধ্যেই "ফিরে/আবার" অর্থটি আছে। তাই অতিরিক্ত "back" বা "again" বাদ দিলে বাক্যটি স্বাভাবিক ও শুদ্ধ হয়।`,
        memoryTag: 'L1-REDUNDANCY-05',
        analysisSource: 'rule',
      };
    },
  },
  {
    id: 'did_past_verb',
    memoryTag: 'L1-TENSE-DID-09',
    test: (s) => /\bdid(\s+not|n't)?\s+(went|came|ate|saw|told|bought|took|made|did|got)\b/.test(s),
    build: (original) => {
      const baseMap: Record<string, string> = {
        went: 'go',
        came: 'come',
        ate: 'eat',
        saw: 'see',
        told: 'tell',
        bought: 'buy',
        took: 'take',
        made: 'make',
        did: 'do',
        got: 'get',
      };
      const match = original.match(
        /\b(did(?:\s+not|n't)?)\s+(went|came|ate|saw|told|bought|took|made|did|got)\b/i
      );
      const aux = match?.[1] ?? "didn't";
      const wrongVerb = (match?.[2] ?? 'went').toLowerCase();
      const rightVerb = baseMap[wrongVerb] ?? wrongVerb;
      const corrected = original.replace(
        /\b(did(?:\s+not|n't)?)\s+(went|came|ate|saw|told|bought|took|made|did|got)\b/i,
        `${aux} ${rightVerb}`
      );
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorCategory: 'Verb Tense',
        errorCategoryBn: 'Verb Tense (দ্বৈত Past)',
        errorSpan: match?.[0] ?? `${aux} ${wrongVerb}`,
        correctionSpan: `${aux} ${rightVerb}`,
        correctedSentence: ensureTerminalPunctuation(corrected, original),
        patternNameEn: 'Double Past Marking After "Did / Didn\'t"',
        patternNameBn: '"Did / Didn\'t"-এর পর পুনরায় Past Verb ব্যবহার',
        l1TriggerEn:
          'When emphasizing a past negative in Bangla ("যাইনি"), learners mark past tense twice in English ("didn\'t went").',
        l1TriggerBn:
          'অতীতের ঘটনা বোঝাতে গিয়ে অনেকেই "did/didn\'t" বসানোর পরও মূল Verb-টিকে Past form-এ রেখে দেন।',
        explanationEn: `"${aux}" already carries the past tense. Always use the base form "${rightVerb}" right after "${aux}".`,
        explanationBn: `"${aux}" নিজেই অতীত কাল বহন করে। তাই এর পরে মূল ক্রিয়ার Base form "${rightVerb}" বসাতে হবে, "${wrongVerb}" নয়।`,
        memoryTag: 'L1-TENSE-DID-09',
        analysisSource: 'rule',
      };
    },
  },
  {
    id: 'my_self_intro',
    memoryTag: 'L1-STRUCT-MYSELF-10',
    test: (s) => /^myself\s+[a-z]/.test(s),
    build: (original) => {
      const corrected = original.replace(/^myself\s+/i, 'My name is ');
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorCategory: 'Sentence Structure',
        errorCategoryBn: 'Sentence Structure (আত্মপরিচয়)',
        errorSpan: 'Myself',
        correctionSpan: 'My name is',
        correctedSentence: ensureTerminalPunctuation(corrected, original),
        patternNameEn: 'Reflexive Pronoun Used as Interview Subject ("Myself...")',
        patternNameBn: 'পরিচয় দেওয়ার শুরুতে "Myself" ব্যবহার',
        l1TriggerEn:
          'Very common South Asian interview opening borrowed as a polite shortcut, but ungrammatical in standard professional English.',
        l1TriggerBn:
          'ইন্টারভিউয়ে অনেকেই বিনয়ী শোনানোর জন্য "Myself [নাম]" বলেন, কিন্তু প্রমিত ইংরেজিতে "Myself" কখনো বাক্যের Subject হতে পারে না।',
        explanationEn:
          'Never start a self-introduction with "Myself". Use "My name is..." or "I am..." for clear, confident professional English.',
        explanationBn:
          'নিজের পরিচয় দিতে কখনো "Myself" দিয়ে বাক্য শুরু করবেন না। আত্মবিশ্বাসের সাথে "My name is..." অথবা "I am..." বলুন।',
        memoryTag: 'L1-STRUCT-MYSELF-10',
        analysisSource: 'rule',
      };
    },
  },
];

export function analyzeSampleSentence(input: string): SampleMistakeAnalysis {
  const trimmed = input.trim();
  const normalized = trimmed.toLowerCase();

  for (const rule of SAMPLE_RULES) {
    if (rule.test(normalized)) {
      return rule.build(trimmed);
    }
  }

  return {
    originalSentence: trimmed || HERO_SAMPLE_PRESETS[0].inputSentence,
    hasDetectedMistake: false,
    errorCategory: 'Clean',
    errorCategoryBn: 'সঠিক গঠন',
    errorSpan: '',
    correctionSpan: '',
    correctedSentence: trimmed || HERO_SAMPLE_PRESETS[0].inputSentence,
    patternNameEn: 'No Common L1 Pattern Triggered in Sample',
    patternNameBn: 'এই নমুনায় সাধারণ কোনো বাংলা-প্রভাবিত ভুল ধরা পড়েনি',
    l1TriggerEn:
      'Your sentence looks clean against our core Bangla-to-English interference rules. Sign up for free to get full voice & contextual analysis.',
    l1TriggerBn:
      'আমাদের প্রাথমিক বাংলা-থেকে-ইংরেজি ভুল শনাক্তকরণে এই বাক্যে সাধারণ কোনো ভুল পাওয়া যায়নি। সম্পূর্ণ ভয়েস ও কনটেক্সট বিশ্লেষণের জন্য ফ্রি অ্যাকাউন্ট শুরু করুন।',
    explanationEn:
      'Try one of the sample chips above—or test phrases like "Yesterday I go to office late because traffic jam" or "I am agree with your decision"—to see instant Bangla-first explanation.',
    explanationBn:
      'উপরের নমুনা বাক্যগুলো বেছে নিন অথবা "Yesterday I go to office late because traffic jam" কিংবা "I am agree with your decision" লিখে দেখুন কীভাবে বাংলায় ব্যাখ্যা তৈরি হয়।',
    memoryTag: 'SAMPLE-CLEAN',
    analysisSource: 'rule',
  };
}

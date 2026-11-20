export interface SamplePreset {
  id: string;
  labelEn: string;
  labelBn: string;
  inputSentence: string;
  contextEn: string;
  contextBn: string;
}

export interface SampleMistakeAnalysis {
  originalSentence: string;
  hasDetectedMistake: boolean;
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

interface RuleDefinition {
  id: string;
  memoryTag: string;
  test: (normalized: string) => boolean;
  build: (original: string) => SampleMistakeAnalysis;
}

const SAMPLE_RULES: RuleDefinition[] = [
  {
    id: 'past_go_yesterday',
    memoryTag: 'L1-TENSE-PAST-01',
    test: (s) =>
      /\bi\s+go\b/.test(s) && /\b(yesterday|last\s+(night|week|month|year)|ago)\b/.test(s),
    build: (original) => {
      const hasToThe = /\bto\s+the\s+market\b/i.test(original);
      const corrected = original
        .replace(/\bgo\b/i, 'went')
        .replace(/\bto market\b/i, hasToThe ? 'to the market' : 'to the market');
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorSpan: 'go to market',
        correctionSpan: 'went to the market',
        correctedSentence: corrected.endsWith('.') ? corrected : `${corrected}.`,
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
        errorSpan: /my brother name/i.test(original) ? "don't ... brother name" : "don't",
        correctionSpan: /my brother name/i.test(original)
          ? "doesn't ... brother's name"
          : "doesn't",
        correctedSentence: corrected.endsWith('.') ? corrected : `${corrected}.`,
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
      };
    },
  },
  {
    id: 'since_present_continuous',
    memoryTag: 'L1-ASPECT-SINCE-03',
    test: (s) => /\b(am|is|are)\s+\w+ing\b/.test(s) && /\b(since|for)\b/.test(s),
    build: (original) => {
      const corrected = original
        .replace(/\bI\s+am\s+(\w+ing)\b/i, 'I have been $1')
        .replace(/\b(He|She)\s+is\s+(\w+ing)\b/i, '$1 has been $2')
        .replace(/\b(We|They|You)\s+are\s+(\w+ing)\b/i, '$1 have been $2');
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorSpan: original.match(/\b(am|is|are)\s+\w+ing\b/i)?.[0] ?? 'am working',
        correctionSpan: corrected.match(/\b(have|has)\s+been\s+\w+ing\b/i)?.[0] ?? 'have been working',
        correctedSentence: corrected.endsWith('.') ? corrected : `${corrected}.`,
        patternNameEn: 'Duration Aspect Transfer (Continuous vs. Present Perfect Continuous)',
        patternNameBn: 'চলমান সময়ের সাথে Present Perfect Continuous-এর ব্যবহার',
        l1TriggerEn:
          'Bangla uses the same present continuous form ("২০২২ সাল থেকে কাজ করছি") for ongoing actions started in the past.',
        l1TriggerBn:
          'বাংলায় "আমি ২০২২ সাল থেকে এখানে কাজ করছি"—বর্তমান ঘটমান ক্রিয়াই যথেষ্ট। কিন্তু ইংরেজিতে কাজ অতীতে শুরু হয়ে এখনও চললে "am working" না বলে "have been working" বলতে হয়।',
        explanationEn:
          'When an action started in the past and continues into the present with "since" or "for", English requires Present Perfect Continuous ("have/has been + verb-ing").',
        explanationBn:
          'কোনো কাজ অতীতে শুরু হয়ে এখনও চলছে এবং বাক্যে "since" বা "for" থাকলে ইংরেজিতে "am/is/are + ing"-এর বদলে "have/has been + verb-ing" ব্যবহার করতে হয়।',
        memoryTag: 'L1-ASPECT-SINCE-03',
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
        errorSpan: 'discuss about',
        correctionSpan: 'discuss',
        correctedSentence: corrected.endsWith('.') ? corrected : `${corrected}.`,
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
      const corrected = original.replace(/\b(return|revert|repeat)\s+(back|again)\b/i, verb);
      return {
        originalSentence: original,
        hasDetectedMistake: true,
        errorSpan: match?.[0] ?? 'return back',
        correctionSpan: verb,
        correctedSentence: corrected.endsWith('.') ? corrected : `${corrected}.`,
        patternNameEn: 'Redundant Directional Modifier',
        patternNameBn: 'পুনরাবৃত্তিমূলক শব্দ ব্যবহার (Return Back)',
        l1TriggerEn:
          'Mirrors Bangla compound verbs like "ফিরে আসা" where two words express return.',
        l1TriggerBn:
          'বাংলায় "ফিরে আসা" বা "পুনরায় বলা" যৌগিক ক্রিয়ার প্রভাবে ইংরেজিতে "return back" বা "repeat again" চলে আসে।',
        explanationEn:
          `"${verb}" already contains the meaning of "back/again". Use "${verb}" by itself for crisp, natural English.`,
        explanationBn:
          `"${verb}" শব্দের মধ্যেই "ফিরে/আবার" অর্থটি আছে। তাই অতিরিক্ত "back" বা "again" বাদ দিলে বাক্যটি স্বাভাবিক ও শুদ্ধ হয়।`,
        memoryTag: 'L1-REDUNDANCY-05',
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
    errorSpan: '',
    correctionSpan: '',
    correctedSentence: trimmed || HERO_SAMPLE_PRESETS[0].inputSentence,
    patternNameEn: 'No Common L1 Pattern Triggered in Sample',
    patternNameBn: 'এই নমুনায় সাধারণ কোনো বাংলা-প্রভাবিত ভুল ধরা পড়েনি',
    l1TriggerEn:
      'This interactive hero sample checks 5 high-frequency Bangla-to-English interference rules. Full voice & contextual diagnosis unlocks inside your learner workspace.',
    l1TriggerBn:
      'হিরো সেকশনের এই নমুনা প্রিভিউটি ৫টি বহুল প্রচলিত বাংলা-থেকে-ইংরেজি ভুলের ধরন যাচাই করে। আপনার সম্পূর্ণ ব্যক্তিগত বিশ্লেষণ শুরু করতে ফ্রি ডায়াগনস্টিক দিন।',
    explanationEn:
      'Try one of the sample presets above—or test phrases like "I go to market yesterday" or "We will discuss about the plan"—to see instant Bangla-first explanation.',
    explanationBn:
      'উপরের নমুনা বাক্যগুলো বেছে নিন অথবা "I go to market yesterday" কিংবা "We will discuss about the plan" লিখে দেখুন কীভাবে বাংলায় ব্যাখ্যা তৈরি হয়।',
    memoryTag: 'SAMPLE-CLEAN',
  };
}

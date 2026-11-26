import type { CurriculumCourse, CurriculumLesson } from '../types/domain';
import {
  mergeCurriculumWithOverlay,
  readCustomCurriculumOverlay,
} from '../services/curriculumStore.ts';

export const CURRICULUM_COURSES: CurriculumCourse[] = [
  {
    id: 'course_foundations',
    order: 1,
    cefrRange: 'Pre-A1 – A2',
    titleEn: 'Foundations of Sentence Construction',
    titleBn: 'বাক্য গঠনের মূল ভিত্তি',
    subtitleEn:
      'Break the habit of translating word-for-word from Bangla SOV order and build automatic English sentence structure.',
    subtitleBn:
      'বাংলা থেকে শব্দে-শব্দে অনুবাদ করার অভ্যাস ভেঙে স্বাভাবিকভাবে ইংরেজি বাক্য গঠনের ভিত্তি তৈরি করুন।',
    targetAudienceEn: 'Essential for Pre-A1 to A2 learners who hesitate before forming everyday sentences.',
    targetAudienceBn: 'Pre-A1 থেকে A2 স্তরের শিক্ষার্থীদের জন্য, যারা কথা বলার আগে বাক্য সাজাতে গিয়ে আটকে যান।',
    modules: [
      {
        id: 'mod_svo_aux',
        courseId: 'course_foundations',
        order: 1,
        titleEn: 'Module 1: English Word Order & Auxiliary Control',
        titleBn: 'মডিউল ১: ইংরেজি বাক্যক্রম ও Auxiliary Verb নিয়ন্ত্রণ',
        descriptionEn:
          'Master Subject–Verb–Object flow and stop dropping "do / does" in questions and negative sentences.',
        descriptionBn:
          'Subject–Verb–Object ক্রম আয়ত্ত করুন এবং প্রশ্ন ও না-বোধক বাক্যে "do / does" ব্যবহারের ভুল দূর করুন।',
        lessons: [
          {
            id: 'les_svo_order',
            courseId: 'course_foundations',
            moduleId: 'mod_svo_aux',
            order: 1,
            cefrBand: 'Pre-A1 – A1',
            estimatedMinutes: 8,
            titleEn: 'English Word Order vs. Bangla SOV',
            titleBn: 'ইংরেজি বাক্যের ক্রম বনাম বাংলা বাক্যগঠন',
            summaryEn:
              'Place the verb right after the subject and keep Place before Time at the end of English sentences.',
            summaryBn:
              'বাংলায় ক্রিয়া বাক্যের শেষে বসলেও ইংরেজিতে কর্তার ঠিক পরেই Verb বসাতে হয়, এবং শেষে স্থান ও সময় বসে।',
            objectivesEn: [
              'Build clear Subject + Verb + Object sentences without pausing to translate.',
              'Order Place before Time naturally (e.g., "at the office every morning").',
              'Eliminate literal Bangla SOV phrasing in everyday speech.',
            ],
            objectivesBn: [
              'অনুবাদ করতে গিয়ে না থেমে সাবলীলভাবে Subject + Verb + Object বাক্য তৈরি করা।',
              'বাক্যের শেষে সময়ের আগে স্থান (Place before Time) সঠিকভাবে বসানো।',
              'দৈনন্দিন কথায় বাংলা শব্দের ক্রম ইংরেজিতে ঢুকে যাওয়ার অভ্যাস দূর করা।',
            ],
            prerequisiteLessonIds: [],
            prerequisiteNoteEn: 'No prerequisites — ideal starting lesson for your academy track.',
            prerequisiteNoteBn: 'কোনো পূর্বশর্ত নেই — শুরু করার জন্য আদর্শ প্রথম লেসন।',
            targetCategories: ['Word Order', 'Grammar'],
            conceptRuleTitleEn: 'Core Rule: Subject + Verb + Object + Place + Time',
            conceptRuleTitleBn: 'মূল নিয়ম: কর্তা (Subject) + ক্রিয়া (Verb) + কর্ম (Object) + স্থান + সময়',
            conceptRuleEn:
              'English strictly locks the action verb right after the subject. Extra details follow in a predictable rhythm: Who does what (Subject + Verb + Object), then Where (Place), then When (Time).',
            conceptRuleBn:
              'ইংরেজিতে কর্তার (Subject) ঠিক পরেই মূল ক্রিয়া (Verb) বসানো বাধ্যতামূলক। এরপর কী করছে (Object), তারপর কোথায় (Place) এবং সবশেষে কখন (Time) বসলে বাক্যটি একদম স্বাভাবিক শোনায়।',
            banglaInterferenceTitleEn: 'Why Bangla speakers stumble here',
            banglaInterferenceTitleBn: 'বাংলাভাষীদের এখানে কেন ভুল হয়',
            banglaInterferenceEn:
              'Bangla uses Subject–Time–Place–Object–Verb order ("আমি প্রতিদিন সকালে অফিসে চা খাই"). When speaking quickly, your brain outputs time or object before the verb.',
            banglaInterferenceBn:
              'বাংলায় আমরা বলি "আমি প্রতিদিন সকালে অফিসে চা খাই" (কর্তা → সময় → স্থান → কর্ম → ক্রিয়া)। দ্রুত ইংরেজি বলতে গেলে মস্তিষ্ক আগে সময় বা বস্তুটি বলে ফেলে এবং Verb পিছিয়ে যায়।',
            contrastRows: [
              {
                banglaThought: 'আমি প্রতিদিন সকালে চা খাই।',
                commonTrap: 'I every morning tea drink.',
                naturalEnglish: 'I drink tea every morning.',
              },
              {
                banglaThought: 'তিনি ঢাকায় একটি ব্যাংকে কাজ করেন।',
                commonTrap: 'He in Dhaka in a bank works.',
                naturalEnglish: 'He works at a bank in Dhaka.',
              },
              {
                banglaThought: 'আমরা শুক্রবারে মাঠে ফুটবল খেলি।',
                commonTrap: 'We on Friday football play in the field.',
                naturalEnglish: 'We play football in the field on Fridays.',
              },
            ],
            examples: [
              {
                id: 'ex_svo_1',
                contextEn: 'Daily routine',
                contextBn: 'দৈনন্দিন রুটিন',
                englishSentence: 'I drink a cup of tea every morning.',
                highlightPhrase: 'drink a cup of tea',
                banglaMeaning: 'আমি প্রতিদিন সকালে এক কাপ চা পান করি।',
              },
              {
                id: 'ex_svo_2',
                contextEn: 'Talking about work',
                contextBn: 'কাজের কথা বলা',
                englishSentence: 'My sister teaches physics at a college in Chattogram.',
                highlightPhrase: 'teaches physics at a college',
                banglaMeaning: 'আমার বোন চট্টগ্রামের একটি কলেজে পদার্থবিজ্ঞান পড়ান।',
              },
              {
                id: 'ex_svo_3',
                contextEn: 'Weekend plans',
                contextBn: 'সাপ্তাহিক ছুটির পরিকল্পনা',
                englishSentence: 'We visit our grandparents in Comilla every month.',
                highlightPhrase: 'in Comilla every month',
                banglaMeaning: 'আমরা প্রতি মাসে কুমিল্লায় দাদা-দাদির বাসায় বেড়াতে যাই।',
              },
              {
                id: 'ex_svo_4',
                contextEn: 'Study habit',
                contextBn: 'পড়াশোনার অভ্যাস',
                englishSentence: 'She practices spoken English at home after dinner.',
                highlightPhrase: 'at home after dinner',
                banglaMeaning: 'সে রাতের খাবারের পর বাসায় ইংরেজি বলার অনুশীলন করে।',
              },
            ],
            guidedExercises: [
              {
                id: 'g_svo_1',
                type: 'fill_blank',
                promptEn: 'Choose the natural English phrasing to complete the sentence:',
                promptBn: 'বাক্যটি স্বাভাবিকভাবে সম্পূর্ণ করতে সঠিক অংশটি বেছে নিন:',
                sentenceTemplate: 'Every weekday, Rahim _____.',
                options: [
                  'the office goes at 9 AM',
                  'goes to the office at 9 AM',
                  'at 9 AM to the office goes',
                  'to the office goes at 9 AM',
                ],
                correctAnswer: 'goes to the office at 9 AM',
                mistakeCategory: 'Word Order',
                domain: 'sentence_construction',
                patternEn: 'Placing object or time before the main verb (Bangla SOV transfer)',
                patternBn: 'মূল Verb-এর আগে স্থান বা সময় বসিয়ে দেওয়া',
                explanationEn:
                  'Place the verb ("goes") directly after the subject ("Rahim"), followed by Place ("to the office") and Time ("at 9 AM").',
                explanationBn:
                  'কর্তা (Rahim)-এর ঠিক পরেই Verb ("goes") বসবে, এরপর স্থান ("to the office") এবং শেষে সময় ("at 9 AM")।',
              },
              {
                id: 'g_svo_2',
                type: 'reorder',
                promptEn: 'Arrange the tiles into natural English word order (Place before Time):',
                promptBn: 'শব্দগুলো সাজিয়ে শুদ্ধ ইংরেজি বাক্য তৈরি করুন (সময়ের আগে স্থান):',
                wordBank: ['every evening', 'reads', 'in the library', 'Nadia', 'English newspapers'],
                correctAnswer: 'Nadia reads English newspapers in the library every evening',
                acceptableAnswers: [
                  'Nadia reads English newspapers in the library every evening',
                  'Every evening Nadia reads English newspapers in the library',
                ],
                mistakeCategory: 'Word Order',
                domain: 'sentence_construction',
                patternEn: 'Subject–Verb–Object–Place–Time ordering',
                patternBn: 'Subject–Verb–Object–Place–Time সঠিক ক্রমে সাজানো',
                explanationEn:
                  'Follow S-V-O ("Nadia reads English newspapers") + Place ("in the library") + Time ("every evening").',
                explanationBn:
                  'প্রথমে Subject + Verb + Object ("Nadia reads English newspapers"), এরপর স্থান ("in the library") ও শেষে সময় ("every evening") বসান।',
              },
              {
                id: 'g_svo_3',
                type: 'error_spot',
                promptEn: 'Click the segment that breaks natural English word order:',
                promptBn: 'বাক্যের যে অংশটি ইংরেজি শব্দক্রম ভেঙেছে সেটিতে ক্লিক করুন:',
                segments: ['My colleague', 'every Monday', 'prepares the weekly report', 'at the office.'],
                errorSegmentIndex: 1,
                correctAnswer: 'My colleague prepares the weekly report at the office every Monday.',
                mistakeCategory: 'Word Order',
                domain: 'sentence_construction',
                patternEn: 'Inserting time phrase between Subject and main Verb',
                patternBn: 'Subject ও মূল Verb-এর মাঝখানে সময় ("every Monday") ঢুকিয়ে দেওয়া',
                explanationEn:
                  'Avoid splitting the subject ("My colleague") and verb ("prepares") with a multi-word time phrase like "every Monday". Move "every Monday" to the end or very beginning.',
                explanationBn:
                  'Subject ("My colleague") এবং Verb ("prepares")-এর মাঝখানে "every Monday" বসানো ইংরেজিতে অস্বাভাবিক। সময়টি বাক্যের শেষে বসান।',
              },
            ],
            independentExercises: [
              {
                id: 'ind_svo_1',
                promptEn: 'Write this Bangla sentence in natural English:',
                promptBn: 'নিচের বাংলা বাক্যটি স্বাভাবিক ইংরেজিতে লিখুন:',
                banglaCue: 'আমি প্রতিদিন সকালে পার্কে হাঁটি।',
                hintWords: ['I', 'walk', 'in the park', 'every morning'],
                sampleCorrectAnswer: 'I walk in the park every morning.',
                acceptableAnswers: [
                  'I walk in the park every morning',
                  'Every morning I walk in the park',
                  'I walk at the park every morning',
                ],
                requiredKeywords: ['walk', 'park', 'morning'],
                forbiddenPatterns: [
                  {
                    pattern: '\\bi\\s+every\\s+morning\\s+walk\\b',
                    feedbackEn: 'Do not place "every morning" between "I" and "walk".',
                    feedbackBn: '"I" এবং "walk"-এর মাঝখানে "every morning" বসাবেন না—Verb শুরুতেই আনুন।',
                  },
                ],
                mistakeCategory: 'Word Order',
                domain: 'sentence_construction',
                patternEn: 'Keeping Subject + Verb together in routine statements',
                patternBn: 'দৈনন্দিন অভ্যাসের বাক্যে Subject-এর ঠিক পরে Verb রাখা',
                explanationEn:
                  'Start with "I walk", then add Place ("in the park") before Time ("every morning").',
                explanationBn:
                  'শুরুতে "I walk", তারপর স্থান ("in the park") এবং শেষে সময় ("every morning") বসান।',
              },
              {
                id: 'ind_svo_2',
                promptEn: 'Translate into natural English (Subject + Verb + Object + Place):',
                promptBn: 'স্বাভাবিক ইংরেজিতে অনুবাদ করুন (Subject + Verb + Object + Place):',
                banglaCue: 'তারা ঢাকায় একটি সফটওয়্যার কোম্পানিতে কাজ করে।',
                hintWords: ['They', 'work', 'at a software company', 'in Dhaka'],
                sampleCorrectAnswer: 'They work at a software company in Dhaka.',
                acceptableAnswers: [
                  'They work at a software company in Dhaka',
                  'They work in a software company in Dhaka',
                  'They work for a software company in Dhaka',
                ],
                requiredKeywords: ['they', 'work', 'software company', 'dhaka'],
                forbiddenPatterns: [
                  {
                    pattern: '\\bthey\\s+in\\s+dhaka\\b',
                    feedbackEn: 'Put the verb "work" immediately after "They", not "in Dhaka".',
                    feedbackBn: '"They"-এর পর সরাসরি "work" বসান, "in Dhaka" বাক্যের শেষে যাবে।',
                  },
                ],
                mistakeCategory: 'Word Order',
                domain: 'sentence_construction',
                patternEn: 'Verb placement before prepositional location phrases',
                patternBn: 'স্থানের আগে Verb বসানো',
                explanationEn:
                  'Place "work" immediately after "They", then move from specific place ("at a software company") to broader city ("in Dhaka").',
                explanationBn:
                  '"They"-এর ঠিক পরেই "work" বসান, তারপর ছোট জায়গা ("at a software company") ও বড় শহর ("in Dhaka") বলুন।',
              },
            ],
            assessmentQuestions: [
              {
                id: 'as_svo_1',
                type: 'mcq',
                promptEn: 'Which sentence follows natural English word order?',
                promptBn: 'নিচের কোন বাক্যটির শব্দক্রম সম্পূর্ণ স্বাভাবিক?',
                options: [
                  { id: 'a', label: 'She every night listens to podcasts in her room.' },
                  { id: 'b', label: 'She listens to podcasts in her room every night.' },
                  { id: 'c', label: 'She in her room every night listens to podcasts.' },
                  { id: 'd', label: 'She listens every night in her room to podcasts.' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Word Order',
                domain: 'sentence_construction',
                patternEn: 'SVO + Place + Time rhythm',
                patternBn: 'SVO + স্থান + সময় ক্রম বজায় রাখা',
                explanationEn:
                  'Keep Object ("to podcasts"), then Place ("in her room"), then Time ("every night").',
                explanationBn:
                  'প্রথমে Object ("to podcasts"), এরপর স্থান ("in her room") এবং শেষে সময় ("every night") বসে।',
              },
              {
                id: 'as_svo_2',
                type: 'mcq',
                promptEn: 'Choose the best English translation for: "আমরা শুক্রবার সকালে বাজারে যাই।"',
                promptBn: '"আমরা শুক্রবার সকালে বাজারে যাই।" — এর সবচেয়ে স্বাভাবিক ইংরেজি কোনটি?',
                options: [
                  { id: 'a', label: 'We on Friday morning go to the market.' },
                  { id: 'b', label: 'We to the market go on Friday mornings.' },
                  { id: 'c', label: 'We go to the market on Friday mornings.' },
                  { id: 'd', label: 'We go on Friday mornings to the market.' },
                ],
                correctAnswer: 'c',
                mistakeCategory: 'Word Order',
                domain: 'sentence_construction',
                patternEn: 'Avoiding Bangla time-before-verb order',
                patternBn: 'Verb-এর আগে সময় না বসানো',
                explanationEn:
                  '"We go" comes first, followed by Place ("to the market") and Time ("on Friday mornings").',
                explanationBn:
                  'শুরুতে "We go", এরপর স্থান ("to the market") এবং শেষে সময় ("on Friday mornings")।',
              },
              {
                id: 'as_svo_3',
                type: 'construct',
                promptEn: 'Fix this Bangla-order sentence: "He every day drinks coffee at the office."',
                promptBn: 'এই বাক্যটির শব্দক্রম ঠিক করে লিখুন: "He every day drinks coffee at the office."',
                correctAnswer: 'He drinks coffee at the office every day.',
                acceptableAnswers: [
                  'He drinks coffee at the office every day',
                  'Every day he drinks coffee at the office',
                ],
                mistakeCategory: 'Word Order',
                domain: 'sentence_construction',
                patternEn: 'Moving time adverbial out of Subject–Verb slot',
                patternBn: 'Subject ও Verb-এর মধ্য থেকে সময় ("every day") সরানো',
                explanationEn:
                  'Keep "He drinks coffee" uninterrupted, followed by Place ("at the office") and Time ("every day").',
                explanationBn:
                  '"He drinks coffee" একসাথে রাখুন, এরপর স্থান ("at the office") এবং শেষে "every day" বসান।',
              },
            ],
          },
          {
            id: 'les_do_does_questions',
            courseId: 'course_foundations',
            moduleId: 'mod_svo_aux',
            order: 2,
            cefrBand: 'A1 – A2',
            estimatedMinutes: 8,
            titleEn: 'Asking & Negating with Do / Does / Doesn’t',
            titleBn: 'Do / Does / Doesn’t দিয়ে প্রশ্ন ও না-বোধক বাক্য',
            summaryEn:
              'Use "do / does" accurately in questions and stop saying "He don’t know" or "Does he knows?"',
            summaryBn:
              'প্রশ্ন ও না-বোধক বাক্যে "do / does" সঠিকভাবে ব্যবহার করুন এবং "He don’t know" বা "Does he knows?" ভুল দূর করুন।',
            objectivesEn: [
              'Choose between "don’t" and "doesn’t" automatically for all subjects.',
              'Keep the main verb in base form after "does / doesn’t".',
              'Form natural everyday questions starting with "Do you..." and "Does he/she...".',
            ],
            objectivesBn: [
              'সঠিক কর্তার সাথে স্বয়ংক্রিয়ভাবে "don’t" এবং "doesn’t" বেছে নেওয়া।',
              '"does / doesn’t"-এর পর মূল Verb-এর Base form বজায় রাখা।',
              '"Do you..." এবং "Does he/she..." দিয়ে স্বাভাবিক প্রশ্ন তৈরি করা।',
            ],
            prerequisiteLessonIds: ['les_svo_order'],
            prerequisiteNoteEn: 'Recommended after Lesson 1: English Word Order vs. Bangla SOV.',
            prerequisiteNoteBn: 'লেসন ১ (ইংরেজি বাক্যের ক্রম) শেষ করার পর এটি অনুশীলন করা ভালো।',
            targetCategories: ['Auxiliary Verb', 'Grammar'],
            conceptRuleTitleEn: 'Core Rule: Does / Doesn’t carries the "-s", NOT the main verb',
            conceptRuleTitleBn: 'মূল নিয়ম: "-s" এর দায়িত্ব নেয় Does / Doesn’t, মূল Verb নয়',
            conceptRuleEn:
              'In present simple negatives and questions, use "does / doesn’t" for He, She, It, or singular nouns, and "do / don’t" for I, You, We, They. Once "does" appears, the main verb returns to its base form ("Does she work?", never "Does she works?").',
            conceptRuleBn:
              'He, She, It বা একবচন কর্তার সাথে প্রশ্ন ও না-বোধক বাক্যে "does / doesn’t" বসে। আর বাক্যে "does / doesn’t" বসলে মূল Verb-এর সাথে আর "-s/-es" যোগ হয় না ("He doesn’t know", কখনোই "He doesn’t knows" নয়)।',
            banglaInterferenceTitleEn: 'Why Bangla speakers stumble here',
            banglaInterferenceTitleBn: 'বাংলাভাষীদের এখানে কেন ভুল হয়',
            banglaInterferenceEn:
              'Bangla forms questions simply by adding "কি" ("তুমি কি চা খাও?") and negatives by adding "না" ("সে জানে না") without any helper verb. So learners often drop "do/does" or default to "don’t" for everyone.',
            banglaInterferenceBn:
              'বাংলায় প্রশ্ন করতে শুধু "কি" আর না-বোধক করতে "না" বসালেই হয়—কোনো আলাদা Auxiliary Verb লাগে না। তাই ইংরেজিতে কথা বলার সময় "Do/Does" বাদ পড়ে বা He/She-এর সাথেও "don’t" চলে আসে।',
            contrastRows: [
              {
                banglaThought: 'সে আমার নাম জানে না।',
                commonTrap: "He don't know my name.",
                naturalEnglish: "He doesn't know my name.",
              },
              {
                banglaThought: 'তুমি কোথায় থাকো?',
                commonTrap: 'Where you live?',
                naturalEnglish: 'Where do you live?',
              },
              {
                banglaThought: 'সে কি এখানে কাজ করে?',
                commonTrap: 'Does she works here?',
                naturalEnglish: 'Does she work here?',
              },
            ],
            examples: [
              {
                id: 'ex_aux_1',
                contextEn: 'Workplace inquiry',
                contextBn: 'অফিসে জিজ্ঞাসা',
                englishSentence: 'Does your manager work from the Dhaka office?',
                highlightPhrase: 'Does your manager work',
                banglaMeaning: 'আপনার ম্যানেজার কি ঢাকা অফিস থেকে কাজ করেন?',
              },
              {
                id: 'ex_aux_2',
                contextEn: 'Clarifying a detail',
                contextBn: 'তথ্য পরিষ্কার করা',
                englishSentence: "She doesn't need the printed copy today.",
                highlightPhrase: "doesn't need",
                banglaMeaning: 'আজ তাঁর প্রিন্ট করা কপি দরকার নেই।',
              },
              {
                id: 'ex_aux_3',
                contextEn: 'Friendly conversation',
                contextBn: 'বন্ধুত্বপূর্ণ আলাপ',
                englishSentence: 'Where do you usually buy fresh vegetables?',
                highlightPhrase: 'Where do you usually buy',
                banglaMeaning: 'আপনি সাধারণত তাজা সবজি কোথা থেকে কেনেন?',
              },
              {
                id: 'ex_aux_4',
                contextEn: 'Explaining a technical issue',
                contextBn: 'প্রযুক্তিগত সমস্যা জানানো',
                englishSentence: "This microphone doesn't record clearly in a noisy room.",
                highlightPhrase: "doesn't record",
                banglaMeaning: 'কোলাহলপূর্ণ ঘরে এই মাইক্রোফোন স্পষ্টভাবে রেকর্ড করে না।',
              },
            ],
            guidedExercises: [
              {
                id: 'g_aux_1',
                type: 'fill_blank',
                promptEn: 'Select the grammatically accurate auxiliary + verb:',
                promptBn: 'সঠিক Auxiliary ও Verb বেছে নিন:',
                sentenceTemplate: 'My younger brother _____ spicy food.',
                options: ["don't like", "doesn't likes", "doesn't like", 'not likes'],
                correctAnswer: "doesn't like",
                mistakeCategory: 'Auxiliary Verb',
                domain: 'grammar',
                patternEn: 'Using "don’t" or double "-s" with singular third-person subject',
                patternBn: 'একবচন কর্তার সাথে "don’t" বা "doesn’t"-এর পর অতিরিক্ত "-s" বসানো',
                explanationEn:
                  '"My younger brother" is singular (he), so use "doesn’t" + base verb "like".',
                explanationBn:
                  '"My younger brother" একবচন (He), তাই "doesn’t" বসবে এবং মূল Verb "like"-এর শেষে "-s" থাকবে না।',
              },
              {
                id: 'g_aux_2',
                type: 'reorder',
                promptEn: 'Build a natural English question:',
                promptBn: 'শব্দগুলো সাজিয়ে একটি শুদ্ধ প্রশ্ন তৈরি করুন:',
                wordBank: ['the bus', 'what time', 'leave', 'does', 'for Sylhet'],
                correctAnswer: 'What time does the bus leave for Sylhet',
                acceptableAnswers: ['What time does the bus leave for Sylhet'],
                mistakeCategory: 'Auxiliary Verb',
                domain: 'sentence_construction',
                patternEn: 'Question word + does + Subject + base verb order',
                patternBn: 'প্রশ্নে Question word + does + Subject + মূল Verb ক্রম',
                explanationEn:
                  'Place "does" right after "What time" and before the subject ("the bus"), keeping "leave" in base form.',
                explanationBn:
                  '"What time"-এর পরপরই "does" বসবে, তারপর Subject ("the bus") এবং মূল Verb ("leave")।',
              },
              {
                id: 'g_aux_3',
                type: 'error_spot',
                promptEn: 'Click the erroneous segment in this question:',
                promptBn: 'এই প্রশ্নের যে অংশে ভুল আছে সেটিতে ক্লিক করুন:',
                segments: ['Does', 'your friend', 'knows', 'how to drive?'],
                errorSegmentIndex: 2,
                correctAnswer: 'Does your friend know how to drive?',
                mistakeCategory: 'Auxiliary Verb',
                domain: 'grammar',
                patternEn: 'Double "-s" marking after "Does"',
                patternBn: '"Does" থাকার পরও মূল Verb-এ "-s" যোগ করা',
                explanationEn:
                  'Because "Does" already marks third-person singular, use the base verb "know", not "knows".',
                explanationBn:
                  'বাক্যের শুরুতে "Does" থাকায় মূল Verb-এ আর "-s" বসে না—সঠিক রূপ "know"।',
              },
            ],
            independentExercises: [
              {
                id: 'ind_aux_1',
                promptEn: 'Write this Bangla sentence in natural English:',
                promptBn: 'নিচের বাংলা বাক্যটি স্বাভাবিক ইংরেজিতে লিখুন:',
                banglaCue: 'সে আমার ফোন নম্বর জানে না।',
                hintWords: ['He / She', "doesn't", 'know', 'my phone number'],
                sampleCorrectAnswer: "He doesn't know my phone number.",
                acceptableAnswers: [
                  "He doesn't know my phone number",
                  "She doesn't know my phone number",
                ],
                requiredKeywords: ["doesn't", 'know', 'phone number'],
                forbiddenPatterns: [
                  {
                    pattern: "\\b(he|she)\\s+don'?t\\b",
                    feedbackEn: 'Use "doesn’t" with He or She, not "don’t".',
                    feedbackBn: 'He বা She-এর সাথে "don’t" নয়, "doesn’t" ব্যবহার করুন।',
                  },
                  {
                    pattern: "\\bdoesn'?t\\s+knows\\b",
                    feedbackEn: 'Drop the "-s" from "knows" after "doesn’t".',
                    feedbackBn: '"doesn’t"-এর পর "knows" নয়, মূল রূপ "know" বসবে।',
                  },
                ],
                mistakeCategory: 'Auxiliary Verb',
                domain: 'grammar',
                patternEn: 'Third-person singular negative with "doesn’t"',
                patternBn: 'He/She-এর সাথে "doesn’t" ব্যবহার',
                explanationEn:
                  'Use "He/She doesn’t know" — never "He don’t know" or "He doesn’t knows".',
                explanationBn:
                  'সঠিক গঠন হলো "He/She doesn’t know" — কখনোই "don’t" বা "knows" নয়।',
              },
              {
                id: 'ind_aux_2',
                promptEn: 'Ask this question naturally in English:',
                promptBn: 'এই প্রশ্নটি স্বাভাবিকভাবে ইংরেজিতে লিখুন:',
                banglaCue: 'আপনি কোথায় কাজ করেন?',
                hintWords: ['Where', 'do', 'you', 'work'],
                sampleCorrectAnswer: 'Where do you work?',
                acceptableAnswers: ['Where do you work'],
                requiredKeywords: ['where', 'do', 'you', 'work'],
                forbiddenPatterns: [
                  {
                    pattern: '^\\s*where\\s+you\\s+work',
                    feedbackEn: 'You omitted the auxiliary "do" before "you".',
                    feedbackBn: '"you"-এর আগে প্রশ্নবোধক Auxiliary "do" বাদ পড়েছে।',
                  },
                ],
                mistakeCategory: 'Auxiliary Verb',
                domain: 'grammar',
                patternEn: 'Omitting "do" in Wh-questions',
                patternBn: 'Wh-প্রশ্নে "do" বাদ পড়া',
                explanationEn:
                  'English Wh-questions need "do/does" before the subject: "Where do you work?"',
                explanationBn:
                  'ইংরেজিতে "Where"-এর পর Subject-এর আগে "do" বসাতে হয়: "Where do you work?"',
              },
            ],
            assessmentQuestions: [
              {
                id: 'as_aux_1',
                type: 'mcq',
                promptEn: 'Choose the error-free sentence:',
                promptBn: 'ভুলমুক্ত সঠিক বাক্যটি বেছে নিন:',
                options: [
                  { id: 'a', label: "My laptop don't connect to the office Wi-Fi." },
                  { id: 'b', label: "My laptop doesn't connects to the office Wi-Fi." },
                  { id: 'c', label: "My laptop doesn't connect to the office Wi-Fi." },
                  { id: 'd', label: 'My laptop not connect to the office Wi-Fi.' },
                ],
                correctAnswer: 'c',
                mistakeCategory: 'Auxiliary Verb',
                domain: 'grammar',
                patternEn: 'Singular inanimate subject with "doesn’t + base verb"',
                patternBn: 'একবচন বস্তুবাচক কর্তার সাথে "doesn’t + base verb"',
                explanationEn:
                  '"My laptop" is singular (it), so use "doesn’t connect".',
                explanationBn:
                  '"My laptop" একবচন (It), তাই "doesn’t connect" সঠিক।',
              },
              {
                id: 'as_aux_2',
                type: 'mcq',
                promptEn: 'How do you naturally ask: "এই দোকানটি কখন খোলে?"',
                promptBn: '"এই দোকানটি কখন খোলে?" — এর স্বাভাবিক ইংরেজি কোনটি?',
                options: [
                  { id: 'a', label: 'When this shop opens?' },
                  { id: 'b', label: 'When does this shop open?' },
                  { id: 'c', label: 'When does this shop opens?' },
                  { id: 'd', label: 'When do this shop open?' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Auxiliary Verb',
                domain: 'grammar',
                patternEn: 'Wh-question auxiliary agreement',
                patternBn: 'Wh-প্রশ্নে "does + base verb" ব্যবহার',
                explanationEn:
                  'Use "does" for singular "this shop" and keep "open" in its base form.',
                explanationBn:
                  '"this shop" একবচন হওয়ায় "does" বসবে এবং মূল Verb হবে "open"।',
              },
              {
                id: 'as_aux_3',
                type: 'construct',
                promptEn: 'Rewrite correctly: "He don\'t understand the instructions."',
                promptBn: 'শুদ্ধ করে লিখুন: "He don\'t understand the instructions."',
                correctAnswer: "He doesn't understand the instructions.",
                acceptableAnswers: ["He doesn't understand the instructions"],
                mistakeCategory: 'Auxiliary Verb',
                domain: 'grammar',
                patternEn: 'Correcting "He don’t" to "He doesn’t"',
                patternBn: '"He don’t"-কে "He doesn’t"-এ সংশোধন',
                explanationEn:
                  'Replace "don’t" with "doesn’t" for the singular subject "He".',
                explanationBn:
                  'কর্তা "He" হওয়ায় "don’t"-এর বদলে "doesn’t" বসাতে হবে।',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'course_tenses',
    order: 2,
    cefrRange: 'A2 – B1',
    titleEn: 'Past & Future in Real Conversations',
    titleBn: 'বাস্তব কথোপকথনে অতীত ও ভবিষ্যৎ',
    subtitleEn:
      'Stop slipping back into present tense when telling past stories, and express ongoing timelines clearly.',
    subtitleBn:
      'অতীতের গল্প বলার সময় Present Tense-এ চলে যাওয়া বন্ধ করুন এবং সময়ের ধারাবাহিকতা স্পষ্টভাবে বলুন।',
    targetAudienceEn: 'Designed for A2–B1 learners who know tense rules on paper but lose control while speaking.',
    targetAudienceBn: 'A2–B1 শিক্ষার্থীদের জন্য, যারা খাতায় Tense জানেন কিন্তু কথা বলার সময় তাল হারিয়ে ফেলেন।',
    modules: [
      {
        id: 'mod_past_duration',
        courseId: 'course_tenses',
        order: 1,
        titleEn: 'Module 1: Finished Past vs. Ongoing Duration',
        titleBn: 'মডিউল ১: সমাপ্ত অতীত বনাম চলমান সময়কাল',
        descriptionEn:
          'Master Past Simple with time anchors and Present Perfect Continuous with "since" and "for".',
        descriptionBn:
          'নির্দিষ্ট অতীত সময়ের সাথে Past Simple এবং "since / for"-এর সাথে Present Perfect Continuous আয়ত্ত করুন।',
        lessons: [
          {
            id: 'les_past_simple_markers',
            courseId: 'course_tenses',
            moduleId: 'mod_past_duration',
            order: 1,
            cefrBand: 'A2',
            estimatedMinutes: 9,
            titleEn: 'Past Simple with Time Markers (Yesterday / Ago / Last)',
            titleBn: 'অতীতের সময়চিহ্নের (Yesterday / Ago / Last) সাথে Past Simple',
            summaryEn:
              'Fix "I go to market yesterday" and "Did you went?" so finished past stories sound clear and fluent.',
            summaryBn:
              '"I go to market yesterday" এবং "Did you went?"-এর মতো ভুল দূর করে সাবলীলভাবে অতীতের ঘটনা বলুন।',
            objectivesEn: [
              'Switch verbs to Past Simple immediately when using "yesterday", "last week", or "ago".',
              'Use "did / didn’t + base verb" without double past tense ("didn’t go", not "didn’t went").',
              'Tell a 2-sentence story about yesterday naturally.',
            ],
            objectivesBn: [
              '"yesterday", "last week" বা "ago" থাকলেই স্বয়ংক্রিয়ভাবে Verb-এর Past form ব্যবহার করা।',
              '"did / didn’t"-এর পর মূল Verb-এর Base form বজায় রাখা ("didn’t go", "didn’t went" নয়)।',
              'গতকালের ঘটনা স্বাভাবিকভাবে ইংরেজিতে বর্ণনা করা।',
            ],
            prerequisiteLessonIds: ['les_do_does_questions'],
            prerequisiteNoteEn: 'Builds directly on Auxiliary Control from Course 1.',
            prerequisiteNoteBn: 'কোর্স ১-এর Auxiliary Verb নিয়মের পরবর্তী ধাপ।',
            targetCategories: ['Tense', 'Auxiliary Verb'],
            conceptRuleTitleEn: 'Core Rule: Finished Time = Past Verb (or Did + Base Verb)',
            conceptRuleTitleBn: 'মূল নিয়ম: অতীত সময় = Verb-এর Past রূপ (অথবা Did + Base Verb)',
            conceptRuleEn:
              'Any finished time anchor ("yesterday", "last night", "two days ago", "in 2021") requires Past Simple in statements ("I went"). In questions and negatives, "did / didn’t" carries the past tense, so the main verb stays in base form ("Did you go?", "I didn’t go").',
            conceptRuleBn:
              'বাক্যে অতীতের নির্দিষ্ট সময় ("yesterday", "last night", "two days ago") থাকলে হ্যাঁ-বোধক বাক্যে Verb-এর Past form ("went") বসে। আর প্রশ্ন বা না-বোধক বাক্যে "did / didn’t" অতীত বোঝায় বলে মূল Verb-টি Base form ("go") হয়ে যায়।',
            banglaInterferenceTitleEn: 'Why Bangla speakers stumble here',
            banglaInterferenceTitleBn: 'বাংলাভাষীদের এখানে কেন ভুল হয়',
            banglaInterferenceEn:
              'Two opposite traps occur: (1) keeping the base verb ("I go yesterday") because "yesterday" already feels like past time, and (2) over-correcting with double past ("I didn’t went").',
            banglaInterferenceBn:
              'এখানে দুই ধরনের ভুল হয়: (১) "yesterday" বলেই মনে হয় অতীত বোঝানো হয়ে গেছে, তাই "go" বদলাতে ভুলে যান; (২) অতিরিক্ত সতর্কতায় "didn’t went"-এর মতো দুবার Past বসিয়ে ফেলেন।',
            contrastRows: [
              {
                banglaThought: 'আমি গতকাল বাজারে গিয়েছিলাম।',
                commonTrap: 'I go to market yesterday.',
                naturalEnglish: 'I went to the market yesterday.',
              },
              {
                banglaThought: 'তুমি কি গত রাতে ইমেইলটা পাঠিয়েছিলে?',
                commonTrap: 'Did you sent the email last night?',
                naturalEnglish: 'Did you send the email last night?',
              },
              {
                banglaThought: 'গত সপ্তাহে আমি মিটিংয়ে যাইনি।',
                commonTrap: "I didn't went to the meeting last week.",
                naturalEnglish: "I didn't go to the meeting last week.",
              },
            ],
            examples: [
              {
                id: 'ex_past_1',
                contextEn: 'Everyday errand',
                contextBn: 'দৈনন্দিন কাজ',
                englishSentence: 'I went to the market yesterday to buy fresh fish.',
                highlightPhrase: 'went to the market yesterday',
                banglaMeaning: 'আমি গতকাল তাজা মাছ কিনতে বাজারে গিয়েছিলাম।',
              },
              {
                id: 'ex_past_2',
                contextEn: 'Workplace follow-up',
                contextBn: 'অফিসে খোঁজ নেওয়া',
                englishSentence: 'Did you receive the updated invoice two days ago?',
                highlightPhrase: 'Did you receive',
                banglaMeaning: 'দুই দিন আগে কি আপনি আপডেট করা ইনভয়েসটি পেয়েছিলেন?',
              },
              {
                id: 'ex_past_3',
                contextEn: 'Explaining an absence',
                contextBn: 'অনুপস্থিতির কারণ বলা',
                englishSentence: "She didn't attend the call last night because of a power cut.",
                highlightPhrase: "didn't attend",
                banglaMeaning: 'বিদ্যুৎ না থাকার কারণে তিনি গত রাতের কলে যোগ দিতে পারেননি।',
              },
              {
                id: 'ex_past_4',
                contextEn: 'Interview story',
                contextBn: 'ইন্টারভিউ অভিজ্ঞতা',
                englishSentence: 'Our team launched the new mobile portal last month.',
                highlightPhrase: 'launched',
                banglaMeaning: 'আমাদের দল গত মাসে নতুন মোবাইল পোর্টালটি চালু করেছিল।',
              },
            ],
            guidedExercises: [
              {
                id: 'g_past_1',
                type: 'fill_blank',
                promptEn: 'Complete the past question accurately:',
                promptBn: 'অতীতের প্রশ্নটি সঠিকভাবে সম্পূর্ণ করুন:',
                sentenceTemplate: 'Did you _____ to the client yesterday afternoon?',
                options: ['spoke', 'speak', 'speaking', 'speaks'],
                correctAnswer: 'speak',
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Using past verb after "Did" (double past tense)',
                patternBn: '"Did"-এর পর আবার Past form ("spoke") বসানো',
                explanationEn:
                  '"Did" already marks past tense, so always follow it with the base verb "speak".',
                explanationBn:
                  '"Did" ইতিমধ্যেই অতীত কাল নির্দেশ করছে, তাই এরপর মূল Verb-এর Base form "speak" বসবে।',
              },
              {
                id: 'g_past_2',
                type: 'reorder',
                promptEn: 'Arrange the sentence cleanly:',
                promptBn: 'শব্দগুলো সাজিয়ে অতীতের শুদ্ধ বাক্য তৈরি করুন:',
                wordBank: ['yesterday', 'went', 'to the bank', 'I', 'in the morning'],
                correctAnswer: 'I went to the bank yesterday in the morning',
                acceptableAnswers: [
                  'I went to the bank yesterday in the morning',
                  'I went to the bank in the morning yesterday',
                  'Yesterday I went to the bank in the morning',
                ],
                mistakeCategory: 'Tense',
                domain: 'sentence_construction',
                patternEn: 'Past Simple verb with time markers',
                patternBn: 'অতীতের সময়চিহ্নের সাথে "went" ব্যবহার',
                explanationEn:
                  'Place "I went" first, then destination ("to the bank"), then time.',
                explanationBn:
                  'শুরুতে "I went", এরপর গন্তব্য ("to the bank") এবং শেষে সময় বসান।',
              },
              {
                id: 'g_past_3',
                type: 'error_spot',
                promptEn: 'Click the part of the sentence that contains a tense error:',
                promptBn: 'বাক্যের যে অংশে Tense-এর ভুল আছে সেটিতে ক্লিক করুন:',
                segments: ['Last Friday,', 'we', "didn't went", 'to the stadium.'],
                errorSegmentIndex: 2,
                correctAnswer: "Last Friday, we didn't go to the stadium.",
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Double past tense ("didn’t went")',
                patternBn: '"didn’t"-এর সাথে "went" ব্যবহার করা',
                explanationEn:
                  'Use "didn’t go", never "didn’t went". "Didn’t" already carries the past tense.',
                explanationBn:
                  '"didn’t"-এর পর কখনোই "went" বসে না—সঠিক রূপ হলো "didn’t go"।',
              },
            ],
            independentExercises: [
              {
                id: 'ind_past_1',
                promptEn: 'Write this in natural Past Simple English:',
                promptBn: 'এটি স্বাভাবিক Past Simple ইংরেজিতে লিখুন:',
                banglaCue: 'আমি গতকাল বাজারে গিয়েছিলাম।',
                hintWords: ['I', 'went', 'to the market', 'yesterday'],
                sampleCorrectAnswer: 'I went to the market yesterday.',
                acceptableAnswers: [
                  'I went to the market yesterday',
                  'Yesterday I went to the market',
                  'I went to market yesterday',
                ],
                requiredKeywords: ['went', 'market', 'yesterday'],
                forbiddenPatterns: [
                  {
                    pattern: '\\bi\\s+go\\b',
                    feedbackEn: 'Change "go" to its past form "went" because of "yesterday".',
                    feedbackBn: '"yesterday" থাকায় "go"-এর পরিবর্তে Past form "went" লিখুন।',
                  },
                ],
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Past Tense Marker Omission ("I go ... yesterday")',
                patternBn: '"Yesterday" থাকার পরও Present Verb ("go") ব্যবহার',
                explanationEn:
                  '"Yesterday" signals completed past time, requiring "went" instead of "go".',
                explanationBn:
                  '"Yesterday" অতীতের সমাপ্ত সময় বোঝায়, তাই "go" নয়, "went" ব্যবহার করতে হবে।',
              },
              {
                id: 'ind_past_2',
                promptEn: 'Write this negative past sentence in English:',
                promptBn: 'অতীতের এই না-বোধক বাক্যটি ইংরেজিতে লিখুন:',
                banglaCue: 'গত রাতে আমি সিনেমাটি দেখিনি।',
                hintWords: ['I', "didn't", 'watch', 'the movie', 'last night'],
                sampleCorrectAnswer: "I didn't watch the movie last night.",
                acceptableAnswers: [
                  "I didn't watch the movie last night",
                  "I didn't see the movie last night",
                  "Last night I didn't watch the movie",
                ],
                requiredKeywords: ["didn't", 'movie', 'last night'],
                forbiddenPatterns: [
                  {
                    pattern: "\\bdidn'?t\\s+(watched|saw)\\b",
                    feedbackEn: 'After "didn’t", use the base verb ("watch" or "see"), not the past form.',
                    feedbackBn: '"didn’t"-এর পর Past form নয়, মূল রূপ "watch" বা "see" বসবে।',
                  },
                ],
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Past negative with "didn’t + base verb"',
                patternBn: '"didn’t"-এর সাথে মূল Verb-এর Base form ব্যবহার',
                explanationEn:
                  'Combine "didn’t" + base verb ("watch" / "see") + "last night".',
                explanationBn:
                  '"didn’t"-এর পর সবসময় Base verb ("watch" / "see") বসে।',
              },
            ],
            assessmentQuestions: [
              {
                id: 'as_past_1',
                type: 'mcq',
                promptEn: 'Choose the correct sentence:',
                promptBn: 'সঠিক বাক্যটি বেছে নিন:',
                options: [
                  { id: 'a', label: 'I meet my university mentor two weeks ago.' },
                  { id: 'b', label: 'I met my university mentor two weeks ago.' },
                  { id: 'c', label: 'I did met my university mentor two weeks ago.' },
                  { id: 'd', label: 'I am meeting my university mentor two weeks ago.' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Using Past Simple with "ago"',
                patternBn: '"ago" থাকলে Past Simple ("met") ব্যবহার',
                explanationEn:
                  '"Two weeks ago" is finished past time, so use simple past "met".',
                explanationBn:
                  '"Two weeks ago" অতীতের নির্দিষ্ট সময়, তাই "met" (Past Simple) ব্যবহার করতে হবে।',
              },
              {
                id: 'as_past_2',
                type: 'mcq',
                promptEn: 'Select the accurate question:',
                promptBn: 'সঠিক প্রশ্নটি নির্বাচন করুন:',
                options: [
                  { id: 'a', label: 'Did she finished the presentation on time?' },
                  { id: 'b', label: 'Was she finish the presentation on time?' },
                  { id: 'c', label: 'Did she finish the presentation on time?' },
                  { id: 'd', label: 'Does she finished the presentation on time?' },
                ],
                correctAnswer: 'c',
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Did + Subject + base verb question rule',
                patternBn: 'প্রশ্নে Did + Subject + Base verb নিয়ম',
                explanationEn:
                  'Use "Did she finish", keeping "finish" in base form.',
                explanationBn:
                  '"Did"-এর পর মূল Verb "finish" (Base form) বসবে।',
              },
              {
                id: 'as_past_3',
                type: 'construct',
                promptEn: 'Fix this sentence: "She didn\'t bought the ticket yesterday."',
                promptBn: 'বাক্যটি শুদ্ধ করে লিখুন: "She didn\'t bought the ticket yesterday."',
                correctAnswer: "She didn't buy the ticket yesterday.",
                acceptableAnswers: ["She didn't buy the ticket yesterday"],
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Removing double past tense after "didn’t"',
                patternBn: '"didn’t"-এর পর দ্বৈত Past form ("bought") সংশোধন',
                explanationEn:
                  'Change "bought" back to base form "buy" after "didn’t".',
                explanationBn:
                  '"didn’t"-এর পর "bought"-এর বদলে মূল রূপ "buy" বসবে।',
              },
            ],
          },
          {
            id: 'les_present_perfect_since',
            courseId: 'course_tenses',
            moduleId: 'mod_past_duration',
            order: 2,
            cefrBand: 'B1',
            estimatedMinutes: 9,
            titleEn: 'Ongoing Duration with "Since" & "For"',
            titleBn: '"Since" ও "For" দিয়ে চলমান সময়ের প্রকাশ',
            summaryEn:
              'Fix one of the most common interview mistakes among Bangla speakers: "I am working here since 2022."',
            summaryBn:
              'চাকরির ইন্টারভিউয়ে বাংলাভাষীদের সবচেয়ে বড় ভুল—"I am working here since 2022"—স্থায়ীভাবে শুধরে নিন।',
            objectivesEn: [
              'Use "have / has been + verb-ing" for ongoing actions started in the past.',
              'Choose "since" (starting point) vs. "for" (length of time) with zero confusion.',
              'Introduce your work or study experience accurately in interviews.',
            ],
            objectivesBn: [
              'অতীতে শুরু হয়ে এখনও চলমান কাজের জন্য "have / has been + verb-ing" ব্যবহার করা।',
              'শুরুর সময় ("since") বনাম মোট সময়কাল ("for") নির্ভুলভাবে আলাদা করা।',
              'ইন্টারভিউতে নিজের কাজ বা পড়াশোনার অভিজ্ঞতা শুদ্ধভাবে বলা।',
            ],
            prerequisiteLessonIds: ['les_past_simple_markers'],
            prerequisiteNoteEn: 'Best taken after Past Simple with Time Markers.',
            prerequisiteNoteBn: 'Past Simple লেসনটি শেষ করার পর এটি অনুশীলন করুন।',
            targetCategories: ['Tense', 'Preposition'],
            conceptRuleTitleEn: 'Core Rule: Past Start + Still Happening = Have / Has Been + -ing',
            conceptRuleTitleBn: 'মূল নিয়ম: অতীতে শুরু + এখনও চলছে = Have / Has Been + Verb-ing',
            conceptRuleEn:
              'Never pair "am / is / are + -ing" with "since" or "for" to show duration. Use "have been + -ing" (I/You/We/They) or "has been + -ing" (He/She/It). Use "since" for a specific start point ("since 2022", "since Monday") and "for" for total duration ("for three years").',
            conceptRuleBn:
              'কাজটি অতীতে শুরু হয়ে এখনও চলমান হলে এবং বাক্যে "since" বা "for" থাকলে "am/is/are + ing" বসানো যাবে না—বসবে "have/has been + verb-ing"। নির্দিষ্ট শুরুর সময়ের আগে "since" ("since 2022") এবং মোট সময়কালের আগে "for" ("for 3 years") বসে।',
            banglaInterferenceTitleEn: 'Why Bangla speakers stumble here',
            banglaInterferenceTitleBn: 'বাংলাভাষীদের এখানে কেন ভুল হয়',
            banglaInterferenceEn:
              'In Bangla, "আমি ২০২২ সাল থেকে এখানে কাজ করছি" uses ordinary present continuous ("কাজ করছি") plus "থেকে". Translating literally produces "I am working here since 2022" or "from 3 years".',
            banglaInterferenceBn:
              'বাংলায় "আমি ২০২২ সাল থেকে কাজ করছি" এবং "আমি এখন কাজ করছি"—দুটোতেই ক্রিয়া হলো "কাজ করছি"। তাই বাংলা থেকে সরাসরি অনুবাদ করলে "am working since 2022" বা "from 3 years" চলে আসে।',
            contrastRows: [
              {
                banglaThought: 'আমি ২০২২ সাল থেকে এখানে কাজ করছি।',
                commonTrap: 'I am working here since 2022.',
                naturalEnglish: 'I have been working here since 2022.',
              },
              {
                banglaThought: 'সে তিন বছর ধরে ঢাকায় থাকছে।',
                commonTrap: 'He is living in Dhaka from three years.',
                naturalEnglish: 'He has been living in Dhaka for three years.',
              },
              {
                banglaThought: 'সকাল থেকে বৃষ্টি হচ্ছে।',
                commonTrap: 'It is raining since morning.',
                naturalEnglish: 'It has been raining since morning.',
              },
            ],
            examples: [
              {
                id: 'ex_since_1',
                contextEn: 'Job interview introduction',
                contextBn: 'চাকরির ইন্টারভিউ পরিচয়',
                englishSentence: 'I have been working as a product analyst since January 2023.',
                highlightPhrase: 'have been working ... since January 2023',
                banglaMeaning: 'আমি ২০২৩ সালের জানুয়ারি থেকে প্রোডাক্ট অ্যানালিস্ট হিসেবে কাজ করছি।',
              },
              {
                id: 'ex_since_2',
                contextEn: 'Talking about skill growth',
                contextBn: 'দক্ষতা অর্জনের কথা',
                englishSentence: 'She has been preparing for IELTS for four months.',
                highlightPhrase: 'has been preparing ... for four months',
                banglaMeaning: 'সে চার মাস ধরে IELTS-এর প্রস্তুতি নিচ্ছে।',
              },
              {
                id: 'ex_since_3',
                contextEn: 'Weather observation',
                contextBn: 'আবহাওয়া নিয়ে কথা',
                englishSentence: 'It has been raining heavily in Dhaka since 7 AM.',
                highlightPhrase: 'has been raining ... since 7 AM',
                banglaMeaning: 'সকাল ৭টা থেকে ঢাকায় ভারী বৃষ্টি হচ্ছে।',
              },
              {
                id: 'ex_since_4',
                contextEn: 'Team collaboration',
                contextBn: 'দলগত কাজ',
                englishSentence: 'We have been collaborating with this client for two years.',
                highlightPhrase: 'have been collaborating ... for two years',
                banglaMeaning: 'আমরা দুই বছর ধরে এই ক্লায়েন্টের সাথে কাজ করছি।',
              },
            ],
            guidedExercises: [
              {
                id: 'g_since_1',
                type: 'fill_blank',
                promptEn: 'Choose the natural English structure for ongoing duration:',
                promptBn: 'চলমান সময়ের জন্য সঠিক ইংরেজি গঠনটি বেছে নিন:',
                sentenceTemplate: 'Farhana _____ at this hospital for five years.',
                options: [
                  'is working',
                  'has been working',
                  'was working',
                  'have been working',
                ],
                correctAnswer: 'has been working',
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Using "is working" instead of "has been working" with "for"',
                patternBn: '"for five years" থাকা সত্ত্বেও "is working" ব্যবহার',
                explanationEn:
                  'Singular subject "Farhana" + ongoing duration ("for five years") requires "has been working".',
                explanationBn:
                  '"Farhana" একবচন এবং কাজটি ৫ বছর ধরে এখনও চলছে, তাই "has been working" হবে।',
              },
              {
                id: 'g_since_2',
                type: 'reorder',
                promptEn: 'Arrange the tokens into a natural interview sentence:',
                promptBn: 'ইন্টারভিউয়ের জন্য স্বাভাবিক বাক্যটি সাজান:',
                wordBank: ['since 2022', 'been', 'I', 'have', 'managing', 'this team'],
                correctAnswer: 'I have been managing this team since 2022',
                acceptableAnswers: ['I have been managing this team since 2022'],
                mistakeCategory: 'Tense',
                domain: 'sentence_construction',
                patternEn: 'Present Perfect Continuous word order',
                patternBn: 'Have + been + verb-ing ক্রম সাজানো',
                explanationEn:
                  'Order: Subject ("I") + "have been" + verb-ing ("managing") + Object ("this team") + "since 2022".',
                explanationBn:
                  'সঠিক ক্রম: "I" + "have been" + "managing" + "this team" + "since 2022"।',
              },
              {
                id: 'g_since_3',
                type: 'error_spot',
                promptEn: 'Click the incorrect segment:',
                promptBn: 'ভুল অংশটিতে ক্লিক করুন:',
                segments: ['I have been', 'living in Uttara', 'from', 'six years.'],
                errorSegmentIndex: 2,
                correctAnswer: 'I have been living in Uttara for six years.',
                mistakeCategory: 'Preposition',
                domain: 'grammar',
                patternEn: 'Using "from" instead of "for" with total duration',
                patternBn: 'মোট সময়কালের আগে "for"-এর বদলে "from" ব্যবহার',
                explanationEn:
                  'Use "for" before a length of time ("for six years"), never "from six years".',
                explanationBn:
                  'মোট সময়কাল ("six years") বোঝাতে "from" নয়, "for" ব্যবহার করতে হয়।',
              },
            ],
            independentExercises: [
              {
                id: 'ind_since_1',
                promptEn: 'Translate this interview sentence accurately:',
                promptBn: 'ইন্টারভিউয়ের এই বাক্যটি শুদ্ধ ইংরেজিতে লিখুন:',
                banglaCue: 'আমি ২০২২ সাল থেকে এখানে কাজ করছি।',
                hintWords: ['I', 'have been', 'working', 'here', 'since 2022'],
                sampleCorrectAnswer: 'I have been working here since 2022.',
                acceptableAnswers: ['I have been working here since 2022'],
                requiredKeywords: ['have been', 'working', 'since 2022'],
                forbiddenPatterns: [
                  {
                    pattern: '\\bi\\s+(am|\'m)\\s+working\\b',
                    feedbackEn: 'Avoid "I am working" with "since 2022" — use "I have been working".',
                    feedbackBn: '"since 2022" থাকলে "I am working" নয়, "I have been working" লিখুন।',
                  },
                ],
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Duration Aspect Transfer ("am working since")',
                patternBn: '"since"-এর সাথে "am working" ব্যবহার',
                explanationEn:
                  'Use Present Perfect Continuous: "I have been working here since 2022."',
                explanationBn:
                  'অতীতে শুরু হয়ে এখনও চলমান কাজের জন্য "I have been working here since 2022" সঠিক।',
              },
              {
                id: 'ind_since_2',
                promptEn: 'Write this duration sentence in English:',
                promptBn: 'চলমান সময়ের এই বাক্যটি ইংরেজিতে লিখুন:',
                banglaCue: 'সে দুই ঘণ্টা ধরে ইংরেজি অনুশীলন করছে।',
                hintWords: ['He / She', 'has been', 'practicing', 'English', 'for two hours'],
                sampleCorrectAnswer: 'She has been practicing English for two hours.',
                acceptableAnswers: [
                  'She has been practicing English for two hours',
                  'He has been practicing English for two hours',
                  'She has been practising English for two hours',
                  'He has been practising English for two hours',
                ],
                requiredKeywords: ['has been', 'english', 'for two hours'],
                forbiddenPatterns: [
                  {
                    pattern: '\\b(he|she)\\s+is\\s+practi[cs]ing\\b',
                    feedbackEn: 'Replace "is practicing" with "has been practicing" for ongoing duration.',
                    feedbackBn: '"দুই ঘণ্টা ধরে" চলমান সময় বোঝাতে "is practicing" নয়, "has been practicing" লিখুন।',
                  },
                ],
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Using "has been + -ing" with "for + duration"',
                patternBn: 'একবচন কর্তার সাথে "has been + verb-ing" এবং "for" ব্যবহার',
                explanationEn:
                  'Use "has been practicing" with singular He/She, and "for two hours" for total length of time.',
                explanationBn:
                  'He/She-এর সাথে "has been practicing" এবং মোট সময়ের আগে "for two hours" বসবে।',
              },
            ],
            assessmentQuestions: [
              {
                id: 'as_since_1',
                type: 'mcq',
                promptEn: 'Which sentence is grammatically natural?',
                promptBn: 'কোন বাক্যটি ব্যাকরণগতভাবে শুদ্ধ ও স্বাভাবিক?',
                options: [
                  { id: 'a', label: 'They are building this bridge since 2021.' },
                  { id: 'b', label: 'They have been building this bridge since 2021.' },
                  { id: 'c', label: 'They have been building this bridge for 2021.' },
                  { id: 'd', label: 'They build this bridge from 2021.' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Present Perfect Continuous + "since" starting year',
                patternBn: 'Present Perfect Continuous ও শুরুর সালের আগে "since"',
                explanationEn:
                  'Use "have been building" with "since 2021" (a specific starting point).',
                explanationBn:
                  'নির্দিষ্ট শুরুর সাল "2021"-এর আগে "since" এবং ক্রিয়া হিসেবে "have been building" বসবে।',
              },
              {
                id: 'as_since_2',
                type: 'mcq',
                promptEn: 'Fill in the blank: "We have been waiting for the results _____ three days."',
                promptBn: 'শূন্যস্থান পূরণ করুন: "We have been waiting for the results _____ three days."',
                options: [
                  { id: 'a', label: 'since' },
                  { id: 'b', label: 'from' },
                  { id: 'c', label: 'for' },
                  { id: 'd', label: 'by' },
                ],
                correctAnswer: 'c',
                mistakeCategory: 'Preposition',
                domain: 'grammar',
                patternEn: 'Choosing "for" with total duration ("three days")',
                patternBn: 'মোট সময়কাল ("three days")-এর আগে "for" বসানো',
                explanationEn:
                  '"Three days" is a length of time, so it always takes "for".',
                explanationBn:
                  '"Three days" একটি মোট সময়কাল, তাই এর আগে সবসময় "for" বসে।',
              },
              {
                id: 'as_since_3',
                type: 'construct',
                promptEn: 'Fix this interview sentence: "I am learning web development since last year."',
                promptBn: 'ইন্টারভিউয়ের এই বাক্যটি শুদ্ধ করুন: "I am learning web development since last year."',
                correctAnswer: 'I have been learning web development since last year.',
                acceptableAnswers: ['I have been learning web development since last year'],
                mistakeCategory: 'Tense',
                domain: 'grammar',
                patternEn: 'Replacing "am learning" with "have been learning" before "since"',
                patternBn: '"since"-এর আগে "am learning"-কে "have been learning"-এ রূপান্তর',
                explanationEn:
                  'Change "am learning" to "have been learning" when pairing with "since last year".',
                explanationBn:
                  '"since last year" থাকায় "am learning"-এর বদলে "have been learning" বলতে হবে।',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'course_workplace',
    order: 3,
    cefrRange: 'B1 – B2',
    titleEn: 'Workplace & Interview English',
    titleBn: 'কর্মক্ষেত্র ও চাকরির ইন্টারভিউ ইংরেজি',
    subtitleEn:
      'Sound crisp, credible, and natural in client meetings, standups, and job interviews by removing L1 preposition & collocation traps.',
    subtitleBn:
      'ক্লায়েন্ট মিটিং, অফিস আপডেট এবং চাকরির ইন্টারভিউয়ে সাবলীল ও পেশাদার হতে অপ্রয়োজনীয় Preposition ও অস্বাভাবিক শব্দচয়ন দূর করুন।',
    targetAudienceEn: 'Built for B1–B2 graduates and professionals preparing for interviews or global teams.',
    targetAudienceBn: 'B1–B2 স্তরের শিক্ষার্থী ও পেশাজীবীদের জন্য, যাঁরা ইন্টারভিউ বা আন্তর্জাতিক টিমের সাথে কাজ করছেন।',
    modules: [
      {
        id: 'mod_workplace_precision',
        courseId: 'course_workplace',
        order: 1,
        titleEn: 'Module 1: Professional Precision & Natural Collocations',
        titleBn: 'মডিউল ১: পেশাদার নির্ভুলতা ও স্বাভাবিক শব্দচয়ন',
        descriptionEn:
          'Eliminate "discuss about / return back" and use executive verb-noun collocations effortlessly.',
        descriptionBn:
          '"discuss about / return back"-এর মতো ভুল বাদ দিন এবং পেশাদার verb-noun শব্দচয়ন আয়ত্ত করুন।',
        lessons: [
          {
            id: 'les_preposition_traps',
            courseId: 'course_workplace',
            moduleId: 'mod_workplace_precision',
            order: 1,
            cefrBand: 'B1 – B2',
            estimatedMinutes: 8,
            titleEn: 'Eliminating Bangla Preposition Transfer (Discuss, Enter, Return)',
            titleBn: 'অতিরিক্ত Preposition-এর ভুল দূর করা (Discuss, Enter, Return)',
            summaryEn:
              'Remove redundant words like "discuss about", "return back", "order for", and "enter into the room" from your professional speech.',
            summaryBn:
              'পেশাদার ইংরেজিতে "discuss about", "return back", "order for" এবং "enter into"-র মতো অপ্রয়োজনীয় শব্দ বাদ দিন।',
            objectivesEn: [
              'Use transitive workplace verbs ("discuss", "emphasize", "order", "enter") without extra prepositions.',
              'Remove redundant modifiers ("return back", "repeat again", "revert back").',
              'Edit common meeting phrases into sharp, executive English.',
            ],
            objectivesBn: [
              '"discuss", "emphasize", "order", "enter"-এর পরে অতিরিক্ত Preposition না বসানো।',
              '"return back", "repeat again", "revert back"-এর মতো পুনরাবৃত্তিমূলক শব্দ বাদ দেওয়া।',
              'অফিস মিটিংয়ের বাক্যগুলোকে সংক্ষিপ্ত ও পেশাদারভাবে বলা।',
            ],
            prerequisiteLessonIds: ['les_present_perfect_since'],
            prerequisiteNoteEn: 'Recommended for learners comfortable with basic tense structure.',
            prerequisiteNoteBn: 'মৌলিক Tense ধারণা থাকলে এই লেসনটি সবচেয়ে বেশি কাজে দেবে।',
            targetCategories: ['Preposition', 'Vocabulary'],
            conceptRuleTitleEn: 'Core Rule: Direct Object After Transitive Verbs (Zero Extra Preposition)',
            conceptRuleTitleBn: 'মূল নিয়ম: Transitive Verb-এর পরেই সরাসরি Object (অতিরিক্ত Preposition নয়)',
            conceptRuleEn:
              'Certain English verbs already contain the preposition inside their meaning: "discuss" = talk about; "enter" = go into; "order" = ask for; "return" = go/come back. Adding "about", "into", "for", or "back" duplicates the meaning.',
            conceptRuleBn:
              'ইংরেজির কিছু Verb-এর অর্থের মধ্যেই Preposition লুকিয়ে থাকে: "discuss" মানেই কোনো বিষয় নিয়ে আলোচনা করা; "return" মানেই ফিরে আসা। তাই এর পরে "about" বা "back" যোগ করলে একই অর্থ দুবার বলা হয়।',
            banglaInterferenceTitleEn: 'Why Bangla speakers stumble here',
            banglaInterferenceTitleBn: 'বাংলাভাষীদের এখানে কেন ভুল হয়',
            banglaInterferenceEn:
              'Bangla uses postpositions ("বিষয়টি নিয়ে আলোচনা করব") and compound verbs ("ফিরে আসব", "আবার বলুন"). Translating each piece produces "discuss about", "return back", and "repeat again".',
            banglaInterferenceBn:
              'বাংলায় আমরা বলি "বিষয়টি নিয়ে আলোচনা করা", "ফিরে আসা" বা "আবার পুনরাবৃত্তি করা"। বাংলা যৌগিক ক্রিয়ার প্রতিটি অংশ ইংরেজিতে বসাতে গিয়েই "discuss about" বা "return back" হয়ে যায়।',
            contrastRows: [
              {
                banglaThought: 'চলুন বাজেট নিয়ে আলোচনা করি।',
                commonTrap: "Let's discuss about the budget.",
                naturalEnglish: "Let's discuss the budget.",
              },
              {
                banglaThought: 'তিনি সোমবার অফিসে ফিরে আসবেন।',
                commonTrap: 'He will return back to the office on Monday.',
                naturalEnglish: 'He will return to the office on Monday.',
              },
              {
                banglaThought: 'আমরা টিমের জন্য লাঞ্চ অর্ডার করেছি।',
                commonTrap: 'We ordered for lunch for the team.',
                naturalEnglish: 'We ordered lunch for the team.',
              },
            ],
            examples: [
              {
                id: 'ex_prep_1',
                contextEn: 'Opening a meeting',
                contextBn: 'মিটিং শুরু করা',
                englishSentence: 'Today we will discuss the Q3 hiring timeline.',
                highlightPhrase: 'discuss the Q3 hiring timeline',
                banglaMeaning: 'আজ আমরা তৃতীয় প্রান্তিকের নিয়োগ সময়সূচি নিয়ে আলোচনা করব।',
              },
              {
                id: 'ex_prep_2',
                contextEn: 'Client email reply',
                contextBn: 'ক্লায়েন্টের ইমেইল উত্তর',
                englishSentence: 'Please review the draft and reply by Thursday afternoon.',
                highlightPhrase: 'reply by Thursday',
                banglaMeaning: 'অনুগ্রহ করে খসড়াটি দেখে বৃহস্পতিবার বিকেলের মধ্যে উত্তর দিন।',
              },
              {
                id: 'ex_prep_3',
                contextEn: 'Travel update',
                contextBn: 'ভ্রমণ আপডেট',
                englishSentence: 'Our director will return to Dhaka next Tuesday.',
                highlightPhrase: 'return to Dhaka',
                banglaMeaning: 'আমাদের পরিচালক আগামী মঙ্গলবার ঢাকায় ফিরে আসবেন।',
              },
              {
                id: 'ex_prep_4',
                contextEn: 'Presentation clarity',
                contextBn: 'প্রেজেন্টেশনে গুরুত্ব দেওয়া',
                englishSentence: 'I want to emphasize two major customer findings.',
                highlightPhrase: 'emphasize two major',
                banglaMeaning: 'আমি গ্রাহকদের দুটি বড় পর্যবেক্ষণের ওপর গুরুত্ব দিতে চাই।',
              },
            ],
            guidedExercises: [
              {
                id: 'g_prep_1',
                type: 'fill_blank',
                promptEn: 'Choose the clean, natural workplace sentence completion:',
                promptBn: 'পেশাদার ইংরেজির জন্য সঠিক অংশটি বেছে নিন:',
                sentenceTemplate: 'In today’s standup, we need to _____.',
                options: [
                  'discuss about the deployment bug',
                  'discuss on the deployment bug',
                  'discuss the deployment bug',
                  'discuss regarding the deployment bug',
                ],
                correctAnswer: 'discuss the deployment bug',
                mistakeCategory: 'Preposition',
                domain: 'grammar',
                patternEn: 'Adding "about / on" after "discuss"',
                patternBn: '"discuss"-এর পর অতিরিক্ত "about / on" বসানো',
                explanationEn:
                  '"Discuss" takes a direct object with no preposition: "discuss the deployment bug".',
                explanationBn:
                  '"Discuss"-এর পরে সরাসরি বিষয়টি বসে—কোনো "about" বা "on" লাগে না।',
              },
              {
                id: 'g_prep_2',
                type: 'reorder',
                promptEn: 'Build a crisp executive sentence (zero redundancy):',
                promptBn: 'অতিরিক্ত শব্দ ছাড়া একটি পরিচ্ছন্ন অফিস বাক্য সাজান:',
                wordBank: ['the key risk', 'emphasized', 'during the review', 'Our lead'],
                correctAnswer: 'Our lead emphasized the key risk during the review',
                acceptableAnswers: ['Our lead emphasized the key risk during the review'],
                mistakeCategory: 'Preposition',
                domain: 'sentence_construction',
                patternEn: 'Using "emphasize" directly with its object (no "on")',
                patternBn: '"emphasize"-এর পর "on" ছাড়া সরাসরি Object বসানো',
                explanationEn:
                  'Say "emphasized the key risk", never "emphasized on the key risk".',
                explanationBn:
                  '"emphasized on" নয়, সরাসরি "emphasized the key risk" বলা শুদ্ধ।',
              },
              {
                id: 'g_prep_3',
                type: 'error_spot',
                promptEn: 'Click the redundant word/phrase that should be fixed:',
                promptBn: 'অপ্রয়োজনীয় বা ভুল অংশটিতে ক্লিক করুন:',
                segments: ['Could you', 'please', 'repeat again', 'the deadline?'],
                errorSegmentIndex: 2,
                correctAnswer: 'Could you please repeat the deadline?',
                mistakeCategory: 'Vocabulary',
                domain: 'vocabulary',
                patternEn: 'Redundant modifier ("repeat again" / "return back")',
                patternBn: '"repeat again"-এর মতো পুনরাবৃত্তিমূলক শব্দ ব্যবহার',
                explanationEn:
                  '"Repeat" already means "say again". Drop "again" and say "repeat the deadline".',
                explanationBn:
                  '"Repeat" শব্দের মধ্যেই "আবার বলা" অর্থ আছে, তাই অতিরিক্ত "again" বাদ দিন।',
              },
            ],
            independentExercises: [
              {
                id: 'ind_prep_1',
                promptEn: 'Write this meeting sentence in clean English (no redundant preposition):',
                promptBn: 'অতিরিক্ত Preposition ছাড়া এই মিটিং বাক্যটি ইংরেজিতে লিখুন:',
                banglaCue: 'আমাদের প্রকল্পের বাজেট নিয়ে আলোচনা করতে হবে।',
                hintWords: ['We need to', 'discuss', 'the project budget'],
                sampleCorrectAnswer: 'We need to discuss the project budget.',
                acceptableAnswers: [
                  'We need to discuss the project budget',
                  'We have to discuss the project budget',
                ],
                requiredKeywords: ['discuss', 'project budget'],
                forbiddenPatterns: [
                  {
                    pattern: '\\bdiscuss\\s+(about|on|regarding)\\b',
                    feedbackEn: 'Remove "about/on" right after "discuss".',
                    feedbackBn: '"discuss"-এর পর "about" বা "on" বাদ দিন—সরাসরি "the project budget" লিখুন।',
                  },
                ],
                mistakeCategory: 'Preposition',
                domain: 'grammar',
                patternEn: 'Transitive verb "discuss" without "about"',
                patternBn: '"discuss"-এর পর "about" বর্জন',
                explanationEn:
                  'Use "discuss the project budget" directly.',
                explanationBn:
                  'সঠিক পেশাদার রূপ: "We need to discuss the project budget."',
              },
              {
                id: 'ind_prep_2',
                promptEn: 'Write this update without redundant words:',
                promptBn: 'অপ্রয়োজনীয় শব্দ ছাড়া এই আপডেটটি ইংরেজিতে লিখুন:',
                banglaCue: 'আমি আগামীকাল অফিসে ফিরে আসব।',
                hintWords: ['I will', 'return', 'to the office', 'tomorrow'],
                sampleCorrectAnswer: 'I will return to the office tomorrow.',
                acceptableAnswers: [
                  'I will return to the office tomorrow',
                  "I'll return to the office tomorrow",
                  'I will come back to the office tomorrow',
                ],
                requiredKeywords: ['office', 'tomorrow'],
                forbiddenPatterns: [
                  {
                    pattern: '\\breturn\\s+back\\b',
                    feedbackEn: 'Drop "back" after "return" (or use "come back" instead).',
                    feedbackBn: '"return back" একসাথে বলবেন না—শুধু "return" অথবা "come back" লিখুন।',
                  },
                ],
                mistakeCategory: 'Vocabulary',
                domain: 'vocabulary',
                patternEn: 'Eliminating "return back" redundancy',
                patternBn: '"return back"-এর পুনরাবৃত্তি দূর করা',
                explanationEn:
                  'Use either "return to the office" or "come back to the office", never "return back".',
                explanationBn:
                  '"return" বা "come back"—যেকোনো একটি ব্যবহার করুন, "return back" নয়।',
              },
            ],
            assessmentQuestions: [
              {
                id: 'as_prep_1',
                type: 'mcq',
                promptEn: 'Choose the most professional, error-free sentence:',
                promptBn: 'সবচেয়ে পেশাদার ও ভুলমুক্ত বাক্যটি বেছে নিন:',
                options: [
                  { id: 'a', label: 'Please enter into the conference room quietly.' },
                  { id: 'b', label: 'Please enter the conference room quietly.' },
                  { id: 'c', label: 'Please enter inside the conference room quietly.' },
                  { id: 'd', label: 'Please enter to the conference room quietly.' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Preposition',
                domain: 'grammar',
                patternEn: 'Using "enter" without "into" for physical rooms',
                patternBn: 'কোনো কক্ষে প্রবেশ বোঝাতে "enter"-এর পর "into" না বসানো',
                explanationEn:
                  'For physical spaces, say "enter the room" (no "into" or "inside").',
                explanationBn:
                  'কোনো কক্ষ বা স্থানে প্রবেশ বোঝাতে সরাসরি "enter the conference room" বলতে হয়।',
              },
              {
                id: 'as_prep_2',
                type: 'mcq',
                promptEn: 'Which sentence avoids redundancy?',
                promptBn: 'কোন বাক্যটিতে কোনো অপ্রয়োজনীয় পুনরাবৃত্তি নেই?',
                options: [
                  { id: 'a', label: 'I will revert back to you by 5 PM.' },
                  { id: 'b', label: 'We should emphasize on customer retention.' },
                  { id: 'c', label: 'We ordered lunch for the design team.' },
                  { id: 'd', label: 'Let us discuss about the roadmap.' },
                ],
                correctAnswer: 'c',
                mistakeCategory: 'Preposition',
                domain: 'vocabulary',
                patternEn: 'Direct transitive verb usage ("ordered lunch")',
                patternBn: '"order"-এর পর অতিরিক্ত "for" ছাড়া সরাসরি বস্তু বসানো',
                explanationEn:
                  '"Ordered lunch" is clean and natural; the other options contain "revert back", "emphasize on", and "discuss about".',
                explanationBn:
                  '"We ordered lunch" সম্পূর্ণ শুদ্ধ; বাকিগুলোতে অপ্রয়োজনীয় শব্দ ("back", "on", "about") রয়েছে।',
              },
              {
                id: 'as_prep_3',
                type: 'construct',
                promptEn: 'Rewrite cleanly: "Let us discuss about the new feature and return back next week."',
                promptBn: 'শুদ্ধ ও পরিচ্ছন্নভাবে লিখুন: "Let us discuss about the new feature and return back next week."',
                correctAnswer: 'Let us discuss the new feature and return next week.',
                acceptableAnswers: [
                  'Let us discuss the new feature and return next week',
                  "Let's discuss the new feature and return next week",
                ],
                mistakeCategory: 'Preposition',
                domain: 'grammar',
                patternEn: 'Removing both "about" after discuss and "back" after return',
                patternBn: '"discuss"-এর পর "about" এবং "return"-এর পর "back" বাদ দেওয়া',
                explanationEn:
                  'Drop "about" after "discuss" and drop "back" after "return".',
                explanationBn:
                  '"discuss"-এর পর "about" এবং "return"-এর পর "back"—দুটোই বাদ দিতে হবে।',
              },
            ],
          },
          {
            id: 'les_interview_impact',
            courseId: 'course_workplace',
            moduleId: 'mod_workplace_precision',
            order: 2,
            cefrBand: 'B2',
            estimatedMinutes: 9,
            titleEn: 'High-Impact Collocations for Interviews (Make, Take, Tell)',
            titleBn: 'ইন্টারভিউয়ের জন্য স্বাভাবিক শব্দচয়ন (Make, Take, Tell)',
            summaryEn:
              'Replace literal Bangla verb pairings ("give an exam", "do a mistake", "say me") with natural executive collocations.',
            summaryBn:
              '"give an exam", "do a mistake", "say me"-এর মতো আক্ষরিক অনুবাদ বদলে স্বাভাবিক পেশাদার ইংরেজি বলুন।',
            objectivesEn: [
              'Use natural verb-noun collocations ("make a decision", "make a mistake", "take an exam").',
              'Distinguish "tell + person" vs. "say + message" accurately.',
              'Frame clear, action-oriented workplace accomplishments.',
            ],
            objectivesBn: [
              '"make a decision", "make a mistake", "take an exam"-এর মতো স্বাভাবিক শব্দজোড়া ব্যবহার করা।',
              '"tell + ব্যক্তি" বনাম "say + কথা" নির্ভুলভাবে আলাদা করা।',
              'ইন্টারভিউয়ে নিজের সাফল্য ও সিদ্ধান্ত স্পষ্টভাবে উপস্থাপন করা।',
            ],
            prerequisiteLessonIds: ['les_preposition_traps'],
            prerequisiteNoteEn: 'Recommended after Eliminating Bangla Preposition Transfer.',
            prerequisiteNoteBn: 'অতিরিক্ত Preposition লেসনটির পর এটি করলে সবচেয়ে ভালো ফল পাবেন।',
            targetCategories: ['Collocation', 'Vocabulary'],
            conceptRuleTitleEn: 'Core Rule: Learn Natural Verb + Noun Pairs Together',
            conceptRuleTitleBn: 'মূল নিয়ম: Verb ও Noun-এর স্বাভাবিক জুটি (Collocation) একসাথে শিখুন',
            conceptRuleEn:
              'Fluent speakers do not mix verbs and nouns freely. In English, you "make" a decision, a mistake, or progress; you "take" an exam or responsibility; and you "tell" a person ("tell me") while you "say" words ("say that...").',
            conceptRuleBn:
              'ইংরেজিতে নির্দিষ্ট Noun-এর সাথে নির্দিষ্ট Verb বসে। যেমন: সিদ্ধান্ত বা ভুলের সাথে "make" ("make a decision", "make a mistake"); পরীক্ষা দেওয়ার ক্ষেত্রে "take an exam" (কখনোই "give an exam" নয়); আর কাউকে বলার ক্ষেত্রে "tell me" বসে।',
            banglaInterferenceTitleEn: 'Why Bangla speakers stumble here',
            banglaInterferenceTitleBn: 'বাংলাভাষীদের এখানে কেন ভুল হয়',
            banglaInterferenceEn:
              'In Bangla, students "পরীক্ষা দেয়" (literally "give an exam") and people "ভুল করে" (literally "do a mistake"). Direct translation sounds instantly unnatural to international interviewers.',
            banglaInterferenceBn:
              'বাংলায় আমরা বলি "পরীক্ষা দেওয়া" (give) এবং "ভুল করা" (do)। কিন্তু ইংরেজিতে ছাত্রছাত্রীরা "take an exam" (শিক্ষক প্রশ্ন দিলে "give"), আর ভুলের ক্ষেত্রে "make a mistake" বলে।',
            contrastRows: [
              {
                banglaThought: 'আমি আগামী মাসে IELTS পরীক্ষা দেব।',
                commonTrap: 'I will give the IELTS exam next month.',
                naturalEnglish: 'I will take the IELTS exam next month.',
              },
              {
                banglaThought: 'প্রথম খসড়ায় আমি একটি ভুল করেছিলাম।',
                commonTrap: 'I did a mistake in the first draft.',
                naturalEnglish: 'I made a mistake in the first draft.',
              },
              {
                banglaThought: 'ম্যানেজার আমাকে পরিকল্পনাটা বলেছিলেন।',
                commonTrap: 'The manager said me the plan.',
                naturalEnglish: 'The manager told me the plan.',
              },
            ],
            examples: [
              {
                id: 'ex_col_1',
                contextEn: 'Behavioral interview answer',
                contextBn: 'ইন্টারভিউয়ের উত্তর',
                englishSentence: 'We had to make a quick decision before the product launch.',
                highlightPhrase: 'make a quick decision',
                banglaMeaning: 'প্রোডাক্ট চালুর আগে আমাদের দ্রুত একটি সিদ্ধান্ত নিতে হয়েছিল।',
              },
              {
                id: 'ex_col_2',
                contextEn: 'Academic goal',
                contextBn: 'একাডেমিক লক্ষ্য',
                englishSentence: 'I plan to take the IELTS Academic test in December.',
                highlightPhrase: 'take the IELTS Academic test',
                banglaMeaning: 'আমি ডিসেম্বরে IELTS Academic পরীক্ষা দেওয়ার পরিকল্পনা করছি।',
              },
              {
                id: 'ex_col_3',
                contextEn: 'Owning a lesson learned',
                contextBn: 'ভুল থেকে শেখা',
                englishSentence: 'I made a mistake in the forecast, so I updated the model immediately.',
                highlightPhrase: 'made a mistake',
                banglaMeaning: 'পূর্বাভাসে আমার একটি ভুল হয়েছিল, তাই আমি সাথে সাথেই মডেলটি আপডেট করেছিলাম।',
              },
              {
                id: 'ex_col_4',
                contextEn: 'Reporting feedback',
                contextBn: 'মতামত জানানো',
                englishSentence: 'The client told us that the new checkout flow saved time.',
                highlightPhrase: 'told us that',
                banglaMeaning: 'ক্লায়েন্ট আমাদের জানিয়েছিলেন যে নতুন চেকআউট পদ্ধতি সময় বাঁচিয়েছে।',
              },
            ],
            guidedExercises: [
              {
                id: 'g_col_1',
                type: 'fill_blank',
                promptEn: 'Choose the natural English collocation:',
                promptBn: 'স্বাভাবিক ইংরেজি শব্দজোড়াটি বেছে নিন:',
                sentenceTemplate: 'After reviewing the user data, our team _____ to simplify onboarding.',
                options: [
                  'did a decision',
                  'made a decision',
                  'gave a decision',
                  'created a decision',
                ],
                correctAnswer: 'made a decision',
                mistakeCategory: 'Collocation',
                domain: 'vocabulary',
                patternEn: 'Natural collocation "make a decision"',
                patternBn: '"decision"-এর সাথে "make" ব্যবহার',
                explanationEn:
                  'Always pair "decision" with "make" (or "reach"), never "do" or "give".',
                explanationBn:
                  '"decision"-এর সাথে সবসময় "make a decision" বসে।',
              },
              {
                id: 'g_col_2',
                type: 'reorder',
                promptEn: 'Arrange into a crisp interview statement:',
                promptBn: 'ইন্টারভিউয়ের জন্য স্বাভাবিক বাক্যটি সাজান:',
                wordBank: ['me', 'about', 'The recruiter', 'told', 'the second round'],
                correctAnswer: 'The recruiter told me about the second round',
                acceptableAnswers: ['The recruiter told me about the second round'],
                mistakeCategory: 'Collocation',
                domain: 'sentence_construction',
                patternEn: 'Using "tell + person + about"',
                patternBn: '"tell + ব্যক্তি + about" গঠন ব্যবহার',
                explanationEn:
                  '"Tell" is followed directly by the person ("told me"), then "about the second round".',
                explanationBn:
                  '"tell"-এর পরেই সরাসরি ব্যক্তি ("told me") বসে।',
              },
              {
                id: 'g_col_3',
                type: 'error_spot',
                promptEn: 'Click the unnatural Bangla-translated phrase:',
                promptBn: 'বাংলা থেকে সরাসরি অনুবাদ করা অস্বাভাবিক অংশটিতে ক্লিক করুন:',
                segments: ['Next Saturday,', 'I am going to', 'give my final exam', 'at the university.'],
                errorSegmentIndex: 2,
                correctAnswer: 'Next Saturday, I am going to take my final exam at the university.',
                mistakeCategory: 'Collocation',
                domain: 'vocabulary',
                patternEn: 'Literal "give an exam" instead of "take an exam"',
                patternBn: '"পরীক্ষা দেওয়া" অর্থে "give"-এর বদলে "take an exam" ব্যবহার',
                explanationEn:
                  'Students "take" (or "sit") an exam; teachers "give" an exam.',
                explanationBn:
                  'শিক্ষার্থীরা পরীক্ষা দেওয়ার ক্ষেত্রে সবসময় "take an exam" বলে।',
              },
            ],
            independentExercises: [
              {
                id: 'ind_col_1',
                promptEn: 'Express this naturally in English:',
                promptBn: 'এটি স্বাভাবিক ইংরেজিতে প্রকাশ করুন:',
                banglaCue: 'আমি রিপোর্টে একটি ভুল করেছিলাম।',
                hintWords: ['I', 'made', 'a mistake', 'in the report'],
                sampleCorrectAnswer: 'I made a mistake in the report.',
                acceptableAnswers: ['I made a mistake in the report'],
                requiredKeywords: ['made', 'mistake', 'report'],
                forbiddenPatterns: [
                  {
                    pattern: '\\bdid\\s+a\\s+mistake\\b',
                    feedbackEn: 'Use "made a mistake", not "did a mistake".',
                    feedbackBn: '"did a mistake" নয়, স্বাভাবিক ইংরেজিতে "made a mistake" লিখুন।',
                  },
                ],
                mistakeCategory: 'Collocation',
                domain: 'vocabulary',
                patternEn: '"make a mistake" vs. literal "do a mistake"',
                patternBn: '"ভুল করা" অর্থে "make a mistake" ব্যবহার',
                explanationEn:
                  'In English, we always "make" a mistake, never "do" a mistake.',
                explanationBn:
                  'ইংরেজিতে ভুল করার ক্ষেত্রে সবসময় "make a mistake" (অতীতে "made a mistake") বসে।',
              },
              {
                id: 'ind_col_2',
                promptEn: 'Write this clearly in English:',
                promptBn: 'এটি স্পষ্ট ইংরেজিতে লিখুন:',
                banglaCue: 'তিনি আমাকে নতুন সময়সূচি বলেছিলেন।',
                hintWords: ['He / She', 'told', 'me', 'the new schedule'],
                sampleCorrectAnswer: 'She told me the new schedule.',
                acceptableAnswers: [
                  'She told me the new schedule',
                  'He told me the new schedule',
                  'She told me about the new schedule',
                  'He told me about the new schedule',
                ],
                requiredKeywords: ['told', 'me', 'new schedule'],
                forbiddenPatterns: [
                  {
                    pattern: '\\bsaid\\s+me\\b',
                    feedbackEn: 'Never say "said me". Use "told me" (or "said to me").',
                    feedbackBn: '"said me" ভুল—সঠিক রূপ হলো "told me"।',
                  },
                ],
                mistakeCategory: 'Collocation',
                domain: 'vocabulary',
                patternEn: '"told me" vs. incorrect "said me"',
                patternBn: '"said me"-এর বদলে "told me" ব্যবহার',
                explanationEn:
                  'Use "tell + person" ("told me") when naming the listener directly.',
                explanationBn:
                  'যাকে বলা হচ্ছে তার নাম বা সর্বনাম ("me") থাকলে "told me" বসবে।',
              },
            ],
            assessmentQuestions: [
              {
                id: 'as_col_1',
                type: 'mcq',
                promptEn: 'Which sentence sounds completely natural in a job interview?',
                promptBn: 'চাকরির ইন্টারভিউয়ে কোন বাক্যটি একদম স্বাভাবিক শোনায়?',
                options: [
                  { id: 'a', label: 'I did great progress during my internship.' },
                  { id: 'b', label: 'I made strong progress during my internship.' },
                  { id: 'c', label: 'I gave strong progress during my internship.' },
                  { id: 'd', label: 'I created strong progress during my internship.' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Collocation',
                domain: 'vocabulary',
                patternEn: 'Collocation "make progress"',
                patternBn: '"progress"-এর সাথে "make" ব্যবহার',
                explanationEn:
                  'Natural English pairs "progress" with "make" ("made strong progress").',
                explanationBn:
                  'উন্নতি বোঝাতে "make progress" (অতীতে "made progress") স্বাভাবিক ইংরেজি।',
              },
              {
                id: 'as_col_2',
                type: 'mcq',
                promptEn: 'Choose the accurate phrasing for a student speaking:',
                promptBn: 'একজন শিক্ষার্থীর কথা হিসেবে কোন বাক্যটি শুদ্ধ?',
                options: [
                  { id: 'a', label: 'I will give my driving test next week.' },
                  { id: 'b', label: 'I will take my driving test next week.' },
                  { id: 'c', label: 'I will do give my driving test next week.' },
                  { id: 'd', label: 'I will submit my driving test next week.' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Collocation',
                domain: 'vocabulary',
                patternEn: '"take a test / exam" for test-takers',
                patternBn: 'পরীক্ষার্থীর ক্ষেত্রে "take a test / exam" ব্যবহার',
                explanationEn:
                  'Test-takers "take a test", never "give a test".',
                explanationBn:
                  'যিনি পরীক্ষা দিচ্ছেন তিনি সবসময় "take a test" বলবেন।',
              },
              {
                id: 'as_col_3',
                type: 'construct',
                promptEn: 'Fix this sentence: "My supervisor said me to update the report."',
                promptBn: 'বাক্যটি শুদ্ধ করে লিখুন: "My supervisor said me to update the report."',
                correctAnswer: 'My supervisor told me to update the report.',
                acceptableAnswers: ['My supervisor told me to update the report'],
                mistakeCategory: 'Collocation',
                domain: 'vocabulary',
                patternEn: 'Replacing "said me to" with "told me to"',
                patternBn: '"said me to"-এর বদলে "told me to" ব্যবহার',
                explanationEn:
                  'Always use "told me to + verb" when reporting a direct instruction.',
                explanationBn:
                  'কাউকে কোনো কাজ করতে বলা বোঝাতে "told me to + verb" ব্যবহার করতে হয়।',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'course_reading_listening',
    order: 4,
    cefrRange: 'A2 – B1',
    titleEn: 'Reading & Listening Comprehension Intelligence',
    titleBn: 'রিডিং ও লিসেনিং বোধগম্যতা বুদ্ধিমত্তা',
    subtitleEn:
      'Decode real-world announcements, workplace briefs, and spoken updates for main ideas, implied intent, and time/detail accuracy.',
    subtitleBn:
      'বাস্তব ঘোষণা, অফিসিয়াল মেসেজ ও কথ্য ইংরেজি শুনে এবং পড়ে মূল ভাব, সময় ও সূক্ষ্ম তথ্য নির্ভুলভাবে বুঝুন।',
    targetAudienceEn:
      'Learners who understand individual words but miss implied deadlines, contrast words, or spoken self-corrections.',
    targetAudienceBn:
      'যারা আলাদা শব্দ বোঝেন কিন্তু "unless/however" বা কথার মাঝের দ্রুত সংশোধন ধরতে গিয়ে বিভ্রান্ত হন।',
    modules: [
      {
        id: 'mod_reading_listening_core',
        courseId: 'course_reading_listening',
        order: 1,
        titleEn: 'Module 1: Active Reading & Spoken Detail Extraction',
        titleBn: 'মডিউল ১: সক্রিয় রিডিং ও কথ্য তথ্য শনাক্তকরণ',
        descriptionEn:
          'Stop translating word-by-word. Identify main purpose, deadlines, and cause-effect links in written and spoken English.',
        descriptionBn:
          'প্রতিটি শব্দ আলাদা অনুবাদ না করে পুরো বাক্যের মূল উদ্দেশ্য, সময়সীমা ও কারণ-ফলাফল দ্রুত বুঝুন।',
        lessons: [
          {
            id: 'les_reading_inference',
            courseId: 'course_reading_listening',
            moduleId: 'mod_reading_listening_core',
            order: 1,
            cefrBand: 'A2 – B1',
            estimatedMinutes: 10,
            titleEn: 'Reading Workplace Briefs & Implied Deadlines',
            titleBn: 'অফিসিয়াল মেসেজ পড়া ও অন্তর্নিহিত সময়সীমা বোঝা',
            summaryEn:
              'Extract main intent, conditional actions, and exact deadlines from short workplace emails and notices.',
            summaryBn:
              'ছোট অফিসিয়াল ইমেইল ও নোটিশ থেকে মূল উদ্দেশ্য, শর্ত এবং নির্ধারিত সময়সীমা নির্ভুলভাবে চিহ্নিত করুন।',
            objectivesEn: [
              'Identify contrast markers ("however", "unless", "instead of") that shift a message’s true instruction.',
              'Avoid double-negative traps when reading or writing "unless" clauses.',
              'Summarize written deadlines accurately with "by + day/time".',
            ],
            objectivesBn: [
              '"however", "unless", "instead of"-এর মতো সংযোগকারী শব্দ দেখে মূল নির্দেশনা শনাক্ত করা।',
              '"unless"-এর সাথে দ্বৈত না-বোধক ত্রুটি এড়িয়ে চলা।',
              '"by + বার/সময়" দিয়ে নির্ভুলভাবে সময়সীমা বোঝা ও লেখা।',
            ],
            prerequisiteLessonIds: ['les_svo_order'],
            prerequisiteNoteEn: 'Recommended once you are comfortable with basic English word order.',
            prerequisiteNoteBn: 'মৌলিক ইংরেজি বাক্যগঠন জানা থাকলে সহজেই করতে পারবেন।',
            targetCategories: ['Grammar', 'Vocabulary'],
            conceptRuleTitleEn: 'Core Rule: Scan for Contrast Markers ("however / unless") and Action Verbs',
            conceptRuleTitleBn: 'মূল নিয়ম: বৈপরীত্য সূচক ("however / unless") ও করণীয় ক্রিয়া খুঁজুন',
            conceptRuleEn:
              'In practical English reading, the key instruction often comes after contrast words like "however", "unless", or "instead". Never stop reading after the first polite sentence.',
            conceptRuleBn:
              'বাস্তব ইংরেজি রিডিংয়ে প্রথম ভদ্র বাক্যের পরে "however", "unless", বা "instead" দিয়ে আসল শর্ত বা পরিবর্তনটি বলা হয়। তাই পুরো মেসেজটি মনোযোগ দিয়ে পড়ুন।',
            banglaInterferenceTitleEn: 'Why Bangla readers misread "unless"',
            banglaInterferenceTitleBn: 'বাংলাভাষী পাঠকদের "unless" বুঝতে কেন ভুল হয়',
            banglaInterferenceEn:
              'Bangla readers often treat "unless" (= if not) as "if", reversing the real instruction or adding an accidental "do not" right after it.',
            banglaInterferenceBn:
              'অনেকে "unless" (= যদি না) কে "if" (= যদি) ভেবে ভুল করেন অথবা এর পরে আবার "do not" বসিয়ে অর্থ উল্টে ফেলেন।',
            contrastRows: [
              {
                banglaThought: 'ক্লায়েন্ট সময় না বাড়ালে শুক্রবারের মধ্যে জমা দিন।',
                commonTrap: 'Submit by Friday unless the client does not approve an extension.',
                naturalEnglish: 'Submit by Friday unless the client approves an extension.',
              },
              {
                banglaThought: 'আমরা সোমবার লঞ্চ করতে চেয়েছিলাম, তবে QA একটি বাগ পেয়েছে।',
                commonTrap: 'We planned to launch Monday; so QA found a login bug.',
                naturalEnglish: 'We planned to launch Monday; however, QA found a login bug.',
              },
            ],
            examples: [
              {
                id: 'ex_read_1',
                contextEn: 'Reading Brief',
                contextBn: 'অফিসিয়াল মেসেজ',
                englishSentence: 'Please finalize the slides by 4 PM today unless the director reschedules the demo.',
                highlightPhrase: 'unless the director reschedules',
                banglaMeaning: 'ডিরেক্টর ডেমো পিছিয়ে না দিলে আজ বিকেল ৪টার মধ্যে স্লাইড চূড়ান্ত করুন।',
              },
              {
                id: 'ex_read_2',
                contextEn: 'Project Update',
                contextBn: 'প্রোজেক্ট আপডেট',
                englishSentence: 'Although the budget was approved, the vendor cannot deliver hardware until next Thursday.',
                highlightPhrase: 'Although the budget was approved',
                banglaMeaning: 'বাজেট অনুমোদিত হলেও ভেন্ডর আগামী বৃহস্পতিবারের আগে হার্ডওয়্যার সরবরাহ করতে পারবে না।',
              },
              {
                id: 'ex_read_3',
                contextEn: 'Action Notice',
                contextBn: 'কর্মনির্দেশনা',
                englishSentence: 'Instead of printing copies, share the PDF link in the team channel before the meeting.',
                highlightPhrase: 'Instead of printing copies',
                banglaMeaning: 'কপি প্রিন্ট করার বদলে মিটিংয়ের আগে টিম চ্যানেলে পিডিএফ লিংক শেয়ার করুন।',
              },
            ],
            guidedExercises: [
              {
                id: 'g_read_1',
                type: 'fill_blank',
                promptEn:
                  'Read: "The training room is closed for repairs; _____, today’s workshop will take place online."',
                promptBn: 'বাক্যটি পড়ে সঠিক সংযোগকারী শব্দ বেছে নিন:',
                sentenceTemplate: 'The training room is closed for repairs; _____, today’s workshop will take place online.',
                options: ['therefore', 'unless', 'during', 'between'],
                correctAnswer: 'therefore',
                mistakeCategory: 'Grammar',
                domain: 'reading',
                patternEn: 'Cause-and-effect connector "therefore" in reading passages',
                patternBn: 'কারণ ও ফলাফল যুক্ত করতে "therefore" বোঝা',
                explanationEn: '"Therefore" signals the direct result of the room being closed.',
                explanationBn: 'রুম বন্ধ থাকার সরাসরি ফলাফল বোঝাতে "therefore" ব্যবহৃত হয়।',
              },
              {
                id: 'g_read_2',
                type: 'reorder',
                promptEn: 'Arrange this clear reading summary sentence:',
                promptBn: 'রিডিং সারসংক্ষেপের বাক্যটি সঠিকভাবে সাজান:',
                wordBank: ['will start', 'unless', 'at 10 AM', 'The briefing', 'we hear otherwise'],
                correctAnswer: 'The briefing will start at 10 AM unless we hear otherwise',
                acceptableAnswers: ['The briefing will start at 10 AM unless we hear otherwise'],
                mistakeCategory: 'Word Order',
                domain: 'reading',
                patternEn: 'Conditional clause with "unless"',
                patternBn: '"unless" দিয়ে শর্তযুক্ত বাক্য বোঝা ও গঠন',
                explanationEn: 'Main schedule first ("The briefing will start at 10 AM"), exception clause second ("unless we hear otherwise").',
                explanationBn: 'মূল সময়সূচি আগে এবং "unless" দিয়ে ব্যতিক্রম শর্ত পরে বসে।',
              },
              {
                id: 'g_read_3',
                type: 'error_spot',
                promptEn: 'Click the phrase that breaks the logical meaning of this notice:',
                promptBn: 'নোটিশটির অর্থ নষ্ট করছে এমন অংশে ক্লিক করুন:',
                segments: ['Do not reply', 'to this automated email', 'unless you do not need', 'human support.'],
                errorSegmentIndex: 2,
                correctAnswer: 'Do not reply to this automated email unless you need human support.',
                mistakeCategory: 'Grammar',
                domain: 'reading',
                patternEn: 'Avoiding double negative after "unless"',
                patternBn: '"unless"-এর পরে আবার "do not" ব্যবহার না করা',
                explanationEn: '"Unless" already means "if not", so use "unless you need", not "unless you do not need".',
                explanationBn: '"unless" নিজেই নেতিবাচক ("যদি না"), তাই এর পরে আবার "do not" বসবে না।',
              },
            ],
            independentExercises: [
              {
                id: 'ind_read_1',
                promptEn:
                  'Passage: "All travel receipts must be uploaded by Tuesday; otherwise, reimbursement moves to next month." Summarize the deadline in one clear English sentence:',
                promptBn:
                  'অনুচ্ছেদ পড়ে একটি পরিষ্কার ইংরেজি বাক্যে সময়সীমাটি লিখুন (মঙ্গলবারের মধ্যে রিসিট আপলোড করতে হবে):',
                banglaCue: 'আমাদের মঙ্গলবারের মধ্যে সব ট্রাভেল রিসিট আপলোড করতে হবে।',
                hintWords: ['We must', 'upload', 'travel receipts', 'by Tuesday'],
                sampleCorrectAnswer: 'We must upload all travel receipts by Tuesday.',
                acceptableAnswers: [
                  'We must upload all travel receipts by Tuesday',
                  'All travel receipts must be uploaded by Tuesday',
                  'We need to upload travel receipts by Tuesday',
                ],
                requiredKeywords: ['upload', 'receipts', 'tuesday'],
                forbiddenPatterns: [
                  {
                    pattern: '\\buntil\\s+tuesday\\s+upload\\b',
                    feedbackEn: 'Use "by Tuesday" for a deadline.',
                    feedbackBn: 'সময়সীমা বোঝাতে "by Tuesday" ব্যবহার করুন।',
                  },
                ],
                mistakeCategory: 'Preposition',
                domain: 'reading',
                patternEn: 'Deadline preposition "by + day"',
                patternBn: 'সময়সীমা বোঝাতে "by + বার" ব্যবহার',
                explanationEn: 'Use "by Tuesday" to express a submission deadline.',
                explanationBn: 'জমা দেওয়ার শেষ সময় বোঝাতে "by Tuesday" ব্যবহৃত হয়।',
              },
            ],
            assessmentQuestions: [
              {
                id: 'as_read_1',
                type: 'mcq',
                promptEn:
                  'Notice: "Our office will remain open on Saturday unless severe weather warnings are issued." When will the office close?',
                promptBn: 'নোটিশ অনুযায়ী অফিস কখন বন্ধ থাকবে?',
                options: [
                  { id: 'a', label: 'Every Saturday automatically' },
                  { id: 'b', label: 'Only if severe weather warnings are issued' },
                  { id: 'c', label: 'Whenever there are no weather warnings' },
                  { id: 'd', label: 'Only on Friday afternoon' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Grammar',
                domain: 'reading',
                patternEn: 'Reading comprehension with "unless"',
                patternBn: '"unless"-এর সঠিক অর্থ অনুধাবন',
                explanationEn: '"Unless" introduces the single condition that cancels the open status.',
                explanationBn: 'কেবল আবহাওয়ার সতর্কতা জারি হলেই অফিস বন্ধ হবে।',
              },
              {
                id: 'as_read_2',
                type: 'mcq',
                promptEn:
                  'Email: "Thanks for sending the draft. Instead of adding new slides, please tighten the executive summary." What should the sender do?',
                promptBn: 'ইমেইল অনুযায়ী প্রেরকের কী করা উচিত?',
                options: [
                  { id: 'a', label: 'Add three new slides to the deck' },
                  { id: 'b', label: 'Make the executive summary shorter and clearer' },
                  { id: 'c', label: 'Delete the entire draft' },
                  { id: 'd', label: 'Wait until next week to reply' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Vocabulary',
                domain: 'reading',
                patternEn: 'Interpreting "instead of" and "tighten" in workplace reading',
                patternBn: '"instead of" ও "tighten" (সংক্ষিপ্ত ও স্পষ্ট করা) বোঝা',
                explanationEn: '"Tighten" a summary means editing it to be concise and sharper.',
                explanationBn: 'এখানে "tighten" মানে সারসংক্ষেপকে আরও সংক্ষিপ্ত ও সুস্পষ্ট করা।',
              },
              {
                id: 'as_read_3',
                type: 'construct',
                promptEn: 'Rewrite accurately without double negative: "Call support unless you do not receive the code."',
                promptBn: 'দ্বৈত না-বোধক ত্রুটি ঠিক করে লিখুন: "Call support unless you do not receive the code."',
                correctAnswer: 'Call support if you do not receive the code.',
                acceptableAnswers: [
                  'Call support if you do not receive the code',
                  'Call support unless you receive the code',
                ],
                mistakeCategory: 'Grammar',
                domain: 'reading',
                patternEn: 'Clear conditional comprehension ("if not" vs "unless")',
                patternBn: '"if you do not" বনাম "unless" সঠিকভাবে ব্যবহার',
                explanationEn: 'Either "if you do not receive" or "unless you receive" expresses the intended meaning clearly.',
                explanationBn: '"if you do not receive" অথবা "unless you receive" — যেকোনো একটি স্পষ্ট ও শুদ্ধ।',
              },
            ],
          },
          {
            id: 'les_listening_spoken_updates',
            courseId: 'course_reading_listening',
            moduleId: 'mod_reading_listening_core',
            order: 2,
            cefrBand: 'A2 – B1',
            estimatedMinutes: 10,
            titleEn: 'Listening to Spoken Schedules & Self-Corrections',
            titleBn: 'কথ্য সময়সূচি শোনা ও বক্তার তাৎক্ষণিক পরিবর্তন ধরা',
            summaryEn:
              'Train your ear using 0.75x and 1.0x audio examples to catch numbers, times, and mid-sentence self-corrections ("actually, make that...").',
            summaryBn:
              '০.৭৫x ও ১.০x অডিও উদাহরণ শুনে সংখ্যা, সময় এবং বক্তার তাৎক্ষণিক সংশোধন ("actually, make that...") সঠিকভাবে ধরুন।',
            objectivesEn: [
              'Catch mid-sentence spoken revisions signaled by "actually", "sorry", or "make that".',
              'Distinguish similar-sounding numbers and gate/platform updates at natural speed.',
              'Confirm heard details politely using "Just to confirm..." and accurate time prepositions.',
            ],
            objectivesBn: [
              '"actually", "sorry", বা "make that"-এর পরের চূড়ান্ত পরিবর্তিত তথ্য ধরা।',
              'স্বাভাবিক গতিতে সংখ্যা, গেট ও সময়সূচির পরিবর্তন আলাদা করা।',
              '"Just to confirm..." ও সঠিক সময়-preposition ("at") দিয়ে তথ্য যাচাই করা।',
            ],
            prerequisiteLessonIds: ['les_reading_inference'],
            prerequisiteNoteEn: 'Use Stage 3 built-in 0.75x and 1.0x audio playback with headphones or speakers.',
            prerequisiteNoteBn: 'স্টেজ ৩-এ বিল্ট-ইন ০.৭৫x ও ১.০x অডিও উদাহরণ শুনে অনুশীলন করুন।',
            targetCategories: ['Vocabulary', 'Preposition'],
            conceptRuleTitleEn: 'Core Rule: Track Final Confirmed Details After "Actually" or "Make That"',
            conceptRuleTitleBn: 'মূল নিয়ম: "Actually", "Sorry", বা "Make that"-এর পরের চূড়ান্ত তথ্য ধরুন',
            conceptRuleEn:
              'In natural spoken English (calls, airports, meetings), speakers frequently revise a detail mid-sentence using "actually", "wait", or "make that". Always record the revised final figure.',
            conceptRuleBn:
              'স্বাভাবিক কথ্য ইংরেজিতে বক্তা প্রায়ই "actually", "wait", বা "make that" বলে আগের সময় বা সংখ্যা সংশোধন করেন। শেষের সংশোধিত তথ্যটিই সঠিক।',
            banglaInterferenceTitleEn: 'Why learners miss mid-sentence spoken corrections',
            banglaInterferenceTitleBn: 'কথার মাঝের দ্রুত সংশোধন কেন অনেক সময় মিস হয়ে যায়',
            banglaInterferenceEn:
              'Learners often anchor on the first number they hear and translate it into Bangla while the speaker is already saying the corrected number.',
            banglaInterferenceBn:
              'প্রথম শোনা সংখ্যাটি মনে মনে অনুবাদ করতে গিয়ে পরের দ্রুত সংশোধনটি অনেক সময় মিস হয়ে যায়।',
            contrastRows: [
              {
                banglaThought: 'মিটিংটা ২টায় — আসলে ২:৩০-এ করুন।',
                commonTrap: 'Let us meet at 2 PM — do that 2:30.',
                naturalEnglish: 'Let’s meet at 2 PM — actually, make that 2:30.',
              },
              {
                banglaThought: 'নিশ্চিত হওয়ার জন্য বলছি, ওয়ার্কশপটা কি ৪:৩০-এ শুরু হবে?',
                commonTrap: 'Does the workshop begin in 4:30 PM?',
                naturalEnglish: 'Just to confirm, does the workshop begin at 4:30 PM?',
              },
            ],
            examples: [
              {
                id: 'ex_lis_1',
                contextEn: 'Spoken Schedule Update (Play 0.75x / 1.0x)',
                contextBn: 'কথ্য সময়সূচি পরিবর্তন',
                englishSentence: 'Our client call starts at 3:00 — actually, make that 3:15 so everyone has time to review the agenda.',
                highlightPhrase: 'actually, make that 3:15',
                banglaMeaning: 'আমাদের ক্লায়েন্ট কল ৩টায় শুরু হবে—আসলে ৩:১৫ করুন যাতে সবাই এজেন্ডা দেখে নিতে পারে।',
              },
              {
                id: 'ex_lis_2',
                contextEn: 'Airport Announcement (Play 0.75x / 1.0x)',
                contextBn: 'এয়ারপোর্ট ঘোষণা',
                englishSentence: 'Passengers for Dhaka, please proceed to Gate 12, not Gate 8, for immediate boarding.',
                highlightPhrase: 'Gate 12, not Gate 8',
                banglaMeaning: 'ঢাকাগামী যাত্রীরা অনুগ্রহ করে ৮ নম্বর নয়, ১২ নম্বর গেটে দ্রুত বোর্ডিংয়ের জন্য আসুন।',
              },
              {
                id: 'ex_lis_3',
                contextEn: 'Number Clarification (Play 0.75x / 1.0x)',
                contextBn: 'সংখ্যা সংশোধন',
                englishSentence: 'I ordered fifteen headsets — wait, I mean fifty headsets — for the new training center.',
                highlightPhrase: 'wait, I mean fifty headsets',
                banglaMeaning: 'আমি পনেরোটা নয়, সরি পঞ্চাশটা হেডসেট অর্ডার করেছি নতুন ট্রেনিং সেন্টারের জন্য।',
              },
            ],
            guidedExercises: [
              {
                id: 'g_lis_1',
                type: 'fill_blank',
                promptEn: 'Choose the natural spoken phrase used to revise a time mid-sentence:',
                promptBn: 'কথার মাঝে সময় সংশোধন করতে ব্যবহৃত স্বাভাবিক ইংরেজি বাক্যাংশ কোনটি?',
                sentenceTemplate: 'Let’s book the room for Tuesday — actually, _____ Wednesday morning.',
                options: ['make that', 'do that', 'give that', 'keep that'],
                correctAnswer: 'make that',
                mistakeCategory: 'Collocation',
                domain: 'reading',
                patternEn: 'Spoken self-correction cue "make that + revised detail"',
                patternBn: 'কথ্য সংশোধনে "make that" বোঝা',
                explanationEn: '"Make that + new time/number" is a standard spoken English cue meaning "change it to".',
                explanationBn: 'কথ্য ইংরেজিতে আগের তথ্য বদলে নতুনটি নিশ্চিত করতে "make that" বলা হয়।',
              },
              {
                id: 'g_lis_2',
                type: 'reorder',
                promptEn: 'Arrange this clear spoken confirmation:',
                promptBn: 'শোনা তথ্য যাচাই করার ভদ্র বাক্যটি সাজান:',
                wordBank: ['at 3:15', 'Just to confirm,', 'is starting', 'the meeting', 'instead of 3:00'],
                correctAnswer: 'Just to confirm, the meeting is starting at 3:15 instead of 3:00',
                acceptableAnswers: ['Just to confirm, the meeting is starting at 3:15 instead of 3:00'],
                mistakeCategory: 'Word Order',
                domain: 'sentence_construction',
                patternEn: 'Confirming heard details with "Just to confirm..."',
                patternBn: '"Just to confirm..." দিয়ে শোনা তথ্য নিশ্চিত করা',
                explanationEn: 'Opening with "Just to confirm," lets you verify numbers politely without sounding unsure.',
                explanationBn: '"Just to confirm," বলে শুরু করলে সময় বা সংখ্যা যাচাই করা অনেক ভদ্র ও পেশাদার শোনায়।',
              },
              {
                id: 'g_lis_3',
                type: 'error_spot',
                promptEn: 'Click the incorrect preposition in this spoken schedule check:',
                promptBn: 'সময়ের আগে ভুল Preposition-টিতে ক্লিক করুন:',
                segments: ['Could you repeat', 'whether the workshop', 'begins in', '4:30 PM?'],
                errorSegmentIndex: 2,
                correctAnswer: 'Could you repeat whether the workshop begins at 4:30 PM?',
                mistakeCategory: 'Preposition',
                domain: 'grammar',
                patternEn: 'Exact clock time uses "at", not "in"',
                patternBn: 'নির্দিষ্ট ঘড়ির সময়ের আগে "at" ব্যবহার',
                explanationEn: 'Always use "at" before exact clock times ("at 4:30 PM").',
                explanationBn: 'নির্দিষ্ট ঘড়ির সময়ের আগে সবসময় "at" বসে।',
              },
            ],
            independentExercises: [
              {
                id: 'ind_lis_1',
                promptEn: 'Write a polite sentence asking a speaker to confirm the revised time (3:15 PM):',
                promptBn: 'বক্তার কাছে পরিবর্তিত সময় (৩:১৫ PM) নিশ্চিত করতে একটি ভদ্র ইংরেজি বাক্য লিখুন:',
                banglaCue: 'নিশ্চিত হওয়ার জন্য বলছি, মিটিংটা কি ৩:১৫-তে?',
                hintWords: ['Just to confirm,', 'is the meeting', 'at 3:15 PM?'],
                sampleCorrectAnswer: 'Just to confirm, is the meeting at 3:15 PM?',
                acceptableAnswers: [
                  'Just to confirm, is the meeting at 3:15 PM?',
                  'Just to confirm, is the meeting at 3:15?',
                  'Could you confirm if the meeting is at 3:15 PM?',
                ],
                requiredKeywords: ['confirm', 'meeting', '3:15'],
                forbiddenPatterns: [
                  {
                    pattern: '\\bin\\s+3:15\\b',
                    feedbackEn: 'Use "at 3:15", not "in 3:15".',
                    feedbackBn: '"in 3:15" নয়, "at 3:15" লিখুন।',
                  },
                ],
                mistakeCategory: 'Preposition',
                domain: 'sentence_construction',
                patternEn: 'Active listening confirmation phrasing',
                patternBn: 'সক্রিয় শ্রবণের সময় ভদ্রভাবে তথ্য নিশ্চিতকরণ',
                explanationEn: 'Repeating the revised time back with "at 3:15" prevents costly scheduling misunderstandings.',
                explanationBn: 'শোনা সময়টি "at 3:15" বলে আবার যাচাই করলে ভুল বোঝাবুঝি এড়ানো যায়।',
              },
            ],
            assessmentQuestions: [
              {
                id: 'as_lis_1',
                type: 'mcq',
                promptEn:
                  'Speaker says: "Send the invoice to Finance — sorry, to Operations — before noon." Which team should receive the invoice?',
                promptBn: 'বক্তার কথা অনুযায়ী ইনভয়েস কোন টিমে পাঠাতে হবে?',
                options: [
                  { id: 'a', label: 'Finance' },
                  { id: 'b', label: 'Operations' },
                  { id: 'c', label: 'Both Finance and HR' },
                  { id: 'd', label: 'After noon only' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Vocabulary',
                domain: 'reading',
                patternEn: 'Catching spoken self-correction after "sorry"',
                patternBn: '"sorry"-এর পরের সংশোধিত তথ্য ধরা',
                explanationEn: 'The speaker explicitly corrected "Finance" to "Operations".',
                explanationBn: 'বক্তা "Finance" সংশোধন করে "Operations" বলেছেন।',
              },
              {
                id: 'as_lis_2',
                type: 'mcq',
                promptEn:
                  'Announcement: "Train 402 now departs from Platform 6 instead of Platform 3 at 8:10." What is the confirmed departure platform?',
                promptBn: 'ট্রেন ৪০২ এখন কোন প্ল্যাটফর্ম থেকে ছাড়বে?',
                options: [
                  { id: 'a', label: 'Platform 3' },
                  { id: 'b', label: 'Platform 6' },
                  { id: 'c', label: 'Platform 4' },
                  { id: 'd', label: 'Platform 10' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Vocabulary',
                domain: 'reading',
                patternEn: 'Distinguishing new vs. cancelled detail ("instead of")',
                patternBn: '"instead of"-এর মাধ্যমে নতুন ও বাতিল তথ্য আলাদা করা',
                explanationEn: '"From Platform 6 instead of Platform 3" means Platform 6 is the active platform.',
                explanationBn: 'প্ল্যাটফর্ম ৩-এর পরিবর্তে প্ল্যাটফর্ম ৬-ই বর্তমান নির্ধারিত প্ল্যাটফর্ম।',
              },
              {
                id: 'as_lis_3',
                type: 'construct',
                promptEn: 'Fix the preposition: "Just to confirm, the interview starts in 11:00 AM."',
                promptBn: 'Preposition শুদ্ধ করে লিখুন: "Just to confirm, the interview starts in 11:00 AM."',
                correctAnswer: 'Just to confirm, the interview starts at 11:00 AM.',
                acceptableAnswers: [
                  'Just to confirm, the interview starts at 11:00 AM',
                  'Just to confirm, the interview starts at 11 AM',
                ],
                mistakeCategory: 'Preposition',
                domain: 'grammar',
                patternEn: 'Time confirmation with "at"',
                patternBn: 'সময়ের আগে "at" ব্যবহার',
                explanationEn: 'Clock times take "at" ("at 11:00 AM").',
                explanationBn: 'নির্দিষ্ট সময়ের আগে "at 11:00 AM" হবে।',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'course_writing_workplace',
    order: 5,
    cefrRange: 'B1 – B2',
    titleEn: 'Practical Writing & Workplace Emails',
    titleBn: 'ব্যবহারিক রাইটিং ও অফিসিয়াল ইমেইল',
    subtitleEn:
      'Write concise, polite, action-oriented emails, status updates, and professional requests without awkward literal translations.',
    subtitleBn:
      'বাংলা থেকে আক্ষরিক অনুবাদ এড়িয়ে সংক্ষিপ্ত, ভদ্র ও কার্যকর অফিসিয়াল ইমেইল, স্ট্যাটাস আপডেট এবং অনুরোধ লিখুন।',
    targetAudienceEn:
      'Professionals and university students writing international emails, follow-ups, and workplace status updates.',
    targetAudienceBn:
      'পেশাজীবী ও বিশ্ববিদ্যালয় শিক্ষার্থী যারা আন্তর্জাতিক টিমে স্পষ্ট ও ভদ্র ইমেইল লিখতে চান।',
    modules: [
      {
        id: 'mod_writing_workplace_emails',
        courseId: 'course_writing_workplace',
        order: 1,
        titleEn: 'Module 1: Concise Professional Requests & Status Updates',
        titleBn: 'মডিউল ১: স্পষ্ট পেশাদার অনুরোধ ও স্ট্যাটাস আপডেট লেখা',
        descriptionEn:
          'Replace overly formal or abrupt phrases ("do the needful", "I want you to") with clear modern workplace English.',
        descriptionBn:
          'অস্বাভাবিক বা রূঢ় বাক্য ("do the needful", "I want you to") বদলে আধুনিক ও ভদ্র কর্মক্ষেত্রের ইংরেজি লিখুন।',
        lessons: [
          {
            id: 'les_writing_action_emails',
            courseId: 'course_writing_workplace',
            moduleId: 'mod_writing_workplace_emails',
            order: 1,
            cefrBand: 'B1 – B2',
            estimatedMinutes: 12,
            titleEn: 'Writing Clear Requests & Follow-Up Emails',
            titleBn: 'স্পষ্ট অনুরোধ ও ফলো-আপ ইমেইল লেখা',
            summaryEn:
              'Structure professional messages with Context -> Specific Action -> Polite Deadline using natural modern tone.',
            summaryBn:
              'প্রেক্ষাপট -> নির্দিষ্ট করণীয় -> ভদ্র সময়সীমা — এই কাঠামোয় আধুনিক অফিসিয়াল ইমেইল ও মেসেজ লিখুন।',
            objectivesEn: [
              'Replace outdated boilerplate ("do the needful", "revert back") with crisp, specific requests.',
              'Write courteous follow-up emails using "I am following up on...".',
              'State clear deliverables and deadlines with polite modal phrasing ("Could you please... by Friday?").',
            ],
            objectivesBn: [
              '"do the needful", "revert back"-এর মতো পুরোনো ও অস্পষ্ট ভাষা বদলে স্পষ্ট অনুরোধ লেখা।',
              '"I am following up on..." দিয়ে পেশাদার ফলো-আপ ইমেইল লেখা।',
              'ভদ্রভাবে নির্দিষ্ট কাজ ও সময়সীমা ("Could you please... by Friday?") উল্লেখ করা।',
            ],
            prerequisiteLessonIds: ['les_preposition_traps'],
            prerequisiteNoteEn: 'Recommended once you are comfortable writing full English sentences.',
            prerequisiteNoteBn: 'পূর্ণ ইংরেজি বাক্য লেখার প্রাথমিক দক্ষতা থাকলে সহজেই সম্পন্ন করতে পারবেন।',
            targetCategories: ['Vocabulary', 'Collocation', 'Grammar'],
            conceptRuleTitleEn: 'Core Rule: Context + Specific Ask + Polite Deadline',
            conceptRuleTitleBn: 'মূল নিয়ম: প্রেক্ষাপট + নির্দিষ্ট অনুরোধ + ভদ্র সময়সীমা',
            conceptRuleEn:
              'Modern international workplace writing values clarity and warmth. Replace vague expressions like "Please do the needful" or blunt orders like "Send me today" with "Could you please share the updated file by 5 PM today?"',
            conceptRuleBn:
              'আধুনিক আন্তর্জাতিক কর্মক্ষেত্রে অস্পষ্ট ("Please do the needful") বা সরাসরি আদেশমূলক ("Send me today") ভাষার বদলে "Could you please share the updated file by 5 PM today?" লেখা অনেক বেশি পেশাদার।',
            banglaInterferenceTitleEn: 'Why outdated email boilerplate hurts clarity',
            banglaInterferenceTitleBn: 'পুরোনো অফিসিয়াল বাক্যাংশ কেন আন্তর্জাতিক ইমেইলে সমস্যা তৈরি করে',
            banglaInterferenceEn:
              'Regional boilerplate like "Kindly revert back ASAP" or "Please do the needful" sounds dated or vague to global teams who expect the exact requested action.',
            banglaInterferenceBn:
              '"Kindly revert back" বা "Please do the needful" আন্তর্জাতিক টিমে অস্পষ্ট শোনায়; এর বদলে সরাসরি "Please reply" বা নির্দিষ্ট কাজের নাম লিখুন।',
            contrastRows: [
              {
                banglaThought: 'অনুগ্রহ করে প্রয়োজনীয় ব্যবস্থা নিন এবং দ্রুত উত্তর দিন।',
                commonTrap: 'Kindly revert back and do the needful urgently.',
                naturalEnglish: 'Could you please review the attached invoice and confirm by 3 PM?',
              },
              {
                banglaThought: 'সোমবারের ইমেইলের উত্তরের অপেক্ষায় আছি।',
                commonTrap: 'I am waiting for your reply since Monday.',
                naturalEnglish: 'I am following up on my Monday email regarding the project timeline.',
              },
            ],
            examples: [
              {
                id: 'ex_wrt_1',
                contextEn: 'Follow-Up Email',
                contextBn: 'ফলো-আপ ইমেইল',
                englishSentence: 'I am following up on the proposal I sent on Monday. Could you share your feedback by Thursday?',
                highlightPhrase: 'following up on the proposal',
                banglaMeaning: 'সোমবার পাঠানো প্রস্তাবনাটির বিষয়ে ফলো-আপ করছি। অনুগ্রহ করে বৃহস্পতিবারের মধ্যে আপনার মতামত জানাতে পারবেন?',
              },
              {
                id: 'ex_wrt_2',
                contextEn: 'Attachment Note',
                contextBn: 'সংযুক্তি বার্তা',
                englishSentence: 'Please find the updated Q3 budget attached. Let me know if you need any clarification.',
                highlightPhrase: 'Let me know if you need any clarification',
                banglaMeaning: 'হালনাগাদ Q3 বাজেট সংযুক্ত করা হলো। কোনো ব্যাখ্যার প্রয়োজন হলে জানাবেন।',
              },
              {
                id: 'ex_wrt_3',
                contextEn: 'Closing Confirmation',
                contextBn: 'সমাপনী নিশ্চয়তা',
                englishSentence: 'Thank you for your quick response. I have updated the schedule accordingly.',
                highlightPhrase: 'updated the schedule accordingly',
                banglaMeaning: 'দ্রুত উত্তরের জন্য ধন্যবাদ। সে অনুযায়ী আমি সময়সূচি হালনাগাদ করেছি।',
              },
            ],
            guidedExercises: [
              {
                id: 'g_wrt_1',
                type: 'fill_blank',
                promptEn: 'Choose the most natural, polite opening for a follow-up email:',
                promptBn: 'ফলো-আপ ইমেইলের জন্য সবচেয়ে স্বাভাবিক ও ভদ্র শুরুর বাক্যাংশটি বেছে নিন:',
                sentenceTemplate: 'Hi Sarah, I am _____ on the onboarding checklist we discussed yesterday.',
                options: ['following up', 'reverting back', 'doing needful', 'waiting back'],
                correctAnswer: 'following up',
                mistakeCategory: 'Collocation',
                domain: 'sentence_construction',
                patternEn: 'Professional follow-up verb "following up on"',
                patternBn: 'ফলো-আপ ইমেইলে "following up on" ব্যবহার',
                explanationEn: '"Following up on + topic" is the standard polite way to check in on a pending item.',
                explanationBn: 'বকেয়া কোনো বিষয়ে ভদ্রভাবে খোঁজ নিতে "following up on" ব্যবহৃত হয়।',
              },
              {
                id: 'g_wrt_2',
                type: 'reorder',
                promptEn: 'Arrange this polite workplace request:',
                promptBn: 'ভদ্র অফিসিয়াল অনুরোধের বাক্যটি সাজান:',
                wordBank: ['by 4 PM', 'Could you', 'the revised budget', 'please share', 'today?'],
                correctAnswer: 'Could you please share the revised budget by 4 PM today?',
                acceptableAnswers: ['Could you please share the revised budget by 4 PM today?'],
                mistakeCategory: 'Word Order',
                domain: 'sentence_construction',
                patternEn: 'Polite request structure "Could you please + verb + object + deadline?"',
                patternBn: '"Could you please + মূল ক্রিয়া + সময়সীমা" কাঠামো',
                explanationEn: 'Polite modal question + specific deliverable + clear deadline.',
                explanationBn: 'ভদ্র অনুরোধ + নির্দিষ্ট ফাইল + পরিষ্কার সময়সীমা।',
              },
              {
                id: 'g_wrt_3',
                type: 'error_spot',
                promptEn: 'Click the redundant/unnatural phrase in this email closing:',
                promptBn: 'ইমেইলের শেষে অপ্রয়োজনীয় বা অস্বাভাবিক অংশটিতে ক্লিক করুন:',
                segments: ['Please', 'revert back to me', 'with your approval', 'before Friday.'],
                errorSegmentIndex: 1,
                correctAnswer: 'Please reply to me with your approval before Friday.',
                mistakeCategory: 'Collocation',
                domain: 'vocabulary',
                patternEn: 'Replacing redundant "revert back" with "reply" or "get back to me"',
                patternBn: '"revert back"-এর বদলে "reply" বা "get back to me" ব্যবহার',
                explanationEn: '"Revert" means return to a previous state, and "back" is redundant. Use "reply" or "get back to me".',
                explanationBn: 'উত্তর দেওয়ার ক্ষেত্রে "revert back" নয়, "reply" বা "get back to me" লিখুন।',
              },
            ],
            independentExercises: [
              {
                id: 'ind_wrt_1',
                promptEn: 'Write a polite follow-up sentence asking a manager for feedback on the report by Friday:',
                promptBn: 'ম্যানেজারের কাছে শুক্রবারের মধ্যে রিপোর্টের মতামত চেয়ে একটি ভদ্র ইংরেজি বাক্য লিখুন:',
                banglaCue: 'আপনি কি অনুগ্রহ করে শুক্রবারের মধ্যে রিপোর্টটির ওপর আপনার মতামত শেয়ার করতে পারবেন?',
                hintWords: ['Could you please', 'share your feedback', 'on the report', 'by Friday?'],
                sampleCorrectAnswer: 'Could you please share your feedback on the report by Friday?',
                acceptableAnswers: [
                  'Could you please share your feedback on the report by Friday?',
                  'Could you share your feedback on the report by Friday?',
                  'Could you please send your feedback on the report by Friday?',
                ],
                requiredKeywords: ['feedback', 'report', 'friday'],
                forbiddenPatterns: [
                  {
                    pattern: '\\bdo\\s+the\\s+needful\\b',
                    feedbackEn: 'Avoid "do the needful"; specify the exact action ("share your feedback").',
                    feedbackBn: '"do the needful" এড়িয়ে সরাসরি "share your feedback" লিখুন।',
                  },
                  {
                    pattern: '\\brevert\\s+back\\b',
                    feedbackEn: 'Replace "revert back" with "reply" or "share your feedback".',
                    feedbackBn: '"revert back" নয়, "share your feedback" বা "reply" লিখুন।',
                  },
                ],
                mistakeCategory: 'Collocation',
                domain: 'sentence_construction',
                patternEn: 'Writing actionable polite workplace requests',
                patternBn: 'স্পষ্ট ও ভদ্র পেশাদার অনুরোধ রচনা',
                explanationEn: 'Naming the exact deliverable ("feedback on the report") and deadline ("by Friday") gets faster responses.',
                explanationBn: 'নির্দিষ্ট চাহিদা ও সময়সীমা উল্লেখ করলে দ্রুত ও কার্যকর উত্তর পাওয়া যায়।',
              },
            ],
            assessmentQuestions: [
              {
                id: 'as_wrt_1',
                type: 'mcq',
                promptEn: 'Which email line is clearest and most professional for an international team?',
                promptBn: 'আন্তর্জাতিক টিমের জন্য কোন ইমেইল লাইনটি সবচেয়ে স্পষ্ট ও পেশাদার?',
                options: [
                  { id: 'a', label: 'Kindly do the needful and revert back ASAP.' },
                  { id: 'b', label: 'Send me the slides right now.' },
                  { id: 'c', label: 'Could you please share the updated slides by 5 PM today?' },
                  { id: 'd', label: 'I am waiting for slides since yesterday morning.' },
                ],
                correctAnswer: 'c',
                mistakeCategory: 'Collocation',
                domain: 'sentence_construction',
                patternEn: 'Clear modern workplace writing tone',
                patternBn: 'আধুনিক ও ভদ্র অফিসিয়াল রাইটিং টোন',
                explanationEn: 'Option C is polite, specific, and gives an unambiguous deadline.',
                explanationBn: 'অপশন C ভদ্র, নির্দিষ্ট এবং স্পষ্ট সময়সীমা নির্দেশ করে।',
              },
              {
                id: 'as_wrt_2',
                type: 'mcq',
                promptEn: 'How should you politely follow up on an unanswered email from two days ago?',
                promptBn: 'দুই দিন আগের উত্তর না পাওয়া ইমেইলে কীভাবে ভদ্রভাবে ফলো-আপ করবেন?',
                options: [
                  { id: 'a', label: 'Why did you not reply to my email?' },
                  { id: 'b', label: 'I am following up on my Tuesday email regarding the schedule.' },
                  { id: 'c', label: 'Please revert back urgently.' },
                  { id: 'd', label: 'You forgot to answer me.' },
                ],
                correctAnswer: 'b',
                mistakeCategory: 'Vocabulary',
                domain: 'sentence_construction',
                patternEn: 'Courteous email follow-up phrasing',
                patternBn: 'ভদ্র ইমেইল ফলো-আপ বাক্য গঠন',
                explanationEn: '"I am following up on..." stays constructive and professional.',
                explanationBn: '"I am following up on..." ব্যবহারে পেশাদার ও ইতিবাচক সুর বজায় থাকে।',
              },
              {
                id: 'as_wrt_3',
                type: 'construct',
                promptEn: 'Rewrite professionally: "Kindly revert back with the updated file before Monday."',
                promptBn: 'পেশাদারভাবে পুনরায় লিখুন: "Kindly revert back with the updated file before Monday."',
                correctAnswer: 'Could you please reply with the updated file before Monday?',
                acceptableAnswers: [
                  'Could you please reply with the updated file before Monday?',
                  'Please reply with the updated file before Monday',
                  'Please send the updated file before Monday',
                ],
                mistakeCategory: 'Collocation',
                domain: 'sentence_construction',
                patternEn: 'Eliminating "revert back" in professional writing',
                patternBn: 'পেশাদার লেখায় "revert back"-এর পরিবর্তে "reply / send" ব্যবহার',
                explanationEn: 'Using "reply with" or "send" is crisp, modern, and clear.',
                explanationBn: '"reply with" বা "send" ব্যবহারে লেখা অনেক স্পষ্ট ও স্বাভাবিক হয়।',
              },
            ],
          },
        ],
      },
    ],
  },
];

export function getAllCourses(): CurriculumCourse[] {
  return mergeCurriculumWithOverlay(CURRICULUM_COURSES, readCustomCurriculumOverlay());
}

export function getAllLessons(): CurriculumLesson[] {
  const result: CurriculumLesson[] = [];
  for (const course of getAllCourses()) {
    for (const mod of course.modules) {
      result.push(...mod.lessons);
    }
  }
  return result;
}

export function getLessonById(lessonId: string): CurriculumLesson | undefined {
  return getAllLessons().find((lesson) => lesson.id === lessonId);
}

export function getCourseById(courseId: string): CurriculumCourse | undefined {
  return getAllCourses().find((course) => course.id === courseId);
}

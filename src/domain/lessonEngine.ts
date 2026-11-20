import type {
  AssessmentQuestion,
  GuidedExercise,
  IndependentExercise,
} from '../types/domain';

export interface ExerciseEvaluationResult {
  isCorrect: boolean;
  normalizedUserAnswer: string;
  expectedAnswer: string;
  feedbackEn: string;
  feedbackBn: string;
  triggeredTrap: boolean;
}

export function normalizeEnglishAnswer(input: string): string {
  return input
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\bdo not\b/gi, "don't")
    .replace(/\bdoes not\b/gi, "doesn't")
    .replace(/\bdid not\b/gi, "didn't")
    .replace(/\bcould not\b/gi, "couldn't")
    .replace(/\bhave not\b/gi, "haven't")
    .replace(/\bhas not\b/gi, "hasn't")
    .replace(/\bi am\b/gi, "i'm")
    .replace(/[.?!,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function evaluateGuidedExercise(
  exercise: GuidedExercise,
  userResponse: string
): ExerciseEvaluationResult {
  const trimmed = userResponse.trim();

  if (exercise.type === 'error_spot') {
    const expectedSegment =
      exercise.segments && exercise.errorSegmentIndex !== undefined
        ? exercise.segments[exercise.errorSegmentIndex]
        : exercise.correctAnswer;
    const isCorrect =
      normalizeEnglishAnswer(trimmed) === normalizeEnglishAnswer(expectedSegment);
    return {
      isCorrect,
      normalizedUserAnswer: trimmed,
      expectedAnswer: exercise.correctAnswer,
      feedbackEn: isCorrect
        ? `Correctly spotted "${expectedSegment}". ${exercise.explanationEn}`
        : `You selected "${trimmed || '(none)'}", but the error is in "${expectedSegment}". ${exercise.explanationEn}`,
      feedbackBn: isCorrect
        ? `সঠিকভাবে ভুল অংশ ("${expectedSegment}") শনাক্ত করেছেন। ${exercise.explanationBn}`
        : `আপনি "${trimmed || '(কিছুই না)'}" বেছে নিয়েছেন, কিন্তু ভুলটি রয়েছে "${expectedSegment}" অংশে। ${exercise.explanationBn}`,
      triggeredTrap: !isCorrect,
    };
  }

  const targets = exercise.acceptableAnswers?.length
    ? exercise.acceptableAnswers
    : [exercise.correctAnswer];
  const normalizedInput = normalizeEnglishAnswer(trimmed);
  const isCorrect = targets.some((t) => normalizeEnglishAnswer(t) === normalizedInput);

  return {
    isCorrect,
    normalizedUserAnswer: trimmed,
    expectedAnswer: exercise.correctAnswer,
    feedbackEn: isCorrect
      ? `Accurate! ${exercise.explanationEn}`
      : `Not quite. Natural phrasing: "${exercise.correctAnswer}". ${exercise.explanationEn}`,
    feedbackBn: isCorrect
      ? `একদম সঠিক! ${exercise.explanationBn}`
      : `ঠিক হয়নি। স্বাভাবিক ইংরেজি রূপ: "${exercise.correctAnswer}"। ${exercise.explanationBn}`,
    triggeredTrap: !isCorrect,
  };
}

export function evaluateIndependentExercise(
  exercise: IndependentExercise,
  userResponse: string
): ExerciseEvaluationResult {
  const trimmed = userResponse.trim();
  const normalizedInput = normalizeEnglishAnswer(trimmed);

  if (!normalizedInput) {
    return {
      isCorrect: false,
      normalizedUserAnswer: '',
      expectedAnswer: exercise.sampleCorrectAnswer,
      feedbackEn: 'Please write a complete English sentence before submitting.',
      feedbackBn: 'জমা দেওয়ার আগে অনুগ্রহ করে একটি পূর্ণ ইংরেজি বাক্য লিখুন।',
      triggeredTrap: false,
    };
  }

  // Check explicit Bangla L1 trap patterns first for targeted feedback
  if (exercise.forbiddenPatterns) {
    for (const trap of exercise.forbiddenPatterns) {
      const regex = new RegExp(trap.pattern, 'i');
      if (regex.test(trimmed)) {
        return {
          isCorrect: false,
          normalizedUserAnswer: trimmed,
          expectedAnswer: exercise.sampleCorrectAnswer,
          feedbackEn: `${trap.feedbackEn} Suggested answer: "${exercise.sampleCorrectAnswer}"`,
          feedbackBn: `${trap.feedbackBn} সঠিক উদাহরণ: "${exercise.sampleCorrectAnswer}"`,
          triggeredTrap: true,
        };
      }
    }
  }

  // Exact match against acceptable natural variations
  const exactMatch = exercise.acceptableAnswers.some(
    (ans) => normalizeEnglishAnswer(ans) === normalizedInput
  );
  if (exactMatch) {
    return {
      isCorrect: true,
      normalizedUserAnswer: trimmed,
      expectedAnswer: exercise.sampleCorrectAnswer,
      feedbackEn: `Well constructed! ${exercise.explanationEn}`,
      feedbackBn: `চমৎকার বাক্য গঠন! ${exercise.explanationBn}`,
      triggeredTrap: false,
    };
  }

  // Flexible semantic keyword check (when required keywords are present & no traps fired)
  if (exercise.requiredKeywords && exercise.requiredKeywords.length > 0) {
    const allKeywordsPresent = exercise.requiredKeywords.every((kw) =>
      normalizedInput.includes(normalizeEnglishAnswer(kw))
    );
    const wordCount = normalizedInput.split(' ').length;
    if (allKeywordsPresent && wordCount >= Math.max(3, exercise.requiredKeywords.length)) {
      return {
        isCorrect: true,
        normalizedUserAnswer: trimmed,
        expectedAnswer: exercise.sampleCorrectAnswer,
        feedbackEn: `Great! Your sentence uses the target structure accurately. Model phrasing: "${exercise.sampleCorrectAnswer}".`,
        feedbackBn: `ভালো হয়েছে! আপনি লক্ষ্যকৃত গঠনটি সঠিকভাবে ব্যবহার করেছেন। আদর্শ বাক্য: "${exercise.sampleCorrectAnswer}"।`,
        triggeredTrap: false,
      };
    }
  }

  return {
    isCorrect: false,
    normalizedUserAnswer: trimmed,
    expectedAnswer: exercise.sampleCorrectAnswer,
    feedbackEn: `Compare your sentence with the natural model: "${exercise.sampleCorrectAnswer}". ${exercise.explanationEn}`,
    feedbackBn: `আপনার বাক্যটির সাথে স্বাভাবিক ইংরেজি রূপটি মিলিয়ে দেখুন: "${exercise.sampleCorrectAnswer}"। ${exercise.explanationBn}`,
    triggeredTrap: false,
  };
}

export function evaluateAssessmentQuestion(
  question: AssessmentQuestion,
  userResponse: string
): ExerciseEvaluationResult {
  const trimmed = userResponse.trim();

  if (question.type === 'mcq') {
    const isCorrect = trimmed === question.correctAnswer;
    const selectedLabel =
      question.options?.find((o) => o.id === trimmed)?.label ?? trimmed;
    const expectedLabel =
      question.options?.find((o) => o.id === question.correctAnswer)?.label ??
      question.correctAnswer;

    return {
      isCorrect,
      normalizedUserAnswer: selectedLabel,
      expectedAnswer: expectedLabel,
      feedbackEn: isCorrect
        ? `Correct! ${question.explanationEn}`
        : `Correct option: "${expectedLabel}". ${question.explanationEn}`,
      feedbackBn: isCorrect
        ? `সঠিক উত্তর! ${question.explanationBn}`
        : `সঠিক উত্তর: "${expectedLabel}"। ${question.explanationBn}`,
      triggeredTrap: !isCorrect,
    };
  }

  const targets = question.acceptableAnswers?.length
    ? question.acceptableAnswers
    : [question.correctAnswer];
  const normalizedInput = normalizeEnglishAnswer(trimmed);
  const isCorrect = targets.some((t) => normalizeEnglishAnswer(t) === normalizedInput);

  return {
    isCorrect,
    normalizedUserAnswer: trimmed,
    expectedAnswer: question.correctAnswer,
    feedbackEn: isCorrect
      ? `Accurate! ${question.explanationEn}`
      : `Natural target: "${question.correctAnswer}". ${question.explanationEn}`,
    feedbackBn: isCorrect
      ? `সঠিক! ${question.explanationBn}`
      : `স্বাভাবিক উত্তর: "${question.correctAnswer}"। ${question.explanationBn}`,
    triggeredTrap: !isCorrect,
  };
}

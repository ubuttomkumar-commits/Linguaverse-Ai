import test from 'node:test';
import assert from 'node:assert/strict';
import { getLessonById } from './curriculumData';
import {
  evaluateAssessmentQuestion,
  evaluateGuidedExercise,
  evaluateIndependentExercise,
} from './lessonEngine';

test('evaluates fill-in-the-blank, reorder, and error-spotting guided exercises accurately', () => {
  const lesson = getLessonById('les_past_simple_markers');
  assert.ok(lesson);

  const [fillBlank, reorder, errorSpot] = lesson.guidedExercises;

  // Fill blank
  assert.equal(evaluateGuidedExercise(fillBlank, 'speak').isCorrect, true);
  assert.equal(evaluateGuidedExercise(fillBlank, 'spoke').isCorrect, false);

  // Reorder (accepts valid alternative ordering)
  assert.equal(
    evaluateGuidedExercise(reorder, 'Yesterday I went to the bank in the morning.').isCorrect,
    true
  );
  assert.equal(evaluateGuidedExercise(reorder, 'I to the bank went yesterday').isCorrect, false);

  // Error spot
  assert.equal(evaluateGuidedExercise(errorSpot, "didn't went").isCorrect, true);
  assert.equal(evaluateGuidedExercise(errorSpot, 'Last Friday,').isCorrect, false);
});

test('independent sentence construction detects Bangla L1 trap patterns and accepts valid phrasing', () => {
  const lesson = getLessonById('les_past_simple_markers');
  assert.ok(lesson);

  const [ex1, ex2] = lesson.independentExercises;

  // Bangla L1 trap: "I go to market yesterday"
  const trapEval = evaluateIndependentExercise(ex1, 'I go to market yesterday');
  assert.equal(trapEval.isCorrect, false);
  assert.equal(trapEval.triggeredTrap, true);
  assert.match(trapEval.feedbackBn, /went/);

  // Valid natural English answer
  const validEval = evaluateIndependentExercise(ex1, 'I went to the market yesterday.');
  assert.equal(validEval.isCorrect, true);

  // Contraction normalization ("did not" -> "didn't")
  const expandedNeg = evaluateIndependentExercise(ex2, 'I did not watch the movie last night');
  assert.equal(expandedNeg.isCorrect, true);
});

test('lesson assessment grades both MCQ and constructed rewrite items', () => {
  const lesson = getLessonById('les_preposition_traps');
  assert.ok(lesson);

  const [q1, , q3] = lesson.assessmentQuestions;
  assert.equal(evaluateAssessmentQuestion(q1, 'b').isCorrect, true);
  assert.equal(evaluateAssessmentQuestion(q1, 'a').isCorrect, false);

  assert.equal(
    evaluateAssessmentQuestion(q3, "Let's discuss the new feature and return next week.").isCorrect,
    true
  );
  assert.equal(
    evaluateAssessmentQuestion(q3, 'Let us discuss about the new feature and return back next week.')
      .isCorrect,
    false
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IELTS_TASK_CATALOG,
  IELTS_TRUTH_DISCLAIMER_EN,
  countEnglishWords,
  getIeltsTaskById,
  gradeObjectiveIeltsTask,
} from './ieltsExamEngine.ts';

test('ieltsExamEngine: catalog covers Speaking, Writing, Reading, and Listening with truth disclaimer', () => {
  const modules = new Set(IELTS_TASK_CATALOG.map((t) => t.module));
  assert.deepEqual([...modules].sort(), ['listening', 'reading', 'speaking', 'writing']);
  assert.match(IELTS_TRUTH_DISCLAIMER_EN, /NOT an official IELTS band score/i);
});

test('ieltsExamEngine: grades objective Reading and Listening tasks accurately', () => {
  const reading = getIeltsTaskById('ielts_read_solar_microgrids');
  assert.ok(reading);
  const perfect = gradeObjectiveIeltsTask(reading, { rq1: 1, rq2: 1, rq3: 2 });
  assert.equal(perfect.scorePct, 100);
  assert.equal(perfect.correctCount, 3);
  assert.equal(perfect.totalQuestions, 3);

  const partial = gradeObjectiveIeltsTask(reading, { rq1: 1, rq2: 0, rq3: 2 });
  assert.equal(partial.correctCount, 2);
  assert.equal(partial.scorePct, 67);
  assert.equal(countEnglishWords('  Hello   world from IELTS prep  '), 5);
});

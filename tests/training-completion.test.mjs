import assert from 'node:assert/strict';
import test from 'node:test';

async function loadModule() {
  try {
    return await import('../js/training-completion.js');
  } catch {
    return null;
  }
}

const diff = {
  pairs: [{ word: 'hello', userWord: 'hello', match: true, errorType: null }],
  stats: { total: 1, correct: 1, missing: 0, extra: 0, replacement: 0 },
  accuracy: 100,
  grade: 'A',
};

test('completing dictation stores the result and marks the material completed', async () => {
  const module = await loadModule();
  assert.ok(module, 'training completion module must exist');

  const material = { id: 'm1', status: 'dictating', scoreHistory: [] };
  module.applyCompletedDictation(material, 'hello', diff, '2026-06-11T00:00:00.000Z');

  assert.equal(material.status, 'completed');
  assert.equal(material.dictationInput, 'hello');
  assert.equal(material.dictationResult.accuracy, 100);
  assert.equal(material.scoreHistory.length, 1);
});

test('score history retains only the latest twenty attempts', async () => {
  const module = await loadModule();
  assert.ok(module, 'training completion module must exist');

  const scoreHistory = Array.from({ length: 20 }, (_, index) => ({
    accuracy: index,
    createdAt: `attempt-${index}`,
  }));
  const material = { id: 'm1', scoreHistory };

  module.applyCompletedDictation(material, 'hello', diff, 'latest');

  assert.equal(material.scoreHistory.length, 20);
  assert.equal(material.scoreHistory[0].createdAt, 'attempt-1');
  assert.equal(material.scoreHistory[19].createdAt, 'latest');
});

test('creates one review record and updates it on later attempts', async () => {
  const module = await loadModule();
  assert.ok(module, 'training completion module must exist');

  const first = module.buildDictationReviewRecord([], 'm1', diff, {
    completedAt: 'first',
    idFactory: () => 'record-1',
  });
  const second = module.buildDictationReviewRecord([first], 'm1', {
    ...diff,
    accuracy: 70,
    grade: 'C',
  }, {
    completedAt: 'second',
    idFactory: () => 'record-2',
  });

  assert.equal(first.id, 'record-1');
  assert.equal(second.id, 'record-1');
  assert.equal(second.reviewStatus, 'need_review');
  assert.equal(second.completedAt, 'second');
  assert.equal(second.errorCount, 0);
});

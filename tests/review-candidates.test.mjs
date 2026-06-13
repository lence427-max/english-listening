import assert from 'node:assert/strict';
import test from 'node:test';

async function loadModule() {
  try {
    return await import('../js/review-candidates.js');
  } catch {
    return null;
  }
}

test('uses completed full-dictation material as a review item', async () => {
  const module = await loadModule();
  assert.ok(module, 'review candidates module must exist');

  const materials = [{
    id: 'm1',
    title: 'Lesson',
    originalText: 'A complete sentence.',
    dictationResult: {
      pairs: [{ match: false, errorType: 'replacement' }],
    },
  }];
  const records = [{ materialId: 'm1', reviewStatus: 'need_review' }];

  const items = module.collectReviewCandidates(materials, records);

  assert.equal(items.length, 1);
  assert.equal(items[0].text, 'A complete sentence.');
  assert.equal(items[0].errorCount, 1);
});

test('prefers paragraph review items when paragraph results exist', async () => {
  const module = await loadModule();
  assert.ok(module, 'review candidates module must exist');

  const materials = [{
    id: 'm1',
    title: 'Lesson',
    originalText: 'First. Second.',
    paragraphs: [
      { text: 'First.' },
      { text: 'Second.' },
    ],
    paragraphResults: {
      1: {
        pairs: [
          { match: true, errorType: null },
          { match: false, errorType: 'missing' },
        ],
      },
    },
    dictationResult: { pairs: [] },
  }];
  const records = [{ materialId: 'm1', reviewStatus: 'need_review' }];

  const items = module.collectReviewCandidates(materials, records);

  assert.equal(items.length, 1);
  assert.equal(items[0].text, 'Second.');
  assert.equal(items[0].errorCount, 1);
});

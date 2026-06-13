import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleanConceptCandidates,
  getSemanticFallback,
  isConceptCandidate,
  isRenderableConceptMap,
  sanitizeConceptMap,
} from '../js/concept-quality.js';

test('filters function words, duplicates, numbers and the center word', () => {
  const candidates = cleanConceptCandidates(
    ['for', 'so', 'then', 'and', 'the', 'of', 'to', 'planet', '42', 'orbit', 'Orbit', 'gravity'],
    'planet'
  );

  assert.deepEqual(candidates, ['orbit', 'gravity']);
  assert.equal(isConceptCandidate('solar system', 'planet'), true);
  assert.equal(isConceptCandidate('a', 'planet'), false);
});

test('planet semantic fallback contains meaningful astronomy associations', () => {
  const fallback = getSemanticFallback('planet');
  const words = fallback.categories.flatMap(category => category.words.map(item => item.word));

  assert.equal(fallback.meaning_zh, '行星');
  assert.ok(fallback.definition);
  assert.ok(fallback.insight);
  for (const expected of ['orbit', 'moon', 'star', 'gravity', 'solar system', 'atmosphere', 'galaxy']) {
    assert.ok(words.includes(expected), `expected planet fallback to include ${expected}`);
  }
  for (const rejected of ['for', 'so', 'then', 'and', 'the', 'of', 'to']) {
    assert.ok(!words.includes(rejected), `expected planet fallback to exclude ${rejected}`);
  }
});

test('orbit semantic fallback supports a meaningful second exploration level', () => {
  const fallback = getSemanticFallback('orbit');
  const words = fallback.categories.flatMap(category => category.words.map(item => item.word));

  assert.equal(fallback.meaning_zh, '轨道');
  assert.ok(fallback.definition);
  assert.ok(fallback.insight);
  for (const expected of ['gravity', 'satellite', 'rotation', 'revolution', 'path', 'spacecraft']) {
    assert.ok(words.includes(expected), `expected orbit fallback to include ${expected}`);
  }
  for (const rejected of ['for', 'so', 'and', 'the']) {
    assert.ok(!words.includes(rejected), `expected orbit fallback to exclude ${rejected}`);
  }
});

test('sanitizes AI concept maps and rejects empty low-quality categories', () => {
  const result = sanitizeConceptMap({
    centerWord: 'planet',
    meaning_zh: '行星',
    definition: 'A world moving around a star.',
    insight: 'Gravity gives each planet its path.',
    categories: [
      {
        name: '天文学',
        emoji: '🔭',
        type: 'concept',
        words: [
          { word: 'the', relation: '' },
          { word: 'orbit', relation: 'path around a star', meaning_zh: '轨道' },
          { word: 'gravity', relation: 'shapes motion', meaning_zh: '引力' },
        ],
      },
      {
        name: '垃圾',
        emoji: 'x',
        type: 'concept',
        words: [{ word: 'and', relation: '' }],
      },
    ],
    bridges: [{ from: 'the', to: 'orbit', insight: 'invalid bridge' }],
  }, 'planet');

  assert.equal(result.categories.length, 1);
  assert.deepEqual(result.categories[0].words.map(item => item.word), ['orbit', 'gravity']);
  assert.deepEqual(result.bridges, []);
  assert.equal(isRenderableConceptMap(result), false);
});

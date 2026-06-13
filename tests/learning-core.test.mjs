import assert from 'node:assert/strict';
import test from 'node:test';

import { enhancedDiff } from '../js/diff.js';
import { estimateParagraphTimes, splitParagraphs } from '../js/paragraph.js';

test('diff ignores case and punctuation while preserving original words', () => {
  const result = enhancedDiff('Hello, WORLD!', 'hello world');

  assert.equal(result.accuracy, 100);
  assert.deepEqual(result.stats, {
    total: 2,
    correct: 2,
    missing: 0,
    extra: 0,
    replacement: 0,
  });
});

test('diff distinguishes missing, extra and replacement errors', () => {
  const missing = enhancedDiff('we learn english', 'we english');
  const extra = enhancedDiff('we learn', 'we really learn');
  const replacement = enhancedDiff('we learn', 'we study');

  assert.equal(missing.stats.missing, 1);
  assert.equal(extra.stats.extra, 1);
  assert.equal(replacement.stats.replacement, 1);
});

test('paragraph splitting removes empty groups and preserves all text', () => {
  const paragraphs = splitParagraphs('First paragraph.\n\n\nSecond paragraph.');

  assert.equal(paragraphs.length, 2);
  assert.equal(paragraphs[0].text, 'First paragraph.');
  assert.equal(paragraphs[1].text, 'Second paragraph.');
});

test('estimated paragraph times are contiguous and end at audio duration', () => {
  const paragraphs = [
    { index: 0, text: 'one two', wordCount: 2 },
    { index: 1, text: 'three four five', wordCount: 3 },
  ];

  estimateParagraphTimes(paragraphs, 50);

  assert.equal(paragraphs[0].startTime, 0);
  assert.equal(paragraphs[0].endTime, paragraphs[1].startTime);
  assert.equal(paragraphs[1].endTime, 50);
});

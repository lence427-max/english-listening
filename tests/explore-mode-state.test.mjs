import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../js/explore-mode.js', import.meta.url), 'utf8');

test('declares pathHistory before breadcrumb and loading code use it', () => {
  assert.match(
    source,
    /\blet\s+pathHistory\s*=\s*\[\s*\]\s*;/,
    'Explore Mode must declare pathHistory state to avoid leaving the center node stuck in loading state'
  );
});

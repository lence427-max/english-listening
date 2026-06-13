import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const knowledgeGraphSource = readFileSync(new URL('../js/knowledge-graph.js', import.meta.url), 'utf8');
const aiSource = readFileSync(new URL('../js/ai-network.js', import.meta.url), 'utf8');
const exploreSource = readFileSync(new URL('../js/explore-mode.js', import.meta.url), 'utf8');

test('knowledge graph imports and uses the shared concept quality rules', () => {
  assert.match(knowledgeGraphSource, /from\s+['"]\.\/concept-quality\.js['"]/);
  assert.match(knowledgeGraphSource, /isConceptCandidate\(/);
});

test('AI mind map uses a new cache version and explicit semantic quality prompt', () => {
  assert.match(aiSource, /mm4_v6_/);
  assert.match(aiSource, /function words/i);
  assert.match(aiSource, /meaning_zh/);
  assert.match(aiSource, /sanitizeConceptMap\(/);
  assert.match(aiSource, /isHighQualityConceptMap\(/);
});

test('Explore Mode sanitizes final maps and centers the concept card text', () => {
  assert.match(exploreSource, /sanitizeConceptMap\(/);
  assert.match(exploreSource, /getSemanticFallback\(/);
  assert.match(exploreSource, /'text-anchor':'middle'/);
  assert.match(exploreSource, /meaning_zh:w\.meaning_zh/);
  assert.match(exploreSource, /definition:w\.definition/);
});

test('child concepts show semantic details and keep the focused flight path', () => {
  assert.match(exploreSource, /showWordCard\(node,\s*e\.clientX,\s*e\.clientY\)/);
  assert.match(exploreSource, /meaning_zh/);
  assert.match(exploreSource, /definition/);
  assert.match(exploreSource, /relation/);
  assert.match(exploreSource, /savePathMarkers\(wordX,\s*wordY\)/);
  assert.match(exploreSource, /flyToWord\(wn\.x,\s*wn\.y,\s*word\)/);
});

test('Knowledge Dust uses cleaned current-map concepts and stars stay extremely faint', () => {
  assert.match(exploreSource, /cleanConceptCandidates\(\s*semanticWords/);
  assert.doesNotMatch(exploreSource, /gd\.collocations\.slice\(0,\s*8\)/);
  assert.match(exploreSource, /opacity:\s*0\.02\s*\+\s*simpleHash\(`star-o-\$\{i\}`\)\s*\*\s*0\.04/);
});

test('curated semantic maps take priority for deterministic planet and orbit exploration', () => {
  assert.match(exploreSource, /const curatedMap = getSemanticFallback\(word\)/);
  assert.match(exploreSource, /let data = curatedMap/);
});

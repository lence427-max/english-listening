import assert from 'node:assert/strict';
import test from 'node:test';

import { createLibraryMaterial, LIBRARY } from '../js/content-library.js';

test('built-in library items import as text-only materials without fake audio URLs', () => {
  const material = createLibraryMaterial(LIBRARY[0]);

  assert.equal(material.audioId, '');
  assert.equal(material.audioFileName, '');
  assert.equal(material.audioUrl, undefined);
  assert.equal(material.audioAvailable, false);
  assert.equal(material.sourceUrl, LIBRARY[0].sourceUrl);
  assert.ok(material.originalText.length > 0);
});

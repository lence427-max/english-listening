import assert from 'node:assert/strict';
import test from 'node:test';

async function loadModule() {
  try {
    return await import('../js/material-stats.js');
  } catch {
    return null;
  }
}

test('counts unique materials that currently need review', async () => {
  const module = await loadModule();
  assert.ok(module, 'material stats module must exist');

  const records = [
    { materialId: 'a', reviewStatus: 'need_review' },
    { materialId: 'a', reviewStatus: 'need_review' },
    { materialId: 'b', reviewStatus: 'mastered' },
    { materialId: 'c', reviewStatus: 'need_review' },
    { materialId: 'missing', reviewStatus: 'need_review' },
  ];
  const materials = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  assert.equal(module.countMaterialsNeedingReview(materials, records), 2);
});

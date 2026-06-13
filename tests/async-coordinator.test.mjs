import assert from 'node:assert/strict';
import test from 'node:test';

async function loadModule() {
  try {
    return await import('../js/async-coordinator.js');
  } catch {
    return null;
  }
}

test('starting a new request aborts and invalidates the previous request', async () => {
  const module = await loadModule();
  assert.ok(module, 'async coordinator module must exist');

  const coordinator = module.createLatestRequestCoordinator();
  const first = coordinator.begin();
  const second = coordinator.begin();

  assert.equal(first.signal.aborted, true);
  assert.equal(first.isCurrent(), false);
  assert.equal(second.signal.aborted, false);
  assert.equal(second.isCurrent(), true);
});

test('cancelling the coordinator invalidates the active request', async () => {
  const module = await loadModule();
  assert.ok(module, 'async coordinator module must exist');

  const coordinator = module.createLatestRequestCoordinator();
  const request = coordinator.begin();
  coordinator.cancel();

  assert.equal(request.signal.aborted, true);
  assert.equal(request.isCurrent(), false);
});

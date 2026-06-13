import assert from 'node:assert/strict';
import test from 'node:test';

async function loadModule() {
  try {
    return await import('../js/view-loader.js');
  } catch {
    return null;
  }
}

test('reports a lazy view loading failure without rejecting', async () => {
  const module = await loadModule();
  assert.ok(module, 'view loader module must exist');

  let reportedError = null;
  const result = await module.loadAndRenderView({
    load: async () => { throw new Error('module failed'); },
    render: () => assert.fail('render must not run'),
    onError: error => { reportedError = error; },
  });

  assert.equal(result, false);
  assert.equal(reportedError?.message, 'module failed');
});

test('renders a successfully loaded lazy view', async () => {
  const module = await loadModule();
  assert.ok(module, 'view loader module must exist');

  let rendered = null;
  const result = await module.loadAndRenderView({
    load: async () => ({ value: 42 }),
    render: loaded => { rendered = loaded.value; },
    onError: () => assert.fail('onError must not run'),
  });

  assert.equal(result, true);
  assert.equal(rendered, 42);
});

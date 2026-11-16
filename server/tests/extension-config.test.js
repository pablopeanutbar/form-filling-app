import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const productionId = 'a'.repeat(32);
const developmentId = 'b'.repeat(32);
const configUrl = new URL('../src/config/env.js', import.meta.url).href;

function loadConfig(overrides = {}) {
  return spawnSync(process.execPath, ['--input-type=module', '-e',
    `import { extensionIds } from ${JSON.stringify(configUrl)}; console.log(JSON.stringify(extensionIds));`
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      MONGO_URI: 'mongodb://localhost/config-test-unused',
      SESSION_SECRET: 'config_test_secret_that_is_at_least_32_characters',
      NODE_ENV: 'development',
      EXTENSION_IDS: productionId,
      EXTENSION_DEV_IDS: developmentId,
      ...overrides
    }
  });
}

test('development and test use only development IDs', () => {
  for (const NODE_ENV of ['development', 'test']) {
    const result = loadConfig({ NODE_ENV, EXTENSION_DEV_IDS: ` ${developmentId}, ${'c'.repeat(32)} ` });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim()), [developmentId, 'c'.repeat(32)]);
  }
});

test('production excludes development IDs', () => {
  const result = loadConfig({ NODE_ENV: 'production' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()), [productionId]);
});

test('empty active allowlists fail closed without falling back to the other environment', () => {
  for (const overrides of [
    { EXTENSION_DEV_IDS: '' },
    { NODE_ENV: 'production', EXTENSION_IDS: '' }
  ]) {
    const result = loadConfig(overrides);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim()), []);
  }
});

test('invalid IDs and wildcards fail configuration validation', () => {
  for (const key of ['EXTENSION_IDS', 'EXTENSION_DEV_IDS']) {
    for (const value of ['*', 'short', 'z'.repeat(32)]) {
      const result = loadConfig({ [key]: value });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Chrome extension IDs/);
    }
  }
});

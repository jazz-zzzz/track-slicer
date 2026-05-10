const test = require('node:test');
const assert = require('node:assert/strict');

const { summarizeBuild, verifyOutput } = require('../src/verify');

test('summarizeBuild reports ok when all counts match', () => {
  const result = summarizeBuild({
    expectedCount: 24,
    generatedFlacCount: 24,
    generatedAlacCount: 24,
  });

  assert.equal(result.ok, true);
  assert.match(result.message, /24 FLAC/);
  assert.match(result.message, /24 ALAC/);
});

test('summarizeBuild reports not ok when counts mismatch', () => {
  const result = summarizeBuild({
    expectedCount: 24,
    generatedFlacCount: 23,
    generatedAlacCount: 24,
  });

  assert.equal(result.ok, false);
});

test('summarizeBuild omits FLAC count when skipFlac is true', () => {
  const result = summarizeBuild({
    expectedCount: 24,
    generatedFlacCount: 0,
    generatedAlacCount: 24,
    skipFlac: true,
  });

  assert.equal(result.ok, true);
  assert.ok(!result.message.includes('FLAC'));
  assert.match(result.message, /24 ALAC/);
});

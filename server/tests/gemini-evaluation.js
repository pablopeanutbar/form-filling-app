import 'dotenv/config';
import { performance } from 'node:perf_hooks';
import { matchFormFields } from '../src/services/matching/matching.service.js';
import { createGeminiFallback, privateGeminiEnabled } from '../src/services/matching/geminiMatcher.js';

const live = process.argv.includes('--live');
if (live && (!privateGeminiEnabled() || !process.env.GEMINI_API_KEY)) {
  throw new Error('Live evaluation requires private synthetic development and a configured Gemini key.');
}
if (!live) {
  process.env.NODE_ENV = 'development';
  process.env.GEMINI_MATCHING_ENABLED = process.env.GEMINI_PRIVATE_SYNTHETIC_DEV = 'true';
}
const cloudFallback = live ? undefined : createGeminiFallback({
  settings: { enabled: true, key: 'synthetic', model: 'mock' },
  generate: async ({ contents }) => ({ text: JSON.stringify({
    results: JSON.parse(contents).map(({ fieldId, operations }) => operations.length
      ? { fieldId, decision: 'derive', profileKey: null, operation: operations[0].id }
      : { fieldId, decision: 'abstain', profileKey: null, operation: null })
  }) })
});

const year = new Date().getUTCFullYear();
const profile = {
  personal: { firstName: 'Synthetic', lastName: 'Example', dateOfBirth: '2000-01-01' },
  education: [{ id: 'synthetic-12', qualificationLevel: '12th', marksObtained: 420, maxMarks: 500 }]
};
const fixtures = [
  { label: 'First name', expected: 'Synthetic' },
  { label: 'Age', expected: year - 2000, derive: true },
  { label: 'Completed years of age', expected: year - 2000, derive: true, review: true },
  { label: 'Age as of 2020-01-01', expected: 20, derive: true },
  { label: 'Age as of the application deadline', expected: null },
  { label: 'Class 12 percentage', expected: 84, derive: true, context: { instructions: 'Marks obtained divided by maximum marks' } },
  { label: 'Qualifying examination percentage', expected: null },
  { label: 'Guardian email', expected: null },
  { label: 'Age', section: 'Guardian details', expected: null }
];
const fields = fixtures.map(({ expected, derive, review, ...field }, index) => ({ ...field, type: 'text', fieldId: 'fixture-' + index }));
for (const enhanced of [false, true]) {
  let requests = 0;
  const started = performance.now();
  const { results } = await matchFormFields(fields, profile, {
    derivationsEnabled: enhanced,
    localDevelopmentRequest: enhanced,
    cloudFallback,
    onCloudRequest: () => requests++
  });
  const scores = { correctMatches: 0, incorrectMatches: 0, correctDerivations: 0, incorrectDerivations: 0,
    correctAbstentions: 0, missedAnswers: 0, unsafeSuggestions: 0 };
  results.forEach((result, index) => {
    const { expected, derive, review } = fixtures[index];
    const correct = result.value === expected;
    if (result.value == null) scores[expected == null ? 'correctAbstentions' : 'missedAnswers']++;
    else if (derive || result.method === 'derived') scores[correct ? 'correctDerivations' : 'incorrectDerivations']++;
    else scores[correct ? 'correctMatches' : 'incorrectMatches']++;
    if ((expected == null && result.value != null) || (result.status === 'matched' && (!correct || review))) scores.unsafeSuggestions++;
  });
  console.log(JSON.stringify({ mode: enhanced ? 'contextual' : 'direct-and-semantic', provider: live ? 'live' : 'mock',
    ...scores, averageLatencyMs: (performance.now() - started) / fields.length, geminiRequests: requests }));
}

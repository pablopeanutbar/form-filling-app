import { matchFieldDeterministically } from './deterministicMatcher.js';
import { rankCandidatesBatch } from './semanticMatcher.js';
import { validateCandidate, isUnsupportedField } from './validationEngine.js';
import { getFieldByKey } from './fieldRegistry.js';
import { matchingDiagnostic } from './diagnostics.js';
import { applyGeminiFallback, isGeminiEnabled } from './geminiMatcher.js';
import { executeAnswerPlan, understandDerivedField } from './answerPlanner.js';

/**
 * Orchestrate the complete form field matching pipeline
 *
 * @param {Array<Object>} fields List of extracted form fields from browser extension
 * @param {Object} profile Authenticated user's profile document
 * @returns {Promise<Object>} Form-filling suggestions and matching summary
 */
export const matchFormFields = async (fields, profile, options = {}) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return {
      results: [],
      summary: {
        totalFields: 0,
        matched: 0,
        needsReview: 0,
        unmatched: 0,
        unsupported: 0
      }
    };
  }

  const decisions = new Array(fields.length);
  const selectedCandidates = new Array(fields.length);
  const fieldsForSemantic = [];
  const semanticIndexMap = [];
  const plans = new Map();
  const trace = typeof options.trace === 'function' ? fields.map(() => ({ miniLM: null, candidateKeys: [], derivation: null })) : null;
  const derive = (field, index) => {
    const plan = plans.get(index);
    if (plan && trace) trace[index].derivation = plan.operation || 'unresolved';
    return executeAnswerPlan(field, profile, plan);
  };
  const cloudEnabled = typeof options.cloudEnabled === 'boolean'
    ? options.cloudEnabled
    : typeof options.localDevelopmentRequest === 'boolean'
      ? options.localDevelopmentRequest && isGeminiEnabled()
      : isGeminiEnabled();

  // Stage 1: Unsupported check & Stage 2: Deterministic matching
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const fieldId = field.fieldId || field.name || field.id || `field_${i}`;
    const normalizedField = { ...field, fieldId };

    // 1. Check unsupported
    const unsupp = isUnsupportedField(normalizedField);
    if (unsupp.unsupported) {
      decisions[i] = validateCandidate(normalizedField, null, profile);
      continue;
    }

    // 2. Deterministic matching
    const detMatch = matchFieldDeterministically(normalizedField);
    const plan = options.derivationsEnabled === false ? null : understandDerivedField(normalizedField);
    if (plan) plans.set(i, plan);
    if (detMatch && detMatch.matched) {
      selectedCandidates[i] = detMatch;
      if (trace && detMatch.canonicalKey) trace[i].candidateKeys.push(detMatch.canonicalKey);
      decisions[i] = validateCandidate(normalizedField, detMatch, profile);
      if (decisions[i].status !== 'matched' || ['birth_year', 'middle_initial'].includes(plan?.operation)
          || (plan?.operation === 'full_name' && !profile?.personal?.fullName?.trim())) {
        decisions[i] = derive(normalizedField, i) || decisions[i];
      }
      if (!plan?.cloudReview || !cloudEnabled) continue;
    }

    // Queue for semantic ML matching
    fieldsForSemantic.push(normalizedField);
    semanticIndexMap.push(i);
  }

  // Stage 3: Semantic ML matching (batch inference)
  if (fieldsForSemantic.length > 0) {
    const operationRankings = new Map();
    let semanticRankings = new Map();
    try {
      semanticRankings = await rankCandidatesBatch(fieldsForSemantic, { topK: 5, minScore: 0.35, operationRankings });
    } catch (err) {
      semanticRankings = new Map();
    }

    for (let k = 0; k < fieldsForSemantic.length; k++) {
      const originalIdx = semanticIndexMap[k];
      const field = fieldsForSemantic[k];
      const candidates = semanticRankings.get(field.fieldId) || [];
      if (trace) {
        trace[originalIdx].miniLM = candidates.map(({ canonicalKey }) => canonicalKey);
        trace[originalIdx].candidateKeys.push(...trace[originalIdx].miniLM);
      }
      const plan = plans.get(originalIdx);
      if (plan) plan.semanticSupport = Boolean(operationRankings.get(field.fieldId)?.some(({ id }) => id === plan.operation));
      if (decisions[originalIdx]) continue;

      const topCandidate = candidates.length > 0 ? candidates[0] : null;
      selectedCandidates[originalIdx] = topCandidate;
      decisions[originalIdx] = validateCandidate(field, topCandidate, profile, candidates);
      if (decisions[originalIdx].status !== 'matched') {
        decisions[originalIdx] = derive(field, originalIdx) || decisions[originalIdx];
      }
    }
  }

  if (cloudEnabled) {
    const fallback = options.cloudFallback || applyGeminiFallback;
    await fallback(fields, profile, decisions, plans, options.onCloudRequest);
  }
  if (trace) {
    decisions.forEach((decision, index) => options.trace(decision.fieldId, trace[index]));
  }

  if (process.env.NODE_ENV === 'development' && process.env.MATCHING_DIAGNOSTICS === 'true') {
    decisions.forEach((decision, index) => console.debug('[matching]', matchingDiagnostic(fields[index], decision, profile, selectedCandidates[index])));
  }

  // Calculate summary counts
  const summary = {
    totalFields: decisions.length,
    matched: 0,
    needsReview: 0,
    unmatched: 0,
    unsupported: 0
  };

  for (const dec of decisions) {
    const source = getFieldByKey(dec.canonicalKey);
    if (source) {
      const record = profile.education?.find((entry) => String(entry.id || entry._id) === dec.educationRecordId);
      dec.source = { label: source.label, ...(record ? { record: [record.degreeName, record.institution].filter(Boolean).join(' · ') } : {}) };
    }
    if (dec.status === 'matched') summary.matched++;
    else if (dec.status === 'needs_review') summary.needsReview++;
    else if (dec.status === 'unsupported') summary.unsupported++;
    else summary.unmatched++;
  }

  return {
    results: decisions,
    summary
  };
};


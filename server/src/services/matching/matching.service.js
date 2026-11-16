import { matchFieldDeterministically } from './deterministicMatcher.js';
import { rankCandidatesBatch } from './semanticMatcher.js';
import { validateCandidate, isUnsupportedField } from './validationEngine.js';
import { getFieldByKey } from './fieldRegistry.js';

/**
 * Orchestrate the complete form field matching pipeline
 *
 * @param {Array<Object>} fields List of extracted form fields from browser extension
 * @param {Object} profile Authenticated user's profile document
 * @returns {Promise<Object>} Form-filling suggestions and matching summary
 */
export const matchFormFields = async (fields, profile) => {
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
  const fieldsForSemantic = [];
  const semanticIndexMap = [];

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
    if (detMatch && detMatch.matched) {
      decisions[i] = validateCandidate(normalizedField, detMatch, profile);
      continue;
    }

    // Queue for semantic ML matching
    fieldsForSemantic.push(normalizedField);
    semanticIndexMap.push(i);
  }

  // Stage 3: Semantic ML matching (batch inference)
  if (fieldsForSemantic.length > 0) {
    let semanticRankings = new Map();
    try {
      semanticRankings = await rankCandidatesBatch(fieldsForSemantic, { topK: 5, minScore: 0.35 });
    } catch (err) {
      semanticRankings = new Map();
    }

    for (let k = 0; k < fieldsForSemantic.length; k++) {
      const originalIdx = semanticIndexMap[k];
      const field = fieldsForSemantic[k];
      const candidates = semanticRankings.get(field.fieldId) || [];

      const topCandidate = candidates.length > 0 ? candidates[0] : null;
      decisions[originalIdx] = validateCandidate(field, topCandidate, profile, candidates);
    }
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


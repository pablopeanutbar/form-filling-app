import { getFieldByKey } from './fieldRegistry.js';
import { validateDestination } from './destinationValidation.js';

/**
 * Extract value from user profile using canonical key and qualification context
 */
export const extractProfileValue = (profile, canonicalKey, field = {}) => {
  if (!profile || !canonicalKey) {
    return { value: null, recordId: null };
  }

  const parts = canonicalKey.split('.');
  const [category, sub, prop] = parts;

  // 1. Personal Information
  if (category === 'personal') {
    const val = profile.personal?.[sub];
    return { value: val !== undefined && val !== null ? val : null, recordId: null };
  }

  // 2. Contact Information
  if (category === 'contact') {
    const val = profile.contact?.[sub];
    return { value: val !== undefined && val !== null ? val : null, recordId: null };
  }

  // 3. Addresses
  if (category === 'addresses') {
    const val = profile.addresses?.[sub]?.[prop];
    return { value: val !== undefined && val !== null ? val : null, recordId: null };
  }

  // 4. Educational Qualifications
  if (category === 'education') {
    const levelKey = sub; // '10th', '12th', or 'undergraduate'
    const fieldName = prop; // e.g. 'percentage', 'institution', 'cgpa'

    if (!Array.isArray(profile.education) || profile.education.length === 0) {
      return { value: null, recordId: null, warning: 'No educational records found in profile' };
    }

    // Match education level safely
    const matchLevel = (eduLevel) => {
      const el = (eduLevel || '').toLowerCase().trim();
      if (levelKey === '10th') {
        return ['10th', '10', 'ssc', 'secondary', 'matriculation', 'tenth', 'high school', 'class 10', 'class x'].includes(el);
      }
      if (levelKey === '12th') {
        return ['12th', '12', 'hsc', 'higher secondary', 'intermediate', 'twelfth', 'senior secondary', 'class 12', 'class xii'].includes(el);
      }
      if (levelKey === 'undergraduate') {
        return ['undergraduate', 'bachelor', 'graduation', 'ug', 'b.tech', 'btech', 'b.e', 'be', 'b.sc', 'bsc', 'bca', 'bba'].includes(el);
      }
      return false;
    };

    const matchingEdus = profile.education.filter((e) => matchLevel(e.qualificationLevel));
    if (matchingEdus.length === 0) {
      return {
        value: null,
        recordId: null,
        warning: `No education record matching qualification level "${levelKey}" found in profile`
      };
    }

    if (matchingEdus.length === 1) {
      const targetEdu = matchingEdus[0];
      const val = targetEdu[fieldName];
      const recId = targetEdu.id || targetEdu._id?.toString() || null;
      return {
        value: val !== undefined && val !== null ? val : null,
        recordId: recId
      };
    }

    // Multiple qualifying records at the same level (e.g. two undergraduate degrees)
    // Score each record based on degree name, specialization, and institution mentions in field context
    const cleanFieldText = ` ${field.section || ''} ${field.label || ''} ${field.name || ''} ${field.placeholder || ''} `
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');

    const scored = matchingEdus
      .map((edu) => {
        let score = 0;
        const deg = (edu.degreeName || '').toLowerCase().replace(/[^\w\s]/g, ' ').trim();
        const spec = (edu.specialization || '').toLowerCase().replace(/[^\w\s]/g, ' ').trim();
        const inst = (edu.institution || '').toLowerCase().replace(/[^\w\s]/g, ' ').trim();

        // Exact phrase matches
        if (spec && cleanFieldText.includes(` ${spec} `)) score += 10;
        if (deg && cleanFieldText.includes(` ${deg} `)) score += 10;

        // Degree abbreviation hints
        if (deg.includes('technology') && (cleanFieldText.includes(' btech ') || cleanFieldText.includes(' b tech '))) score += 5;
        if (deg.includes('science') && (cleanFieldText.includes(' bsc ') || cleanFieldText.includes(' b sc '))) score += 5;
        if (deg.includes('computer') && cleanFieldText.includes(' computer ')) score += 4;
        if (deg.includes('mathematics') && cleanFieldText.includes(' math ')) score += 4;
        if (spec && cleanFieldText.includes(spec)) score += 3;
        if (inst && cleanFieldText.includes(` ${inst} `)) score += 5;

        return { edu, score };
      })
      .sort((a, b) => b.score - a.score);

    if (scored[0].score > 0 && (scored.length === 1 || scored[0].score > scored[1].score)) {
      const targetEdu = scored[0].edu;
      const val = targetEdu[fieldName];
      const recId = targetEdu.id || targetEdu._id?.toString() || null;
      return {
        value: val !== undefined && val !== null ? val : null,
        recordId: recId
      };
    }

    // Still ambiguous: do NOT arbitrarily pick one without flagging review
    return {
      value: null,
      recordId: null,
      isAmbiguousRecord: true,
      warning: `Multiple qualification records found for "${levelKey}". Review recommended to confirm degree selection.`
    };
  }

  // 5. Professional Profile Links & Skills
  if (category === 'professional') {
    if (sub === 'profileLinks') {
      const val = profile.professional?.profileLinks?.[prop];
      return { value: val !== undefined && val !== null ? val : null, recordId: null };
    }
    if (sub === 'skills') {
      const skills = profile.professional?.skills;
      return {
        value: Array.isArray(skills) && skills.length > 0 ? skills.join(', ') : null,
        recordId: null
      };
    }
  }

  return { value: null, recordId: null };
};

/**
 * Format and sanitize raw value according to field definition and constraints
 */
export const formatAndValidateValue = (value, fieldDef, field) => {
  if (value === null || value === undefined) {
    return { formattedValue: null, isValid: false, message: 'Value is empty or not set' };
  }

  const dt = fieldDef.dataType || 'string';

  // String values
  if (dt === 'string') {
    const strVal = String(value).trim();
    if (strVal.length === 0) {
      return { formattedValue: null, isValid: false, message: 'String value is empty' };
    }
    return validateDestination(strVal, field);
  }

  // Number values
  if (dt === 'number') {
    const num = Number(value);
    if (typeof value === 'boolean' || String(value).trim() === '' || !Number.isFinite(num)) {
      return { formattedValue: null, isValid: false, message: 'Invalid number format' };
    }
    if ((fieldDef.key.endsWith('.marksObtained') && num < 0) || (fieldDef.key.endsWith('.maxMarks') && num <= 0)) {
      return { formattedValue: null, isValid: false, message: 'The saved marks are outside the valid range.' };
    }

    // Percentage bounds check
    if (fieldDef.key.endsWith('.percentage')) {
      if (num < 0 || num > 100) {
        return { formattedValue: null, isValid: false, message: 'Saved percentage is outside the valid range (0–100).' };
      }
    }

    return validateDestination(num, field);
  }

  // Date values
  if (dt === 'date') {
    const dateStr = String(value).trim();
    return validateDestination(dateStr, field);
  }

  return { formattedValue: null, isValid: false, message: 'This value type needs manual review.' };
};

/**
 * Check if extracted field is explicitly unsupported for autofilling
 */
export const isUnsupportedField = (field) => {
  const type = (field.type || 'text').toLowerCase().trim();
  const unsupportedTypes = ['file', 'image', 'password', 'hidden', 'submit', 'button', 'reset', 'captcha', 'checkbox'];

  const originalType = field.constraints?.inputType;
  if (unsupportedTypes.includes(type) || !['text', 'email', 'tel', 'number', 'date', 'url', 'textarea', 'select', 'radio'].includes(type)
      || (originalType && !['text', 'search', 'email', 'tel', 'number', 'date', 'url', 'textarea', 'select', 'radio', 'month', 'week', 'time', 'datetime-local'].includes(originalType))) {
    return {
      unsupported: true,
      reason: `Field type "${type}" is unsupported for automated autofill`
    };
  }

  const label = (field.label || '').toLowerCase();
  const name = (field.name || '').toLowerCase();
  const combined = `${label} ${name} ${field.id || ''} ${field.placeholder || ''} ${field.section || ''}`.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/[_-]/g, ' ');

  if (/captcha|password|passcode|one time|verification|security code|\botp\b|\b(?:cvv|cvc|2fa|mfa)\b|credit.?card|debit.?card|card.?number|card.?holder|\bcc\b|expiry|expiration/.test(combined)) {
    return {
      unsupported: true,
      reason: 'Security and verification challenge fields cannot be automated'
    };
  }

  return { unsupported: false };
};

/**
 * Negative constraint check to prevent obvious semantic mismatches
 */
export const violatesNegativeGuards = (field, candidateKey) => {
  const label = (field.label || '').toLowerCase();
  const section = (field.section || '').toLowerCase();
  const combined = `${field.section || ''} ${field.label || ''} ${field.name || ''} ${field.id || ''} ${field.placeholder || ''}`.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/[_-]/g, ' ');
  if (/\b(parent|father|mother|guardian|spouse|emergency|referee|reference)\b/.test(combined)
      && (candidateKey.startsWith('contact.') || ['personal.fullName', 'personal.dateOfBirth', 'personal.gender'].includes(candidateKey))) return true;
  const percent = /percentage|percent|\bpct\b|%/.test(combined);
  const marks = /\bmarks?\b|\bscore\b/.test(combined);
  if (candidateKey.endsWith('.percentage') && marks && !percent) return true;
  if (/\.(marksObtained|maxMarks)$/.test(candidateKey) && (percent || /\b[sc]?gpa\b/.test(combined))) return true;
  if (candidateKey.endsWith('.marksObtained') && /\b(maximum|max|total|out of)\b/.test(combined)) return true;
  if (candidateKey.endsWith('.maxMarks') && /obtained|scored|secured/.test(combined)) return true;
  if (candidateKey.startsWith('education.') && /\bmarks?\b/.test(combined) && !percent && !/\.(marksObtained|maxMarks)$/.test(candidateKey)) return true;
  if (candidateKey.startsWith('education.10th') && /class\s*(12|xii)\b/.test(combined)) return true;
  if (candidateKey.startsWith('education.12th') && /class\s*(10|x)\b/.test(combined)) return true;
  if (candidateKey.startsWith('education.undergraduate') && /class\s*(10|12|x|xii)\b/.test(combined)) return true;

  // Father vs Mother vs Applicant
  if (candidateKey === 'personal.fatherName' && (combined.includes('mother') || combined.includes('guardian'))) {
    return true;
  }
  if (candidateKey === 'personal.motherName' && (combined.includes('father') || combined.includes('guardian'))) {
    return true;
  }
  if (candidateKey === 'personal.fullName' && (combined.includes('father') || combined.includes('mother') || combined.includes('guardian') || combined.includes('institute') || combined.includes('school') || combined.includes('college'))) {
    return true;
  }

  // Permanent vs Correspondence
  if (candidateKey.startsWith('addresses.permanent') && (combined.includes('correspondence') || combined.includes('present') || combined.includes('current address') || combined.includes('communication'))) {
    return true;
  }
  if (candidateKey.startsWith('addresses.correspondence') && combined.includes('permanent')) {
    return true;
  }

  // 10th vs 12th vs Graduation
  if (candidateKey.startsWith('education.10th') && (combined.includes('12th') || combined.includes('intermediate') || combined.includes('hsc') || combined.includes('graduation') || combined.includes('bachelor') || combined.includes('degree'))) {
    return true;
  }
  if (candidateKey.startsWith('education.12th') && (combined.includes('10th') || combined.includes('matric') || combined.includes('ssc') || combined.includes('graduation') || combined.includes('bachelor') || combined.includes('degree'))) {
    return true;
  }
  if (candidateKey.startsWith('education.undergraduate') && (combined.includes('10th') || combined.includes('matric') || combined.includes('12th') || combined.includes('intermediate'))) {
    return true;
  }

  // Percentage vs CGPA
  if (candidateKey.endsWith('.percentage') && combined.includes('cgpa') && !combined.includes('percentage') && !combined.includes('%')) {
    return true;
  }
  if (candidateKey.endsWith('.cgpa') && (combined.includes('percentage') || combined.includes('%')) && !combined.includes('cgpa')) {
    return true;
  }

  return false;
};

/**
 * Independent Validation Engine
 * Validates candidate mapping against canonical registry, user profile, and constraints.
 *
 * @param {Object} field Extracted form field metadata
 * @param {Object} candidate Best candidate match (from deterministic or ML)
 * @param {Object} profile User profile document/object
 * @param {Array} allCandidates Full ranked candidate list (for ambiguity detection)
 * @returns {Object} Final validated autofill decision
 */
export const validateCandidate = (field, candidate, profile, allCandidates = []) => {
  const fieldId = field.fieldId || field.name || field.id || 'unknown_field';

  // 1. Check unsupported
  const unsuppCheck = isUnsupportedField(field);
  if (unsuppCheck.unsupported) {
    return {
      fieldId,
      canonicalKey: null,
      value: null,
      status: 'unsupported',
      confidence: 0,
      method: null,
      reason: unsuppCheck.reason,
      needsReview: false
    };
  }

  // 2. If no candidate exists
  if (!candidate || !candidate.canonicalKey) {
    return {
      fieldId,
      canonicalKey: null,
      value: null,
      status: 'unmatched',
      confidence: 0,
      method: null,
      reason: 'No matching profile field found meeting confidence threshold',
      needsReview: false
    };
  }

  // 3. Verify canonical registry definition
  const fieldDef = getFieldByKey(candidate.canonicalKey);
  if (!fieldDef) {
    return {
      fieldId,
      canonicalKey: candidate.canonicalKey,
      value: null,
      status: 'unmatched',
      confidence: 0,
      method: candidate.method,
      reason: `Canonical key "${candidate.canonicalKey}" is not registered`,
      needsReview: true
    };
  }

  // 4. Verify Negative Guards
  if (violatesNegativeGuards(field, candidate.canonicalKey)) {
    return {
      fieldId,
      canonicalKey: null,
      value: null,
      status: 'unmatched',
      confidence: 0,
      method: candidate.method,
      reason: `Mapping to "${candidate.canonicalKey}" rejected due to conflicting context constraints`,
      needsReview: false
    };
  }

  // 5. Extract value from user profile
  const { value: rawVal, recordId: educationRecordId, warning, isAmbiguousRecord } = extractProfileValue(profile, candidate.canonicalKey, field);

  // 6. Check Ambiguity (if multiple ML candidates have very close scores)
  let isAmbiguous = false;
  let ambiguityReason = '';
  if (allCandidates.length >= 2 && candidate.method === 'semantic_embedding') {
    const top1 = allCandidates[0];
    const top2 = allCandidates[1];
    if (top1.score - top2.score < 0.05 && top2.score >= 0.50) {
      isAmbiguous = true;
      ambiguityReason = `Ambiguous semantic match: "${top1.canonicalKey}" (${(top1.score * 100).toFixed(0)}%) vs "${top2.canonicalKey}" (${(top2.score * 100).toFixed(0)}%)`;
    }
  }

  // 7. Format and validate the value
  const { formattedValue, displayValue, isValid, message: valMessage } = formatAndValidateValue(rawVal, fieldDef, field);

  // 8. Decide final status & confidence
  const isDeterministic = candidate.method.startsWith('deterministic');
  const baseConfidence = candidate.confidence || candidate.score || 0;

  // Case A: Ambiguous ML match
  if (isAmbiguous) {
    return {
      fieldId,
      canonicalKey: candidate.canonicalKey,
      value: formattedValue,
      displayValue,
      educationRecordId: educationRecordId || undefined,
      status: 'needs_review',
      confidence: Math.round(baseConfidence * 100) / 100,
      method: candidate.method,
      reason: ambiguityReason,
      needsReview: true
    };
  }

  // Case A2: Ambiguous multiple education records at same level
  if (isAmbiguousRecord) {
    return {
      fieldId,
      canonicalKey: candidate.canonicalKey,
      value: formattedValue,
      displayValue,
      educationRecordId: educationRecordId || undefined,
      status: 'needs_review',
      confidence: Math.round(baseConfidence * 100) / 100,
      method: candidate.method,
      reason: warning,
      needsReview: true
    };
  }

  // Case B: Value is missing in profile
  if (!isValid || formattedValue === null) {
    return {
      fieldId,
      canonicalKey: candidate.canonicalKey,
      value: null,
      educationRecordId: educationRecordId || undefined,
      status: 'needs_review',
      confidence: Math.round(baseConfidence * 100) / 100,
      method: candidate.method,
      reason: warning || valMessage || `Profile field "${candidate.canonicalKey}" is empty or not set in profile`,
      needsReview: true
    };
  }

  // Case C: Deterministic match with valid profile value -> MATCHED
  if (isDeterministic) {
    return {
      fieldId,
      canonicalKey: candidate.canonicalKey,
      value: formattedValue,
      displayValue,
      educationRecordId: educationRecordId || undefined,
      status: 'matched',
      confidence: Math.round(baseConfidence * 100) / 100,
      method: candidate.method,
      reason: candidate.reason || `Matched deterministically via ${candidate.method}`,
      needsReview: false
    };
  }

  // Similarity is not an accuracy probability; semantic suggestions always require review.
  if (candidate.method === 'semantic_embedding' && baseConfidence >= 0.80) {
    return {
      fieldId,
      canonicalKey: candidate.canonicalKey,
      value: formattedValue,
      displayValue,
      educationRecordId: educationRecordId || undefined,
      status: 'needs_review',
      confidence: Math.round(baseConfidence * 100) / 100,
      method: 'semantic_embedding',
      reason: candidate.explanation || `Matched via semantic similarity (${(baseConfidence * 100).toFixed(1)}%)`,
      needsReview: true // Semantic match always flags user review recommendation
    };
  }

  // Case E: Semantic match with moderate confidence (0.50 - 0.80) -> NEEDS_REVIEW
  if (candidate.method === 'semantic_embedding' && baseConfidence >= 0.50) {
    return {
      fieldId,
      canonicalKey: candidate.canonicalKey,
      value: formattedValue,
      displayValue,
      educationRecordId: educationRecordId || undefined,
      status: 'needs_review',
      confidence: Math.round(baseConfidence * 100) / 100,
      method: 'semantic_embedding',
      reason: `Moderate semantic similarity (${(baseConfidence * 100).toFixed(1)}%). Requires user verification.`,
      needsReview: true
    };
  }

  // Case F: Below acceptable threshold
  return {
    fieldId,
    canonicalKey: null,
    value: null,
    status: 'unmatched',
    confidence: Math.round(baseConfidence * 100) / 100,
    method: candidate.method,
    reason: `Candidate similarity (${(baseConfidence * 100).toFixed(1)}%) is below acceptable threshold`,
    needsReview: false
  };
};


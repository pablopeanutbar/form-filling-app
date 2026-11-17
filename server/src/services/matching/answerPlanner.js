import { calendarDate, derivations } from './derivations.js';
import { identifyField, normalizeIdentityText } from './fieldIdentity.js';
import { getFieldByKey } from './fieldRegistry.js';
import { extractProfileValue, formatAndValidateValue } from './validationEngine.js';

const relatedPerson = /\b(?:father|mother|parent|guardian|dependent|child|spouse|nominee|beneficiary|sibling|son|daughter)s?\b/;
const ageQuestion = /^(?:(?:applicant|candidate|student)(?: s)? )?(?:current age|age current(?: completed years)?|age|age in (?:completed )?years|completed years of age)(?: (?:as (?:of|on)|on|at)\b.*)?$/;
const months = 'january february march april may june july august september october november december'.split(' ');

function referenceDates(context) {
  const written = /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi;
  return context.replace(written, (_, day, month, year) =>
    `${year}-${String(months.indexOf(month.toLowerCase()) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`);
}

export function understandDerivedField(field, today = new Date().toISOString().slice(0, 10)) {
  const label = normalizeIdentityText(field.label);
  const context = [field.label, field.placeholder, field.section, field.context?.instructions, ...(field.context?.headings || [])].filter(Boolean).join(' ');
  if (ageQuestion.test(label)) {
    const identityContext = normalizeIdentityText([context, field.name, field.id].join(' '));
    if (relatedPerson.test(identityContext)) return null;
    if (/\b(?:ignore|override|disregard|system prompt)\b/i.test(context)) {
      return { review: 'Check the date the form uses to calculate age.' };
    }
    const dateContext = referenceDates(context);
    const dates = [...new Set(dateContext.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [])];
    const currentAnchor = /\b(?:as (?:of|on)|on) today\b/i;
    const cutoffMentioned = /\b(?:as (?:of|on)|cut\s*off|reference date|on|at|on the date|eligibility date)\b/i.test(context.replace(currentAnchor, ''));
    const hasOtherDate = /\b\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4}\b/.test(context.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ''));
    const explicitDate = /\b(?:as (?:of|on)|on|at|cut\s*off(?: date)?\s*:)\s+\d{4}-\d{2}-\d{2}\b/i.test(dateContext);
    const cutoff = dates.length === 1 && explicitDate && !hasOtherDate &&
      !/\b(?:or|whichever|earlier|later)\b/i.test(context) && calendarDate(dates[0]) ? dates[0] : null;
    if (!cutoff && (cutoffMentioned || dates.length || hasOtherDate || field.context?.instructions)) {
      return { review: 'Check the date the form uses to calculate age.' };
    }
    return { operation: 'age_from_dob', cutoff: cutoff || today,
      cloudReview: !/^(?:age|current age|age current(?: completed years)?|age in years)$/.test(label)
        && !currentAnchor.test(context) && !cutoff && !/\b(?:applicant|candidate|student)\b/.test(label) };
  }
  const key = identifyField(field)?.key;
  if (key === 'personal.birthYear') return { key, operation: 'birth_year' };
  if (key === 'personal.fullName') return { key, operation: 'full_name' };
  if (key === 'personal.middleInitial') return { key, operation: 'middle_initial' };
  if (key?.startsWith('education.') && key.endsWith('.percentage')) {
    const normalized = context.toLowerCase();
    if (/\b(?:cgpa|gpa|conversion|grading policy|weighted|equivalence)\b/.test(normalized)) return null;
    if (!/marks\s+(?:obtained|scored)\s*(?:\/|divided by|out of)\s*(?:maximum|total|max)\s+marks/i.test(context)) return null;
    const places = normalized.match(/\b([0-4]) decimal places?\b/);
    if (/round|decimal/.test(normalized) && !places) return { review: 'Check the form’s rounding instructions.' };
    return { key, operation: 'percentage_from_marks', decimals: places ? Number(places[1]) : undefined };
  }
  return null;
}

export function executeAnswerPlan(field, profile, plan, cloud = false) {
  if (!plan) return null;
  const review = (reason) => ({ fieldId: field.fieldId, canonicalKey: plan.key || null, value: null,
    status: 'needs_review', confidence: 0, method: 'derived', needsReview: true, reason });
  if (plan.review) return review(plan.review);
  if (plan.cloudReview && !cloud) return null;
  const operation = derivations[plan.operation];
  const supportedTypes = operation.outputType === 'number'
    ? ['text', 'number', 'select', 'radio'] : ['text', 'textarea', 'select', 'radio'];
  if (!supportedTypes.includes((field.type || 'text').toLowerCase())) return review('Check what this field accepts.');
  const education = plan.operation === 'percentage_from_marks';
  const prefix = education ? plan.key.slice(0, plan.key.lastIndexOf('.') + 1) : '';
  const sources = operation.sourceKeys.map((key) => extractProfileValue(profile, prefix + key, field));
  if (education && (!sources[0].recordId || sources.some(({ recordId }) => recordId !== sources[0].recordId))) return null;
  const value = operation.execute(sources.map((source) => source.value), plan);
  if (value == null) return null;
  const definition = getFieldByKey(plan.key) || { key: 'personal.age', dataType: operation.outputType };
  const checked = formatAndValidateValue(value, definition, field);
  if (!checked.isValid) return review(checked.message || 'Check what this field accepts.');
  return {
    fieldId: field.fieldId, canonicalKey: plan.key || null, value: checked.formattedValue,
    displayValue: checked.displayValue, educationRecordId: sources[0].recordId || undefined,
    status: cloud ? 'needs_review' : 'matched', confidence: 0, method: 'derived', needsReview: cloud,
    reason: operation.reason
  };
}

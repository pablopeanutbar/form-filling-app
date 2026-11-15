import { CANONICAL_FIELDS } from './fieldRegistry.js';

/**
 * Clean and normalize text strings for rule matching
 */
const clean = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Check if text contains whole phrase
 */
const hasPhrase = (text, phrase) => {
  if (!text || !phrase) return false;
  return ` ${text} `.includes(` ${phrase} `);
};

/**
 * Check if text contains any of the terms
 */
const hasAny = (text, terms) => {
  return terms.some((term) => hasPhrase(text, term));
};

/**
 * Deterministic (rule-based) field matcher.
 * Evaluates high-confidence explicit labels, attributes, and context constraints.
 *
 * @param {Object} field Extracted form field metadata
 * @returns {Object|null} Match result or null
 */
export const matchFieldDeterministically = (field) => {
  const label = clean(field.label);
  const name = clean(field.name);
  const id = clean(field.id);
  const placeholder = clean(field.placeholder);
  const section = clean(field.section);
  const type = (field.type || 'text').toLowerCase();

  const combined = `${section} ${label} ${name} ${id} ${placeholder}`.trim();

  // Helper to ensure target doesn't contain forbidden terms
  const notContains = (terms) => !terms.some((t) => hasPhrase(combined, t));

  // ----------------------------------------------------
  // 1. Personal Names (Distinguish Applicant, Parents, Institution)
  // ----------------------------------------------------
  if (hasPhrase(combined, 'father') && notContains(['mother', 'guardian', 'institution', 'college', 'school'])) {
    if (hasAny(combined, ['name', 'full name', 'father s name', 'name of father'])) {
      return {
        matched: true,
        canonicalKey: 'personal.fatherName',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: "Explicit mention of father's name with negative guards against applicant/mother"
      };
    }
  }

  if (hasPhrase(combined, 'mother') && notContains(['father', 'guardian', 'institution', 'college', 'school'])) {
    if (hasAny(combined, ['name', 'full name', 'mother s name', 'name of mother'])) {
      return {
        matched: true,
        canonicalKey: 'personal.motherName',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: "Explicit mention of mother's name with negative guards against applicant/father"
      };
    }
  }

  if (hasPhrase(combined, 'guardian') && notContains(['father', 'mother'])) {
    if (hasAny(combined, ['relation', 'relationship'])) {
      return {
        matched: true,
        canonicalKey: 'personal.guardianRelation',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: "Explicit guardian relationship field"
      };
    }
    if (hasAny(combined, ['name', 'guardian name', 'name of guardian'])) {
      return {
        matched: true,
        canonicalKey: 'personal.guardianName',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: "Explicit guardian full name field"
      };
    }
  }

  // Applicant Full Name (Must NEVER match parents or institutions)
  if (
    hasAny(label, [
      'full name',
      'applicant name',
      'candidate name',
      'name of applicant',
      'name of candidate',
      'name of the candidate',
      'candidate full name',
      'student name',
      'name in full',
      'your name'
    ]) ||
    ((hasPhrase(label, 'name') || name === 'name' || id === 'name') &&
      hasAny(section, ['personal', 'applicant', 'candidate', 'basic']) &&
      notContains(['father', 'mother', 'guardian', 'parent', 'school', 'college', 'university', 'institution', 'company']))
  ) {
    if (notContains(['father', 'mother', 'guardian', 'parent', 'school', 'college', 'university', 'institution', 'company'])) {
      return {
        matched: true,
        canonicalKey: 'personal.fullName',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Explicit applicant name indicator with strict parent/institution exclusion'
      };
    }
  }

  // ----------------------------------------------------
  // 2. Personal Attributes: Date of Birth & Gender
  // ----------------------------------------------------
  if (
    hasAny(label, ['date of birth', 'dob', 'birth date', 'birthdate', 'd o b']) ||
    hasAny(name, ['dob', 'date_of_birth', 'birthdate']) ||
    (type === 'date' && hasAny(label, ['birth', 'dob']))
  ) {
    return {
      matched: true,
      canonicalKey: 'personal.dateOfBirth',
      confidence: 1.0,
      method: 'deterministic_rule',
      reason: 'Explicit date of birth alias or date-type attribute'
    };
  }

  if (hasAny(label, ['gender', 'sex', 'applicant gender']) || hasAny(name, ['gender', 'sex'])) {
    return {
      matched: true,
      canonicalKey: 'personal.gender',
      confidence: 1.0,
      method: 'deterministic_rule',
      reason: 'Explicit gender / sex field indicator'
    };
  }

  // ----------------------------------------------------
  // 3. Contact Details: Email & Phone Numbers
  // ----------------------------------------------------
  if (
    type === 'email' ||
    hasAny(label, ['email', 'email address', 'e mail', 'contact email', 'candidate email', 'applicant email']) ||
    hasAny(name, ['email', 'user_email', 'contact_email'])
  ) {
    return {
      matched: true,
      canonicalKey: 'contact.contactEmail',
      confidence: 1.0,
      method: 'deterministic_rule',
      reason: 'Explicit email type or label keyword'
    };
  }

  // Alternate vs Primary Phone
  if (
    hasAny(combined, ['alternate', 'alternative', 'secondary', 'emergency']) &&
    hasAny(combined, ['phone', 'mobile', 'contact', 'telephone', 'cell', 'number'])
  ) {
    return {
      matched: true,
      canonicalKey: 'contact.alternatePhone',
      confidence: 1.0,
      method: 'deterministic_rule',
      reason: 'Secondary/alternate phone qualification detected'
    };
  }

  if (
    (type === 'tel' || hasAny(label, ['mobile', 'mobile number', 'phone number', 'primary phone', 'contact number', 'cell number'])) &&
    notContains(['alternate', 'secondary', 'emergency', 'father', 'mother', 'fax'])
  ) {
    return {
      matched: true,
      canonicalKey: 'contact.primaryPhone',
      confidence: 1.0,
      method: 'deterministic_rule',
      reason: 'Primary telephone/mobile field without alternate modifiers'
    };
  }

  // ----------------------------------------------------
  // 4. Addresses: Distinguish Permanent vs Correspondence
  // ----------------------------------------------------
  const isPermanent =
    hasPhrase(section, 'permanent') ||
    hasPhrase(label, 'permanent') ||
    hasPhrase(name, 'permanent') ||
    hasPhrase(id, 'perm');

  const isCorrespondence =
    hasAny(section, ['correspondence', 'current', 'communication', 'present', 'mailing']) ||
    hasAny(label, ['correspondence', 'current', 'communication', 'present', 'mailing']) ||
    hasAny(name, ['correspondence', 'current', 'communication', 'present']) ||
    hasAny(id, ['corr', 'pres', 'curr']);

  if (isPermanent && !isCorrespondence) {
    if (hasAny(combined, ['pincode', 'pin code', 'postal code', 'zip code', 'zip'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.permanent.postalCode',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Permanent address postal code indicator'
      };
    }
    if (hasAny(label, ['city', 'town']) && notContains(['district', 'state'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.permanent.city',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Permanent address city indicator'
      };
    }
    if (hasPhrase(label, 'district') && notContains(['city', 'state'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.permanent.district',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Permanent address district indicator'
      };
    }
    if (hasAny(label, ['state', 'province'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.permanent.state',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Permanent address state indicator'
      };
    }
    if (hasAny(label, ['country', 'nation'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.permanent.country',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Permanent address country indicator'
      };
    }
    if (hasAny(label, ['address line 1', 'street address', 'address line', 'permanent address', 'house no'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.permanent.addressLine1',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Permanent address street / line 1 indicator'
      };
    }
  }

  if (isCorrespondence && !isPermanent) {
    if (hasAny(combined, ['pincode', 'pin code', 'postal code', 'zip code', 'zip'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.correspondence.postalCode',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Correspondence address postal code indicator'
      };
    }
    if (hasAny(label, ['city', 'town']) && notContains(['district', 'state'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.correspondence.city',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Correspondence address city indicator'
      };
    }
    if (hasPhrase(label, 'district') && notContains(['city', 'state'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.correspondence.district',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Correspondence address district indicator'
      };
    }
    if (hasAny(label, ['state', 'province'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.correspondence.state',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Correspondence address state indicator'
      };
    }
    if (hasAny(label, ['country', 'nation'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.correspondence.country',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Correspondence address country indicator'
      };
    }
    if (hasAny(label, ['address line 1', 'street address', 'current address', 'mailing address', 'present address'])) {
      return {
        matched: true,
        canonicalKey: 'addresses.correspondence.addressLine1',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Correspondence address street / line 1 indicator'
      };
    }
  }

  // ----------------------------------------------------
  // 5. Educational Qualifications (Level & Metric Disambiguation)
  // ----------------------------------------------------
  const is10th =
    hasAny(combined, ['10th', 'matric', 'matriculation', 'ssc', 'class 10', 'class x', 'secondary school']) &&
    notContains(['12th', 'hsc', 'graduation', 'undergraduate', 'postgraduate']);

  const is12th =
    hasAny(combined, ['12th', 'intermediate', 'hsc', '10 2', 'class 12', 'class xii', 'higher secondary']) &&
    notContains(['10th', 'matric', 'graduation', 'undergraduate', 'postgraduate']);

  const isUndergrad =
    hasAny(combined, ['graduation', 'undergraduate', 'ug', 'bachelor', 'b tech', 'b e', 'b sc', 'b com', 'b a', 'degree']) &&
    notContains(['10th', '12th', 'master', 'postgraduate', 'pg']);

  // Class 10 Matches
  if (is10th) {
    if ((hasAny(combined, ['percentage', 'percent', 'marks percentage', 'marks', 'pct', 'score']) || (field.label && field.label.includes('%'))) && notContains(['cgpa', 'gpa', 'total marks', 'max marks', 'maximum marks'])) {
      return {
        matched: true,
        canonicalKey: 'education.10th.percentage',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Class 10 specific percentage field'
      };
    }
    if (hasAny(combined, ['board', 'board of education'])) {
      return {
        matched: true,
        canonicalKey: 'education.10th.boardOrUniversity',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Class 10 specific educational board'
      };
    }
    if (hasAny(combined, ['school', 'institution', 'school name'])) {
      return {
        matched: true,
        canonicalKey: 'education.10th.institution',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Class 10 school/institution name'
      };
    }
    if (hasAny(combined, ['passing year', 'year of passing', 'completion year'])) {
      return {
        matched: true,
        canonicalKey: 'education.10th.passingYear',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Class 10 year of passing'
      };
    }
  }

  // Class 12 Matches
  if (is12th) {
    if ((hasAny(combined, ['percentage', 'percent', 'marks percentage', 'marks', 'pct', 'score']) || (field.label && field.label.includes('%'))) && notContains(['cgpa', 'gpa', 'total marks', 'max marks', 'maximum marks'])) {
      return {
        matched: true,
        canonicalKey: 'education.12th.percentage',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Class 12 specific percentage field'
      };
    }
    if (hasAny(combined, ['board', 'board of education'])) {
      return {
        matched: true,
        canonicalKey: 'education.12th.boardOrUniversity',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Class 12 specific educational board'
      };
    }
    if (hasAny(combined, ['school', 'junior college', 'institution', 'college name'])) {
      return {
        matched: true,
        canonicalKey: 'education.12th.institution',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Class 12 school/junior college name'
      };
    }
    if (hasAny(combined, ['passing year', 'year of passing', 'completion year'])) {
      return {
        matched: true,
        canonicalKey: 'education.12th.passingYear',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Class 12 year of passing'
      };
    }
  }

  // Undergraduate Matches
  if (isUndergrad) {
    // Distinguish CGPA from Percentage explicitly
    if (hasAny(combined, ['cgpa', 'gpa', 'cumulative grade point']) && notContains(['percentage', 'percent'])) {
      if (hasAny(combined, ['scale', 'out of', 'max cgpa'])) {
        return {
          matched: true,
          canonicalKey: 'education.undergraduate.cgpaScale',
          confidence: 1.0,
          method: 'deterministic_rule',
          reason: 'Undergraduate CGPA grading scale'
        };
      }
      return {
        matched: true,
        canonicalKey: 'education.undergraduate.cgpa',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Undergraduate CGPA field (distinct from percentage)'
      };
    }

    if ((hasAny(combined, ['percentage', 'percent', 'aggregate percentage', 'marks', 'pct']) || (field.label && field.label.includes('%'))) && notContains(['cgpa', 'gpa', 'total marks', 'max marks', 'maximum marks'])) {
      return {
        matched: true,
        canonicalKey: 'education.undergraduate.percentage',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Undergraduate aggregate percentage field (distinct from CGPA)'
      };
    }

    if (hasAny(combined, ['degree name', 'graduation degree', 'bachelor degree', 'degree in', 'qualifying degree', 'degree', 'course of study', 'degree course', 'course name', 'name of degree'])) {
      return {
        matched: true,
        canonicalKey: 'education.undergraduate.degreeName',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Undergraduate degree title'
      };
    }

    if (hasAny(combined, ['college', 'college name', 'institute', 'institute name', 'institution'])) {
      return {
        matched: true,
        canonicalKey: 'education.undergraduate.institution',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Undergraduate college / institute name'
      };
    }

    if (hasAny(combined, ['university', 'university name', 'affiliating university'])) {
      return {
        matched: true,
        canonicalKey: 'education.undergraduate.boardOrUniversity',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Undergraduate university name'
      };
    }

    if (hasAny(combined, ['branch', 'specialization', 'stream', 'discipline', 'major'])) {
      return {
        matched: true,
        canonicalKey: 'education.undergraduate.specialization',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Undergraduate branch/specialization'
      };
    }

    if (hasAny(combined, ['passing year', 'year of passing', 'graduation year'])) {
      return {
        matched: true,
        canonicalKey: 'education.undergraduate.passingYear',
        confidence: 1.0,
        method: 'deterministic_rule',
        reason: 'Undergraduate year of passing'
      };
    }
  }

  // ----------------------------------------------------
  // 6. Professional Links (URLs)
  // ----------------------------------------------------
  if (hasPhrase(combined, 'linkedin')) {
    return {
      matched: true,
      canonicalKey: 'professional.profileLinks.linkedin',
      confidence: 1.0,
      method: 'deterministic_rule',
      reason: 'LinkedIn profile link'
    };
  }
  if (hasPhrase(combined, 'github')) {
    return {
      matched: true,
      canonicalKey: 'professional.profileLinks.github',
      confidence: 1.0,
      method: 'deterministic_rule',
      reason: 'GitHub profile link'
    };
  }
  if (hasPhrase(combined, 'portfolio') || (type === 'url' && hasPhrase(combined, 'website'))) {
    return {
      matched: true,
      canonicalKey: 'professional.profileLinks.portfolio',
      confidence: 1.0,
      method: 'deterministic_rule',
      reason: 'Personal website/portfolio link'
    };
  }

  // ----------------------------------------------------
  // 7. Direct Registry Alias Match (Exact match against registry aliases)
  // ----------------------------------------------------
  for (const fieldDef of CANONICAL_FIELDS) {
    if (fieldDef.aliases.some((alias) => clean(alias) === label)) {
      return {
        matched: true,
        canonicalKey: fieldDef.key,
        confidence: 0.98,
        method: 'deterministic_alias',
        reason: `Exact match against canonical alias: "${label}"`
      };
    }
  }

  return { matched: false };
};


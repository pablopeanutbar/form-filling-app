export function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value && date.getUTCFullYear() > 0 ? date : null;
}

export const derivations = {
  age_from_dob: {
    sourceKeys: ['personal.dateOfBirth'], outputType: 'number',
    meaning: 'Applicant age in completed calendar years today or on a specified cutoff date',
    execute([dob], { cutoff }) {
      const birth = calendarDate(dob);
      const reference = calendarDate(cutoff);
      if (!birth || !reference || birth > reference) return null;
      const age = reference.getUTCFullYear() - birth.getUTCFullYear()
        - Number(cutoff.slice(5) < dob.slice(5));
      return age <= 125 ? age : null;
    },
    reason: 'Calculated from your date of birth.'
  },
  birth_year: {
    sourceKeys: ['personal.dateOfBirth'], outputType: 'number',
    meaning: 'Calendar year of birth derived from the applicant date of birth',
    execute: ([dob]) => calendarDate(dob)?.getUTCFullYear() ?? null,
    reason: 'Taken from your date of birth.'
  },
  full_name: {
    sourceKeys: ['personal.firstName', 'personal.middleName', 'personal.lastName'], outputType: 'string',
    meaning: 'Applicant complete name assembled from saved first middle and last names',
    execute([first, middle, last]) {
      if (!first?.trim() || !last?.trim()) return null;
      return [first, middle, last].filter((part) => part?.trim()).map((part) => part.trim()).join(' ');
    },
    reason: 'Combined from your saved name components.'
  },
  middle_initial: {
    sourceKeys: ['personal.middleName'], outputType: 'string',
    meaning: 'First letter of the applicant middle name',
    execute([middle]) {
      const name = middle?.trim();
      return /^\p{L}[\p{L}\p{M}]*$/u.test(name || '') ? Array.from(name)[0] : null;
    },
    reason: 'Taken from your saved middle name.'
  },
  percentage_from_marks: {
    sourceKeys: ['marksObtained', 'maxMarks'], outputType: 'number',
    meaning: 'Qualification percentage calculated from marks obtained divided by maximum marks',
    execute([obtained, maximum], { decimals }) {
      if (![obtained, maximum].every(Number.isFinite) || maximum <= 0 || obtained < 0 || obtained > maximum) return null;
      const percentage = obtained / maximum * 100;
      if (decimals !== undefined) return Number(percentage.toFixed(decimals));
      const rounded = Math.round(percentage * 100) / 100;
      return Math.abs(rounded - percentage) < 1e-10 ? rounded : null;
    },
    reason: 'Calculated from marks saved for this qualification.'
  }
};

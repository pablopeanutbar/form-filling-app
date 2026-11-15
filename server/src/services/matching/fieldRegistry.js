/**
 * Canonical Field Registry for formER
 * Defines the controlled vocabulary of supported profile fields, their semantic descriptions,
 * data types, aliases, and contextual constraints for deterministic and ML matching.
 */

export const CANONICAL_FIELDS = [
  // ==========================================
  // Personal Information
  // ==========================================
  {
    key: 'personal.fullName',
    label: 'Applicant Full Name',
    category: 'personal',
    dataType: 'string',
    description: 'The legal full name of the applicant, candidate, or student',
    aliases: [
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
    ],
    contextConstraints: {
      excludedTerms: ['father', 'mother', 'guardian', 'parent', 'spouse', 'school', 'college', 'university', 'institution', 'company'],
      sectionHints: ['personal', 'applicant details', 'candidate details', 'basic info']
    }
  },
  {
    key: 'personal.dateOfBirth',
    label: 'Date of Birth',
    category: 'personal',
    dataType: 'date',
    description: 'Applicant date of birth in calendar day, month, and year',
    aliases: [
      'date of birth',
      'dob',
      'birth date',
      'birthdate',
      'd.o.b',
      'applicant dob'
    ],
    contextConstraints: {
      sectionHints: ['personal', 'basic details']
    }
  },
  {
    key: 'personal.gender',
    label: 'Gender',
    category: 'personal',
    dataType: 'string',
    description: 'Applicant gender or sex',
    aliases: [
      'gender',
      'sex',
      'applicant gender'
    ],
    contextConstraints: {
      allowedValues: ['male', 'female', 'other', 'prefer_not_to_say']
    }
  },
  {
    key: 'personal.fatherName',
    label: "Father's Full Name",
    category: 'personal',
    dataType: 'string',
    description: "The legal full name of the applicant's father",
    aliases: [
      "father's name",
      'father name',
      'fathers name',
      "father's full name",
      'name of father',
      "parent's name - father"
    ],
    contextConstraints: {
      requiredTerms: ['father'],
      excludedTerms: ['mother', 'guardian', 'institution']
    }
  },
  {
    key: 'personal.motherName',
    label: "Mother's Full Name",
    category: 'personal',
    dataType: 'string',
    description: "The legal full name of the applicant's mother",
    aliases: [
      "mother's name",
      'mother name',
      'mothers name',
      "mother's full name",
      'name of mother',
      "parent's name - mother"
    ],
    contextConstraints: {
      requiredTerms: ['mother'],
      excludedTerms: ['father', 'guardian', 'institution']
    }
  },
  {
    key: 'personal.guardianName',
    label: "Guardian's Name",
    category: 'personal',
    dataType: 'string',
    description: "The full name of the applicant's legal guardian if applicable",
    aliases: [
      "guardian's name",
      'guardian name',
      'guardians name',
      'name of guardian'
    ],
    contextConstraints: {
      requiredTerms: ['guardian'],
      excludedTerms: ['father', 'mother']
    }
  },
  {
    key: 'personal.guardianRelation',
    label: 'Guardian Relationship',
    category: 'personal',
    dataType: 'string',
    description: 'Relationship of the legal guardian to the applicant',
    aliases: [
      'guardian relation',
      'relationship with guardian',
      'guardian relationship',
      'relation with applicant'
    ],
    contextConstraints: {
      requiredTerms: ['guardian', 'relation']
    }
  },

  // ==========================================
  // Contact Information
  // ==========================================
  {
    key: 'contact.contactEmail',
    label: 'Contact Email Address',
    category: 'contact',
    dataType: 'string',
    description: 'Primary email address for communications and correspondence',
    aliases: [
      'email',
      'email address',
      'e-mail',
      'contact email',
      'candidate email',
      'applicant email',
      'registered email'
    ],
    contextConstraints: {
      inputType: 'email'
    }
  },
  {
    key: 'contact.primaryPhone',
    label: 'Primary Mobile Number',
    category: 'contact',
    dataType: 'string',
    description: 'Primary telephone or mobile number of the applicant',
    aliases: [
      'mobile number',
      'phone number',
      'primary phone',
      'mobile',
      'contact number',
      'cell number',
      'telephone number',
      'whatsapp number'
    ],
    contextConstraints: {
      inputType: 'tel',
      excludedTerms: ['alternate', 'secondary', 'parent', 'father', 'mother', 'fax']
    }
  },
  {
    key: 'contact.alternatePhone',
    label: 'Alternate Contact Number',
    category: 'contact',
    dataType: 'string',
    description: 'Secondary or alternate mobile or telephone number',
    aliases: [
      'alternate mobile',
      'alternate phone',
      'secondary phone',
      'alternate contact number',
      'emergency contact number',
      'alternative mobile number'
    ],
    contextConstraints: {
      requiredTerms: ['alternate', 'alternative', 'secondary', 'emergency']
    }
  },

  // ==========================================
  // Permanent Address
  // ==========================================
  {
    key: 'addresses.permanent.addressLine1',
    label: 'Permanent Address Line 1',
    category: 'addresses',
    dataType: 'string',
    description: 'Primary address line (house/flat number, building, street) of permanent domicile',
    aliases: [
      'permanent address',
      'permanent address line 1',
      'permanent street address',
      'permanent residential address'
    ],
    contextConstraints: {
      addressType: 'permanent'
    }
  },
  {
    key: 'addresses.permanent.city',
    label: 'Permanent Address City',
    category: 'addresses',
    dataType: 'string',
    description: 'City or town of the permanent domicile',
    aliases: [
      'permanent city',
      'permanent town',
      'city (permanent)',
      'city of permanent residence'
    ],
    contextConstraints: {
      addressType: 'permanent'
    }
  },
  {
    key: 'addresses.permanent.district',
    label: 'Permanent Address District',
    category: 'addresses',
    dataType: 'string',
    description: 'District or county of the permanent domicile',
    aliases: [
      'permanent district',
      'district (permanent)',
      'district of permanent residence'
    ],
    contextConstraints: {
      addressType: 'permanent'
    }
  },
  {
    key: 'addresses.permanent.state',
    label: 'Permanent Address State / Province',
    category: 'addresses',
    dataType: 'string',
    description: 'State or province of the permanent domicile',
    aliases: [
      'permanent state',
      'state (permanent)',
      'state of permanent residence',
      'permanent province'
    ],
    contextConstraints: {
      addressType: 'permanent'
    }
  },
  {
    key: 'addresses.permanent.country',
    label: 'Permanent Address Country',
    category: 'addresses',
    dataType: 'string',
    description: 'Country of the permanent domicile',
    aliases: [
      'permanent country',
      'country (permanent)',
      'nationality country'
    ],
    contextConstraints: {
      addressType: 'permanent'
    }
  },
  {
    key: 'addresses.permanent.postalCode',
    label: 'Permanent Address PIN / Postal Code',
    category: 'addresses',
    dataType: 'string',
    description: 'Postal code or PIN code of permanent residence',
    aliases: [
      'permanent pincode',
      'permanent pin code',
      'permanent postal code',
      'permanent zip code',
      'pincode (permanent)'
    ],
    contextConstraints: {
      addressType: 'permanent'
    }
  },

  // ==========================================
  // Correspondence Address
  // ==========================================
  {
    key: 'addresses.correspondence.addressLine1',
    label: 'Correspondence / Current Address Line 1',
    category: 'addresses',
    dataType: 'string',
    description: 'Primary street address for mailing, correspondence, or current living address',
    aliases: [
      'correspondence address',
      'current address',
      'mailing address',
      'communication address',
      'present address',
      'address for communication'
    ],
    contextConstraints: {
      addressType: 'correspondence'
    }
  },
  {
    key: 'addresses.correspondence.city',
    label: 'Correspondence Address City',
    category: 'addresses',
    dataType: 'string',
    description: 'City or town of the correspondence or present living address',
    aliases: [
      'current city',
      'correspondence city',
      'present city',
      'city for communication'
    ],
    contextConstraints: {
      addressType: 'correspondence'
    }
  },
  {
    key: 'addresses.correspondence.district',
    label: 'Correspondence Address District',
    category: 'addresses',
    dataType: 'string',
    description: 'District of the correspondence or present living address',
    aliases: [
      'current district',
      'correspondence district',
      'present district'
    ],
    contextConstraints: {
      addressType: 'correspondence'
    }
  },
  {
    key: 'addresses.correspondence.state',
    label: 'Correspondence Address State / Province',
    category: 'addresses',
    dataType: 'string',
    description: 'State or province of the correspondence or present living address',
    aliases: [
      'current state',
      'correspondence state',
      'present state',
      'state of communication'
    ],
    contextConstraints: {
      addressType: 'correspondence'
    }
  },
  {
    key: 'addresses.correspondence.country',
    label: 'Correspondence Address Country',
    category: 'addresses',
    dataType: 'string',
    description: 'Country of the correspondence or present living address',
    aliases: [
      'current country',
      'correspondence country',
      'present country'
    ],
    contextConstraints: {
      addressType: 'correspondence'
    }
  },
  {
    key: 'addresses.correspondence.postalCode',
    label: 'Correspondence Address PIN / Postal Code',
    category: 'addresses',
    dataType: 'string',
    description: 'Postal code or PIN code of correspondence or current living address',
    aliases: [
      'current pincode',
      'current postal code',
      'correspondence pincode',
      'mailing pin code',
      'present postal code',
      'communication pin code'
    ],
    contextConstraints: {
      addressType: 'correspondence'
    }
  },

  // ==========================================
  // Educational Qualifications — Class 10 (Secondary)
  // ==========================================
  {
    key: 'education.10th.percentage',
    label: 'Class 10 Percentage',
    category: 'education',
    dataType: 'number',
    description: 'Percentage scored in Class 10, Matriculation, or Secondary School Certificate examination',
    aliases: [
      '10th percentage',
      'class 10 percentage',
      'matric percentage',
      'matriculation percentage',
      'ssc percentage',
      '10th standard percentage',
      '10th %',
      'class x percentage'
    ],
    contextConstraints: {
      qualificationLevel: '10th',
      scoreType: 'percentage',
      excludedTerms: ['12th', 'graduation', 'degree', 'cgpa', 'college']
    }
  },
  {
    key: 'education.10th.boardOrUniversity',
    label: 'Class 10 Board',
    category: 'education',
    dataType: 'string',
    description: 'Board of education for Class 10 (e.g., CBSE, ICSE, State Board)',
    aliases: [
      '10th board',
      'class 10 board',
      'matric board',
      'ssc board',
      'board of class 10',
      '10th education board'
    ],
    contextConstraints: {
      qualificationLevel: '10th',
      excludedTerms: ['12th', 'graduation', 'degree']
    }
  },
  {
    key: 'education.10th.institution',
    label: 'Class 10 School Name',
    category: 'education',
    dataType: 'string',
    description: 'Name of the school attended for Class 10 examination',
    aliases: [
      '10th school name',
      'class 10 school',
      '10th institution',
      'matric school name',
      'high school name'
    ],
    contextConstraints: {
      qualificationLevel: '10th'
    }
  },
  {
    key: 'education.10th.passingYear',
    label: 'Class 10 Passing Year',
    category: 'education',
    dataType: 'number',
    description: 'Year of passing the Class 10 or Matriculation examination',
    aliases: [
      '10th passing year',
      'class 10 year of passing',
      'year of passing 10th',
      'matric passing year'
    ],
    contextConstraints: {
      qualificationLevel: '10th'
    }
  },

  // ==========================================
  // Educational Qualifications — Class 12 (Higher Secondary)
  // ==========================================
  {
    key: 'education.12th.percentage',
    label: 'Class 12 Percentage',
    category: 'education',
    dataType: 'number',
    description: 'Percentage scored in Class 12, Intermediate, or Higher Secondary Certificate examination',
    aliases: [
      '12th percentage',
      'class 12 percentage',
      'intermediate percentage',
      'hsc percentage',
      '10+2 percentage',
      '12th standard percentage',
      '12th %',
      'class xii percentage'
    ],
    contextConstraints: {
      qualificationLevel: '12th',
      scoreType: 'percentage',
      excludedTerms: ['10th', 'graduation', 'degree', 'cgpa', 'college']
    }
  },
  {
    key: 'education.12th.boardOrUniversity',
    label: 'Class 12 Board',
    category: 'education',
    dataType: 'string',
    description: 'Board of education for Class 12 (e.g., CBSE, ISC, State Board)',
    aliases: [
      '12th board',
      'class 12 board',
      'intermediate board',
      'hsc board',
      '10+2 board'
    ],
    contextConstraints: {
      qualificationLevel: '12th',
      excludedTerms: ['10th', 'graduation', 'degree']
    }
  },
  {
    key: 'education.12th.institution',
    label: 'Class 12 School / Junior College Name',
    category: 'education',
    dataType: 'string',
    description: 'Name of the school or junior college attended for Class 12 examination',
    aliases: [
      '12th school name',
      'class 12 school',
      '12th college name',
      'intermediate college name',
      'junior college name'
    ],
    contextConstraints: {
      qualificationLevel: '12th'
    }
  },
  {
    key: 'education.12th.passingYear',
    label: 'Class 12 Passing Year',
    category: 'education',
    dataType: 'number',
    description: 'Year of passing the Class 12 or Intermediate examination',
    aliases: [
      '12th passing year',
      'class 12 year of passing',
      'year of passing 12th',
      'intermediate passing year'
    ],
    contextConstraints: {
      qualificationLevel: '12th'
    }
  },

  // ==========================================
  // Educational Qualifications — Undergraduate (Graduation)
  // ==========================================
  {
    key: 'education.undergraduate.degreeName',
    label: 'Graduation Degree Name',
    category: 'education',
    dataType: 'string',
    description: 'Name of the undergraduate degree (e.g., B.Tech, B.Sc, B.Com, B.A)',
    aliases: [
      'graduation degree',
      'undergraduate degree',
      'degree name',
      'ug degree',
      'bachelor degree',
      'name of graduation degree',
      'qualifying degree'
    ],
    contextConstraints: {
      qualificationLevel: 'undergraduate',
      excludedTerms: ['10th', '12th', 'master', 'postgraduate']
    }
  },
  {
    key: 'education.undergraduate.institution',
    label: 'Graduation College / Institute Name',
    category: 'education',
    dataType: 'string',
    description: 'Name of the college or institute where undergraduate studies were completed',
    aliases: [
      'graduation college',
      'undergraduate college',
      'college name',
      'institute name',
      'graduation institution',
      'ug college name'
    ],
    contextConstraints: {
      qualificationLevel: 'undergraduate',
      excludedTerms: ['school', '10th', '12th']
    }
  },
  {
    key: 'education.undergraduate.boardOrUniversity',
    label: 'Graduation University Name',
    category: 'education',
    dataType: 'string',
    description: 'Name of the university affiliating or conferring the undergraduate degree',
    aliases: [
      'graduation university',
      'undergraduate university',
      'university name',
      'affiliating university',
      'ug university'
    ],
    contextConstraints: {
      qualificationLevel: 'undergraduate',
      excludedTerms: ['school', '10th', '12th', 'board']
    }
  },
  {
    key: 'education.undergraduate.specialization',
    label: 'Graduation Specialization / Branch',
    category: 'education',
    dataType: 'string',
    description: 'Academic branch or major field of study during graduation',
    aliases: [
      'graduation branch',
      'graduation specialization',
      'branch of study',
      'undergraduate major',
      'stream in graduation',
      'ug discipline'
    ],
    contextConstraints: {
      qualificationLevel: 'undergraduate'
    }
  },
  {
    key: 'education.undergraduate.percentage',
    label: 'Graduation Aggregate Percentage',
    category: 'education',
    dataType: 'number',
    description: 'Overall aggregate percentage marks obtained in undergraduate degree',
    aliases: [
      'graduation percentage',
      'degree percentage',
      'undergraduate percentage',
      'aggregate percentage in graduation',
      'ug percentage',
      'bachelor percentage'
    ],
    contextConstraints: {
      qualificationLevel: 'undergraduate',
      scoreType: 'percentage',
      excludedTerms: ['10th', '12th', 'cgpa', 'gpa']
    }
  },
  {
    key: 'education.undergraduate.cgpa',
    label: 'Graduation CGPA / GPA',
    category: 'education',
    dataType: 'number',
    description: 'Cumulative Grade Point Average obtained in undergraduate degree',
    aliases: [
      'graduation cgpa',
      'undergraduate cgpa',
      'degree cgpa',
      'cgpa in graduation',
      'ug cgpa',
      'cumulative grade point average'
    ],
    contextConstraints: {
      qualificationLevel: 'undergraduate',
      scoreType: 'cgpa',
      excludedTerms: ['10th', '12th', 'percentage', '%']
    }
  },
  {
    key: 'education.undergraduate.cgpaScale',
    label: 'Graduation CGPA Scale',
    category: 'education',
    dataType: 'number',
    description: 'Maximum scale for graduation CGPA (e.g., 10.0 or 4.0)',
    aliases: [
      'cgpa scale',
      'grading scale',
      'out of cgpa',
      'max cgpa'
    ],
    contextConstraints: {
      qualificationLevel: 'undergraduate'
    }
  },
  {
    key: 'education.undergraduate.passingYear',
    label: 'Graduation Passing Year',
    category: 'education',
    dataType: 'number',
    description: 'Year of completion or passing of the undergraduate degree',
    aliases: [
      'graduation passing year',
      'year of graduation',
      'undergraduate completion year',
      'ug passing year'
    ],
    contextConstraints: {
      qualificationLevel: 'undergraduate'
    }
  },

  // ==========================================
  // Professional Information
  // ==========================================
  {
    key: 'professional.profileLinks.linkedin',
    label: 'LinkedIn Profile URL',
    category: 'professional',
    dataType: 'string',
    description: 'Web URL link to the applicant LinkedIn profile',
    aliases: [
      'linkedin',
      'linkedin url',
      'linkedin profile',
      'linkedin link'
    ],
    contextConstraints: {
      inputType: 'url'
    }
  },
  {
    key: 'professional.profileLinks.github',
    label: 'GitHub Profile URL',
    category: 'professional',
    dataType: 'string',
    description: 'Web URL link to the applicant GitHub profile',
    aliases: [
      'github',
      'github url',
      'github profile',
      'github link'
    ],
    contextConstraints: {
      inputType: 'url'
    }
  },
  {
    key: 'professional.profileLinks.portfolio',
    label: 'Personal Portfolio URL',
    category: 'professional',
    dataType: 'string',
    description: 'Web URL link to personal website, portfolio, or CV site',
    aliases: [
      'portfolio',
      'portfolio url',
      'personal website',
      'website url'
    ],
    contextConstraints: {
      inputType: 'url'
    }
  }
];

/**
 * Get all canonical registry entries
 */
export const getRegistry = () => CANONICAL_FIELDS;

/**
 * Find canonical entry by key
 */
export const getFieldByKey = (key) => CANONICAL_FIELDS.find((f) => f.key === key);

/**
 * Get canonical fields filtered by category
 */
export const getFieldsByCategory = (category) =>
  CANONICAL_FIELDS.filter((f) => f.category === category);


# Contextual form audit

The audit used the original `former_contextual_reasoning_test.html` from the desktop. All 31 extracted IDs matched the brief. The separate answer key could not be located. The expected identities and intentional blanks came from the brief, and both profiles used independently chosen fictional values. No live database or account was accessed.

The harness ran the content extractor, request schema, Mongoose profile model, matcher, shared popup controller and DOM writer in JSDOM. A local message bridge stood in for Chrome transport and authenticated HTTP. The popup initiated Fill All Matched. “Selected” means the popup sent a fill proposal; it does not describe the user's original run. Every filled field returned a verified `filled` result and emitted both `input` and `change`. The focused extension tests separately exercise trusted worker routing and manual selection.

| Run | Correct fills | Incorrect fills | Correct abstentions | Eligible misses |
| --- | ---: | ---: | ---: | ---: |
| Before fixes, complete | 19 | 0 | 6 | 6 |
| After fixes, complete | 25 | 0 | 6 | 0 |
| Before fixes, incomplete | 6 | 0 | 23 | 2 |
| After fixes, incomplete | 8 | 0 | 23 | 0 |

The reported manual result of 8 fills is separate from the controlled baseline. Its saved values, decisions and selection history were unavailable, so the audit cannot assign causes to that historical run.

## All 31 fields

The last two outcome columns list source presence, final classification, popup selection and DOM result for each synthetic profile. A dash in the DOM result means no write was attempted. For every row in both final runs, MiniLM was skipped, Gemini eligibility was empty, Gemini was never invoked, and there was no Gemini key or operation. The “Direct candidate” column lists the deterministic key considered or records that the direct route was blocked. The “Derivation” column records the operation attempted. The harness emits the raw decision reasons and these stage markers without saved values.

| HTML ID | Extracted label and section | Expected identity | Direct candidate | Derivation | Complete profile | Incomplete profile | Finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `app-given` | First Name · Section 01Applicant information | personal.firstName | `personal.firstName` | — | Yes / Ready / selected / filled | Yes / Ready / selected / filled | Passed both runs |
| `app-family` | Last Name · Section 01Applicant information | personal.lastName | `personal.lastName` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `app-full` | Full Name · Section 01Applicant information | personal.fullName | `personal.fullName` | `full_name` | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `app-middleinitial` | Middle Initial · Section 01Applicant information | middle_initial | `personal.middleInitial` | `middle_initial` | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `app-dob` | Date of Birth · Section 01Applicant information | personal.dateOfBirth | `personal.dateOfBirth` | — | Yes / Ready / selected / filled | Yes / Ready / selected / filled | Passed both runs |
| `app-birthyear` | Birth Year · Section 01Applicant information | birth_year | `personal.birthYear` | `birth_year` | Yes / Ready / selected / filled | Yes / Ready / selected / filled | Passed both runs |
| `app-age` | Age (current, completed years) · Section 01Applicant information | age_from_dob | Direct blocked | `age_from_dob` | Yes / Ready / selected / filled | Yes / Ready / selected / filled | Current-age wording and ‘as of today’ were missed |
| `app-age-cutoff` | Age as on 01 July 2026 · Section 01Applicant information | age_from_dob | Direct blocked | `age_from_dob` | Yes / Ready / selected / filled | Yes / Ready / selected / filled | Passed both runs |
| `father-full` | Full Name · Section 02Parent and guardian details / Father's details | personal.fatherName | `personal.fatherName` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Umbrella family heading masked explicit father scope |
| `father-age` | Age · Section 02Parent and guardian details / Father's details | father age | Direct blocked | — | No / unmatched / unselected / — | No / unmatched / unselected / — | No saved father DOB or age |
| `mother-full` | Full Name · Section 02Parent and guardian details / Mother's details | personal.motherName | `personal.motherName` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Umbrella family heading masked explicit mother scope |
| `mother-phone` | Phone Number · Section 02Parent and guardian details / Mother's details | mother phone | Direct blocked | — | No / unmatched / unselected / — | No / unmatched / unselected / — | No separate saved mother phone |
| `hsc-score` | Aggregate Score (%) · Section 03Higher secondary examination (Class XII) | education.12th.percentage | `education.12th.percentage` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `hsc-passing` | Year of Passing · Section 03Higher secondary examination (Class XII) | education.12th.passingYear | `education.12th.passingYear` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `hsc-board` | Examining Board · Section 03Higher secondary examination (Class XII) | education.12th.boardOrUniversity | `education.12th.boardOrUniversity` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `hsc-roll` | Roll Number · Section 03Higher secondary examination (Class XII) | exam roll number | Direct blocked | — | No / unmatched / unselected / — | No / unmatched / unselected / — | No saved roll number. Previously considered alternate phone |
| `ug-score` | Aggregate Score (%) · Section 04Undergraduate / graduation examination | education.undergraduate.percentage | `education.undergraduate.percentage` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `ug-passing` | Year of Passing · Section 04Undergraduate / graduation examination | education.undergraduate.passingYear | `education.undergraduate.passingYear` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `ug-degree` | Degree Awarded · Section 04Undergraduate / graduation examination | education.undergraduate.degreeName | `education.undergraduate.degreeName` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `ug-university` | Awarding University · Section 04Undergraduate / graduation examination | education.undergraduate.boardOrUniversity | `education.undergraduate.boardOrUniversity` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `qualifying-degree` | Qualifying Examination · Section 05Programme eligibility | education.undergraduate.degreeName | `education.undergraduate.degreeName` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Old match lacked proof of qualification completion |
| `qualifying-percentage` | Percentage Obtained · Section 05Programme eligibility | education.undergraduate.percentage | `education.undergraduate.percentage` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Linked eligibility rule was ignored |
| `permanent-line` | Address Line 1 · Section 06Contact addresses / Permanent address | addresses.permanent.addressLine1 | `addresses.permanent.addressLine1` | — | Yes / Ready / selected / filled | Yes / Ready / selected / filled | Passed both runs |
| `permanent-city` | City · Section 06Contact addresses / Permanent address | addresses.permanent.city | `addresses.permanent.city` | — | Yes / Ready / selected / filled | Yes / Ready / selected / filled | Passed both runs |
| `permanent-pin` | PIN Code · Section 06Contact addresses / Permanent address | addresses.permanent.postalCode | `addresses.permanent.postalCode` | — | Yes / Ready / selected / filled | Yes / Ready / selected / filled | Valid digit-count pattern was rejected |
| `postal-line` | Address Line 1 · Section 06Contact addresses / Correspondence address | addresses.correspondence.addressLine1 | `addresses.correspondence.addressLine1` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `postal-city` | City · Section 06Contact addresses / Correspondence address | addresses.correspondence.city | `addresses.correspondence.city` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Source absent in incomplete fixture |
| `postal-pin` | PIN Code · Section 06Contact addresses / Correspondence address | addresses.correspondence.postalCode | `addresses.correspondence.postalCode` | — | Yes / Ready / selected / filled | No / Needs review / unselected / — | Valid digit-count pattern was rejected |
| `barred-exam` | Have you ever been debarred from an examination? · Section 07Additional declarations | disciplinary declaration | Direct blocked | — | No / unmatched / unselected / — | No / unmatched / unselected / — | No saved declaration. Previously considered applicant surname |
| `application-number` | Official Application Number · Section 07Additional declarations | official application number | Direct blocked | — | No / unmatched / unselected / — | No / unmatched / unselected / — | No official number. Previously suggested applicant surname for review |
| `family-income` | Annual Family Income (INR) · Section 07Additional declarations | verified family income | Direct blocked | — | No / unmatched / unselected / — | No / unmatched / unselected / — | No verified income. Previously considered applicant surname |

## Root causes by stage

- **Extraction and identity.** The closest subsection was missing on sibling-heading layouts. The broad parent-and-guardian legend then overrode the specific father or mother identity. The final relationship guard duplicated the broader interpretation and rejected the two correct keys. Specific local evidence now resolves the role while contradictory specific roles still abstain.
- **Answer planning.** The current-age parser did not recognize the form's “current, completed years” wording or distinguish “as of today” from a cutoff. The decision now uses today's calendar date for explicit current age and the linked fixed date when a cutoff is specified.
- **Qualification resolution.** The degree fell through to a legacy alias and the percentage was blocked on missing level. Both now use explicitly linked eligibility rules. An instruction requiring completion uses passed records only, and ambiguous records still abstain. Class XII and undergraduate fields already had correct Mongoose and registry paths.
- **Destination validation.** The postal-code matcher and saved strings were correct. The validator rejected every HTML pattern, including the six-digit PIN pattern. It now interprets bounded ASCII digit-count patterns and preserves leading zeros. Arbitrary patterns still require manual handling, and the DOM writer independently checks browser validity.
- **Semantic routing.** Roll number, official application number, family income and the disciplinary declaration reached MiniLM before the fix. The complete fixture surfaced an unrelated surname on the application-number field, but Fill All did not select it. Those unsupported identities now abstain before retrieval and cloud routing.
- **Selection and writing.** The controlled audit found no lost ready proposals. Fill All submitted each ready result, skipped unresolved fields, and confirmed all writes after the fixes. Missing saved details stayed blank. No identity was added to the profile schema.

Re-run from the repository root in PowerShell:

```powershell
$env:FORMER_AUDIT_ASSERT = 'true'
node server/tests/contextual-form-audit.js "$env:USERPROFILE/Desktop/former_contextual_reasoning_test.html"
```

# formER — Development Progress Tracking

## Current Development Milestone
**Milestone 4: Intelligent Field Matching Engine (Completed & Verified)**

---

## 1. Milestone Status: Intelligent Field Matching Engine

### Status: Complete & Verified
The hybrid form-field understanding and matching engine has been implemented and verified. It maps extracted online form fields to canonical profile fields using a multi-stage pipeline: deterministic rule-based matching with negative guards, local sentence embedding inference via MiniLM (`@huggingface/transformers`), an independent validation and decision engine, and an authenticated REST API.

### Completed Features:

#### Part 1 — Canonical Field Registry (`server/src/services/matching/fieldRegistry.js`):
- Controlled vocabulary defining 44 canonical profile fields across Personal, Contact, Permanent Address, Correspondence Address, Education (10th, 12th, Undergraduate), and Professional categories.
- Each registry entry specifies:
  - Canonical dotted key (e.g., `personal.fullName`, `education.undergraduate.cgpa`, `addresses.permanent.postalCode`)
  - Human-readable name & semantic description
  - Data type (`string`, `number`, `date`, `url`)
  - Curated aliases for synonym expansion
  - Negative context constraints and section hints to guard against semantic confusion.

#### Part 2 — Deterministic Matching (`server/src/services/matching/deterministicMatcher.js`):
- High-confidence rule-based matching analyzing field labels, IDs, names, placeholders, input types, and section context.
- Negative guards prevent false-positive matching:
  - Applicant name vs. Father's name vs. Mother's name vs. Institution/School/College name.
  - Permanent address vs. Correspondence/Mailing address.
  - Class 10th percentage vs. Class 12th percentage vs. Undergraduate aggregate percentage vs. CGPA.
  - URL profile links (LinkedIn, GitHub, Portfolio).

#### Part 3 — Local MiniLM Integration (`server/src/services/matching/semanticMatcher.js`):
- Embedded local sentence-transformers inference using `@huggingface/transformers` (`Xenova/all-MiniLM-L6-v2`) in Node.js ES Modules without requiring Python or microservices.
- Safe concurrent singleton initialization ensuring the ONNX model is loaded once into memory and reused across requests.
- Canonical registry embeddings pre-computed and cached in-memory (384-dimensional normalized vectors).
- High-performance batch inference (`rankCandidatesBatch`) for multi-field forms.
- Normalized vector dot product calculates exact cosine similarity.
- Fallback resilience: Model loading and inference errors are caught gracefully and routed to fallback/unmatched decisions without crashing the server.

#### Part 4 — Independent Validation & Decision Engine (`server/src/services/matching/validationEngine.js`):
- Decouples similarity scores from autofill eligibility. Never approves a mapping solely based on high cosine similarity.
- Enforces 4 standard decision states:
  - `matched`: Verified mapping with profile data present; autofill safe.
  - `needs_review`: Flagged for user confirmation when:
    - Profile field is empty or unset.
    - Semantic match ambiguity exists (top candidates within 0.05 score delta).
    - ML-only match without deterministic verification (flags review recommendation).
    - Metric distinction (e.g., percentage requested but only CGPA present; refuses arbitrary percentage derivation).
  - `unmatched`: No candidate meets confidence thresholds or violates negative guards.
  - `unsupported`: Security challenges (CAPTCHA, OTP), file uploads (resumes, signatures), or password fields safely flagged as unsupportable.
- Preserves qualification context: Educational fields return the associated subdocument `educationRecordId`.

#### Part 5 — Matching Orchestration Service (`server/src/services/matching/matching.service.js`):
- Cohesive multi-stage pipeline:
  1. Unsupported field detection.
  2. Deterministic rule evaluation.
  3. Batch semantic embedding ranking for remaining ambiguous fields.
  4. Independent validation, profile value extraction, and formatting.
  5. Aggregates results and diagnostic summary metrics (`totalFields`, `matched`, `needsReview`, `unmatched`, `unsupported`).

#### Part 6 — Authenticated REST API (`server/src/routes/autofill.routes.js`):
- `POST /api/v1/autofill/match`:
  - Protected with session authentication (`requireAuth`) and double-submit CSRF cookie protection.
  - Validates request payload via Zod (`validateMatchRequest`) with batch bounds (1 to 100 fields).
  - Automatically loads authenticated user's canonical profile.
  - Returns structured array of match recommendations with diagnostic metadata.

---

## 2. Modified & Created Files

### Created Files:
- `server/src/services/matching/fieldRegistry.js`: Canonical registry of 44 supported fields and semantic metadata.
- `server/src/services/matching/deterministicMatcher.js`: Rule-based deterministic field matcher with negative guards.
- `server/src/services/matching/semanticMatcher.js`: Local MiniLM inference service, embedding cache, and candidate ranking.
- `server/src/services/matching/validationEngine.js`: Independent validation engine, value extraction, and decision logic.
- `server/src/services/matching/matching.service.js`: Form-field matching pipeline orchestrator.
- `server/src/validators/autofill.validator.js`: Zod schema and validation middleware for `/api/v1/autofill/match`.
- `server/src/controllers/autofill.controller.js`: Controller handling matching requests.
- `server/src/routes/autofill.routes.js`: Express router mounting `/api/v1/autofill/match`.
- `server/tests/matching.test.js`: Comprehensive 12-scenario test suite verifying precision, MiniLM inference, negative guards, abstention, and REST API.

### Modified Files:
- `server/src/routes/index.js`: Mounted `autofillRoutes` at `/api/v1/autofill`.
- `server/src/middleware/csrf.middleware.js`: Fixed destructuring of `generateToken` from `csrf-csrf`.
- `server/src/controllers/auth.controller.js`: Enabled overwrite mode in `getCsrfToken` to prevent session-identifier mismatch on CSRF re-fetch.
- `server/package.json`: Added `tests/matching.test.js` to `npm test` script.

---

## 3. Verified Test Results

Executed complete automated test suite (`npm test`):
- **Total Test Suites**: 6
- **Total Tests**: 44
- **Passed**: 44
- **Failed**: 0
- **Duration**: ~8.5s

### Verified Scenarios:
1. `health.test.js` (4 tests): Liveness, readiness, 404, Helmet security headers.
2. `error.test.js` (3 tests): Error formatting, status codes, production message masking.
3. `db.test.js` (2 tests): Connection success and unreachable host diagnostic reporting.
4. `auth.test.js` (11 tests): Registration, Argon2id hashing, login, logout, session regeneration, CSRF, rate limiting.
5. `profile.test.js` (12 tests): Profile retrieval, auto-initialization, partial updates, addresses, education CRUD, isolation, injection protection, optional field clearing.
6. `matching.test.js` (12 tests):
   - Canonical registry definitions, categories, and types.
   - Deterministic matching for applicant name, father's name, mother's name, with strict exclusion of institutions.
   - Permanent vs. correspondence address postal codes and cities.
   - Disambiguation of 10th percentage, 12th percentage, graduation degree, and CGPA.
   - Real local MiniLM inference embedding text and ranking semantic candidates.
   - Validation engine producing `matched` status when data exists.
   - Safe abstention: `needs_review` when profile value is missing.
   - Safe abstention: refusing automatic CGPA-to-percentage conversion without verified formula.
   - Unsupported field detection for file uploads, passwords, and security challenges.
   - End-to-end pipeline orchestration with diagnostic summary.
   - Unauthorized access rejection (HTTP 401) on `POST /api/v1/autofill/match`.
   - Full authenticated autofill match integration with real database profile and education record ID preservation.

---

## 4. Known Issues & Limitations
- **External AI Fallback (Gemini)**: Not yet implemented (planned for Stage 3 LLM reasoning fallback when confidence is ambiguous).
- **Chrome Extension & Frontend Client**: Not yet implemented.
- **Dynamic Field Types**: Dropdowns (`<select>`) and radio buttons currently match value options to canonical values via string equality; fuzzy option mapping will be enhanced with client-side extension feedback.

---

## 5. Next Recommended Implementation Step
**Milestone 5: Chrome Extension (Manifest V3) or Gemini LLM Reasoning Fallback**
- Implement Chrome Extension form field detection, context extraction, authenticated backend communication, and user review UI.
- Or implement Stage 3 Gemini Reasoning fallback for ambiguous fields before browser automation.

---

## 4. Canonical Field Mappings for AI/ML Readiness

The schema was constructed with predictable keys directly matching future MiniLM matching targets:
- `personal.fullName`
- `personal.dateOfBirth`
- `personal.gender`
- `personal.fatherName`
- `personal.motherName`
- `contact.primaryPhone`
- `contact.alternatePhone`
- `contact.contactEmail`
- `addresses.permanent.addressLine1`
- `addresses.permanent.city`
- `addresses.permanent.state`
- `addresses.permanent.postalCode`
- `addresses.correspondence.addressLine1`
- `addresses.correspondence.city`
- `addresses.correspondence.state`
- `addresses.correspondence.postalCode`
- `education[id].qualificationLevel`
- `education[id].degreeName`
- `education[id].institution`
- `education[id].boardOrUniversity`
- `education[id].percentage`
- `education[id].cgpa`
- `education[id].passingYear`

---

## 5. Next Recommended Implementation Step
- **Milestone 4: React Application & Account Workflows**
  - Initialize React + Vite frontend inside `client/` using Tailwind CSS.
  - Build authentication UI (Registration, Login, Protected route guard).
  - Build Profile Management Dashboard (Personal, Contact, Address, and Education editors).
  - Integrate CSRF token fetching and session-authenticated API communication.

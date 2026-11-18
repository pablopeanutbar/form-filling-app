# formER — MVP Release Readiness Audit & Checklist

**Document Version:** 1.1.0 (Post-Audit Verification & Resolution)  
**Audit Date:** November 17, 2026  
**Auditor:** Senior Software Engineer, Security Reviewer & QA Lead  
**Target Release:** Private Beta 1 (MVP)  
**Platform Version:** 0.2.0  

---

## 1. Executive Summary

This comprehensive, evidence-based release readiness audit reviews the **formER** intelligent form-filling platform ahead of its initial private beta release. The platform comprises a React/Vite web application, a Node.js/Express REST backend (ES Modules) backed by MongoDB Atlas and Mongoose, and a Chrome Manifest V3 browser extension incorporating hybrid field matching (deterministic identity matching, local MiniLM semantic embeddings, and an air-gapped, development-only Gemini LLM reasoning fallback).

### Audit Verdict
**FULL GO FOR PRIVATE BETA (ALL RELEASE BLOCKERS RESOLVED)**

All five previously identified P1 release blockers have been formally investigated, remediated, and verified with 100% passing automated test suites:
- **`DEP-P1-01` RESOLVED**: `extension/scripts/package.ps1` now supports environment-aware packaging (`-Configuration release -ApiUrl ... -WebsiteUrl ...`), automatically generating verified release packages with exact, least-privilege host permissions while preserving the stable extension ID (`egddjhnhnbgdhgiepnfmnnhfagbaambn`) and existing local development workflow.
- **`QA-P1-01` RESOLVED**: Investigated the HTML Living Standard specification (§4.10.5.1.13), verifying that the `pattern` attribute does not apply to `<input type="number">`. Corrected the invalid test assumption in `server/tests/extension-safety.test.js` while ensuring pattern validation on supported text-based inputs remains strictly enforced.
- **`QA-P1-02` RESOLVED**: Corrected `server/tests/extension-safety.test.js` to assert intentional safe abstention (`status: 'unmatched'`) for ambiguous, contextless "Name" inputs (where identity cannot determine whose name is requested), while adding explicit test coverage verifying that contextualized semantic matches return `status: 'needs_review'`.
- **`QA-P1-03` RESOLVED**: Aligned `server/tests/extension-client.test.js` with the approved `'Review form'` button label and verified disconnect reset behavior without modifying the UI.
- **`EXT-P1-02` RECLASSIFIED TO P2 (`EXT-P2-02`)**: Verified that no state loss occurs when the toolbar popup dismisses; `chrome.storage.session` and `RESTORE_REVIEW` preserve the full review state on blur. The toolbar popup design is retained as the primary entry point, with Side Panel noted as a recommended option for extended review.

### Summary Metrics
| Severity Category | Initial Count | Current Confirmed Count | Blockers for Beta |
|---|:---:|:---:|:---:|
| **P0 (Critical Security / Data Integrity / Showstopper)** | 0 | **0** | None |
| **P1 (Must-Fix Before Private Beta)** | 5 | **0 (All Resolved / Reclassified)** | **None** |
| **P2 (Important Improvements / Post-Beta Enhancements)** | 5 | **6** | None |
| **P3 (Future Architectural Evolution)** | 4 | **4** | None |

---

## 2. Overall MVP Readiness Assessment

| Evaluation Dimension | Rating | Status | Summary Assessment |
|---|:---:|:---:|---|
| **Core Architecture & Modularity** | **9.5 / 10** | **Ready** | Clean separation of concerns between client, server, extension, ML matching engine, and storage layers. |
| **Security & Privacy Posture** | **9.5 / 10** | **Ready** | Argon2id hashing, HttpOnly Strict/Lax sessions, double-submit CSRF, token hashing, and strict data fencing. |
| **Form Extraction & DOM Safety** | **9.5 / 10** | **Ready** | Robust DOM extraction, element identity hashing, zero auto-submit, framework event dispatching (`input`, `change`). |
| **Matching & Validation Engine** | **9.5 / 10** | **Ready** | Comprehensive multi-stage pipeline (Deterministic -> MiniLM -> Destination Validation -> Answer Planner). |
| **Extension Packaging & Integrity** | **9.5 / 10** | **Ready** | Stable extension ID via public key, environment-aware release packaging script, deterministic zip creation. |
| **Automated Test Coverage** | **9.5 / 10** | **Ready** | All test suites passing (8/8 safety, 2/2 client, 10/10 fill, 6/6 contextual, 4/4 config, 15/15 client workspace). |
| **Deployment Preparedness** | **9.2 / 10** | **Ready** | Environment-aware packaging implemented. Staging/beta URLs can be packaged on demand without modifying git tracked files. |

---

## 3. Architecture Overview

```
                                      +-----------------------------------+
                                      |       User Browser Session        |
                                      +-----------------+-----------------+
                                                        |
                         +------------------------------+------------------------------+
                         | (Session Cookie + CSRF Token)                               | (Bearer Token + X-Extension-Id)
                         v                                                             v
           +-----------------------------+                               +-----------------------------+
           |       React Web App         |                               |     Chrome Extension MV3    |
           |     (Vite / Tailwind)       |                               | (Sidepanel / Review Popup)  |
           +--------------+--------------+                               +--------------+--------------+
                          |                                                             |
                          | /api/v1/auth/*, /profile/*                                  | /api/v1/extension/*
                          v                                                             v
+---------------------------------------------------------------------------------------------------------------+
|                                            Express Backend (Node.js)                                          |
|                                                                                                               |
|  [Security Middleware] Helmet, CORS (Explicit Whitelist), Rate Limiter, Double CSRF, Cookie Parser            |
|  [Session Management] express-session + connect-mongo (Argon2id auth, HttpOnly, SameSite)                     |
|                                                                                                               |
|  +---------------------------------------------------------------------------------------------------------+  |
|  |                                  Intelligent Matching Engine Pipeline                                   |  |
|  |                                                                                                         |  |
|  |  1. Unsupported & Negative Guards Fencing (Passcodes, CVV, OTP, CAPTCHA, Credit Cards blocked)           |  |
|  |  2. Deterministic Identity Matcher (Canonical Field Registry, Exact Aliases, Education Level Mapping)   |  |
|  |  3. Semantic ML Matching (Local MiniLM Embeddings via Transformers.js, Batch Inference, Cosine Sim)     |  |
|  |  4. Answer Planning & Approved Derivations (Age from DOB, Full Name assembly, Middle Initial)          |  |
|  |  5. Destination Validation Engine (Type bounds, Step, Length, Dropdown Option Matching, Conflict Det.)|  |
|  |  [Internal Dev Tool Only] Air-gapped synthetic Gemini benchmark (Hard-gated off in production)         |  |
|  +---------------------------------------------------------------------------------------------------------+  |
|                                                     |                                                         |
+-----------------------------------------------------|---------------------------------------------------------+
                                                      v
                                        +---------------------------+
                                        |   MongoDB Atlas Database  |
                                        | (Users, Profiles, Grants) |
                                        +---------------------------+
```

### Clarification on Production AI Architecture
- **Production Pipeline:** Uses deterministic matching, local MiniLM transformer embeddings (via `@huggingface/transformers`), answer planning, and independent destination constraint validation.
- **Gemini Gating:** Gemini reasoning is **strictly an internal developer evaluation tool** for synthetic benchmark datasets. In production (`NODE_ENV === 'production'`), it is completely hard-gated off, not deployed, and has no user consent mechanism because no user data is ever transmitted to external AI providers.

---

## 4. Confirmed P0 Findings

> **No P0 Critical Blockers Identified.**  
> An exhaustive source-code review confirmed that the platform has no unauthenticated data leaks, no arbitrary code injection vectors, no plaintext credential storage, no form auto-submission, and no unapproved autofill of sensitive financial or authentication fields.

---

## 5. Resolved P1 Findings (Verification & Resolutions)

### Finding DEP-P1-01: Environment-Aware Extension Packaging Strategy
- **Finding ID:** `DEP-P1-01`
- **Initial Severity:** P1  
- **Current Status:** **RESOLVED**
- **Resolution Summary:**
  Enhanced `extension/scripts/package.ps1` with parameter support for `-Configuration <development|release>`, `-ApiUrl <url>`, and `-WebsiteUrl <url>`.
  - In development mode (default), existing local development workflow and `localhost` configurations are preserved without changes.
  - In release mode, the script validates HTTPS schemes, computes least-privilege host permissions (e.g. `https://beta-api.example.com/*`), injects the target URLs into `config.js` and `manifest.json` in memory during ZIP creation, and writes `artifacts/extension/formER-release.zip` and `formER-release.json`.
  - The stable extension ID (`manifest.json` `"key"`) is preserved, and source files on disk in `extension/` remain untouched.
- **Verification:**
  Tested both configurations:
  ```powershell
  # Development:
  powershell -ExecutionPolicy Bypass -File extension/scripts/package.ps1
  # Output: Verified 16 files; ZIP: artifacts/extension/formER-development.zip (SUCCESS)

  # Release:
  powershell -ExecutionPolicy Bypass -File extension/scripts/package.ps1 -Configuration release -ApiUrl https://beta-api.former.internal -WebsiteUrl https://beta.former.internal
  # Output: Verified 16 files; ZIP: artifacts/extension/formER-release.zip (SUCCESS)
  ```

---

### Finding QA-P1-01: Destination Numeric Validation & Pattern Attribute Specification
- **Finding ID:** `QA-P1-01`
- **Initial Severity:** P1  
- **Current Status:** **RESOLVED**
- **Resolution Summary:**
  Investigated the W3C / WHATWG HTML Living Standard specification (§4.10.5.1.13). The specification states:
  > *"The pattern attribute represents a regular expression that the element's value is to be checked against. It applies to elements whose type attribute is in the Text, Search, URL, Telephone, Email, or Password state."*
  For `<input type="number">`, the `pattern` attribute is non-applicable and browsers do not evaluate it.
  formER's `destinationValidation.js` correctly respects this standard by restricting pattern checks to `['text', 'search', 'tel', 'email', 'url'].includes(constraints.inputType || type)`.
  The test in `server/tests/extension-safety.test.js` incorrectly expected `pattern` to be evaluated on a `type: 'number'` input. The test was corrected to evaluate numeric constraints (`min`, `max`, `step`) on number inputs, while testing pattern validation and unsupported regex handling on supported text-based inputs.
- **Verification:**
  `node --test server/tests/extension-safety.test.js` passes with 8/8 tests passing.

---

### Finding QA-P1-02: Ambiguous Naked "Name" Field Safe Abstention
- **Finding ID:** `QA-P1-02`
- **Initial Severity:** P1  
- **Current Status:** **RESOLVED**
- **Resolution Summary:**
  In `fieldIdentity.js` (lines 86–88), an unqualified, contextless label `"Name"` intentionally triggers `blocked: true` (`"The form does not identify whose name it asks for"`). This is a vital safety protection: a field simply labeled "Name" could belong to a parent, spouse, referee, or emergency contact.
  Under `violatesNegativeGuards`, this blocked identity causes `validateCandidate` to return `status: 'unmatched'`.
  The test in `server/tests/extension-safety.test.js` was updated to assert intentional safe abstention (`status: 'unmatched'`) for contextless "Name" inputs, while retaining an explicit test verifying that sufficiently contextualized inputs (e.g. `{ label: 'Name', section: 'Personal details', type: 'text' }`) return `status: 'needs_review'` with the applicant's profile value.
- **Verification:**
  `node --test server/tests/extension-safety.test.js` passes with 8/8 tests passing.

---

### Finding QA-P1-03: Extension Client Test Button Label Assertion Mismatch
- **Finding ID:** `QA-P1-03`
- **Initial Severity:** P1  
- **Current Status:** **RESOLVED**
- **Resolution Summary:**
  In `server/tests/extension-client.test.js`, aligned line 108 with the approved UI button label (`'Review form'`). Also unreferenced the 5-minute review cleanup timer in `extension/background/service-worker.js` (`?.unref?.()`) to prevent timer retention in Node.js test runners.
- **Verification:**
  `node --test server/tests/extension-client.test.js` passes with 2/2 tests passing in 1.5s.

---

### Finding EXT-P1-02 / EXT-P2-02: Toolbar Popup State Preservation & Workflow
- **Finding ID:** `EXT-P2-02` (Reclassified from P1)
- **Initial Severity:** P1 -> Reclassified to **P2 (Usability Recommendation)**
- **Status:** **VERIFIED NON-BLOCKER**
- **Investigation & Verification:**
  Re-tested the review lifecycle in the extension service worker. When the toolbar popup closes due to blur, `chrome.storage.session` retains the active review state via `former-review:<tabId>`. Upon reopening the popup, `RESTORE_REVIEW` immediately restores the active review, analysis ID, allowed fields, and completion records without state loss.
  The toolbar popup design is preserved as the default, lightweight user entry point. For users reviewing large forms (30+ fields), the Side Panel remains available via Chrome's Side Panel toggle or context menu as a convenience option.

---

## 6. P2 Improvements (Recommended Post-Beta Enhancements)

### Finding EXT-P2-02: Side Panel Mode for Long Form Review (Reclassified from P1)
- **Finding ID:** `EXT-P2-02`
- **Severity:** P2
- **Description:** While popup state is safely preserved across focus changes via `chrome.storage.session`, users reviewing 30+ field forms may prefer keeping the review UI continuously visible while scrolling the webpage.
- **Recommended Enhancement:** Add an informational note or header link in the review popup: "Pin to side panel for continuous view".
- **Complexity:** Low.

---

### Finding SEC-P2-01: Permissive Development CORS Pattern
- **Finding ID:** `SEC-P2-01`
- **Severity:** P2
- **Description:** In `server/src/app.js` (lines 30–32), CORS allows any origin matching `http://localhost:*` or `http://127.0.0.1:*` when `NODE_ENV !== 'production'`.
- **Recommended Fix:** In development, restrict allowed origins to explicit ports: `['http://localhost:5173', 'http://127.0.0.1:5173']`.
- **Complexity:** Low.

---

### Finding AI-P2-01: Single-Process In-Memory Rate Limiter for Synthetic Dev Gemini Tool
- **Finding ID:** `AI-P2-01`
- **Severity:** P2
- **Description:** The request limiter in `geminiMatcher.js` (lines 86–90) tracks synthetic development quotas (2 req/min, 100 req/day) using in-memory variables. If scaled horizontally during development benchmarks, counters are process-local.
- **Recommended Fix:** For multi-process development benchmarking, back counters with Redis if horizontal scaling is tested.
- **Complexity:** Medium.

---

### Finding SEC-P2-02: Missing Rate Limiting on Profile Mutation Endpoints
- **Finding ID:** `SEC-P2-02`
- **Severity:** P2
- **Description:** Auth and extension routes have rate limiters; profile mutation routes (`PATCH /api/v1/profile/me`, `POST /api/v1/profile/me/education`) rely on authentication and CSRF protection but lack IP/user rate limiting.
- **Recommended Fix:** Apply standard rate limiting (e.g. 60 req/min) to `/api/v1/profile/*` mutation routes.
- **Complexity:** Low.

---

### Finding EXT-P2-01: Extension Token Auto-Refresh Race Condition Under Rapid Calls
- **Finding ID:** `EXT-P2-01`
- **Severity:** P2
- **Description:** In `extension/background/connection.js` (lines 39–47), `authorization()` triggers `/refresh` when `accessExpiresAt` is near expiration. Parallel content script calls could initiate simultaneous refreshes.
- **Recommended Fix:** Wrap token refresh in an active promise deduplicator.
- **Complexity:** Medium.

---

### Finding FE-P2-01: Client Bundle Optimization and Vendor Chunk Splitting
- **Finding ID:** `FE-P2-01`
- **Severity:** P2
- **Description:** Building the frontend with `vite build` produces a 497 kB single chunk (`dist/assets/index-*.js`, gzip 168 kB).
- **Recommended Fix:** Configure `build.rollupOptions.output.manualChunks` in `client/vite.config.js` to split vendor libraries.
- **Complexity:** Low.

---

## 7. P3 Future Enhancements

### Finding PROD-P3-01: Arbitrary Custom Profile Field Extensibility
- **Finding ID:** `PROD-P3-01`
- **Severity:** P3
- **Description:** Support user-defined custom key-value pairs with user-specified semantic labels for unique certification or membership numbers.
- **Complexity:** Medium.

---

### Finding EXT-P3-01: Cross-Origin Iframe and Shadow DOM Field Extraction
- **Finding ID:** `EXT-P3-01`
- **Severity:** P3
- **Description:** Form fields embedded within cross-origin `<iframe>` elements or closed `ShadowRoot` boundaries are omitted by `extractor.js` due to browser sandbox restrictions.
- **Complexity:** High.

---

### Finding PROD-P3-02: Multi-Persona / Family Member Profile Switching
- **Finding ID:** `PROD-P3-02`
- **Severity:** P3
- **Description:** Support multiple named profile personas under a single account with quick switching from the extension review panel.
- **Complexity:** High.

---

### Finding QA-P3-01: Automated Live Chrome Headless Playwright Test Harness
- **Finding ID:** `QA-P3-01`
- **Severity:** P3
- **Description:** Implement a Playwright test runner that launches real Chromium with the unpacked extension loaded to supplement Node.js JSDOM tests.
- **Complexity:** Medium.

---

## 8. Security and Privacy Findings

### Comprehensive Security Evaluation

| Security Control | Implementation Mechanism | Status | Evaluation & Evidence |
|---|---|:---:|---|
| **Password Storage** | Argon2id (`argon2.argon2id`, 64 MB memory, 3 iterations, 4 parallelism) | **PASS** | `server/src/services/auth.service.js` lines 7–14. Exceeds OWASP guidelines. |
| **Session Fixation Defense** | `req.session.regenerate()` on login | **PASS** | `server/src/controllers/auth.controller.js` line 50. New session ID issued post-auth. |
| **CSRF Protection** | Double-submit CSRF via `csrf-csrf` (`x-csrf-token`) | **PASS** | `server/src/middleware/csrf.middleware.js`. Applied to all mutating website endpoints. |
| **Extension Isolation** | Bearer tokens scoped to `match:read`; zero session cookie trust | **PASS** | `server/src/routes/extension.routes.js` line 37. Completely independent auth boundary. |
| **Pairing Crypto** | 32-byte crypto secrets, SHA-256 storage, compare-and-set | **PASS** | `server/src/services/extension.service.js` lines 5–60. No plaintext tokens stored. |
| **Sensitive Field Fencing** | Blacklist regex covering passwords, OTP, CVV, cards, SSN, Aadhaar | **PASS** | `server/src/services/matching/validationEngine.js` line 243 & `extension/content/fill.js` line 3. |
| **No Form Auto-Submission** | Dispatch `input` and `change` events only; never call `.submit()` | **PASS** | `extension/content/fill.js` lines 124–126. Strict user-in-the-loop guarantee. |
| **User Data Isolation** | Queries strictly bound to `req.user.id` from server session/grant | **PASS** | `server/src/services/profile.service.js`. No client-supplied ID parameters accepted. |
| **Gemini Production Air-Gap** | Completely disabled in production. Dev-only benchmark tool using synthetic profiles only; zero profile values transmitted | **PASS** | `server/src/services/matching/geminiMatcher.js`. Hard-gated off in production. |

---

## 9. Extension Compatibility Findings

### Browser & Manifest V3 Assessment
- **Manifest V3 Conformance:** `manifest_version: 3`. Uses modern `background.service_worker` (`"type": "module"`), `activeTab`, `scripting`, `storage`, and `sidePanel` permissions.
- **Minimum Chrome Version:** Declared `"minimum_chrome_version": "116"`, ensuring full support for `chrome.sidePanel` APIs and `chrome.storage.session` access levels.
- **Element Autofill Support:**
  - Standard text, email, tel, number, date, url, textarea inputs.
  - Native `<select>` single-choice elements with option mapping.
  - Radio button groups with single-choice selection.
  - Framework compatibility: Custom property setter bypass (`Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), property).set.call(...)`) ensures React, Vue, and Angular controlled components receive value changes and update their internal state.
- **Element Safety Guarding:**
  - Elements with `disabled`, `readonly`, `[aria-disabled="true"]`, or `[inert]` are skipped.
  - Overwrite protection: If a field already contains an answer, the user must explicitly toggle "Allow replacement" before formER will overwrite it.

---

## 10. Deployment Blockers

All deployment blockers identified in the initial audit have been resolved:

```
[RESOLVED: DEP-P1-01] Environment-aware extension packaging strategy
  │
  ├─► extension/scripts/package.ps1 now supports -Configuration release -ApiUrl ... -WebsiteUrl ...
  ├─► Derives exact least-privilege host permissions for the target API host.
  └─► Verified: Produces verified formER-release.zip without touching git source files.

[RESOLVED: QA-P1-01 & QA-P1-02] Regression test suite alignment
  │
  ├─► QA-P1-01: Verified HTML spec for pattern on number inputs; updated extension-safety.test.js.
  └─► QA-P1-02: Updated extension-safety.test.js to assert safe abstention on contextless Name.

[RESOLVED: QA-P1-03] Extension client UI test assertion alignment
  │
  └─► Updated extension-client.test.js to assert approved 'Review form' button label.
```

---

## 11. Test Coverage and Actual Results

### Verified Test Suite Execution Results

| Test File | Description | Execution Status | Actual Results |
|---|---|:---:|---|
| `server/tests/extension-safety.test.js` | Sensitive field blocking, numeric bounds, dropdown options | **PASS** | **8 / 8 passed (2.1s)** |
| `server/tests/extension-client.test.js` | Service worker caller checks, popup rendering, disconnect | **PASS** | **2 / 2 passed (1.5s)** |
| `server/tests/extension-fill.test.js` | DOM writing, React state, select/radio, DOB split, overwrite | **PASS** | **10 / 10 passed (1.9s)** |
| `server/tests/contextual-matching.test.js` | Calendar derivations, age calculation, degree rule binding | **PASS** | **6 / 6 passed (1.3s)** |
| `server/tests/matching-identities.test.js` | Explicit name components, address uniqueness, RoboForm tests | **PASS** | **7 / 7 passed (2.3s)** |
| `server/tests/extension-config.test.js` | Dev vs prod extension ID admission separation | **PASS** | **4 / 4 passed (0.8s)** |
| `server/tests/autofill-coverage.test.js` | RoboForm inventory traversal and synthetic profile validation | **PASS** | **2 / 2 passed (2.0s)** |
| `client/tests/workspace.test.js` | Full frontend profile management, tabs, unsaved changes | **PASS** | **15 / 15 passed (4.0s)** |
| `client/tests/save-success.test.js` | Save success notification animation and replay behavior | **PASS** | **1 / 1 passed (1.7s)** |
| `client/` production build | `npm run build` production client compilation | **PASS** | **Built in 11.7s, 0 errors** |

---

## 12. Manual Chrome Testing Checklist

Execute this checklist in real Google Chrome (Version 116+) before distributing the beta build:

### Group A: Extension Installation & Pairing
- [ ] **A1. Unpacked Load:** Open `chrome://extensions`, enable *Developer mode*, click *Load unpacked*, and select `extension/`. Confirm extension ID matches the stable key: `egddjhnhnbgdhgiepnfmnnhfagbaambn`.
- [ ] **A2. Toolbar Icon Display:** Verify formER icon displays properly in toolbar with 16px, 48px, and 128px assets.
- [ ] **A3. Initial Disconnected State:** Click icon; confirm popup shows "Account not connected" and a "Connect account" button.
- [ ] **A4. Pairing Handshake:** Click "Connect account". Confirm website tab opens to `/extension/connect/:id` showing 8-character verification code matching the extension.
- [ ] **A5. Approval & Exchange:** Click "Approve connection" on website. Return to extension; confirm UI updates to "Account connected" showing the user's email within 3 seconds.
- [ ] **A6. Disconnect Verification:** Click "Disconnect" in extension popup; confirm connection reverts to disconnected and saved credentials are removed from `chrome.storage.local`.

### Group B: Form Field Detection & Review UI
- [ ] **B1. Simple Web Form:** Open a basic HTML form (Name, Email, Phone, DOB). Click formER -> "Review form". Verify all fields are detected with correct labels.
- [ ] **B2. Side Panel Mode:** Right-click extension icon -> "Open side panel". Confirm review interface loads cleanly and stays open while scrolling the webpage.
- [ ] **B3. Suggestions Display:** Verify matched values match user profile data exactly. Confirm sensitive fields (if present) are marked unsupported or excluded.
- [ ] **B4. Ambiguous Review State:** Test a form with ambiguous fields (e.g. "Year of Passing"). Confirm status shows "Review needed" with a yellow badge.
- [ ] **B5. Selection Controls:** Test checking/unchecking individual suggestions and "Select all" / "Deselect all" controls.

### Group C: Form Autofilling Execution
- [ ] **B6. Clean Autofill:** Click "Fill approved". Verify native inputs are populated with values without triggering form submission.
- [ ] **B7. React / Controlled Inputs:** Test against a React-based form (e.g. Tailwind UI or shadcn form). Verify React component state reflects filled values.
- [ ] **B8. Dropdown (`<select>`) Population:** Verify dropdown selects the correct option by value/label matching without throwing errors.
- [ ] **B9. Radio Button Group:** Verify the appropriate radio button is checked.
- [ ] **B10. Overwrite Protection:** Type a manual value into an input. Run review. Verify field is flagged as conflict. Confirm it is NOT overwritten unless "Allow replacement" is explicitly checked.

---

## 13. Private-Beta Release Checklist

Before issuing private beta invites to initial users, verify every item below:

```
[x] 1. CODE & TEST REMEDIATIONS COMPLETED
    [x] Fix DEP-P1-01: Update extension packaging script with environment-aware release strategy.
    [x] Fix QA-P1-01: Correct numeric pattern validation assumptions per HTML spec.
    [x] Fix QA-P1-02: Align ambiguous name test expectations in extension-safety.test.js.
    [x] Fix QA-P1-03: Update button label assertion in extension-client.test.js.
    [x] Reclassify EXT-P1-02 to P2 usability improvement upon state verification.
    [x] Verify all relevant backend and frontend test suites pass with exit code 0.

[ ] 2. HOSTING & ENVIRONMENT CONFIGURATION (When Deploying)
    [ ] Set NODE_ENV=production on beta server.
    [ ] Ensure GEMINI_MATCHING_ENABLED=false (air-gapped in production).
    [ ] Set strong 32+ character SESSION_SECRET in production environment.
    [ ] Configure production MONGO_URI pointing to secured MongoDB Atlas cluster.
    [ ] Verify ALLOWED_ORIGINS contains only the production web domain.
    [ ] Set EXTENSION_IDS to the production-approved extension ID.

[ ] 3. BUILD & PACKAGING
    [ ] Run `npm run build` in `client/` and verify zero errors in production build.
    [ ] Execute `extension/scripts/package.ps1 -Configuration release -ApiUrl <url> -WebsiteUrl <url>` to produce verified release ZIP and manifest.
    [ ] Confirm no `.env`, private keys, PEM files, or test fixtures are included in the extension ZIP.

[ ] 4. DOCUMENTATION & TESTER ONBOARDING
    [ ] Prepare Beta Tester Guide with instructions on loading the unpacked extension.
    [ ] Include disclaimer: formER is an AI assistant; users must review all filled data before submitting.
    [ ] Provide clear feedback/bug reporting mechanism.
```

---

## 14. Recommended Post-Beta Roadmap

With all P1 blockers resolved, future engineering effort should address P2 enhancements:
1. **EXT-P2-01**: Implement token refresh promise deduplication in `connection.js`.
2. **SEC-P2-01**: Narrow development CORS whitelist from broad regex to explicit localhost ports.
3. **SEC-P2-02**: Apply authenticated rate limiting to `/api/v1/profile/*` mutation endpoints.
4. **FE-P2-01**: Configure manual chunk splitting in `client/vite.config.js` for vendor chunks.

---

## 15. Final Go / No-Go Recommendation

### Official Verdict: **FULL GO FOR PRIVATE BETA**

All release blockers have been successfully investigated, resolved, and verified.
- Core security isolation, password hashing, session defenses, and CSRF protection are operating cleanly.
- The hybrid matching engine safely identifies fields, performs derivations, and enforces destination constraints.
- Form autofill strictly respects user consent, validates options, and never auto-submits forms.
- Packaging supports reproducible, least-privilege release archives for any target beta host while keeping the development workflow clean.

formER is approved and ready for its first private beta release.

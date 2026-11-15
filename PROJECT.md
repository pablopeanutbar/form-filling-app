# formER — Product & Technical Specification

**Product:** formER  
**Category:** AI-powered productivity and intelligent form automation  
**Architecture:** Modular full-stack web application with browser extension  
**Development Status:** Active development  
**Product Direction:** Secure, reliable, production-oriented SaaS platform

---

# 1. Product Vision

formER is an AI/ML-powered form-filling platform designed to simplify completing repetitive, complex, and lengthy online forms.

Users securely store their personal, educational, and professional information once. The formER browser extension then interprets supported online forms and intelligently identifies which saved information belongs in each field.

Unlike conventional autofill systems that rely primarily on field names or browser-saved values, formER uses contextual understanding, semantic machine learning, and validation to match differently worded questions with the appropriate user information.

The objective is to build an intelligent, dependable form-filling system that reduces repetitive data entry while preserving accuracy, privacy, and user control.

## 1.1 Core Value Proposition

**Save your information once. Fill forms intelligently.**

formER should:

- Understand unfamiliar form field labels.
- Recognize semantically equivalent questions.
- Match form questions with relevant saved information.
- Identify missing, ambiguous, or conflicting information.
- Validate answers before suggesting them.
- Help users complete supported forms with fewer errors.
- Give users control over all autofill actions.

The platform must prioritize correctness over the number of fields filled.

## 1.2 Target Applications

formER is intended to support a variety of online forms, including:

- University admission and registration forms.
- Scholarship applications.
- Government service and recruitment forms.
- Competitive examination registrations.
- Job application forms.
- Other supported registration and information-collection forms.

Support depends on form complexity, browser permissions, website behavior, and available user information.

Do not assume every website or form is automatically compatible.

---

# 2. Core Product Components

The platform consists of three applications:

1. formER Web Application
2. formER Backend API
3. formER Browser Extension

All components must follow clearly defined responsibilities and communicate through secure interfaces.

## 2.1 Web Application

The web application is the central interface through which users manage their accounts and information.

Responsibilities:

- User registration and authentication.
- Personal information management.
- Educational information management.
- Profile completion overview.
- Autofill activity history.
- Privacy and account settings.
- Issue reporting and user feedback.
- Browser extension installation and connection guidance.

The web application must not directly execute browser autofill operations on unrelated websites.

## 2.2 Backend API

The backend acts as the central application layer.

Responsibilities:

- Authentication and authorization.
- User and profile management.
- MongoDB operations.
- Form metadata processing.
- Field matching orchestration.
- Machine learning inference.
- Optional LLM interpretation.
- Mapping validation.
- Autofill suggestion generation.
- History and feedback management.
- Security and privacy enforcement.

The backend must expose consistent, versioned REST endpoints.

## 2.3 Browser Extension

The browser extension is responsible for interacting with supported webpages.

Responsibilities:

- Detecting relevant form fields.
- Extracting field labels and contextual metadata.
- Communicating with the authenticated backend.
- Receiving validated autofill suggestions.
- Allowing users to review uncertain mappings.
- Populating supported form elements.
- Detecting supported dynamic form changes.
- Reporting unsupported or failed field interactions.

The extension must not directly connect to MongoDB or external AI providers using privileged application credentials.

---

# 3. Technology Stack

## 3.1 Frontend

- React
- Vite
- JavaScript ES6+
- Tailwind CSS
- shadcn/ui where appropriate
- React Router
- Fetch API or a consistent HTTP client

## 3.2 Backend

- Node.js
- Express.js
- JavaScript ES Modules
- REST APIs
- Zod for request and response validation
- Centralized error handling

## 3.3 Database

- MongoDB Atlas
- Mongoose ODM

## 3.4 Browser Extension

- Chrome Extension Manifest V3
- JavaScript
- Chrome Extension APIs
- Content scripts
- Background service worker
- Extension popup and/or appropriate review interface

## 3.5 AI and Machine Learning

- Transformers.js
- Pretrained MiniLM sentence embedding model
- Cosine similarity for semantic candidate ranking
- Deterministic matching and validation rules
- Google Gemini API for optional advanced interpretation
- Structured and validated model outputs

The ML inference layer must be modular and replaceable.

The core application must not depend on a specific hosted LLM provider.

## 3.6 Development and Deployment

- Git and GitHub
- Environment-based configuration
- ESLint and consistent code formatting
- Automated testing
- Production frontend hosting
- Independently hosted Node.js backend
- MongoDB Atlas

Deployment infrastructure should remain configurable rather than hardcoded to a single hosting provider.

---

# 4. System Architecture

## 4.1 Architectural Model

Use a modular monolithic backend.

The React application and Chrome extension are independent clients of the same Express API.

Architecture:

```text
                  formER Web Application
                      React + Vite
                           |
                           | HTTPS
                           |
                           v
                    Express REST API
                           ^
                           |
                           | HTTPS
                           |
                   Chrome Extension
                           |
                           v
                   Supported Webpage

                    Express REST API
                           |
           +---------------+----------------+
           |               |                |
           v               v                v
      MongoDB Atlas   Matching Engine   Auth Services
                           |
                  +--------+--------+
                  |                 |
                  v                 v
             Local MiniLM      Gemini API
             Inference         (Conditional)
```

The matching engine is part of the backend application, not a separate microservice by default.

## 4.2 Architectural Boundaries

- Database access belongs to backend data-access modules.
- Controllers handle HTTP request and response coordination.
- Services contain business logic.
- AI inference is isolated behind service interfaces.
- Browser DOM manipulation belongs to the extension.
- Authentication must be enforced on protected backend operations.
- User data must be accessed only within the authorized user's context.

No component should bypass these boundaries for convenience.

---

# 5. User Accounts and Authentication

formER requires real user accounts and protected personal data.

## 5.1 Authentication Capabilities

The application should support:

- User registration.
- Login.
- Logout.
- Persistent authenticated sessions.
- Password recovery.
- Session expiration.
- Account deletion.

Email verification and additional authentication protections should be implemented as appropriate.

Passwords must be hashed with a suitable password-hashing algorithm, such as Argon2id.

Passwords must never be stored in plaintext.

## 5.2 Website Authentication

The web application should use secure session management.

Preferred characteristics:

- Secure, HttpOnly authentication cookies.
- Appropriate SameSite configuration.
- CSRF protection when cookies authenticate state-changing requests.
- Session expiration and revocation.
- HTTPS in production.
- Explicit origin and CORS policies.

Do not store long-lived sensitive credentials in localStorage.

## 5.3 Extension Authentication

The extension requires its own secure authorization mechanism.

The extension must not assume that website authentication cookies are automatically available to it.

Use a browser-extension-compatible account authorization flow, such as an authorization-code flow with PKCE where appropriate.

Requirements:

- The user explicitly connects the extension to their account.
- The extension receives appropriately scoped credentials.
- Credentials are never exposed to arbitrary webpage scripts.
- The backend validates every authenticated request.
- Sessions can expire and be revoked.
- Extension access can be disconnected from account settings.

Do not pass privileged authentication tokens through webpage DOM elements.

Do not invent a simplified authentication mechanism that bypasses backend authorization.

---

# 6. Information Management System

The central responsibility of the web application is to maintain an accurate, structured profile of the user's information.

## 6.1 Profile Categories

### Personal Information

Examples:

- Full legal name.
- Date of birth.
- Gender, where provided.
- Parent or guardian information.
- Other relevant personal details.

### Contact Information

- Email addresses.
- Phone numbers.
- Alternate contact information.

### Address Information

- Permanent address.
- Correspondence address.
- City.
- District.
- State.
- Country.
- Postal code.

Permanent and correspondence addresses must remain distinguishable.

### Educational Information

Support multiple independent educational qualifications.

Each qualification may contain:

- Qualification level.
- Degree or examination name.
- Institution.
- Board or university.
- Specialization or subjects.
- Start and completion dates.
- Passing year.
- Roll or enrollment identifiers, where appropriate.
- Marks obtained.
- Maximum marks.
- Percentage.
- CGPA or SGPA.
- Grading scale.
- Result status.

Educational records must preserve their individual identity.

Never assume one qualification represents another.

### Professional Information

Support optional professional details such as:

- Work experience.
- Job titles.
- Organizations.
- Skills.
- Relevant qualifications.
- Professional profiles.

### Additional Information

The data model should support carefully defined additional fields without requiring arbitrary changes to the entire database schema.

Sensitive fields must have explicit handling rules.

## 6.2 Profile Data Principles

- Store information in structured, typed fields.
- Use stable canonical field identifiers.
- Preserve differences between similar information types.
- Support multiple qualifications and addresses.
- Preserve source and verification metadata where useful.
- Validate information before persistence.
- Support editing and deletion.
- Do not silently infer missing personal information.
- Do not overwrite user-confirmed information with AI predictions.

For example, graduation percentage and Class 12 percentage must never share the same canonical identifier.

## 6.3 Canonical Profile Fields

The matching engine must reference a controlled registry of canonical fields.

Each field definition should contain:

```json
{
  "key": "personal.fullName",
  "label": "Full Legal Name",
  "description": "The legal full name of the applicant",
  "dataType": "string",
  "category": "personal",
  "aliases": [
    "Applicant Name",
    "Candidate Name",
    "Full Name"
  ]
}
```

This is an illustrative field definition, not a complete registry.

The canonical registry defines the meaning and expected type of information.

Actual user values remain separate.

For repeated records, such as multiple educational qualifications, use stable record identifiers and explicit qualification context rather than assuming array positions identify a particular degree.

## 6.4 Data Provenance

Where relevant, stored values should track:

- Whether the value was entered by the user.
- Whether it was extracted from a document.
- Whether the user has confirmed it.
- When it was updated.
- Any required qualification or context.

An AI-generated suggestion must not automatically become verified profile information.

---

# 7. Database Design

MongoDB is the primary database.

Use Mongoose models with appropriate validation, indexes, and timestamps.

## 7.1 User Collection

Stores account information.

Suggested responsibilities:

- User identifier.
- Email.
- Password hash or authentication-provider identifier.
- Account status.
- Authentication metadata.
- Creation and update timestamps.

Unique email constraints must be enforced appropriately.

## 7.2 Profile Collection

Stores the user's structured personal information.

Requirements:

- One clearly identified profile owner.
- Account-level authorization.
- Structured personal information.
- Contact information.
- Address records.
- Educational qualification records.
- Professional information.
- Source and verification metadata.
- Creation and update timestamps.

The schema should balance flexibility with validation.

Avoid an unrestricted key-value database where arbitrary user input can overwrite protected fields or alter application behavior.

## 7.3 Autofill History Collection

Stores metadata about permitted autofill operations.

Possible fields:

- User reference.
- Website origin.
- Timestamp.
- Number of fields detected.
- Number of fields matched.
- Number requiring review.
- Number left unmatched.
- Processing status.
- Error category, when applicable.

Avoid storing complete filled forms or sensitive answers by default.

History must not imply that a user successfully submitted a form unless that outcome is actually known.

## 7.4 Feedback Collection

Stores user-reported matching issues and explicit corrections.

Possible fields:

- User reference.
- Relevant form-field description.
- Predicted canonical field.
- Corrected canonical field.
- Issue category.
- Timestamp.
- Review status.

Feedback may later support evaluation and model improvement.

Personal data must be minimized and protected. Training use requires an appropriate consent and data-handling policy.

## 7.5 Future Document Support

The architecture may later support document-based information extraction.

Do not add a standalone Documents navigation page unless the product requirements are explicitly updated.

Document extraction and storage should be designed as optional capabilities integrated into the relevant information-management workflows.

---

# 8. AI/ML Form Understanding Engine

The intelligent matching engine is one of formER's primary product capabilities.

Its responsibility is to determine which stored user information, if any, corresponds to each requested form field.

The engine must not generate arbitrary personal information.

## 8.1 Input to the Matching Engine

The extension extracts structured field metadata.

Example:

```json
{
  "fields": [
    {
      "fieldId": "field_1",
      "label": "Name of Applicant",
      "type": "text",
      "required": true,
      "section": "Personal Details",
      "placeholder": "",
      "options": []
    },
    {
      "fieldId": "field_2",
      "label": "Aggregate percentage in graduation",
      "type": "number",
      "required": true,
      "section": "Educational Qualifications",
      "placeholder": "",
      "options": []
    }
  ]
}
```

Real extraction should also support relevant details such as:

- Input name and identifier.
- Associated label.
- ARIA label.
- Placeholder.
- Nearby heading or section.
- Select options and their values.
- Required state.
- Supported HTML validation constraints.
- Relevant nearby explanatory text.

Field context must be bounded, sanitized as appropriate, and treated as untrusted input.

Do not transmit entire webpage contents when field-level context is sufficient.

## 8.2 Stage One — Deterministic Matching

The matching engine first evaluates explicit rules and known mappings.

Examples:

- Email address fields.
- Clearly labeled date-of-birth fields.
- Explicitly identified full-name fields.
- Unambiguous contact-number fields.

Rules should consider context and field types, not simply substring matches.

For instance, a field containing the word "name" must not automatically map to the applicant's name.

Rules must distinguish applicant names, parent names, institution names, and organization names.

## 8.3 Stage Two — MiniLM Semantic Matching

MiniLM is the primary semantic machine learning model.

Use Transformers.js to run a compatible pretrained sentence embedding model in the Node.js environment.

Responsibilities:

- Convert field descriptions into embeddings.
- Compare extracted fields against canonical profile descriptions.
- Rank possible mappings.
- Return candidate mappings with similarity scores.

Optimizations:

- Load the model once per inference worker.
- Reuse the loaded model.
- Cache stable canonical field embeddings.
- Batch inference where practical.
- Avoid redundant model initialization.

Similarity scores must not be represented as calibrated correctness probabilities.

A high similarity score does not guarantee a correct match.

Model thresholds and selection rules must be evaluated against labeled data.

## 8.4 Stage Three — Gemini Reasoning

Gemini is an optional reasoning fallback.

Call Gemini only when simpler matching stages cannot confidently and safely resolve a field and additional context may help.

Potential use cases:

- Unfamiliar administrative terminology.
- Ambiguous educational qualifications.
- Context-dependent field descriptions.
- Questions requiring interpretation of nearby instructions.

The backend should primarily send:

- Extracted form-field descriptions.
- Relevant section context.
- Allowed canonical field identifiers.
- Descriptions of available information types.
- Necessary constraints.

Do not send the user's complete profile by default.

If actual personal values are essential for a particular interpretation, minimize the data shared and enforce applicable consent, privacy, and provider policies.

Gemini must return schema-constrained structured results.

All returned identifiers must be validated against the backend's canonical field registry.

If the AI cannot reliably determine the answer, it must be allowed to abstain.

## 8.5 Matching Service Design

The backend should expose a provider-independent matching interface.

Conceptual services:

```text
services/
└── matching/
    ├── matching.service.js
    ├── ruleMatcher.service.js
    ├── semanticMatcher.service.js
    ├── llmMatcher.service.js
    ├── validation.service.js
    └── fieldRegistry.js
```

Names may be adjusted to maintain consistency with the existing codebase.

Responsibilities:

- `matching.service.js`: Coordinates the pipeline.
- `ruleMatcher.service.js`: Applies deterministic mappings.
- `semanticMatcher.service.js`: Runs embedding-based candidate ranking.
- `llmMatcher.service.js`: Requests optional advanced reasoning.
- `validation.service.js`: Checks candidate eligibility and constraints.
- `fieldRegistry.js`: Defines canonical profile field semantics.

Changing an ML model or hosted LLM provider must not require rewriting the extension.

---

# 9. Validation and Decision Engine

The validation engine determines whether a proposed mapping is suitable for autofill.

It must operate independently of model predictions.

## 9.1 Validation Responsibilities

Check:

- Whether the proposed profile field exists.
- Whether the user actually has that information.
- Whether the field meaning matches.
- Whether the value is compatible with the input type.
- Whether the value matches the expected format.
- Whether the relevant qualification or context is correct.
- Whether multiple interpretations remain possible.
- Whether a transformation is permitted.
- Whether the form's supported constraints are satisfied.

## 9.2 Decision States

Every processed field should receive a status.

**matched**

An eligible mapping has been established and passes the relevant checks.

**needs_review**

A potential mapping exists but requires user confirmation or additional information.

**unmatched**

No valid mapping can be established.

An optional `unsupported` status may be used for form elements that the extension cannot safely manipulate.

The backend and extension must agree on the exact status contract.

## 9.3 Transformation Rules

Some fields require formatting or transformations.

Examples:

- Date formatting.
- Capitalization.
- Phone number representation.
- Dropdown option matching.
- Address formatting.

Transformations must preserve the original meaning.

Do not invent institution-specific rules.

For example, CGPA-to-percentage conversion requires an applicable verified conversion formula.

If no valid conversion rule is available, request user input rather than guessing.

## 9.4 Example Output

```json
{
  "suggestions": [
    {
      "fieldId": "field_1",
      "profileKey": "personal.fullName",
      "value": "Example Applicant",
      "status": "matched",
      "reason": "Applicant full name"
    },
    {
      "fieldId": "field_2",
      "profileKey": null,
      "value": null,
      "status": "needs_review",
      "reason": "Graduation percentage is unavailable"
    }
  ]
}
```

The example illustrates the response contract.

Real mappings must be generated through the matching pipeline and validated against actual authorized profile data.

---

# 10. Browser Extension Architecture

The browser extension must follow Chrome Manifest V3.

## 10.1 Extension Components

### Popup Interface

Responsibilities:

- Display extension connection status.
- Allow the user to initiate autofill.
- Show basic processing status.
- Provide access to formER account management.

### Content Script

Responsibilities:

- Inspect supported webpage form elements.
- Extract structured field metadata.
- Identify corresponding DOM elements.
- Receive approved autofill instructions.
- Apply values to supported controls.
- Trigger appropriate input and change events.
- Detect and report relevant failures.

### Background Service Worker

Responsibilities:

- Coordinate extension messages.
- Communicate with the backend.
- Manage authenticated API requests.
- Handle appropriate extension lifecycle events.
- Avoid exposing authentication credentials to webpage scripts.

## 10.2 Autofill Workflow

1. User opens a supported webpage.
2. User activates formER.
3. Extension identifies supported form fields.
4. Extension extracts bounded field metadata.
5. Background service worker sends an authenticated request to Express.
6. Backend obtains relevant authorized profile information.
7. Matching engine identifies potential mappings.
8. Validation engine checks proposed answers.
9. Backend returns structured suggestions.
10. Extension presents results requiring review.
11. User confirms the applicable autofill operation.
12. Content script fills approved fields.
13. Extension reports supported success and failure states.

The user's own review and submission remain separate from formER's matching process.

## 10.3 Form Compatibility

Support should be developed progressively for:

- Text inputs.
- Email inputs.
- Phone inputs.
- Date inputs.
- Numeric inputs.
- Textareas.
- Select elements.
- Radio buttons.
- Checkboxes with unambiguous semantics.
- Dynamically rendered supported controls.
- Multi-step forms.

Custom components, cross-origin frames, Shadow DOM, and framework-controlled inputs may require specialized handling.

Do not claim compatibility with unsupported controls.

## 10.4 Browser Safety

- Never automatically submit forms.
- Never bypass CAPTCHA or OTP verification.
- Never access privileged browser pages.
- Do not collect passwords or payment credentials.
- Do not run hidden background scraping.
- Request minimum necessary permissions.
- Avoid unrestricted page access when user-triggered permissions are sufficient.
- Do not execute arbitrary webpage-provided JavaScript as trusted code.
- Provide clear failure states.

---

# 11. Backend API Design

Use versioned REST endpoints.

Suggested API organization:

```text
/api/v1/auth
/api/v1/profile
/api/v1/autofill
/api/v1/history
/api/v1/feedback
/api/v1/health
```

## 11.1 Authentication

Responsibilities:

- Register users.
- Authenticate users.
- Manage sessions.
- Revoke sessions.
- Support the extension authorization flow.
- Handle account recovery.

## 11.2 Profile API

Responsibilities:

- Retrieve the authenticated user's profile.
- Create or initialize a profile.
- Update supported profile information.
- Add, edit, and remove educational records.
- Manage address records.
- Validate and persist changes.

All profile access must be scoped to the authenticated user.

Do not trust a client-supplied user ID to authorize profile access.

## 11.3 Autofill API

Primary conceptual endpoint:

`POST /api/v1/autofill/match`

Responsibilities:

1. Authenticate the extension.
2. Validate the request structure and size.
3. Retrieve the user's permitted profile information.
4. Process extracted field metadata.
5. Execute the matching pipeline.
6. Validate candidate mappings.
7. Resolve approved profile references to values.
8. Return structured results.

Sensitive data must not be exposed through error responses or logs.

## 11.4 History and Feedback APIs

Provide authenticated access to the user's own permitted history and reports.

History should prioritize operational metadata over storing the actual personal values inserted into forms.

---

# 12. Web Application Pages

The initial application navigation should contain the following sections.

## 12.1 Dashboard

Purpose:

Provide a clear overview of the user's formER account and information readiness.

Potential components:

- Welcome and account overview.
- Profile completion information.
- Missing information summary.
- Recent autofill activity.
- Extension connection status.
- Quick access to profile editing.

## 12.2 My Information

Purpose:

Allow users to manage saved information.

Organize information into understandable categories:

- Personal details.
- Contact information.
- Addresses.
- Educational qualifications.
- Professional details.
- Additional supported information.

Provide clear validation and save feedback.

Avoid presenting the entire profile as one excessively long form.

## 12.3 History

Purpose:

Display recorded autofill activity.

Show relevant information such as:

- Website or service.
- Date.
- Processing result.
- Number of fields processed.
- Number of fields requiring attention.

Do not imply that a form was submitted or accepted unless explicitly verified.

## 12.4 Account Settings

Purpose:

Manage account preferences, security, privacy, and connected extensions.

Include appropriate controls for:

- Account details.
- Password and session management.
- Connected browser extensions.
- Privacy preferences.
- Account deletion.

## 12.5 Report

Purpose:

Allow users to report problems with formER.

Possible issue categories:

- Incorrect field matching.
- Missing information mapping.
- Unsupported form elements.
- Extension malfunction.
- General product issues.

Do not include a standalone Forms or Documents navigation page unless explicitly approved as a new product requirement.

---

# 13. Frontend Design System

The visual design language is defined by `DESIGN.md`.

The frontend implementation must follow that document when it is available.

Principles:

- Professional SaaS product identity.
- Clean typography.
- Consistent spacing.
- Reusable interface components.
- Thoughtful visual hierarchy.
- Responsive design.
- Accessible interactions.
- Clear feedback and error states.
- Appropriate loading and empty states.
- Consistent forms and navigation.

Design references must guide the interface without copying unrelated branding or proprietary assets.

Visual polish must not replace functional implementation.

---

# 14. Privacy and Security Architecture

formER processes personal information and must be designed accordingly.

## 14.1 Data Protection

- Protect data in transit using HTTPS.
- Use appropriate database encryption-at-rest capabilities.
- Evaluate application-level encryption for particularly sensitive fields.
- Limit access to authorized users and services.
- Keep secrets in server-side environment configuration.
- Avoid unnecessary storage of form contents.
- Implement appropriate deletion and retention policies.

## 14.2 External AI Providers

- Prefer sending field metadata and canonical descriptions.
- Avoid unnecessary personal identifiers.
- Do not expose complete user profiles by default.
- Do not include sensitive information in model logs.
- Apply applicable consent and data-processing requirements.
- Handle provider failures without fabricating answers.

## 14.3 Authentication and Authorization

- Verify identity on protected requests.
- Enforce ownership checks on profile and history resources.
- Support session expiration and revocation.
- Apply rate limiting where appropriate.
- Never expose service credentials to clients.

## 14.4 Untrusted Content

Treat the following as untrusted:

- Webpage text.
- Form metadata.
- User-submitted free text.
- LLM-generated output.
- Browser extension messages.

Validate every relevant boundary.

In particular, webpage instructions must never override the application's matching, privacy, or authorization policies.

---

# 15. Reliability and Error Handling

The application must handle expected failures gracefully.

Examples:

- Database connection failure.
- Expired authentication.
- Missing profile information.
- Unsupported form field.
- ML model initialization failure.
- Gemini API rate limiting or timeout.
- Malformed model response.
- Invalid field mapping.
- Website input rejecting a value.
- Network interruption.

Requirements:

- Use clear error categories.
- Never invent fallback answers.
- Support safe retries when appropriate.
- Prevent unnecessary repeated AI calls.
- Implement suitable request timeouts.
- Avoid exposing internal errors to users.
- Log operational errors without leaking personal information.

If AI interpretation is unavailable, the system may use independently validated deterministic matches.

It must not lower its accuracy or safety requirements merely to fill more fields.

---

# 16. Performance and Scalability

The architecture should support increasing usage without requiring the application to be rewritten.

## 16.1 ML Performance

- Load MiniLM once per inference worker.
- Reuse model instances.
- Cache canonical field embeddings.
- Use batching where beneficial.
- Avoid unnecessary model inference.
- Measure inference latency and memory usage.

## 16.2 AI Cost Optimization

- Resolve clear matches without external LLM calls.
- Use MiniLM for candidate ranking.
- Call Gemini only when additional interpretation is justified.
- Cache safe, context-appropriate mapping results.
- Do not cache sensitive personal values in shared mapping caches.
- Apply request limits and abuse controls.

## 16.3 Production Inference

Initially, MiniLM may run within the Node.js backend process.

The inference implementation must be isolated behind a service interface so it can later be moved to a dedicated inference worker or hosted service if scaling demands it.

Backend deployments must account for model-loading memory, cold starts, and concurrent requests.

Gemini should remain an optional external dependency rather than a requirement for all autofill operations.

---

# 17. Testing and Quality Assurance

Testing is required throughout development.

## 17.1 Backend Tests

- Authentication.
- Authorization.
- Profile validation.
- Database operations.
- Request schema validation.
- API error handling.

## 17.2 Matching Tests

- Correct canonical field identification.
- Parent and guardian field distinctions.
- Multiple educational qualifications.
- Address type distinctions.
- Missing values.
- Ambiguous fields.
- Invalid transformations.
- LLM output validation.
- Unmatched-field handling.

## 17.3 Extension Tests

- Supported input detection.
- Label and context extraction.
- Dropdown option handling.
- Input value assignment.
- Framework-controlled inputs.
- Extension authentication.
- Failure handling.
- Permission boundaries.

## 17.4 ML Evaluation

Maintain labeled test cases representing realistic form fields.

Measure:

- Mapping precision.
- Eligible-field coverage.
- Incorrect autofill rate.
- Abstention behavior.
- Inference latency.
- LLM fallback frequency.

Evaluate on unseen form structures and websites where possible.

Do not rely on a handful of successful examples as proof of generalized accuracy.

---

# 18. Future Product Capabilities

The architecture should accommodate future improvements without requiring them immediately.

Potential capabilities:

- Document information extraction.
- OCR-assisted profile entry.
- User-approved corrections and feedback learning.
- Specialized trained form-field classification models.
- Improved contextual understanding.
- Additional browser support.
- Expanded multilingual form understanding.
- More advanced form compatibility.
- Profile information verification.
- Enhanced privacy controls.
- Smarter matching performance and caching.

New capabilities must be justified by product needs and verified behavior.

Avoid implementing features solely because they use AI.

---

# 19. Project Directory Structure

Recommended root structure:

```text
formER/
│
├── AGENTS.md
├── PROJECT.md
├── DESIGN.md
├── PROGRESS.md
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── services/
│   │   ├── lib/
│   │   └── App.jsx
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── services/
│   │   │   ├── matching/
│   │   │   └── auth/
│   │   ├── validators/
│   │   ├── utils/
│   │   └── app.js
│   ├── .env.example
│   └── package.json
│
├── extension/
│   ├── manifest.json
│   ├── popup/
│   ├── background/
│   ├── content/
│   └── assets/
│
├── tests/
│   ├── fixtures/
│   ├── matching/
│   ├── integration/
│   └── extension/
│
└── README.md
```

This is a recommended architecture, not permission to generate unused boilerplate or unnecessary abstractions.

Create modules as features require them.

---

# 20. Development Strategy

Development must proceed in independently verifiable milestones.

Recommended implementation sequence:

1. Repository and backend foundation.
2. Database models and authentication.
3. User profile management.
4. React application and account workflows.
5. Extension foundation and form-field extraction.
6. Authenticated extension-to-backend communication.
7. Deterministic matching engine.
8. MiniLM semantic matching integration.
9. Mapping validation and user review.
10. Conditional Gemini reasoning.
11. Form compatibility improvements.
12. History, feedback, testing, and operational improvements.
13. Deployment and production hardening.

Milestone order may be adjusted when technical dependencies justify it.

Avoid implementing unrelated features before the current milestone is verified.

Every completed component should remain part of the evolving product rather than requiring replacement with an entirely separate implementation.

---

# 21. Product Quality Standards

formER must meet the following engineering principles:

### Functionality

Features must perform real operations rather than display fabricated results.

### Accuracy

Incorrect personal-information autofilling is a critical product failure.

### Security

No user should gain access to another user's private information.

### Privacy

Only necessary information should be processed, shared, or retained.

### Maintainability

The application should support future improvements without excessive rewriting.

### Performance

Common operations should remain responsive, with expensive AI calls minimized.

### Transparency

Users should understand which fields were filled and which require attention.

### User Control

The user remains responsible for confirming and submitting forms.

---

# 22. Definition of Done

A feature is complete only when:

1. Its functionality has been implemented.
2. Its relevant API contracts are respected.
3. Input and output validation are present.
4. Authentication and authorization requirements are satisfied.
5. Relevant error cases have been handled.
6. Appropriate tests have been executed.
7. Known limitations have been documented.
8. Its implementation is consistent with the established architecture.
9. PROGRESS.md has been updated.

Do not report unfinished or untested functionality as complete.

---

# 23. Governing Principle

**formER must be engineered as an actual intelligent software product.**

The web application, browser extension, database, and AI/ML engine must work together as one coherent system.

The objective is not to maximize the number of screens, features, or AI technologies.

The objective is to provide a reliable, secure, intelligent solution to repetitive online form filling.

All engineering decisions should support this objective.

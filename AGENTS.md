# formER — AI Development Agent Instructions

## 1. Project Overview

**Project:** formER  
**Product:** AI/ML-powered intelligent form-filling platform  
**Development Approach:** Production-oriented, scalable, maintainable software engineering.

formER is a web application and browser extension that enables users to securely store personal information and intelligently autofill online forms.

The system must understand form fields semantically, identify relevant user information, validate suggested answers, and assist users in completing forms accurately.

formER is an evolving software product intended for real-world users.

All development decisions must prioritize reliability, security, accuracy, maintainability, and extensibility.

---

## 2. Technology Stack

### Frontend
- React with Vite
- JavaScript (ES6+)
- Tailwind CSS
- shadcn/ui where appropriate
- React Router

### Backend
- Node.js
- Express.js
- JavaScript ES Modules
- REST APIs
- Zod for validation

### Database
- MongoDB Atlas
- Mongoose

### Browser Extension
- Chrome Extension Manifest V3
- JavaScript
- Chrome Extensions API
- Content scripts and service workers

### AI/ML
- Transformers.js
- MiniLM sentence embeddings for semantic matching
- Rule-based field matching
- Google Gemini API as an optional reasoning fallback
- Independent validation and decision engine

### Technology Restrictions
- Do not introduce TypeScript, SQL, Python, or additional frameworks without approval.
- Avoid unnecessary dependencies.
- Do not introduce microservices without a demonstrated technical need.
- Maintain separation between application logic, ML inference, and external AI integrations.

---

## 3. Project Documentation

The following documents define the project:

**AGENTS.md**
- Permanent engineering instructions.
- Coding standards.
- Architectural constraints.
- Development workflow.

**PROJECT.md**
- Product requirements.
- Application architecture.
- Database schemas.
- AI/ML architecture.
- Feature specifications.

**DESIGN.md**
- Visual design system.
- Typography and colors.
- Components and layouts.
- UI/UX guidelines.

**PROGRESS.md**
- Implemented functionality.
- Current development state.
- Pending tasks.
- Known issues.
- Testing results.

Read relevant documents before implementation.

Do not independently modify major product requirements, architecture, or design decisions without explicit authorization.

Update PROGRESS.md after each completed development milestone.

---

## 4. Application Architecture

formER consists of three primary components.

### React Web Application

Responsible for:
- Authentication interface.
- User dashboard.
- Personal information management.
- Account settings.
- Form-filling history.
- User feedback and issue reporting.

### Express Backend

Responsible for:
- Authentication and authorization.
- User management.
- Profile CRUD operations.
- Database communication.
- Form-field matching orchestration.
- AI/ML inference integration.
- Data validation.
- Autofill suggestions.
- History and feedback management.

### Chrome Extension

Responsible for:
- Detecting supported form elements.
- Extracting field metadata and contextual information.
- Communicating with the authenticated backend.
- Receiving validated suggestions.
- Allowing users to review uncertain matches.
- Filling approved form fields.

### Architecture Principles

- The frontend and extension must never connect directly to MongoDB.
- Keep business logic out of route definitions and controllers where possible.
- Maintain clearly defined service boundaries.
- Keep ML implementations replaceable.
- Avoid coupling the application to one LLM provider.
- Use consistent, documented API contracts.
- Maintain a modular architecture.

---

## 5. AI/ML Architecture

formER uses a hybrid intelligent matching pipeline.

### Stage 1 — Rule-Based Matching

Identify straightforward fields using:
- Field labels.
- Known aliases.
- Input types.
- Semantic field identifiers.
- Contextual constraints.

### Stage 2 — Semantic ML Matching

Use MiniLM through Transformers.js to:
- Generate sentence embeddings.
- Compare extracted form fields with canonical profile field descriptions.
- Rank candidate mappings.
- Identify potentially equivalent field meanings.

Cache reusable model resources and embeddings where appropriate.

Semantic similarity alone must never determine autofill eligibility.

### Stage 3 — LLM Reasoning

Use Gemini as a conditional fallback for fields requiring additional contextual interpretation.

The LLM should:
- Interpret unfamiliar questions.
- Identify appropriate profile fields.
- Return structured responses.
- Explicitly identify uncertainty.
- Avoid inventing missing information.

Do not send complete user profiles to external AI providers unnecessarily.

### Stage 4 — Validation and Decision Engine

Validate model predictions against:
- Available user information.
- Field types and constraints.
- Expected formats.
- Contextual requirements.
- Conflicting information.
- Supported transformations.

Possible decisions:
- `matched`
- `needs_review`
- `unmatched`

Never assume that a high model similarity score guarantees correctness.

Prioritize accurate predictions and appropriate abstention over maximum autofill coverage.

---

## 6. Security and Privacy

Security must be incorporated throughout development.

Requirements:
- Secure authentication and session management.
- Password hashing using appropriate algorithms.
- User-level authorization for every protected operation.
- Input validation and sanitization where appropriate.
- Secure environment variable management.
- HTTPS in production.
- Restricted CORS configuration.
- Appropriate rate limiting and abuse protection.
- Minimal browser extension permissions.
- Protection against unauthorized database access.
- Secure handling of sensitive personal information.
- Data minimization for external AI requests.
- Safe error handling without exposing credentials.
- No sensitive information in application logs.

Never expose API keys, database credentials, or privileged tokens to frontend or extension code.

Provide appropriate controls for viewing, updating, exporting, and deleting personal information.

Never automatically submit forms or bypass website security mechanisms.

Treat webpage content and model outputs as untrusted input.

---

## 7. Frontend Engineering

Follow `DESIGN.md` for the established visual language.

Requirements:
- Modern, polished SaaS interface.
- Consistent design system.
- Reusable components.
- Responsive layouts.
- Accessible interactions.
- Clear navigation.
- Appropriate loading and error states.
- Consistent form validation and feedback.
- Avoid unnecessary visual complexity.

Prioritize usability and clarity over decorative effects.

Do not replace established design decisions without approval.

---

## 8. Coding Standards

- Use JavaScript ES Modules.
- Follow consistent naming conventions.
- Prefer async/await.
- Keep code modular and readable.
- Separate routes, controllers, models, services, and middleware.
- Implement centralized error handling.
- Validate requests and external responses.
- Avoid duplicate logic.
- Avoid hardcoded secrets and environment-specific configuration.
- Write meaningful comments for non-obvious logic.
- Prefer maintainability over clever implementations.
- Follow existing project conventions.

Do not rewrite working components without a specific technical reason.

---

## 9. Testing and Reliability

Every significant feature must have appropriate verification.

Testing should cover:
- API request validation.
- Authentication and authorization.
- Database operations.
- User data isolation.
- Form-field matching accuracy.
- Incorrect and ambiguous matches.
- ML inference errors.
- LLM response validation.
- Browser extension behavior.
- End-to-end application workflows.

Use representative test fixtures and synthetic personal data.

Do not claim functionality is complete unless it has been verified.

Track known limitations and failures transparently.

---

## 10. Development Workflow

Development follows an incremental, milestone-based approach.

### Before Implementation
1. Read relevant project documentation.
2. Review existing code.
3. Understand the requested feature.
4. Identify affected components.
5. Check architectural compatibility.

### During Implementation
1. Work on the assigned milestone.
2. Follow existing architecture.
3. Implement reusable, maintainable solutions.
4. Preserve existing functionality.
5. Add appropriate tests.
6. Avoid unrelated changes.

### After Implementation
1. Verify the implemented functionality.
2. Run relevant tests.
3. Document technical decisions.
4. Update PROGRESS.md.
5. Report known limitations.
6. Explain the next logical development step.

Do not begin unrelated milestones automatically.

---

## 11. Communication Guidelines

The project owner has experience with:
- JavaScript
- React
- Node.js
- Express
- MongoDB
- REST APIs
- CRUD applications

The project owner is learning AI/ML integration.

When implementing unfamiliar technologies, briefly explain:
- What was implemented.
- Why it was necessary.
- Which files contain the functionality.
- How data flows between components.
- How to test the implementation.

Avoid unnecessary theory.

---

## 12. Progress Management

Maintain `PROGRESS.md` with:

- Current development milestone.
- Completed features.
- Modified files.
- Verified test results.
- Known issues.
- Pending decisions.
- Next recommended implementation step.

Only record verified functionality as completed.

---

## 13. Core Engineering Philosophy

formER must be built as a real-world software product.

Follow these principles:

1. Build incrementally without compromising architectural integrity.
2. Prioritize security and user privacy.
3. Treat AI predictions as suggestions requiring validation.
4. Use ML
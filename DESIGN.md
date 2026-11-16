# formER — Design System & Product Interface Specification

**Status:** Approved visual direction for implementation  
**Version:** 1.0  
**Applies to:** React web application, marketing/entry pages, and Chrome extension UI  
**Primary inspiration:** Apple's clean, human-centered visual language, adapted into an original formER product identity  
**Brand accent:** **Apple blue `#0071E3`** (retain this exact accent)

> This document governs appearance, interaction patterns, layout, and interface copy—not authentication, data contracts, business logic, or security implementation. `PROJECT.md` governs product behavior and architecture; `AGENTS.md` governs agent workflow. Reuse the design system across the website and extension, but adapt layouts to their different dimensions and tasks.

---

## 1. Design vision

**formER should feel calm, effortless, precise, and trustworthy.** It helps people save their information once and reuse it intelligently when completing online forms. The interface should reduce work and uncertainty rather than showcase technology.

The visual character is:

- **Premium but approachable:** refined without feeling exclusive, corporate, or flashy.
- **Light-first and readable:** white, soft grays, strong typography, generous but intentional space.
- **Task-focused:** every screen should make the next useful action obvious.
- **Trustworthy with personal data:** explicit save states, clear warnings, no surprising autofill behavior.
- **Quietly intelligent:** show results and explanations, not gratuitous AI imagery or jargon.
- **Consistent across surfaces:** website and extension share tokens, icon language, and interaction patterns.

### 1.1 What to draw from the references

- **Apple:** minimalism, airy composition, quiet typography, subtle surfaces, pill-shaped primary buttons, original blue `#0071E3`, smooth but restrained feedback.
- **Well-structured SaaS applications:** functional sidebar, editable data sections, compact information rows, predictable forms and settings.
- **formER's own functionality:** profile completion, educational records, reviewable field matches, clear uncertain/unmatched states.

**Do not copy** Apple logos, wordmarks, trademarks, photography, illustrations, layouts pixel-for-pixel, or proprietary font files. Use accessible, appropriately licensed fonts and original formER visual assets. The goal is a distinct product, not an Apple clone.

---

## 2. Shared design tokens

All frontend surfaces should use **semantic tokens**, not scattered hard-coded values. Define the tokens once in the React application's stylesheet/theme and mirror them in the Chrome extension stylesheet or a build-time shared source when practical. The extension need not use React or Tailwind solely for styling consistency.

### 2.1 Light theme — default and primary

| Token | Value | Purpose |
| --- | --- | --- |
| `--color-primary` | `#0071E3` | Main brand accent and primary actions |
| `--color-primary-hover` | `#0066CC` | Primary hover and actionable text |
| `--color-primary-active` | `#005BB5` | Pressed/active emphasis |
| `--color-primary-soft` | `#EAF4FF` | Selected nav items, restrained blue tints |
| `--color-primary-light` | `#2997FF` | Optional highlights **only**; not normal body text on white |
| `--color-background` | `#FFFFFF` | Main app canvas where appropriate |
| `--color-canvas-muted` | `#F5F5F7` | Page bands, sidebar or inset canvas |
| `--color-surface` | `#FFFFFF` | Cards, menus, panels, inputs |
| `--color-surface-subtle` | `#FAFAFC` | Subtle inset areas and hover fills |
| `--color-text` | `#1D1D1F` | Main text, headings, form values |
| `--color-text-secondary` | `#515154` | Descriptions and supporting labels |
| `--color-text-muted` | `#6E6E73` | Noncritical metadata and placeholders |
| `--color-border` | `#E5E7EB` | Standard subtle dividers and card borders |
| `--color-border-strong` | `#C7C7CC` | Inputs and elements needing a visible boundary |
| `--color-error` | `#D92D20` | Errors, destructive actions |
| `--color-error-soft` | `#FFF0EF` | Error background |
| `--color-success` | `#16794D` | Confirmed successful actions |
| `--color-success-soft` | `#EAF7F0` | Success background |
| `--color-warning` | `#915B00` | Ambiguity, review required |
| `--color-warning-soft` | `#FFF7E8` | Review background |
| `--color-disabled` | `#A1A1A6` | Disabled labels/icons only |

**Color rules:**

1. `#0071E3` is the **only dominant action color**. Do not replace it with Mercury indigo or an arbitrary purple.
2. Primary buttons use white text on Apple blue. Check actual contrast for every interactive state.
3. Ordinary text on white must use a sufficiently dark token. Avoid light blue (`#2997FF`) for small text on white.
4. Color must never be the only signal of errors, success, selection, or matching status: use labels, icons, and descriptions.
5. Don't scatter multiple decorative accent colors across pages. Semantic success/warning/error colors are for status, not decoration.

### 2.2 Theme strategy

- Implement a polished **light theme first** for the web app and the extension.
- Dark mode is **optional future work**, not a reason to delay the light UI. Do not display a nonfunctional theme toggle.
- If dark mode is introduced, use a complete separately tested semantic palette and maintain the same component shapes and hierarchy. Do not simply invert colors.

### 2.3 Typography

Use **Geist** (appropriately licensed) or **Inter** as the primary cross-platform font. Use a consistent fallback stack. Do **not** bundle or redistribute Apple's SF Pro fonts or Mercury's Arcadia fonts.

| Role | Desktop size / line-height | Weight | Notes |
| --- | --- | --- | --- |
| Marketing hero | `clamp(40px, 5vw, 64px)` / 1.08–1.15 | 600–700 | Only for landing/marketing moments |
| Page title | 30–34px / 1.2 | 600 | Dashboard, My Information, settings |
| Section heading | 20–24px / 1.3 | 600 | Within a page |
| Card title | 16–18px / 1.35 | 600 | Reusable cards |
| Body | 15–16px / 1.5–1.6 | 400 | Default copy and input values |
| Form label | 14px / 1.4 | 500–600 | Above controls, not only placeholders |
| Supporting text | 13–14px / 1.45 | 400 | Secondary instructions and summaries |
| Small metadata | 12–13px / 1.4 | 400–500 | Nonessential metadata only |
| Popup title | 18–20px / 1.3 | 600 | Chrome extension |

- Use sentence case for UI labels, headings, and actions.
- Slightly tighten large headings only; normal body text should use default or near-default letter spacing.
- Avoid all-caps headers, excessive bolding, multiple competing font families, and tiny critical text.
- Use **tabular numerals** for counts, dates, and numeric comparisons where helpful.

### 2.4 Spacing and dimensions

Use a predictable **4px base** with an 8px primary rhythm:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80` px.

- Inline icon/text gap: `6–8px`.
- Field label → control: `6–8px`.
- Related controls within a form: `16–20px`.
- Section separation inside an application page: `24–40px`.
- Card padding: `20–24px` desktop, `16–20px` mobile.
- Main desktop page horizontal padding: `32px`, up to `48px` on wide screens.
- Mobile page horizontal padding: `16–20px`.
- Marketing landing sections may use `64–96px` vertical space; do **not** use such spacing in a dense data-entry screen.
- Main authenticated content maximum width: approximately `1120–1200px`, adjusted to the task.
- Desktop sidebar width: approximately `240–260px`; predictable and unobtrusive.
- Extension popup target width: approximately `380–400px`, accommodating Chrome constraints and smaller windows. Keep the main action visible without unnecessary scrolling.

### 2.5 Shapes, borders and elevation

| Component | Radius | Surface/edge |
| --- | --- | --- |
| Primary/secondary action buttons | Full pill (`9999px`) | Clear contrast; no heavy shadow |
| Text/number/date inputs | `8px` | Visible 1px boundary |
| Selects, segmented inputs | `8px` | Match input family |
| Cards, section panels | `12–16px` | White surface with subtle border |
| Dialogs and large popovers | `16px` | Light shadow only when needed |
| Small badges/chips | Pill or `6–8px` | Low-contrast surface + readable text |
| Sidebar active item | `8–10px` | Soft blue tint + blue/dark text |

Prefer hierarchy through **spacing, typography, borders, and tonal surfaces**, not prominent drop shadows. Avoid glassmorphism, intense gradients, neon, and over-rounded nested cards.

---

## 3. Shared component specifications

### 3.1 Buttons

- **Primary:** `#0071E3` background, white label, pill shape, 44px standard height, horizontal padding `18–22px`. One dominant primary action per local task area.
- **Primary hover:** `#0066CC`; **pressed:** `#005BB5`. Maintain distinct keyboard focus.
- **Secondary:** white/light background, dark label and subtle border; use for cancel, back, or lower-priority actions. Do not rely on pale blue text alone to communicate a button boundary.
- **Tertiary:** text-only or minimal icon-and-label action for navigation and low-emphasis controls.
- **Destructive:** explicitly labeled and confirmed when needed; never style as an ordinary primary action.
- **Loading:** disable duplicate submission, preserve button width, display meaningful progress and errors.
- Minimum practical interactive target: **44×44px** for primary touch actions. Smaller icon controls should have expanded hit areas.

### 3.2 Form controls

- Place persistent labels **above** fields; placeholders are examples, not replacements for labels.
- Input height: **44–48px**; background white; 1px `--color-border-strong`; `8px` radius; text 15–16px.
- Focus: obvious 2px blue outline/ring with sufficient separation. Never remove focus indication.
- Inline hint text below complex fields; specific validation feedback next to affected fields.
- Mark optional fields clearly where appropriate; never use color alone to indicate required fields.
- Use specialized inputs where appropriate (date, email, numeric) but ensure keyboard and accessibility behavior.
- **Never silently infer or convert user data**. For CGPA/percentage, ask for explicitly saved values or verified conversion rules.
- Allow users to clear optional values with clear UI, and preserve unrelated form sections when saving.
- For multi-step or complex information, use subsections and progressive disclosure, not one massive unbroken form.

### 3.3 Cards, lists and data rows

- Use cards to group related actions or information, not as decoration around every line of content.
- Use simple rows/tables for education records, professional experience and history when multiple records exist.
- Provide meaningful empty states and a single obvious next action.
- Use restrained separators and hover treatments; avoid heavy alternating row colors.
- Do not imply a record is verified unless its verification state is actually known.

### 3.4 Navigation

- Desktop: persistent, calm **left sidebar** with logo at top, navigation in the middle, and account access below.
- The agreed authenticated navigation is exactly: **Dashboard, My Information, History, Account Settings, Report**.
- Do **not** add standalone Documents or Forms pages.
- Active item: pale-blue background and blue icon/label or dark high-contrast label.
- Mobile: accessible drawer or compact navigation; do not shrink the desktop sidebar into an unusable column.
- Keep account/session actions easy to locate; do not overwhelm the sidebar with unrelated links.

### 3.5 Icons and illustration

- Use a consistent, simple outlined icon set (such as Lucide) with similar stroke widths and sizes.
- Standard icon sizes: 16px inline, 18–20px navigation/actions, 24px only when hierarchy requires.
- Icons support meaning; they do not replace clear text labels for important actions.
- Use original simple graphics or understated product illustrations, not copied Apple/Mercury assets or stock-heavy decoration.

### 3.6 Feedback and system states

- **Loading:** lightweight skeleton or spinner near the area being updated; avoid full-screen blocking when unnecessary.
- **Saved:** show a short, accurate confirmation after the server acknowledges the write.
- **Error:** use human language that explains the action needed; preserve entered data if saving fails.
- **Empty:** explain what is missing and offer a relevant action; never fabricate analytics or recent activity.
- **Disabled/unavailable:** explain why a control is unavailable; do not ship clickable-looking dead buttons.
- **Confirmation:** require extra confirmation for deletion or irreversible actions.

---

## 4. Website: public and authentication surfaces

### 4.1 Landing page (when implemented)

The landing page may be more editorial and airy than the authenticated app, but it must belong to the same brand family.

- White/light background with occasional soft-gray section bands.
- Short, confident benefit-led headline; explain that formER helps users reuse their information on online forms.
- Original, accurate product UI visuals—not fictitious success rates or fake testimonials.
- One clear call to action, such as **Get started**.
- Explain the workflow in simple steps: save information → review matches → fill supported fields.
- Communicate trust: consent-based operation, uncertainty review, no automatic form submission.
- Use large type sparingly; avoid excessive animation, confusing scrolling effects, or unrealistic promises.

### 4.2 Login and registration

- Calm, focused layout with a restrained brand mark and a short introduction.
- Card or contained form width around **400–440px**; mobile responsive.
- Clear email and password fields, readable validation, show/hide password control with accessible label.
- Strong primary action; obvious link to switch between login and signup.
- Restore sessions correctly and communicate loading/errors without exposing sensitive details.
- Do not show working-looking recovery or verification links until supported; add them when the backend flow exists.

---

## 5. Website: authenticated application

### 5.1 Overall layout

Use a practical SaaS application shell—not the cinematic composition of an Apple or Mercury marketing homepage.

**Desktop layout:**

```text
┌─────────────────────┬─────────────────────────────────────────┐
│ formER              │ Page title / context / account actions  │
│                     ├─────────────────────────────────────────┤
│ Dashboard           │                                         │
│ My Information      │     Functional page content             │
│ History             │     Forms, records, real status         │
│ Account Settings    │                                         │
│ Report              │                                         │
│                     │                                         │
└─────────────────────┴─────────────────────────────────────────┘
```

- Keep the sidebar compact and visually subdued; prioritize content.
- Page headings identify the current task, with one short supporting description when useful.
- Use content-aligned action buttons rather than a toolbar full of controls.
- At narrower widths, collapse the sidebar into a labeled menu/drawer with appropriate focus management.

### 5.2 Dashboard

**Purpose:** communicate account readiness and the most useful next step.

Recommended modules, shown only when backed by real data:

1. Simple welcome/account status.
2. **Profile completeness**, computed from an explicit, understandable rule—not an invented percentage.
3. Missing or incomplete information categories with links to the correct editor.
4. Recent autofill activity **only after** the backend history feature exists; otherwise a truthful empty state.
5. Extension connection status only when that status can actually be determined.

Prefer 2–3 balanced sections above the fold to numerous metric cards. No fictional trends, meaningless graphs, or giant promotional hero inside the app.

### 5.3 My Information

**This is formER's most important editing screen.** It should be exceptionally readable and feel safe to use.

Sections:

- **Personal details:** legal name, date of birth, parent/guardian information.
- **Contact:** email and phone information.
- **Addresses:** permanent and correspondence addresses, visually and semantically distinct.
- **Education:** independently identified records for school, undergraduate, postgraduate, and additional qualifications.
- **Professional:** skills, experience, links, where supported by the backend.

Design rules:

- Use in-page tabs/section navigation or clearly separated cards; avoid one giant form.
- Group related fields into 1–2 columns on desktop and a single column on mobile.
- Include clear **Save changes**, **Cancel**, and state feedback.
- Never save unrelated sections accidentally or erase siblings during partial edits.
- Distinguish *missing*, *user-entered*, and *verified* values only when the backend supports those states.
- Support `null`/empty optional values as intended by the API; no arbitrary defaults.
- Avoid showing raw canonical keys or database IDs in the UI.

**Education record pattern:**

- Show one record per clearly named qualification, e.g., “Class 12 · Board name · 2024” when those values exist.
- Use a compact list of record cards or rows with **Add qualification**, **Edit**, and **Remove** actions.
- In the editor, visually separate **percentage**, **CGPA**, **CGPA scale**, **SGPA**, and **marks obtained/max marks**.
- Do not silently derive an unavailable percentage from CGPA.
- If multiple records share a qualification level, retain their distinct identity; no ambiguous “first degree wins” UX.
- Destructive actions require an explicit confirmation state.

### 5.4 History

- When implemented, display factual, authorized autofill activity only.
- Suggested columns/rows: website or origin, date/time, detected count, matched/review count, processing state.
- The presence of an autofill event must **not** imply successful submission of a government, school, or job application.
- Before implementation, show a truthful feature-unavailable or empty state without fabricated entries.

### 5.5 Account Settings

- Group available settings into Account, Security, Privacy, and Extension Connections **only when corresponding functionality exists**.
- Provide clear explanation for consequential settings.
- Sensitive account actions (e.g. deletion) should be isolated from ordinary preferences.
- Never imply email verification, password reset, MFA, or disconnect controls are working without real backend support.

### 5.6 Report

- Provide a clear issue-reporting form when the backend supports submission.
- Appropriate categories may include incorrect matching, unsupported field, extension malfunction and general issue.
- For privacy, do not ask for sensitive personal values or full form contents unnecessarily.
- Until reporting API exists, communicate availability honestly instead of showing a fake success confirmation.

---

## 6. Chrome extension: shared branding, compact interaction

The popup uses the **same tokens, font family, blue accent, radii, icons, and status semantics** as the web app. Its layout is a purpose-built compact workflow, not a miniaturized dashboard.

### 6.1 Popup shell

- Target approximate width: **380–400px** with adaptive sizing where possible.
- Header: original formER logo/wordmark, current connection status, minimal secondary menu.
- Main content: current website/domain, support state, contextual primary action.
- Prefer a single-column layout and concise copy.
- Use internal scrolling for long result lists; keep important state and action discoverable.
- A diagnostic metadata/JSON view is appropriate for development tooling, but should not dominate the end-user experience.

### 6.2 Popup states

**Disconnected:**
- Simple explanation of the need to connect an account.
- A **Connect account** action only after the secure extension authorization flow is implemented.
- No pretending the extension can access an authenticated profile before connection.

**Ready / no form detected:**
- Show the current site's support status.
- Offer **Detect fields** or **Scan form** as a user-triggered action.
- Explain restricted pages and unsupported controls calmly.

**Results available:**
- Show number of identified fields, eligible matches, fields needing review, and unmatched fields.
- Present a concise field list with meaningful labels, suggested source category and action.
- Do not overwhelm users with raw JSON, embedding vectors, or algorithm internals.

**Review required:**
- Present uncertain mappings with a visible warning and explanation.
- Allow users to inspect and approve individual suggestions or leave them untouched.
- Never represent MiniLM cosine similarity as a calibrated accuracy probability.

**Ready to fill:**
- Present a clear **Fill selected fields** action after explicit user review/approval.
- Differentiate matching from actual DOM insertion and from website submission.
- **Never automatically submit** external forms, bypass OTP/CAPTCHA, or fill password/payment fields.

**Completed / partial failure:**
- Show honest inserted/failed counts and actionable descriptions.
- Do not claim a form was submitted or accepted by the external website.

### 6.3 Matching states and visual language

| Engine state | User-facing label | Treatment | Behavior |
| --- | --- | --- | --- |
| `matched` | Ready to fill | Subtle green/success signifier | Eligible only after backend validation; user remains in control |
| `needs_review` | Review needed | Amber/warning text and icon | Require explicit confirmation; show reason |
| `unmatched` | No match found | Neutral/gray | Leave the field untouched; explain what is missing if known |
| `unsupported` | Not supported | Neutral/muted with clear label | Do not attempt autofill |

Do not create a large colorful badge for every field if plain labels and icons communicate the same information. Use calm, compact rows and subtle semantics.

### 6.4 Current extension implementation

- Preserve the existing Manifest V3 detection, extraction, messaging, and privacy logic.
- A visual redesign must not rewrite or weaken extraction logic, permissions, sensitive-field exclusions, or authorization.
- Current diagnostic popup can be restyled later using this system; a shared design language **does not require** migrating the extension to React.

---

## 7. Responsive behavior

### 7.1 Breakpoints (guidance, not framework constraints)

- **Small:** below ~640px — single-column forms, simplified header, full-width actions where appropriate.
- **Medium:** ~640–1023px — adaptive spacing, fewer form columns, collapsible navigation.
- **Large:** 1024px and above — persistent sidebar, content grids, efficient multi-column editing.

Make layout decisions based on component fit rather than forcing decorative breakpoints.

### 7.2 Form behavior

- Forms should not overflow horizontally.
- Important labels and validation messages should wrap gracefully.
- Never reduce text size excessively just to fit a row.
- Dropdowns/dialogs must remain usable by keyboard and on narrow screens.
- For longer editing workflows, maintain clear section context and prevent accidental data loss.

---

## 8. Motion and interaction

- Prefer subtle 120–220ms transitions for hover, focus, disclosure and selection.
- Use restrained easing; avoid bouncing, exaggerated parallax, auto-playing hero motion, and intrusive animations.
- Show progress only for actual pending operations; don't create fake delays for effect.
- Respect `prefers-reduced-motion` and provide equivalent static feedback.
- Avoid animations that shift controls while users type or review sensitive information.

---

## 9. Accessibility and trust requirements

- Target **WCAG 2.2 AA** accessibility for core journeys.
- Text and interactive controls must have adequate measured contrast; fix failures even if a raw reference token must be adapted for the context.
- Keyboard navigation, visible focus, sensible tab order and reachable dialog dismissal are required.
- Inputs must have programmatic labels; errors must be associated with fields and announced appropriately.
- Icon-only actions must have accessible names; tooltips are not the sole explanation of critical controls.
- Interactive states must never be conveyed by color alone.
- Provide adequate tap/click targets and readable zoom behavior.
- Do not display full personal information unnecessarily in overview cards, extension diagnostics, logs, or support interactions.
- Be explicit about what formER **suggested**, what it **filled**, and what the user must **review and submit**.
- Do not display arbitrary “98% accurate” scores, guarantees, or trust claims without measured supporting evidence.

---

## 10. Content voice

Write copy as if formER is a dependable personal utility, not a developer tool.

**Preferred:**

- “Your information, ready when you need it.”
- “Add a qualification”
- “Save changes”
- “Review 3 suggested matches”
- “We couldn't match this field safely.”
- “Nothing was submitted to this website.”

**Avoid:**

- “AI-powered semantic embeddings executed successfully.”
- “100% accurate autofill.”
- “Magic one-click application submission.”
- “Congratulations! Your form is submitted” when only inputs were filled.
- Generic filler, fabricated usage metrics, fictitious recent activity, or developer-debug terminology in customer-facing UI.

Use sentence case and concise, unambiguous messages. Show enough detail for users to make informed choices.

---

## 11. Implementation guidance for Antigravity

1. Read `AGENTS.md`, `PROJECT.md`, `PROGRESS.md`, and this `DESIGN.md` before UI implementation.
2. Implement semantic tokens first; avoid hardcoding colors and spacing in every component.
3. Keep **Apple blue `#0071E3`** as the exact formER primary accent. Hover/active may darken appropriately.
4. Use React + Vite + JavaScript ES modules + Tailwind + shadcn/ui where appropriate for the **website**, as defined in `PROJECT.md`.
5. Keep the extension implementation compatible with its current architecture. Reuse token values and interaction conventions; do not force a framework migration for appearance alone.
6. Build reusable button, input, field, card, navigation and feedback patterns.
7. Build functionality before embellishment. No static impostor pages, fake charts, dead buttons, or hardcoded personal data.
8. Match the actual backend API responses, CSRF/session behavior and profile schemas, rather than designing around assumed or mock contracts.
9. Preserve user control and uncertainty handling for autofill. Do not turn an ML ranking into an unconditional “safe” choice.
10. Verify visual consistency at mobile and desktop widths, and check extension popup usability separately.
11. Treat this document as a **visual specification**. If an implementation concern conflicts with security, privacy, accessibility or verified application requirements, prioritize the safer functional behavior and document the tradeoff.
12. Do not alter this document or major visual direction without approval. Update `PROGRESS.md` after verified UI milestones.

---

## 12. Visual acceptance checklist

A UI milestone may be called visually complete when:

- [ ] Apple blue `#0071E3` is the consistent primary action color.
- [ ] Typography, spacing, colors, radii and states come from semantic tokens.
- [ ] Landing, login, authenticated pages and extension feel like **one original formER brand**.
- [ ] Dashboard has an effective application hierarchy rather than a giant marketing hero.
- [ ] My Information is comfortable for extensive, accurate data entry.
- [ ] Educational records and address types are visually distinct and editable.
- [ ] Every visible action is implemented or clearly communicated as unavailable.
- [ ] Loading, error, empty, success, disabled and review states are coherent.
- [ ] No fake analytics, claims, submissions, or autofill confidence percentages appear.
- [ ] Mobile and desktop layouts work without horizontal overflow.
- [ ] Extension UI remains compact and supports deliberate field review.
- [ ] Core journeys are keyboard-accessible with good contrast and clear focus.
- [ ] No copyrighted third-party assets or restricted font files are copied into the product.
- [ ] Existing security, matching and extension functionality remains intact.

---

**Design principle:** Make complex form completion feel simple and reliable. Let the interface make a clear promise—and let the actual software keep it.

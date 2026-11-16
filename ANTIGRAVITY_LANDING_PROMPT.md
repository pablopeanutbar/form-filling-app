# Antigravity — formER Public Landing Page (High-Fidelity Reference Adaptation)

We are changing the immediate frontend priority. **Pause Phase 6B dashboard work. Build only the public marketing landing page.**

## Read first

1. `AGENTS.md`
2. `PROJECT.md`
3. `DESIGN.md` (shared app/extension design)
4. `LANDING_DESIGN.md` (authoritative for `/` only)
5. `PROGRESS.md`
6. `references/alto-coffee-template/README.md`
7. `references/alto-coffee-template/components/alto-coffee-template/README.md`
8. **The full actual source** `references/alto-coffee-template/components/alto-coffee-template/alto-coffee-template.tsx`

The supplied template's source is available in the reference folder; **do not attempt to recreate the visual experience using only a few generic Tailwind cards or a text prompt**.

## Goal

Rebuild the template's visual sophistication and **high-fidelity scroll/interactivity** as the **formER** consumer SaaS landing page. Keep scene pacing, large typography, layering, hero transformation, sticky sequences, parallax cards, interactive art, horizontal process gallery, responsive behavior and tasteful footer reveal. Replace all coffee-specific content and business logic with a truthful, original story about formER.

The experience should be visually remarkable while communicating in plain language:

**Save your information once. Get help filling supported online forms. Review suggestions before anything is filled.**

**Brand action blue: `#0071E3`.** The landing page may use bold cinematic backgrounds as documented in `LANDING_DESIGN.md`. Do not force the light dashboard style onto cinematic scenes.

## Implementation workflow

### Stage 1 — Inspect and plan
- Inspect the current React router, authenticated app, styles and dependencies.
- Identify the reference component sections, GSAP timelines, SVG/canvas utilities, hover states, and responsive rules before changing code.
- Give a concise mapping of reference scenes → new formER scenes. Avoid a wholesale rewrite of unrelated authenticated components.
- If practical, run the original reference separately to understand its baseline visual rhythm; do not confuse reference coffee UI with the final product.

### Stage 2 — Build the public landing
- Add real public `/` route. Keep `/login` and `/register` functioning; move current authenticated shell to its proper protected route if necessary.
- Implement the cinematic hero with giant staggered typography and a scroll-through-visual-world transition into an illustrated example form. Preserve layered motion and key visual timing.
- Build the oversized feature stage, dark zooming three-use-case story, floating form/document showcase, horizontal six-step journey, interactive simulated autofill preview, strong complementary-feature/final CTA section, and animated footer.
- Use **formER-specific** illustrations and copy. Product demo visuals may use obviously fictitious example form details, never private user profile values.
- Navigation should show formER, clear section links, Log in and Get started/Open dashboard. Every CTA must work with the existing router.
- Preserve hover and clickable interactions; avoid inert fake buttons.

### Stage 3 — Motion fidelity and polish
- Use GSAP 3.13+ ScrollTrigger/MorphSVG where appropriate. Adapt proven animation logic from the supplied template. Keep JS ES modules (`.jsx`), not TypeScript.
- Scope GSAP initialization and clean up on unmount. No global scroll interference with the app.
- Respect reduced-motion preferences; touch/mobile interactions must be accessible and legible.
- Preserve high-contrast scenes, oversized headline typography, animation cadence, transitions and dimensional illustrations. **No generic SaaS template substitution.**
- Be mindful of performance, lazy-loading and image licensing.

### Stage 4 — QA and report
- Run frontend build and existing backend/auth tests. Do not alter backend authentication logic except narrowly required router integration.
- Verify in real Chrome at desktop 1440×900, tablet 768×1024 and mobile 390×844. Check horizontal overflow, scroll transitions, mobile navigation, keyboard focus, reduced motion, route transitions and auth redirects.
- Compare the adapted experience against the source/reference section by section. Fix major differences before declaring complete.
- Provide actual screenshots (hero, feature section, interactive section, mobile); report what does and does not match the reference. Never claim testing you didn't perform.
- Update `PROGRESS.md` with accurate status and open issues.

## Strict restrictions

- Do not remove, bypass or mock authentication, sessions or CSRF.
- Do not change or redesign the existing Chrome extension, backend, profile APIs, MiniLM engine or protected dashboard in this milestone.
- Do not modify `AGENTS.md`, `PROJECT.md`, `DESIGN.md` or `LANDING_DESIGN.md` without approval.
- Do not add fake testimonials, fake activity metrics, fake user counts, fake user data, fake pricing, a nonfunctional newsletter, or a dead download link.
- Do not expose backend implementation details (MongoDB, MiniLM, Argon2id, CSRF, etc.) in customer-facing copy.
- Do not retain coffee imagery, volcano altitude UI, origin-country business data, shopping cart, inventory bars or coffee brew actions.
- Preserve appropriate attribution to the original MIT template author if substantial portions of code are used.
- Do not start Phase 6B or 6C afterward. Stop after landing-page implementation and report.

## Priority clarification

**Fidelity to the reference's visual storytelling and interactions is more important than implementation speed.** If an effect is difficult, implement and verify it rather than silently replacing it with a static screenshot. Flag any limitations explicitly.

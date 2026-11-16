# formER — Landing Page Design & Motion Specification

**Status:** Approved creative direction for the *public landing page only*  
**Reference:** `references/alto-coffee-template/` — Alto Coffee Template by Kedhareswer Naidu (MIT license, as stated in the supplied source README)  
**Design intent:** High-fidelity adaptation of the reference template's cinematic composition, scene pacing, interaction design, and scroll choreography for the formER consumer SaaS product.  
**Brand primary:** `#0071E3` (retain the selected original Apple-blue accent).  
**Application:** React + Vite + JavaScript ES modules; retain existing Express authentication/API infrastructure.

## 1. Document priority and scope

- This document governs only the public route `/` and any landing-specific visual components.
- The existing root `DESIGN.md` still governs the authenticated dashboard, login, registration, profile editors, account settings, and Chrome extension. Do **not** replace or rewrite it automatically.
- Reuse the reference's **visual and motion patterns**, not its coffee business concepts, brand mark, products, photographs, locations, pricing, or marketing claims.
- If a literal element has no relevance to form-filling (volcano altitude, coffee cherries, coffee-bag checkout, geographical coffee origins, brewing), replace it with an original formER-specific narrative **while retaining comparable visual impact and motion choreography**.
- The brand must still be recognizably formER. Keep the marketing website cinematic; keep actual data-entry screens calm, legible, efficient, and functional.
- Prioritize faithful composition, motion timing, layering, scroll behavior, transition quality, responsive behavior and typography over inventing extra UI sections.

## 2. Exact implementation reference

Unzip the user-provided `coffee-roaster-landing-page-template-v1.zip` into a *reference-only* folder in this repository:

```text
references/alto-coffee-template/
  README.md
  components/alto-coffee-template/
    README.md
    alto-coffee-template.tsx
    demo.tsx
    demo-huila.tsx
```

The file `alto-coffee-template.tsx` contains the complete layout, CSS string, SVG/canvas artwork, GSAP timelines and interactions. Its component README documents mechanics and usage. **Read both, not just screenshots.** The source is React + TypeScript and uses `gsap`, `ScrollTrigger`, and `MorphSVGPlugin`; formER remains JavaScript ES modules, so convert adapted components to `.jsx` rather than adding TypeScript to the app.

The source describes these precise visual mechanics:

1. Frosted fixed header over the hero, becoming opaque after the hero; section-aware navigation underline; compact responsive burger.
2. Immersive hero with enormous editorial text animating in character-by-character; scroll-scrubbed layers, drifting clouds, a temporary white-out, and transition into another scene.
3. Deep-green high-impact feature band with oversized type, expanding colored disc and large interactive foreground artwork that subtly follows the pointer.
4. Full-screen, deep-black interactive storytelling sequence with camera movement, zoom and morph transitions between three destinations, synchronized by scroll position and clickable stage tabs.
5. Warm, dark editorial showcase with outline/display lettering, 3D hover/tilt objects and staggered overlapping floating cards with parallax and a dynamically changing caption.
6. Sticky horizontal journey strip driven by vertical scrolling, with numbered photographic/illustrated stages and scroll progress.
7. Contrasting second showcase band with alternative floating cards and a meaningful clickable interactive visual sequence (originally brewing).
8. Two large side-by-side product-like visual focal points with a structured comparison/decision area.
9. High-contrast footer featuring animated brand artwork, simple calls to action and restrained navigation.

Technical mechanisms worth preserving: GSAP scoped with `gsap.context`, `ScrollTrigger`, `MorphSVGPlugin` where useful; `position: sticky` stages rather than fragile global scroll hijacking; container-query responsive rules; `prefers-reduced-motion` still states; SVG and canvas illustration; cleanup on unmount.

## 3. Brand and visual direction

**Mood:** Cinematic, editorial, premium, expressive and interactive—without making the product feel complicated, technical, childish or untrustworthy. Visitors should immediately understand the user benefit despite the visuals.

**Reference-informed creative palette** (these are scene roles, not a mandate to recolor all app screens):

| Token | Hex | Use |
| --- | --- | --- |
| `--former-primary` | `#0071E3` | Primary CTAs, active links, product highlights; replaces reference's default coffee-red brand accent |
| `--landing-cream` | `#F5ECE1` | Warm, editorial light text and contrast bands |
| `--landing-ink` | `#0E0D0D` | Immersive dark stage, footer |
| `--landing-forest` | `#123E2C` | Signature dramatic feature band |
| `--landing-brown` | `#4A2E26` | Optional warm dark showcase band, if visually useful |
| `--landing-sky` | `#1F6FD1` | Hero's photographic/illustrated atmosphere |
| `--landing-disc` | `#2F5FE0` | Bright large graphic accent |
| `--landing-white` | `#FFFFFF` | Bright transitions and functional UI previews |
| `--landing-body-text` | `#1D1D1F` | Text on bright surfaces |

Use bold section-by-section scene contrast. **Do not flatten the entire landing page into white cards.** Apple-inspired restraint survives in legibility and CTA polish, but the coffee template is the primary landing visual inspiration. Keep blue from `#0071E3` recognizable as formER's action color, especially on CTA buttons. Make the remaining scene accents harmonious rather than forcing all artwork to blue.

**Typography:** The reference uses variable-width Archivo for main typography and thin Jost for oversized stylized titles. Both are public Google Fonts in the supplied source. Use Archivo + Jost for the public landing experience if acceptable and load efficiently. The application design system may continue using Geist/Inter. Avoid introducing proprietary Apple or Mercury fonts. Maintain huge type scales, confident tight headline rhythm, outlined giant titles and animated letter reveals. Responsive clamp sizing must avoid overflow.

**Spacing and composition:** Full-bleed scene panels; generous vertical pacing; oversized scale shifts; intentional asymmetry; background images and illustrations behind rather than boxed beside headings; precise focal points; floating layers with meaningful depth. Do not reduce the reference into a conventional hero followed by three generic feature cards.

## 4. User-focused narrative and section mapping

Each original scene is a *visual-movement reference*, not a source of coffee copy.

| Reference template | formER interpretation | Preserve |
| --- | --- | --- |
| Volcano/cloud descent hero | Enter the world of online forms: a cinematic opening with moving layers of form sheets, labels and a transition toward an elegant, readable form interface | Huge split headline, atmospheric backdrop, drifting layers, scroll descent/white-out, sticky scene, progress cue |
| “2026 New Crop” green band | **“ONCE SAVED. READY WHEN YOU ARE.”** A large visual motif of a personal-information card or stacked document silhouettes expanding over a colored disc | Forest green canvas, gigantic typography, blue disc scaling in, illustration overlap, gentle cursor lean |
| Morphing world/origins map | Three destinations for user's saved details: **Applications / Scholarships / Registrations** (wording may be adjusted). A dark, zooming *interface world* or graphical form canvas, not an irrelevant geographical map | Black stage, sophisticated camera/zoom transitions, pulsing highlight, scroll-synced tab progression, large scene captions |
| Whole-bean showcase | **“YOUR INFO.”** Saved details appear as high-quality 3D document/profile cards, with clear distinction between personal, contact, address and education info | Giant outlined type, card tilts, alternating floating cards, parallax, active center caption |
| Farm-to-cup horizontal strip | **How formER works:** Save your details → Visit a supported form → Detect questions → Check suggestions → Fill approved answers → Submit yourself | Sticky horizontal scroll strip, numbered steps, cinematic pace, progress indicator |
| Stick / brewing scene | **“WATCH IT FILL.”** A click-driven illustration shows fields being suggested, reviewed and populated in a plausible example form | Contrasting color band, selection cards, choreographed particle/flow animation, satisfying before/after transition |
| Limited edition comparison | **Save once / Fill with control** or **Profile / Extension** as two complementary sides of the experience | Twin sculptural focal points, clean comparative layout, high-impact final decision/CTA |
| Footer | Animated formER mark with simple registration CTA, documentation/privacy links as available | Large brand moment, line-drawing animation, considered typography, strong closure |

The mapping is a storytelling brief. Adapt visuals intelligently; **do not literally reproduce a coffee bag, cup, volcano statistics, shopping cart, shipping fees, fake inventory, or coffee geographic origin map with only the labels replaced.** Those would make formER confusing.

### Hero copy — preferred starting point

**Headline:** `Your details.\nEvery form.`  
**Supporting line:** `Save your information once. Get help filling online applications and registrations without typing everything again.`  
**Primary CTA:** `Get started` → working registration route.  
**Secondary CTA:** `See how it works` → in-page anchor.  
**Small helper:** `You review what gets filled.`

Use plain customer language. The reference uses two-line huge typography; preserve this structure. Do not place a long explanation about AI models in the hero.

### Other suggested customer copy

- Feature emphasis: `Less typing. More getting things done.`
- Control line: `Nothing gets submitted for you.`
- Information line: `Your name, addresses, and qualifications—organized in one place.`
- Demo section: `See how a form comes together.`
- Final CTA: `Ready to stop starting from scratch?`

Copy may be refined for layout and readability. The primary rule is truthful consumer benefit, not technological jargon.

## 5. Reference-level motion and interaction details

### Header
- Transparent/frosted against hero; smoothly changes to high-contrast opaque navigation on leaving the hero.
- Clearly visible formER wordmark/logo, section links, `Log in`, `Get started`.
- Active-section indicators follow scroll; mobile burger/menu is usable, keyboard accessible and closes on navigation.
- **No shopping bag, stock counter or commerce actions.**

### Hero
- Full viewport, multi-screen scroll timeline (`position: sticky` stage inside a tall scroll container).
- Animate characters upward on entry. Layered backgrounds move at different speeds with smooth scroll-scrubbing.
- A visually dramatic intermediate transition (mist/white-out) reveals a clean, form-oriented product scene.
- Replace the original altitude counter with **nondeceptive progress-like storytelling**, e.g. `01 / 03` scene position. Do not display fake numbers of users, forms completed or user profile completion.
- Keep ambient motion subtle enough not to compete with headline and CTAs.

### Oversized typography section
- Giant letterforms, expanding disc, interactive original SVG foreground hero artwork.
- Use stylized form/document imagery rather than low-quality generic stock screenshots.
- Preserve the reference's layered depth and pointer movement, with touch and reduced-motion fallbacks.

### Dark story stage
- Use scroll-tied zooms and transitions between three *real product use cases*.
- Tabs click through the actual stage. Keep text synchronized to animation state.
- Form graphics may be illustrative but should read clearly as sample UI. Do not claim backend matching or live account data on a public visitor page.
- Do not render unrelated countries merely because the original source has world map geometry.

### Floating showcase / interactive preview
- Preserve alternating overlapping rows, multi-speed parallax, card rotation and meaningful captions.
- At least one convincing formER product illustration: form on one side, proposed matches on the other, with a clear review step.
- Demonstrate simple, realistic form labels (e.g. `Applicant name`, `Father's name`, `Graduation percentage`); use plainly synthetic names/details, not any real user's data.
- Clear distinction between `Suggested`, `Review`, and `Not available`. Never show uncertain information silently autofilled.
- Interactive preview must be labeled as an illustration, not passed off as a live connection to a government site.

### Horizontal process strip
- Realistic steps with numbered frames, progress line, horizontally moving content driven by vertical scroll.
- On mobile and under reduced motion, switch to an accessible scrolling/tappable sequence, not broken pinning.

### Final CTA and footer
- `Get started` and `Log in` navigate to existing functioning routes.
- Do not add an email newsletter form unless a real backend exists. Do not promise an extension-install action unless a valid extension install destination exists.
- Privacy and other legal links must point to real content if displayed; otherwise don't invent them.
- No fabricated testimonials, ratings, enterprise logos, usage metrics or pricing.

## 6. Product semantics and route behavior

- `/` is public marketing page whether or not a visitor is signed in.
- `/register` and `/login` use the existing working authentication.
- The authenticated application remains protected and accessible at a clear route such as `/app` or `/dashboard`, whichever is consistent with the router. If the existing authenticated shell currently occupies `/`, migrate its routing carefully without breaking session restoration or post-login redirects.
- Nav anchors scroll to landing sections. Calls to action lead to **real** destinations. Signed-in visitors may see `Open dashboard` in place of `Get started` when appropriate.
- Public animated product illustrations must not call protected APIs or touch real user data.

## 7. Quality, performance and accessibility

- Integrate GSAP only where it produces needed fidelity; prefer source patterns and `gsap.context`/`ScrollTrigger`, with cleanup on unmount and route change.
- Use `gsap.matchMedia`/`prefers-reduced-motion`; users with reduced-motion preferences see finished, readable static scenes and can still navigate.
- Do not hijack body scroll globally or interfere with the authenticated app's scrolling.
- Optimize/lazy-load large noncritical visual elements; define image dimensions, avoid layout shifts, compress any new assets, and keep mobile GPU/memory use reasonable.
- Embedded maps or large paths from the source should not be dragged into production when the geography itself is not used.
- Main nav and interactive controls must work by keyboard and show visible focus. Use descriptive labels, semantic headings and sufficient contrast.
- Use container-based and viewport responsive strategies, with specific verification at ~1440×900, 768×1024 and 390×844.
- Avoid horizontal overflow, clipped typography, stuck scroll timelines, scroll-jacking, or animations trapped after navigating away.
- Test in real Chrome, not only a DOM mock. Check interactive links, visible controls, route navigation, cleanup and reduced motion.

## 8. Technical reuse and license

- Reference source reportedly uses the **MIT** license. Preserve the creator and license attribution as appropriate in the repository when adapting substantial portions. Do not copy unrelated trademarks or brand identity.
- Source author: Kedhareswer Naidu; original component: `Alto Coffee Template`.
- Keep source/reference files clearly separate from production code; do not publish coffee reference assets or copy as if they were formER features.
- Existing formER frontend is React + Vite + JavaScript; port adapted TSX into `.jsx` and remove type declarations/TypeScript assertions; do not switch the project to TypeScript.
- Do not blindly copy one 170KB component into app pages. Extract coherent visual components and animations while preserving timing and fidelity; keep animation and DOM concerns scoped.
- `gsap` >= 3.13 provides the referenced plugins per the source README; confirm installed version and imports.
- Photo URLs in source are externally hotlinked Unsplash coffee imagery. They are not fit for the formER product; provide original suitable art or assets with the right permissions.

## 9. Acceptance criteria

Completion requires both **visual fidelity and real customer-facing functionality**:

1. A design review comparing reference choreography, section scale, motion pacing, sticky transitions, interactive cards, horizontal strip and footer against the adapted landing page.
2. Working public landing route, working real auth CTA links and preserved existing session/login flows.
3. A clear narrative for ordinary users—no mentions of MiniLM, MongoDB, Mongoose, Argon2id, CSRF, ONNX, field registry or architecture in public-facing copy.
4. No coffee-specific leftovers, fake product metrics or misleading interactive affordances.
5. Responsive real-browser check at desktop, tablet and mobile; reduced-motion check.
6. Clean GSAP teardown, no unexpected body scroll interference or console errors.
7. Source credit/licensing retained when code reuse requires it.
8. Actual test results, screenshots and implementation limits reported; `PROGRESS.md` updated accurately.

**Do not declare the page done merely because it renders. The motion and experience are part of the design requirements.**

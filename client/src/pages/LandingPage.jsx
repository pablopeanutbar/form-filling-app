import * as React from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * formER Public Landing Page
 *
 * Adapted from the Alto Coffee Template by Kedhareswer Naidu (MIT License).
 * Transformed into the high-fidelity, cinematic consumer landing page for formER:
 * "Save your details once. Get help filling supported online forms. Review suggestions before anything is filled."
 *
 * Visual sections:
 * - Header: Frosted over the atmospheric hero, transitions solid on scroll; section-aware nav underline; responsive drawer.
 * - Hero: Cinematic descent through atmospheric clouds with letter-by-letter rising headline,
 *         HUD progress indicator, white-out veil, and arrival onto an illustrated form interface.
 * - Oversized Feature Stage ("ONCE SAVED. READY TO FILL."): Signature deep green canvas, giant typography,
 *         expanding blue disc, and stacked interactive profile cards that lean towards the cursor.
 * - Three-Destination Story Stage ("WHERE YOUR INFO GOES"): Solid dark interface matrix with zooming camera,
 *         vector path morphing between 3 use cases (Job Portals, University Admissions, Government Registrations).
 * - Floating Document Showcase ("YOUR INFO."): 3D tilting master profile cards, thin display headline,
 *         staggered multi-speed floating cards, and dynamic sticky center caption.
 * - Horizontal Process Strip ("HOW FORMER WORKS"): 6-step journey horizontally driven by vertical scroll.
 * - Interactive Simulated Autofill Preview ("WATCH IT FILL"): Real click-driven interactive form demo
 *         populating synthetic values with confidence tags and sensitive field exclusion.
 * - Dual Core Comparison: Side-by-side comparison between Web Profile Hub and Browser Extension with specs table and CTAs.
 * - Footer: Self-drawing vector formER brand mark, navigation links and privacy trust statement.
 */

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, MorphSVGPlugin);
}

// ---- Original formER Vector Mark ----
// Stylized document folded into an intelligent checkmark
export function FormerMark({ size = 32, className, title }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path d={MARK_PATH} fill="currentColor" fillRule="evenodd" />
      <path
        d={MARK_CHECK}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MARK_PATH =
  'M12 8h26l14 14v34a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Zm24 2v14h14';
const MARK_CHECK = 'M20 34l8 8 16-16';

// Equirectangular space for the interactive story matrix (1000 x 394.4)
const MATRIX_W = 1000;
const MATRIX_H = 394.4;

// Abstract canvas grid background
const MATRIX_GRID =
  'M40 80h920M40 160h920M40 240h920M40 320h920M120 40v314M240 40v314M360 40v314M480 40v314M600 40v314M720 40v314M840 40v314';

// Three distinct destination shape outlines for morphing in the story sequence
const DESTINATIONS = [
  {
    tag: 'Applications',
    category: 'Job & Career Portals',
    title: 'Career Applications',
    subtitle: 'Applicant tracking systems, job boards & company careers',
    fields: ['Candidate name', 'Contact phone', 'Resume summary', 'Notice period'],
    blurb: 'Apply across tech, corporate, and agency career pages without re-entering education and employment history from scratch.',
    box: [180, 120, 360, 280],
    // Stylized job application / briefcase document path
    d: 'M200 140h120a16 16 0 0 1 16 16v100a16 16 0 0 1-16 16H200a16 16 0 0 1-16-16V156a16 16 0 0 1 16-16Zm30-20h60a8 8 0 0 1 8 8v12h-76V128a8 8 0 0 1 8-8Zm-10 50h100M220 195h70M220 220h85'
  },
  {
    tag: 'Scholarships',
    category: 'University & Academic Portals',
    title: 'University & Scholarships',
    subtitle: 'Admissions, grants, exchange programs & fellowship forms',
    fields: ['Legal name', 'Permanent address', 'Degree & Board', 'CGPA & Passing year'],
    blurb: 'Preserves individual degrees, graduation years, percentage scales, and academic boards with contextual matching precision.',
    box: [460, 110, 640, 285],
    // Stylized graduation cap & diploma outline path
    d: 'M480 170L550 135L620 170L550 205ZM505 185v40c0 24 20 45 45 45s45-21 45-45v-40M610 175v55'
  },
  {
    tag: 'Registrations',
    category: 'Government & Public Forms',
    title: 'Official Registrations',
    subtitle: 'Competitive exams, identity verification & public registries',
    fields: ['Full legal name', 'Father & Mother name', 'District / State', 'Postal code'],
    blurb: 'Strictly isolates parent names from candidate names and distinguishes correspondence from permanent residence.',
    box: [730, 120, 910, 280],
    // Stylized official identity seal / pillar emblem path
    d: 'M750 250h140v16H750ZM760 250V160h24v90M810 250V160h24v90M860 250V160h24v90M745 160l75-40 75 40ZM800 190a20 20 0 1 0 40 0 20 20 0 0 0-40 0'
  }
];

// Helper: camera viewBox framing
function cameraFor(box, aspect, minW, pad) {
  const bw = box[2] - box[0];
  const bh = box[3] - box[1];
  const cx = box[0] + bw / 2;
  const cy = box[1] + bh / 2;
  let w = Math.max(bw * pad, minW, bh * pad * aspect);
  let h = w / aspect;
  return [cx - w / 2, cy - h / 2, w, h];
}

function toScreen(px, py, vb, sw, sh) {
  const s = Math.max(sw / vb[2], sh / vb[3]);
  const ox = (sw - vb[2] * s) / 2;
  const oy = (sh - vb[3] * s) / 2;
  return [ox + (px - vb[0]) * s, oy + (py - vb[1]) * s];
}

// Procedural value noise for smooth cloud textures
function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function noise2(x, y, period, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % period) + period) % period;
  const x1 = (x0 + 1) % period;
  const a = hash2(x0, yi, seed);
  const b = hash2(x1, yi, seed);
  const c = hash2(x0, yi + 1, seed);
  const d = hash2(x1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, period, seed, octaves) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let p = period;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise2(x, y, p, seed + o * 17);
    norm += amp;
    x *= 2;
    y *= 2;
    p *= 2;
    amp *= 0.5;
  }
  return sum / norm;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintClouds(w, h, seed, cover) {
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(w, h);
  const cells = 6;
  const field = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const band = Math.exp(-Math.pow((t - 0.58) / 0.26, 2));
    for (let x = 0; x < w; x++) {
      const wx = (x / w) * cells;
      const wy = (y / h) * cells * (h / w) * 2.4;
      const warp = fbm(wx + 3.1, wy + 7.7, cells, seed + 101, 3) - 0.5;
      const n = fbm(wx + warp * 0.9, wy + warp * 0.6, cells, seed, 5);
      field[y * w + x] = n * (0.55 + 0.75 * band) - (1 - band) * 0.18;
    }
  }
  const lo = 0.62 - cover * 0.2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const n = field[i];
      const above = field[Math.max(0, y - 5) * w + x];
      let a = (n - lo) / 0.11;
      a = a < 0 ? 0 : a > 1 ? 1 : a;
      a = a * a * (3 - 2 * a);
      const lit = Math.max(0, Math.min(1, 0.66 + (n - above) * 7));
      const c = 196 + lit * 59;
      img.data[i * 4] = c - 4;
      img.data[i * 4 + 1] = c - 1;
      img.data[i * 4 + 2] = c + 2 > 255 ? 255 : c + 2;
      img.data[i * 4 + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
}

function paintGrain() {
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = cv.height = 140;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(140, 140);
  const r = rng(7);
  for (let i = 0; i < 140 * 140; i++) {
    const v = r() * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 20;
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
}

const REDUCE = '(prefers-reduced-motion: reduce)';
const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia(REDUCE).matches;

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const uid = 'fm' + React.useId().replace(/[^a-zA-Z0-9]/g, '');

  // ---- Navigation items ----
  const navLinks = [
    { label: 'Overview', href: '#top' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Interactive Demo', href: '#demo' }
  ];

  // ---- Six-step journey data ----
  const processSteps = [
    {
      step: '01',
      title: 'Save Info Once',
      body: 'Enter your personal details, contact coordinates, and qualifications in your private profile.',
      tag: 'One-time setup'
    },
    {
      step: '02',
      title: 'Navigate Any Form',
      body: 'Open job portals, college applications, or registration sites directly in your browser.',
      tag: 'Supported pages'
    },
    {
      step: '03',
      title: 'Detect Questions',
      body: 'The formER extension inspects labels, fieldsets, and options without reading entered secrets.',
      tag: 'Zero-data scan'
    },
    {
      step: '04',
      title: 'Semantic Matching',
      body: 'Our hybrid deterministic and local ML engine maps each question to your canonical record.',
      tag: 'MiniLM embeddings'
    },
    {
      step: '05',
      title: 'Review Suggestions',
      body: 'High-confidence matches are shown clearly; uncertain or ambiguous questions ask for your choice.',
      tag: 'Explicit review'
    },
    {
      step: '06',
      title: 'Fill With Control',
      body: 'Approved values populate into the inputs. You review the complete page and submit it yourself.',
      tag: 'User submit only'
    }
  ];

  // ---- Interactive simulated demo presets ----
  const demoScenarios = [
    {
      id: 'job',
      title: 'Job Application',
      subtitle: 'Engineering Role at Acme Corp',
      fields: [
        { id: 'f_name', label: 'Candidate Full Name', value: 'Alex Morgan', confidence: 'MATCHED' },
        { id: 'f_email', label: 'Primary Contact Email', value: 'alex.morgan@example.com', confidence: 'MATCHED' },
        { id: 'f_deg', label: 'Highest Degree Obtained', value: 'B.Tech in Computer Science', confidence: 'MATCHED' },
        { id: 'f_gpa', label: 'Final Cumulative Grade / Percentage', value: '8.85 CGPA', confidence: 'NEEDS_REVIEW', note: 'Verify CGPA scale' }
      ]
    },
    {
      id: 'scholarship',
      title: 'University Scholarship',
      subtitle: 'Global Excellence Fellowship Portal',
      fields: [
        { id: 's_name', label: 'Applicant Legal Name', value: 'Alex Morgan', confidence: 'MATCHED' },
        { id: 's_phone', label: 'Mobile Number (+ Country Code)', value: '+1 (555) 019-2834', confidence: 'MATCHED' },
        { id: 's_addr', label: 'Permanent Home Address', value: '742 Evergreen Terrace, Springfield', confidence: 'MATCHED' },
        { id: 's_stream', label: 'Undergraduate Specialization', value: 'Software Systems', confidence: 'MATCHED' }
      ]
    },
    {
      id: 'registration',
      title: 'Exam Registration',
      subtitle: 'National Licensing Board Portal',
      fields: [
        { id: 'r_name', label: 'Candidate Name', value: 'Alex Morgan', confidence: 'MATCHED' },
        { id: 'r_father', label: "Father's Full Name", value: 'Arthur Morgan', confidence: 'MATCHED' },
        { id: 'r_pin', label: 'Postal Zip Code', value: '97477', confidence: 'MATCHED' },
        { id: 'r_state', label: 'State / Province', value: 'Oregon', confidence: 'MATCHED' }
      ]
    }
  ];

  // ---- State ----
  const [clouds, setClouds] = React.useState(['', '', '']);
  const [grain, setGrain] = React.useState('');
  const [solid, setSolid] = React.useState(false);
  const [active, setActive] = React.useState('');
  const [menu, setMenu] = React.useState(false);
  const [storyStep, setStoryStep] = React.useState(0);
  const [selectedDemo, setSelectedDemo] = React.useState('job');
  const [isDemoFilled, setIsDemoFilled] = React.useState(false);
  const [isAutofilling, setIsAutofilling] = React.useState(false);

  const rootRef = React.useRef(null);
  const ctxRef = React.useRef(null);
  const storyRef = React.useRef(0);
  const storyNav = React.useRef(null);
  const menuButtonRef = React.useRef(null);
  const headerRef = React.useRef(null);

  React.useEffect(() => {
    if (!menu) return;
    const dismissOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenu(false);
        menuButtonRef.current?.focus();
      }
    };
    const dismissOutside = (event) => {
      if (!headerRef.current?.contains(event.target)) setMenu(false);
    };
    document.addEventListener('keydown', dismissOnEscape);
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    return () => {
      document.removeEventListener('keydown', dismissOnEscape);
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
    };
  }, [menu]);

  // Generate seamless procedural textures once
  React.useLayoutEffect(() => {
    try {
      setClouds([
        paintClouds(880, 300, 3, 0.35),
        paintClouds(880, 300, 8, 0.6),
        paintClouds(880, 300, 21, 0.85)
      ]);
      setGrain(paintGrain());
    } catch {
      // Fallback gracefully if canvas context restricted
    }
  }, []);

  // Smooth scroll handler
  const scrollToSec = React.useCallback((href) => {
    const root = rootRef.current;
    if (!root || !href.startsWith('#')) return;
    const el = root.querySelector(`[data-sec="${href.slice(1)}"]`);
    setMenu(false);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - (href === '#top' ? 0 : 64);
    window.scrollTo({ top, behavior: prefersReduced() ? 'auto' : 'smooth' });
  }, []);

  const handleLinkClick = (href) => (e) => {
    e.preventDefault();
    scrollToSec(href);
  };

  // ---- GSAP Scroll Animations ----
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (s) => root.querySelector(s);
    const qa = (s) => Array.from(root.querySelectorAll(s));
    const cleanups = [];

    const ctx = gsap.context(() => {
      // Header transparency & active navigation state
      ScrollTrigger.create({
        trigger: q('.ac-hero'),
        start: 'bottom top+=72',
        onEnter: () => setSolid(true),
        onLeaveBack: () => setSolid(false)
      });

      for (const sec of qa('[data-nav]')) {
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 50%',
          end: 'bottom 50%',
          onToggle: (self) => self.isActive && setActive(sec.getAttribute('data-nav') || ''),
          onLeaveBack: () => sec.getAttribute('data-nav') === 'story' && setActive('')
        });
      }

      // Camera & SVG setup for 3-destination story sequence
      const svg = q('.ac-map-svg');
      const morph = q('.ac-map-morph');
      const pin = q('.ac-map-pin');
      const stage = q('.ac-map-stage');
      const cam = { x: 0, y: 0, w: MATRIX_W, h: MATRIX_H };
      const aspect = () => (stage ? stage.clientWidth / Math.max(1, stage.clientHeight) : 16 / 9);

      const camAt = (i) => {
        const a = aspect();
        if (i < 0) return cameraFor([20, 20, 980, 360], a, a < 1 ? 560 : 900, 1);
        const c = cameraFor(DESTINATIONS[i].box, a, a < 1 ? 220 : 380, a < 1 ? 3.2 : 5.5);
        c[1] += c[3] * 0.08;
        return c;
      };

      const applyCam = () => {
        if (!svg || !stage) return;
        const vb = [cam.x, cam.y, cam.w, cam.h];
        svg.setAttribute('viewBox', vb.map((v) => v.toFixed(2)).join(' '));
        if (morph && pin) {
          const bb = morph.getBBox();
          const [sx, sy] = toScreen(
            bb.x + bb.width / 2,
            bb.y + bb.height / 2,
            vb,
            stage.clientWidth,
            stage.clientHeight
          );
          pin.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
        }
      };

      const setCam = (c) => {
        cam.x = c[0];
        cam.y = c[1];
        cam.w = c[2];
        cam.h = c[3];
        applyCam();
      };

      const stillStory = (i) => {
        if (morph) morph.setAttribute('d', DESTINATIONS[Math.max(0, i)].d);
        gsap.set(morph, { scale: 1, opacity: 1 });
        setCam(camAt(Math.max(0, i)));
      };

      const mm = gsap.matchMedia();

      // Reduced-motion mode
      mm.add(REDUCE, () => {
        stillStory(storyRef.current);
        storyNav.current = {
          go: (i) => {
            storyRef.current = i;
            setStoryStep(i);
            stillStory(i);
          }
        };
        const onResize = () => stillStory(storyRef.current);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      });

      // Standard animation timeline
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Hero Descent Timeline
        const progressEl = q('[data-stage-num]');
        const marker = q('.ac-hud-mark');

        const updateHUD = (p) => {
          const clamped = Math.min(1, Math.max(0, p));
          if (progressEl) {
            const stepNum = clamped < 0.35 ? '01' : clamped < 0.72 ? '02' : '03';
            progressEl.textContent = stepNum;
          }
          if (marker) {
            marker.style.transform = `translateY(${(clamped * 100).toFixed(2)}%)`;
          }
        };

        gsap.from(qa('.ac-hero-char'), {
          yPercent: 110,
          opacity: 0,
          duration: 1.1,
          ease: 'power4.out',
          stagger: 0.035,
          delay: 0.15
        });

        gsap.from(q('.ac-hud-read'), { opacity: 0, x: 20, duration: 1, delay: 0.8, ease: 'power3.out' });

        const heroTl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: q('.ac-hero'),
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.7
          },
          onUpdate: () => updateHUD((heroTl.time() - 0.6) / 5.4)
        });

        heroTl
          .to(q('.ac-hero-title'), { yPercent: -60, opacity: 0, duration: 2.2, ease: 'power1.in' }, 0.6)
          .to(q('.ac-hero-cue'), { opacity: 0, duration: 0.6 }, 0)
          .fromTo(q('.ac-cloud-back'), { yPercent: 6 }, { yPercent: -60, duration: 5.5 }, 0)
          .fromTo(q('.ac-cloud-mid'), { yPercent: 28 }, { yPercent: -70, duration: 5.5 }, 0)
          .fromTo(q('.ac-cloud-front'), { yPercent: 62, scale: 1 }, { yPercent: -40, scale: 1.6, duration: 5.5 }, 0)
          .to(q('.ac-veil'), { opacity: 1, duration: 1.6, ease: 'power1.in' }, 2.4)
          .fromTo(q('.ac-alt-cap'), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, 3.4)
          .set(qa('.ac-cloud'), { opacity: 0 }, 4.6)
          .set(q('.ac-field'), { opacity: 1 }, 4.6)
          .to(q('.ac-alt-cap'), { opacity: 0, y: -50, duration: 1, ease: 'power2.in' }, 5.6)
          .fromTo(q('.ac-field'), { yPercent: 55, scale: 1.25 }, { yPercent: 0, scale: 1, duration: 2.8, ease: 'power2.out' }, 5.2)
          .to(q('.ac-veil'), { opacity: 0, duration: 1.8, ease: 'power1.out' }, 5.4)
          .fromTo(q('.ac-field-cap'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, 7.2)
          .to(q('.ac-hud'), { color: '#ffffff', duration: 0.6 }, 5.4)
          .to({}, { duration: 1.6 }, 8.2);

        // Only the new CTA fades out; existing scene timings and headline motion stay intact.
        heroTl.to(q('.ac-hero-cta'), { autoAlpha: 0, y: -24, duration: 1.2, ease: 'power1.in' }, 0.6);

        // Feature Stage: ONCE SAVED. READY TO FILL.
        gsap.from(qa('.ac-crop-char'), {
          yPercent: 105,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.04,
          scrollTrigger: { trigger: q('.ac-crop'), start: 'top 70%' }
        });

        gsap.fromTo(
          q('.ac-cherry-wrap'),
          { scale: 0.5, rotate: -20, yPercent: 35 },
          {
            scale: 1,
            rotate: 0,
            yPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger: q('.ac-crop'), start: 'top 90%', end: 'center 50%', scrub: 0.8 }
          }
        );

        gsap.fromTo(
          q('.ac-disc'),
          { scale: 0 },
          {
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: q('.ac-crop'), start: 'top 80%', end: 'center 55%', scrub: 0.6 }
          }
        );

        // Interactive pointer tracking for profile stack
        const cropSec = q('.ac-crop');
        const stackLean = q('.ac-cherry-lean');
        if (cropSec && stackLean && window.matchMedia('(pointer: fine)').matches) {
          const qx = gsap.quickTo(stackLean, 'x', { duration: 0.9, ease: 'power3.out' });
          const qy = gsap.quickTo(stackLean, 'y', { duration: 0.9, ease: 'power3.out' });
          const qr = gsap.quickTo(stackLean, 'rotate', { duration: 1.2, ease: 'power3.out' });
          const onMove = (e) => {
            const r = cropSec.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            qx(nx * 36);
            qy(ny * 22);
            qr(nx * 6);
          };
          const onLeave = () => {
            qx(0);
            qy(0);
            qr(0);
          };
          cropSec.addEventListener('pointermove', onMove);
          cropSec.addEventListener('pointerleave', onLeave);
          cleanups.push(() => {
            cropSec.removeEventListener('pointermove', onMove);
            cropSec.removeEventListener('pointerleave', onLeave);
          });
        }

        // Story Section: Camera zooming & path morphing
        if (svg && morph && stage) {
          morph.setAttribute('d', DESTINATIONS[0].d);
          gsap.set(morph, { scale: 0, opacity: 0, transformOrigin: '50% 50%' });
          setCam(camAt(-1));
          storyRef.current = -1;
          setStoryStep(-1);

          const arrivals = [];
          const mt = gsap.timeline({
            defaults: { ease: 'power2.inOut' },
            onUpdate: () => syncStory()
          });

          mt.to({}, { duration: 0.7 });

          for (let i = 0; i < DESTINATIONS.length; i++) {
            if (i === 0) {
              mt.to(cam, {
                x: () => camAt(0)[0],
                y: () => camAt(0)[1],
                w: () => camAt(0)[2],
                h: () => camAt(0)[3],
                duration: 1.1,
                onUpdate: applyCam
              });
              mt.to(morph, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.6)' }, '-=0.5');
            } else {
              const at = mt.duration();
              const mid = () => {
                const a = camAt(i - 1);
                const b = camAt(i);
                const w = Math.max(a[2], b[2], Math.abs(b[0] - a[0]) * 1.5);
                const h = w / aspect();
                return [
                  (a[0] + a[2] / 2 + b[0] + b[2] / 2) / 2 - w / 2,
                  (a[1] + a[3] / 2 + b[1] + b[3] / 2) / 2 - h / 2,
                  w,
                  h
                ];
              };
              mt.to(
                cam,
                {
                  x: () => mid()[0],
                  y: () => mid()[1],
                  w: () => mid()[2],
                  h: () => mid()[3],
                  duration: 0.6,
                  ease: 'power2.in',
                  onUpdate: applyCam
                },
                at
              );
              mt.to(cam, {
                x: () => camAt(i)[0],
                y: () => camAt(i)[1],
                w: () => camAt(i)[2],
                h: () => camAt(i)[3],
                duration: 0.7,
                ease: 'power2.out',
                onUpdate: applyCam
              });
              mt.to(
                morph,
                {
                  morphSVG: { shape: DESTINATIONS[i].d, type: 'rotational' },
                  duration: 1.2,
                  ease: 'power1.inOut',
                  onUpdate: applyCam
                },
                at + 0.05
              );
            }
            arrivals.push(mt.duration());
            mt.to({}, { duration: 0.9 });
          }

          const storyST = ScrollTrigger.create({
            trigger: q('.ac-origins'),
            start: 'top top',
            end: 'bottom bottom',
            animation: mt,
            scrub: 0.8,
            invalidateOnRefresh: true
          });

          function syncStory() {
            const t = mt.time();
            let idx = -1;
            for (let k = 0; k < arrivals.length; k++) {
              if (t >= arrivals[k] - (k === 0 ? 0.75 : 0.62)) idx = k;
            }
            if (idx !== storyRef.current) {
              storyRef.current = idx;
              setStoryStep(idx);
            }
          }

          storyNav.current = {
            go: (i) => {
              const top = storyST.start + ((arrivals[i] + 0.3) / mt.duration()) * (storyST.end - storyST.start);
              window.scrollTo({ top, behavior: 'smooth' });
            }
          };

          const onResize = () => applyCam();
          window.addEventListener('resize', onResize);
          cleanups.push(() => window.removeEventListener('resize', onResize));
        }

        // Display Titles & Staggered Letter Reveals
        for (const el of qa('.ac-display')) {
          gsap.from(el.querySelectorAll('.ac-display-char'), {
            yPercent: 110,
            duration: 1.1,
            ease: 'power4.out',
            stagger: 0.05,
            scrollTrigger: { trigger: el, start: 'top 80%' }
          });
          gsap.fromTo(
            el,
            { letterSpacing: '0.12em' },
            {
              letterSpacing: '0em',
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom 40%', scrub: 0.8 }
            }
          );
        }

        // Horizontal Strip: Vertical scroll drives horizontal movement
        const track = q('.ac-strip-track');
        const stripStage = q('.ac-strip-stage');
        if (track && stripStage) {
          gsap.to(track, {
            x: () => -Math.max(0, track.scrollWidth - stripStage.clientWidth),
            ease: 'none',
            scrollTrigger: {
              trigger: q('.ac-strip'),
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.6,
              invalidateOnRefresh: true
            }
          });
          gsap.fromTo(
            q('.ac-strip-bar i'),
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: 'none',
              scrollTrigger: { trigger: q('.ac-strip'), start: 'top top', end: 'bottom bottom', scrub: 0.6 }
            }
          );
        }

        // Footer: Self-drawing logo outline animation
        const outline = q('.ac-foot-outline');
        if (outline) {
          const len = outline.getTotalLength();
          gsap.set(outline, { strokeDasharray: len, strokeDashoffset: len });
          const ft = gsap.timeline({ scrollTrigger: { trigger: q('.ac-foot'), start: 'top 75%' } });
          ft.to(outline, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' })
            .from(q('.ac-foot-fill'), { opacity: 0, duration: 0.8 }, '-=0.5');
        }

        // Generic rise reveals
        for (const el of qa('[data-rise]')) {
          gsap.from(el, {
            y: 44,
            opacity: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%' }
          });
        }
      });
    }, root);

    ctxRef.current = ctx;
    const refresh = () => ScrollTrigger.refresh();
    const t = window.setTimeout(refresh, 400);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(refresh);
    }
    return () => {
      window.clearTimeout(t);
      for (const fn of cleanups) fn();
      ctx.revert();
      ctxRef.current = null;
    };
  }, []);

  // Simulated Autofill Animation Sequence
  const handleAutofillTrigger = () => {
    if (isAutofilling) return;
    setIsAutofilling(true);
    setIsDemoFilled(false);

    window.setTimeout(() => {
      setIsDemoFilled(true);
      setIsAutofilling(false);
    }, 750);
  };

  const handleResetDemo = () => {
    setIsDemoFilled(false);
    setIsAutofilling(false);
  };

  const chars = (text, cls) => {
    const words = text.split(' ');
    return words.map((word, wIdx) => (
      <React.Fragment key={wIdx}>
        <span className="ac-word" aria-hidden="true">
          {Array.from(word).map((ch, cIdx) => (
            <span key={cIdx} className={cls} aria-hidden="true">
              {ch}
            </span>
          ))}
        </span>
        {wIdx < words.length - 1 && ' '}
      </React.Fragment>
    ));
  };

  const activeDemoData = demoScenarios.find((s) => s.id === selectedDemo) || demoScenarios[0];

  return (
    <div
      ref={rootRef}
      className="ac-root"
      style={{
        '--h': '100svh',
        '--ac-accent': '#0071E3',
        '--ac-cream': '#F5ECE1',
        '--ac-brown': '#161B22',
        '--ac-deep': '#141923',
        '--ac-ink': '#0E0D0D',
        '--ac-crop': '#123E2C',
        '--ac-disc': '#2F5FE0',
        '--ac-skyTop': '#1F6FD1',
        '--ac-skyBottom': '#E9F3FB',
        '--ac-sans': "'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        '--ac-display': "'Jost', 'Futura', 'Century Gothic', 'Avenir Next', sans-serif",
        '--ac-grain': grain ? `url(${grain})` : 'none'
      }}
    >
      <style>{CSS}</style>

      <div className="ac-page">
        {/* ---- Header ---- */}
        <header ref={headerRef} className={`ac-head${solid ? ' is-solid' : ''}`}>
          <a className="ac-logo" href="#top" onClick={handleLinkClick('#top')} aria-label="formER home">
            <FormerMark size={28} className="ac-logo-mark text-primary" />
            <span className="tracking-tight text-white font-bold text-base">formER</span>
          </a>

          <nav className="ac-nav" aria-label="Landing Sections">
            {navLinks.map((l) => (
              <a
                key={l.href + l.label}
                href={l.href}
                onClick={handleLinkClick(l.href)}
                aria-current={active === l.href.slice(1) ? 'true' : undefined}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="ac-head-end">
            <div className="ac-head-auth">
            {isAuthenticated ? (
              <Link to="/app" className="ac-pill">
                <span>Open dashboard</span>
                <b>→</b>
              </Link>
            ) : (
              <>
                <Link to="/login" className="ac-login-link">
                  Log in
                </Link>
                <Link to="/register" className="ac-pill">
                  <span>Sign up</span>
                  <b>→</b>
                </Link>
              </>
            )}
            </div>
            <button
              ref={menuButtonRef}
              type="button"
              className="ac-burger"
              aria-expanded={menu}
              aria-controls={`${uid}-navigation`}
              aria-label={menu ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMenu((m) => !m)}
            >
              <i />
              <i />
            </button>
          </div>

          <nav id={`${uid}-navigation`} className={`ac-menu${menu ? ' is-open' : ''}`} hidden={!menu} aria-label="Mobile navigation">
            {navLinks.map((l) => (
              <a key={l.href + l.label} href={l.href} onClick={handleLinkClick(l.href)}>
                {l.label}
              </a>
            ))}
            <div className="pt-2 mt-2 border-t border-white/10 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link to="/app" className="ac-pill" onClick={() => setMenu(false)}>
                  <span>Open dashboard</span><b aria-hidden="true">→</b>
                </Link>
              ) : (
                <>
                  <Link to="/login" className="ac-login-link" onClick={() => setMenu(false)}>
                    Log in
                  </Link>
                  <Link to="/register" className="ac-pill" onClick={() => setMenu(false)}>
                    <span>Sign up</span><b aria-hidden="true">→</b>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        {/* ---- Hero: The Descent into the Form World ---- */}
        <section className="ac-hero" data-sec="top" aria-label="Your details. Every form.">
          <div className="ac-hero-stage">
            <div className="ac-sky" />

            {/* Stylized elevation horizon geometry */}
            <svg className="ac-peak" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <defs>
                <linearGradient id={uid + 'horizon'} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#1E3A5F" />
                  <stop offset="1" stopColor="#0B1524" />
                </linearGradient>
              </defs>
              <path
                d="M-40 1000L-40 780C260 740 540 600 720 480L800 430L880 480C1060 600 1340 740 1640 780L1640 1000Z"
                fill={`url(#${uid}horizon)`}
              />
              <path
                d="M-60 1000L-60 840C200 810 500 700 800 620C1100 700 1400 810 1660 840L1660 1000Z"
                fill="#122338"
                opacity="0.8"
              />
            </svg>

            {/* 3 Cloud Bands */}
            <div className="ac-cloud ac-cloud-back" style={{ opacity: clouds[0] ? 0.9 : 0 }}>
              <i style={{ backgroundImage: clouds[0] ? `url(${clouds[0]})` : undefined }} />
            </div>

            {/* Hero Main Headline */}
            <div className="ac-hero-intro">
              <h1 className="ac-hero-title" aria-label="Your details. Every form.">
                <span className="ac-line">{chars('Your details.', 'ac-hero-char')}</span>
                <span className="ac-line">{chars('Every form.', 'ac-hero-char')}</span>
              </h1>
              <div className="ac-hero-cta">
                <Link to={isAuthenticated ? '/app' : '/register'} className="ac-pill ac-hero-button">
                  <span>{isAuthenticated ? 'Go to dashboard' : 'Get started'}</span>
                  <b aria-hidden="true">→</b>
                </Link>
              </div>
            </div>

            <div className="ac-cloud ac-cloud-mid" style={{ opacity: clouds[1] ? 1 : 0 }}>
              <i style={{ backgroundImage: clouds[1] ? `url(${clouds[1]})` : undefined }} />
            </div>
            <div className="ac-cloud ac-cloud-front" style={{ opacity: clouds[2] ? 1 : 0 }}>
              <i style={{ backgroundImage: clouds[2] ? `url(${clouds[2]})` : undefined }} />
            </div>

            {/* Form Interface Revealed after the Cloud Descent */}
            <div className="ac-field">
              <HeroFormInterface uid={uid} />
            </div>

            {/* Intermediate White-out Transition Veil */}
            <div className="ac-veil" />

            {/* Step Readiness Indicator during the transition */}
            <div className="ac-alt-cap">
              <p className="ac-alt-label">Journey Phase</p>
              <p className="ac-alt-big">
                <span data-stage-num>01</span>
                <small>/ 03</small>
              </p>
              <p className="ac-alt-soil">1. Stored Profile → 2. Field Match → 3. Verified Fill</p>
            </div>

            {/* Form Sheet Arrival Caption */}
            <div className="ac-field-cap">
              <p className="ac-eyebrow">Zero re-typing</p>
            </div>

            {/* Right HUD Scale */}
            <div className="ac-hud" aria-hidden="true">
              <div className="ac-hud-scale">
                <span>01</span>
                <div className="ac-hud-rail">
                  <i className="ac-hud-mark" />
                </div>
                <span>03</span>
              </div>
              <div className="ac-hud-read">
                <span>
                  Phase <b data-stage-num>01</b>
                </span>
                <small>Form Intelligence</small>
                <small>Readiness Matrix</small>
              </div>
            </div>

            <div className="ac-hero-cue" aria-hidden="true">
              <span>Scroll to enter</span>
              <i />
            </div>

            <div className="ac-grain" />
          </div>
        </section>

        {/* ---- Oversized Feature Stage: ONCE SAVED. READY TO FILL. ---- */}
        <section className="ac-crop" data-sec="crop">
          <div className="ac-crop-stage">
            <span className="ac-disc" aria-hidden="true" />
            <h2 className="ac-crop-title" aria-label="ONCE SAVED. READY TO FILL.">
              <span className="ac-line">{chars('ONCE SAVED.', 'ac-crop-char')}</span>
              <span className="ac-line">{chars('READY TO FILL.', 'ac-crop-char')}</span>
            </h2>
            <span className="ac-cherry-wrap" aria-hidden="true">
              <span className="ac-cherry-lean">
                <ProfileStackArt uid={uid} />
              </span>
            </span>
          </div>

          <p className="ac-crop-body" data-rise>
            Save your information once. Get help filling online applications and registrations without typing
            everything from scratch. You review and approve suggestions before anything is filled.
          </p>

          <dl className="ac-crop-stats" data-rise>
            <div>
              <dt>Single Store</dt>
              <dd>1 Master Profile</dd>
            </div>
            <div>
              <dt>Assisted Matching</dt>
              <dd>0 Guesswork</dd>
            </div>
            <div>
              <dt>Consent First</dt>
              <dd>100% User Control</dd>
            </div>
          </dl>
        </section>

        {/* ---- Three-Destination Story Sequence: WHERE YOUR INFO GOES ---- */}
        <section
          className="ac-origins"
          data-sec="story"
          data-nav="story"
          style={{ '--steps': DESTINATIONS.length }}
          aria-label="Where formER helps you"
        >
          <div className="ac-map-stage">
            {/* Interactive Vector Interface Matrix */}
            <svg
              className="ac-map-svg"
              viewBox={`0 0 ${MATRIX_W} ${MATRIX_H}`}
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <path className="ac-map-land" d={MATRIX_GRID} />
              {DESTINATIONS.map((dest, i) => (
                <path
                  key={i}
                  className={`ac-map-ghost${i === storyStep ? ' is-on' : ''}`}
                  d={dest.d}
                />
              ))}
              <path className="ac-map-morph" d={DESTINATIONS[0].d} />
            </svg>

            {/* Target Pulse Indicator */}
            <div className="ac-map-pin" aria-hidden="true" style={{ opacity: storyStep >= 0 ? 1 : 0 }}>
              <i />
              <i />
            </div>

            <div className="ac-map-shade" />

            {/* Introductory scene caption */}
            <div className={`ac-map-intro${storyStep < 0 ? ' is-on' : ''}`}>
              <p className="ac-map-kicker">
                <FormerMark size={18} className="text-primary inline-block mr-2" />
                Three Core Form Universes
              </p>
              <h2>One profile. Countless online forms.</h2>
              <p>Scroll to explore how your canonical profile maps to real-world applications, admissions, and portals.</p>
            </div>

            {/* Destination Detail Cards */}
            {DESTINATIONS.map((dest, i) => (
              <article
                key={dest.tag + i}
                className={`ac-map-cap${i === storyStep ? ' is-on' : ''}`}
                aria-hidden={i !== storyStep}
              >
                <p className="ac-map-year">{dest.tag.toUpperCase()}</p>
                <h3>{dest.title}</h3>
                <p className="ac-map-meta">{dest.subtitle}</p>
                <p className="ac-map-blurb">{dest.blurb}</p>
                <ul>
                  {dest.fields.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </article>
            ))}

            {/* Right-side Step Tabs */}
            <div className="ac-map-years" role="tablist" aria-label="Use case destinations">
              {DESTINATIONS.map((dest, i) => (
                <button
                  key={dest.tag + i}
                  type="button"
                  role="tab"
                  aria-selected={i === storyStep}
                  className={i === storyStep ? 'is-on' : undefined}
                  onClick={() => storyNav.current?.go(i)}
                >
                  <span>{dest.tag}</span>
                  <small>{dest.category}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Horizontal Process Strip: HOW FORMER WORKS ---- */}
        <section className="ac-strip" data-sec="how-it-works" data-nav="how-it-works" aria-label="How formER works">
          <div className="ac-strip-stage">
            <div className="ac-strip-head">
              <h2>How formER works</h2>
              <p>Six straightforward steps between having your details and completing an online form.</p>
              <div className="ac-strip-bar" aria-hidden="true">
                <i />
              </div>
            </div>

            <ol className="ac-strip-track">
              {processSteps.map((s, i) => (
                <li key={s.step} className="ac-step" data-tone={i % 4}>
                  <div className="ac-step-pic">
                    <span className="ac-step-n">{s.step}</span>
                    <StepIconNumber num={s.step} />
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                  <b>{s.tag}</b>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---- Interactive Simulated Autofill Preview: WATCH IT FILL. ---- */}
        <section className="ac-stick" data-sec="demo" data-nav="demo">
          <div className="ac-show">
            <p className="ac-show-pill">Interactive Live Demonstration</p>
            <h2 className="ac-display ac-display-red" aria-label="WATCH IT ASSIST YOU.">
              <span className="ac-line">{chars('WATCH IT', 'ac-display-char')}</span>
              <span className="ac-line">{chars('ASSIST YOU.', 'ac-display-char')}</span>
            </h2>
            <p className="ac-show-sub" data-rise>
              Select a real-world scenario below and trigger the simulated autofill. Watch how formER flags matches,
              requires review for ambiguities, and leaves sensitive controls untouched.
            </p>
          </div>

          <div className="ac-demo-container" data-rise>
            {/* Scenario Picker Pills */}
            <div className="ac-demo-tabs">
              {demoScenarios.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  className={`ac-demo-tab${selectedDemo === sc.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setSelectedDemo(sc.id);
                    setIsDemoFilled(false);
                  }}
                >
                  <span>{sc.title}</span>
                  <small>{sc.subtitle}</small>
                </button>
              ))}
            </div>

            {/* Side-by-side interactive demo stage */}
            <div className="ac-demo-stage">
              {/* Form Side */}
              <div className="ac-demo-form-card">
                <div className="ac-demo-form-header">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs text-white/50 font-mono">web-form.example.org</span>
                </div>

                <div className="p-6 space-y-4">
                  <h4 className="text-lg font-semibold text-white">{activeDemoData.title}</h4>
                  <p className="text-xs text-white/60 mb-4">{activeDemoData.subtitle}</p>

                  {activeDemoData.fields.map((fld) => (
                    <div key={fld.id} className="space-y-1 text-left">
                      <div className="flex items-center justify-between text-xs">
                        <label className="text-white/80 font-medium">{fld.label}</label>
                        {isDemoFilled && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              fld.confidence === 'MATCHED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {fld.confidence === 'MATCHED' ? '✓ Matched (98%)' : '⚠ Review needed'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        readOnly
                        placeholder={`Enter ${fld.label.toLowerCase()}`}
                        value={isDemoFilled ? fld.value : ''}
                        className={`w-full h-10 px-3 rounded-lg text-sm bg-black/40 border transition-all duration-300 ${
                          isDemoFilled
                            ? fld.confidence === 'MATCHED'
                              ? 'border-emerald-500 text-white bg-emerald-950/20'
                              : 'border-amber-500 text-white bg-amber-950/20'
                            : 'border-white/10 text-white/50'
                        }`}
                      />
                      {isDemoFilled && fld.note && (
                        <p className="text-[11px] text-amber-300/80 italic mt-0.5">ℹ {fld.note}</p>
                      )}
                    </div>
                  ))}

                  {/* Excluded sensitive control */}
                  <div className="space-y-1 text-left pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-white/60">Security Verification (CAPTCHA)</label>
                      <span className="text-[10px] text-white/40 font-mono">Excluded</span>
                    </div>
                    <div className="h-10 px-3 rounded-lg bg-black/20 border border-white/5 flex items-center justify-between text-xs text-white/40">
                      <span>I am human challenge</span>
                      <span className="text-[11px] text-primary">Never touched by formER</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assistant Side */}
              <div className="ac-demo-assistant-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                    <FormerMark size={18} />
                  </div>
                  <div>
                    <h5 className="font-semibold text-white text-sm">formER Assistant</h5>
                    <p className="text-[11px] text-white/60">Active in-page inspection</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-left mb-6">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-white/60">Fields Detected:</p>
                    <p className="font-semibold text-white text-sm">
                      {activeDemoData.fields.length} form inputs + 1 excluded security check
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-white/60">Matching Protocol:</p>
                    <p className="font-semibold text-emerald-400">
                      Deterministic aliases + MiniLM embeddings
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="ac-btn w-full"
                    onClick={handleAutofillTrigger}
                    disabled={isAutofilling}
                  >
                    {isAutofilling
                      ? 'Analyzing & Filling…'
                      : isDemoFilled
                      ? 'Re-run Autofill'
                      : 'Autofill with formER'}
                  </button>

                  {isDemoFilled && (
                    <button
                      type="button"
                      className="text-xs text-white/60 hover:text-white py-2 transition-colors"
                      onClick={handleResetDemo}
                    >
                      Clear form
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-white/40 text-center mt-4">
                  Notice: Synthetic demo data only. formER operates solely on user consent.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="ac-foot" data-sec="footer">
          {/* Self-drawing FormerMark */}
          <svg className="ac-foot-mark" viewBox="0 0 64 64" aria-hidden="true">
            <path className="ac-foot-fill" d={MARK_PATH} fillRule="evenodd" />
            <path className="ac-foot-outline" d={MARK_PATH} />
            <path
              className="ac-foot-handle"
              d={MARK_CHECK}
              fill="none"
              stroke="#0071E3"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>

          <p className="ac-foot-line">Your details. Every form. Under your control.</p>

          <div className="ac-foot-cols">
            <div>
              <h3>Product</h3>
              <ul>
                <li>
                  <a href="#top" onClick={handleLinkClick('#top')}>
                    Overview
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" onClick={handleLinkClick('#how-it-works')}>
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#demo" onClick={handleLinkClick('#demo')}>
                    Interactive Demo
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3>Account</h3>
              <ul>
                <li>
                  <Link to="/login">Sign in</Link>
                </li>
                <li>
                  <Link to="/register">Create an account</Link>
                </li>
                {isAuthenticated && (
                  <li>
                    <Link to="/app">Dashboard</Link>
                  </li>
                )}
              </ul>
            </div>

          </div>

          <div className="ac-foot-base">
            <span className="ac-foot-word">
              <FormerMark size={20} className="text-primary inline-block mr-1" /> formER
            </span>
            <span className="ac-foot-social">
              <span className="opacity-60 text-xs">Privacy by design &bull; Consent first</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

// ---- Subcomponents ----

/** Illustrated Form Document Sheet revealed after cloud white-out in Hero */
function HeroFormInterface({ uid }) {
  return (
    <svg className="ac-field-art" viewBox="360 240 880 760" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id={uid + 'sheetBg'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F5F5F7" />
        </linearGradient>
      </defs>
      <rect x="360" y="240" width="880" height="760" rx="24" fill={`url(#${uid}sheetBg)`} />
      <rect x="420" y="300" width="320" height="24" rx="6" fill="#0071E3" opacity="0.9" />
      <rect x="420" y="340" width="480" height="12" rx="4" fill="#C7C7CC" opacity="0.5" />
      <rect x="420" y="390" width="760" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
      <rect x="440" y="408" width="180" height="16" rx="4" fill="#0071E3" opacity="0.2" />
      <rect x="420" y="470" width="360" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
      <rect x="440" y="488" width="140" height="16" rx="4" fill="#0071E3" opacity="0.2" />
      <rect x="820" y="470" width="360" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
      <rect x="840" y="488" width="160" height="16" rx="4" fill="#0071E3" opacity="0.2" />
      <rect x="420" y="550" width="760" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
      <rect x="440" y="568" width="220" height="16" rx="4" fill="#0071E3" opacity="0.2" />
    </svg>
  );
}

/** Stacked dimensional profile cards leaning towards pointer in green feature stage */
function ProfileStackArt({ uid }) {
  return (
    <svg className="ac-cherries" viewBox="0 0 600 460" aria-hidden="true">
      <defs>
        <filter id={uid + 'shadow'} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="24" stdDeviation="20" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>
      {/* Background card */}
      <g filter={`url(#${uid}shadow)`} transform="translate(140, 40) rotate(-6)">
        <rect x="0" y="0" width="300" height="190" rx="16" fill="#1D2A3A" stroke="#2F455C" strokeWidth="1.5" />
        <rect x="24" y="24" width="140" height="14" rx="4" fill="#0071E3" opacity="0.8" />
        <rect x="24" y="52" width="220" height="8" rx="3" fill="#FFFFFF" opacity="0.4" />
        <rect x="24" y="70" width="180" height="8" rx="3" fill="#FFFFFF" opacity="0.4" />
      </g>
      {/* Middle card */}
      <g filter={`url(#${uid}shadow)`} transform="translate(160, 110) rotate(4)">
        <rect x="0" y="0" width="300" height="190" rx="16" fill="#141E28" stroke="#0071E3" strokeWidth="2" />
        <rect x="24" y="24" width="160" height="14" rx="4" fill="#0071E3" />
        <rect x="24" y="52" width="240" height="8" rx="3" fill="#FFFFFF" opacity="0.6" />
        <rect x="24" y="70" width="190" height="8" rx="3" fill="#FFFFFF" opacity="0.4" />
      </g>
      {/* Foreground card */}
      <g filter={`url(#${uid}shadow)`} transform="translate(180, 190) rotate(-2)">
        <rect x="0" y="0" width="320" height="200" rx="16" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
        <rect x="24" y="24" width="180" height="16" rx="4" fill="#0071E3" />
        <rect x="24" y="56" width="260" height="10" rx="3" fill="#1D1D1F" opacity="0.8" />
        <rect x="24" y="78" width="200" height="10" rx="3" fill="#515154" opacity="0.6" />
        <rect x="24" y="100" width="150" height="10" rx="3" fill="#515154" opacity="0.6" />
        <g transform="translate(24, 134)">
          <rect x="0" y="0" width="110" height="28" rx="14" fill="#EAF7F0" />
          <text x="55" y="18" fill="#16794D" fontSize="11" fontWeight="700" textAnchor="middle">
            VERIFIED 100%
          </text>
        </g>
      </g>
    </svg>
  );
}

/** Step numbers rendered inside horizontal process strip */
function StepIconNumber({ num }) {
  return (
    <span className="text-4xl font-extrabold text-white/30 tracking-tight select-none">
      {num}
    </span>
  );
}

// ---- Scoped CSS matching reference structure ----
const CSS = `
.ac-root {
  --ac-tan: color-mix(in srgb, var(--ac-cream) 60%, #0071E3);
  --ac-salmon: color-mix(in srgb, var(--ac-accent) 50%, #7db9ff);
  position: relative;
  isolation: isolate;
  font-family: var(--ac-sans);
  color: var(--ac-cream);
  background: var(--ac-ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow-x: clip;
}
:where(.ac-root) h1, :where(.ac-root) h2, :where(.ac-root) h3, :where(.ac-root) h4, :where(.ac-root) p,
:where(.ac-root) dl, :where(.ac-root) dd, :where(.ac-root) ul, :where(.ac-root) ol {
  margin: 0;
  padding: 0;
}
:where(.ac-root) ul, :where(.ac-root) ol { list-style: none; }
:where(.ac-root) a { color: inherit; text-decoration: none; }
:where(.ac-root) button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
:where(.ac-root) :focus-visible { outline: 2px solid var(--ac-accent); outline-offset: 3px; border-radius: 4px; }
.ac-page { position: relative; container-type: inline-size; }
.ac-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; }

/* Header */
.ac-head {
  position: sticky;
  top: 0;
  z-index: 40;
  height: 64px;
  margin-bottom: -64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 clamp(16px, 3cqi, 40px);
  color: #FFFFFF;
  background: color-mix(in srgb, var(--ac-skyBottom) 12%, transparent);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  backdrop-filter: blur(14px) saturate(1.2);
  transition: background .5s, color .5s;
}
.ac-head.is-solid {
  background: color-mix(in srgb, var(--ac-ink) 88%, transparent);
  color: var(--ac-cream);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.ac-logo { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-size: 16px; letter-spacing: .15em; }
.ac-nav { display: flex; gap: 28px; font-size: 13px; font-weight: 600; letter-spacing: .04em; }
.ac-nav a { position: relative; padding: 8px 0; opacity: .78; transition: opacity .2s; }
.ac-nav a:hover, .ac-nav a[aria-current] { opacity: 1; }
.ac-nav a::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 2px;
  height: 2px;
  background: var(--ac-accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform .35s cubic-bezier(.2,.7,.2,1);
}
.ac-nav a:hover::after, .ac-nav a[aria-current]::after { transform: scaleX(1); }
.ac-head-end { display: flex; align-items: center; gap: 12px; }
.ac-head-auth { display: flex; align-items: center; gap: 12px; }
.ac-login-link { font-size: 13px; font-weight: 600; opacity: .8; padding: 6px 10px; transition: opacity .2s; }
.ac-login-link:hover { opacity: 1; }
.ac-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  border-radius: 99px;
  background: var(--ac-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  transition: transform .25s, background .25s;
}
.ac-pill:hover { transform: translateY(-1px); background: #0066CC; }
.ac-pill:active { transform: scale(.98); background: #005BB5; }
.ac-pill b {
  display: grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  border-radius: 99px;
  background: #fff;
  color: var(--ac-accent);
  font-size: 12px;
}
.ac-burger { display: none; flex-direction: column; justify-content: center; gap: 6px; width: 44px; height: 44px; padding: 0 12px; }
.ac-burger i { display: block; height: 2px; background: currentColor; border-radius: 2px; transition: transform .3s; }
.ac-burger[aria-expanded="true"] i:first-child { transform: translateY(4px) rotate(45deg); }
.ac-burger[aria-expanded="true"] i:last-child { transform: translateY(-4px) rotate(-45deg); }
.ac-menu {
  position: absolute;
  top: 64px; right: 12px;
  display: flex;
  flex-direction: column;
  min-width: 220px;
  padding: 12px;
  border-radius: 16px;
  background: var(--ac-ink);
  color: var(--ac-cream);
  border: 1px solid rgba(255,255,255,.1);
  box-shadow: 0 20px 50px rgba(0,0,0,.45);
}
.ac-menu[hidden] { display: none; }
.ac-menu a { padding: 10px 14px; min-height: 44px; border-radius: 8px; font-weight: 600; font-size: 14px; }
.ac-menu a:hover { background: rgba(255,255,255,.07); }
.ac-menu a.ac-pill { border-radius: 99px; justify-content: center; background: #0071E3; color: #fff; }
.ac-menu a.ac-pill:hover { background: #0066CC; }

/* Hero */
.ac-hero { position: relative; height: calc(var(--h) * 3.6); background: var(--ac-skyBottom); }
.ac-hero-stage { position: sticky; top: 0; height: var(--h); min-height: 560px; overflow: hidden; }
.ac-sky { position: absolute; inset: 0; background: linear-gradient(180deg, var(--ac-skyTop) 0%, var(--ac-skyBottom) 70%); }
.ac-peak { position: absolute; left: 0; bottom: 0; width: 100%; height: 100%; max-width: none; }
.ac-cloud { position: absolute; left: 0; right: 0; pointer-events: none; transition: opacity 1s; }
.ac-cloud i {
  position: absolute; top: 0; left: 0; bottom: 0;
  width: 200%;
  background-repeat: repeat-x;
  background-size: 50% 100%;
  animation: ac-drift 120s linear infinite;
}
.ac-cloud-back { bottom: 28%; height: 36%; }
.ac-cloud-mid { bottom: 4%; height: 46%; }
.ac-cloud-mid i { animation-duration: 90s; animation-direction: reverse; }
.ac-cloud-front { bottom: -14%; height: 62%; transform-origin: 50% 100%; }
.ac-cloud-front i { animation-duration: 70s; }
@keyframes ac-drift { to { transform: translateX(-50%); } }

.ac-hero-intro {
  position: absolute;
  left: 0; right: 0; top: 25%;
  z-index: 1;
  text-align: center;
  pointer-events: none;
}
.ac-hero-title {
  position: relative;
  color: #fff;
  font-weight: 800;
  font-size: clamp(44px, 9.2cqi, 140px);
  line-height: .9;
  letter-spacing: -.04em;
  text-shadow: 0 6px 40px rgba(10,25,45,.4);
}
.ac-hero-cta { margin-top: clamp(16px, 3vh, 28px); }
.ac-hero-button { height: 50px; padding: 0 24px; font-size: 15px; background: #0071E3; pointer-events: auto; }
.ac-line { display: block; overflow: hidden; padding: 0 .04em .08em; white-space: nowrap; }
.ac-word { display: inline-block; white-space: nowrap; }
.ac-hero-char, .ac-crop-char { display: inline-block; will-change: transform; }
.ac-display-char { display: inline-block; will-change: transform; }

.ac-field { position: absolute; inset: 64px 0 0; display: grid; place-items: center; opacity: 0; transform-origin: 50% 100%; }
.ac-field-art { display: block; width: min(48%, 520px); height: min(64%, 460px); }
.ac-veil {
  position: absolute; inset: 0;
  opacity: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at 50% 52%, #fff 0 40%, var(--ac-skyBottom) 100%);
}
.ac-alt-cap {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 0 16px;
  text-align: center;
  color: #4A5568;
  opacity: 0;
  pointer-events: none;
}
.ac-alt-label { font-size: 12px; font-weight: 600; letter-spacing: .3em; text-transform: uppercase; opacity: .7; }
.ac-alt-big {
  font-weight: 300;
  font-size: clamp(76px, 15cqi, 220px);
  line-height: 1;
  letter-spacing: -.03em;
  font-variant-numeric: tabular-nums;
  margin: 6px 0 10px;
}
.ac-alt-big small { font-size: .3em; font-weight: 500; margin-left: .12em; }
.ac-alt-soil { font-size: clamp(16px, 1.8cqi, 24px); font-weight: 700; color: var(--ac-accent); }

.ac-field-cap {
  position: absolute;
  left: clamp(16px, 5cqi, 80px);
  bottom: clamp(28px, 6cqi, 80px);
  max-width: 440px;
  color: #fff;
  opacity: 0;
  text-shadow: 0 2px 20px rgba(0,0,0,.5);
}

.ac-hud {
  position: absolute;
  right: clamp(16px, 3cqi, 44px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  color: #FFFFFF;
  pointer-events: none;
}
.ac-hud-scale { display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 10px; font-weight: 600; font-variant-numeric: tabular-nums; }
.ac-hud-rail { position: relative; width: 12px; height: min(24vh, 200px); background: repeating-linear-gradient(180deg, currentColor 0 1px, transparent 1px 11px); opacity: .8; }
.ac-hud-mark { position: absolute; left: -6px; right: -6px; top: 0; height: 100%; }
.ac-hud-mark::before { content: ""; position: absolute; left: 0; right: 0; top: -1px; height: 3px; background: currentColor; }
.ac-hud-read { display: flex; flex-direction: column; font-size: 12px; font-weight: 600; }
.ac-hud-read b { font-size: 28px; font-weight: 300; font-variant-numeric: tabular-nums; }
.ac-hud-read small { font-size: 10px; letter-spacing: .16em; text-transform: uppercase; opacity: .75; margin-top: 2px; }

.ac-hero-cue {
  position: absolute;
  left: 50%; bottom: 24px;
  transform: translateX(-50%);
  display: flex; flex-direction: column;
  align-items: center; gap: 8px;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .2em;
  text-transform: uppercase;
}
.ac-hero-cue i {
  width: 1px; height: 40px;
  background: linear-gradient(currentColor, currentColor) 0 0/1px 40% no-repeat;
  animation: ac-cue 1.8s cubic-bezier(.6,0,.3,1) infinite;
  opacity: .9;
}
@keyframes ac-cue { from { background-position: 0 -20px; } to { background-position: 0 60px; } }
.ac-grain { position: absolute; inset: 0; pointer-events: none; background-image: var(--ac-grain); opacity: .7; }

/* Oversized Feature Stage */
.ac-crop {
  position: relative;
  overflow: hidden;
  background: var(--ac-crop);
  padding: clamp(100px, 12cqi, 180px) clamp(16px, 4cqi, 64px) clamp(80px, 10cqi, 140px);
  text-align: center;
}
.ac-crop-stage { position: relative; display: grid; place-items: center; max-width: min(1200px, 92cqi); margin: 0 auto; }
.ac-disc {
  position: absolute;
  left: 50%; top: 64%;
  width: min(34cqi, 380px);
  aspect-ratio: 1;
  margin: calc(min(34cqi, 380px) / -2) 0 0 calc(min(34cqi, 380px) / -2);
  border-radius: 50%;
  background: var(--ac-disc);
}
.ac-crop-title {
  position: relative;
  z-index: 1;
  display: flex; flex-direction: column;
  align-items: center;
  font-weight: 800;
  font-size: clamp(34px, 7.2cqi, 126px);
  line-height: .92;
  letter-spacing: -.035em;
  color: #fff;
}
.ac-cherry-wrap {
  position: absolute;
  z-index: 2;
  left: 50%; top: 58%;
  width: min(40cqi, 480px);
  margin-left: calc(min(40cqi, 480px) / -2);
  pointer-events: none;
}
.ac-cherry-lean { display: block; }
.ac-cherries { display: block; width: 100%; height: auto; filter: drop-shadow(0 24px 30px rgba(0,0,0,.35)); }

.ac-crop-body {
  position: relative;
  max-width: 520px;
  margin: clamp(150px, 18cqi, 260px) auto 0;
  font-size: 16px;
  line-height: 1.7;
  color: color-mix(in srgb, #fff 84%, transparent);
}
.ac-crop-stats {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  max-width: 820px;
  margin: 48px auto 0;
  border-top: 1px solid rgba(255, 255, 255, .2);
}
.ac-crop-stats div { padding: 20px 12px 0; }
.ac-crop-stats div + div { border-left: 1px solid rgba(255, 255, 255, .2); }
.ac-crop-stats dt { font-size: 11px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; opacity: .7; }
.ac-crop-stats dd { margin-top: 6px; font-size: clamp(17px, 1.8cqi, 24px); font-weight: 700; }

/* Destination Story Stage */
.ac-origins { position: relative; height: calc(var(--h) * (var(--steps) + 2)); background: var(--ac-ink); }
.ac-map-stage { position: sticky; top: 0; height: var(--h); min-height: 560px; overflow: hidden; }
.ac-map-svg { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; }
.ac-map-land { fill: none; stroke: rgba(255, 255, 255, 0.08); stroke-width: 1; stroke-dasharray: 4 6; }
.ac-map-ghost { fill: none; stroke: rgba(0, 113, 227, 0.25); stroke-width: 2; transition: opacity .4s; }
.ac-map-ghost.is-on { opacity: 0; }
.ac-map-morph { fill: rgba(0, 113, 227, 0.15); stroke: var(--ac-accent); stroke-width: 2.5; stroke-linejoin: round; }
.ac-map-pin { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; transition: opacity .4s; }
.ac-map-pin i {
  position: absolute; left: -50px; top: -50px;
  width: 100px; height: 100px;
  border-radius: 50%;
  border: 1.5px solid var(--ac-accent);
  animation: ac-ping 2.6s cubic-bezier(.2,.6,.3,1) infinite;
}
.ac-map-pin i + i { animation-delay: 1.3s; }
@keyframes ac-ping { from { transform: scale(.2); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }

.ac-map-shade {
  position: absolute; inset: 0;
  pointer-events: none;
  background: linear-gradient(0deg, var(--ac-ink) 0%, transparent 40%), linear-gradient(180deg, var(--ac-ink) 0%, transparent 16%);
}
.ac-map-intro {
  position: absolute; left: 16px; right: 16px; top: 50%;
  text-align: center;
  opacity: 0;
  transform: translateY(-44%);
  transition: opacity .6s, transform .8s cubic-bezier(.2,.8,.2,1);
  pointer-events: none;
}
.ac-map-intro.is-on { opacity: 1; transform: translateY(-50%); }
.ac-map-kicker { font-size: 12px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: var(--ac-cream); }
.ac-map-intro h2 {
  margin: 16px 0 18px;
  font-size: clamp(40px, 6.8cqi, 100px);
  font-weight: 800;
  letter-spacing: -.04em;
  color: var(--ac-accent);
}
.ac-map-intro p:last-child { max-width: 440px; margin: 0 auto; font-size: 15px; line-height: 1.6; color: rgba(255,255,255,.7); }

.ac-map-cap {
  position: absolute; left: 16px; right: 16px; bottom: clamp(32px, 7vh, 72px);
  text-align: center;
  visibility: hidden;
  transition: visibility 0s .5s;
}
.ac-map-cap.is-on { visibility: visible; transition: none; }
.ac-map-cap > * { opacity: 0; transform: translateY(20px); transition: opacity .4s, transform .6s cubic-bezier(.2,.8,.2,1); }
.ac-map-cap.is-on > * { opacity: 1; transform: none; }
.ac-map-year { font-size: 12px; font-weight: 700; letter-spacing: .25em; color: var(--ac-accent); }
.ac-map-cap h3 {
  margin: 6px 0 10px;
  font-size: clamp(40px, 7cqi, 104px);
  font-weight: 800;
  letter-spacing: -.04em;
  color: #fff;
}
.ac-map-meta { font-size: 14px; font-weight: 600; color: rgba(255,255,255,.8); }
.ac-map-blurb { max-width: 48ch; margin: 8px auto 0; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,.6); }
.ac-map-cap ul { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 14px; }
.ac-map-cap li {
  padding: 5px 12px;
  border-radius: 99px;
  border: 1px solid rgba(0, 113, 227, 0.4);
  background: rgba(0, 113, 227, 0.1);
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.ac-map-years {
  position: absolute; right: clamp(16px, 4cqi, 64px); top: 50%;
  transform: translateY(-50%);
  display: flex; flex-direction: column;
  gap: 6px;
  z-index: 3;
}
.ac-map-years button {
  position: relative;
  display: flex; flex-direction: column;
  align-items: flex-end;
  padding: 8px 16px 8px 0;
  opacity: .4;
  transition: opacity .3s, color .3s;
}
.ac-map-years button::after {
  content: "";
  position: absolute; right: 0; top: 10px; bottom: 10px; width: 2px;
  background: currentColor;
  transform: scaleY(.3);
  transition: transform .4s;
}
.ac-map-years button:hover { opacity: .8; }
.ac-map-years button.is-on { opacity: 1; color: var(--ac-accent); }
.ac-map-years button.is-on::after { transform: scaleY(1); }
.ac-map-years span { font-size: 15px; font-weight: 800; }
.ac-map-years small { font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #fff; opacity: .75; }

.ac-show { margin-top: clamp(100px, 13cqi, 200px); text-align: center; }
.ac-show-pill {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 99px;
  border: 1px solid rgba(0, 113, 227, 0.4);
  background: rgba(0, 113, 227, 0.1);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .08em;
  color: #7db9ff;
}
.ac-display {
  margin-top: 16px;
  display: flex; flex-direction: column; align-items: center;
  font-family: var(--ac-display);
  font-weight: 300;
  font-size: clamp(34px, 7.8cqi, 136px);
  line-height: .96;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--ac-tan);
}
.ac-display-red { color: var(--ac-salmon); }
.ac-display-char { display: inline-block; }
.ac-show-sub { max-width: 440px; margin: 24px auto 0; font-size: 13px; line-height: 1.7; color: rgba(255,255,255,.65); }

/* Horizontal Process Strip */
.ac-strip { position: relative; height: calc(var(--h) * 3); background: var(--ac-brown); }
.ac-strip-stage { position: sticky; top: 0; height: var(--h); min-height: 600px; overflow: hidden; display: flex; flex-direction: column; justify-content: center; gap: clamp(28px, 4cqi, 48px); }
.ac-strip-head { position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 24px 48px; flex-wrap: wrap; padding: 0 clamp(16px, 4cqi, 64px); }
.ac-strip-head h2 { max-width: 13ch; font-size: clamp(26px, 3cqi, 44px); font-weight: 800; line-height: 1.1; letter-spacing: -.025em; color: #fff; }
.ac-strip-head p { max-width: 320px; font-size: 13px; line-height: 1.6; color: rgba(255,255,255,.65); }
.ac-strip-bar { position: absolute; left: clamp(16px, 4cqi, 64px); bottom: -16px; width: min(260px, 40cqi); height: 2px; background: rgba(255,255,255,.16); }
.ac-strip-bar i { position: absolute; inset: 0; background: var(--ac-accent); transform-origin: left; }
.ac-strip-track { display: flex; gap: clamp(12px, 1.6cqi, 20px); width: max-content; padding: 0 clamp(16px, 4cqi, 64px); }
.ac-step { flex: none; width: clamp(210px, 21cqi, 290px); }
.ac-step-pic {
  position: relative;
  display: grid; place-items: center;
  aspect-ratio: 4/5;
  border-radius: 14px;
  overflow: hidden;
  transition: transform .6s cubic-bezier(.2,.8,.2,1);
  background: linear-gradient(160deg, #1A2838, #0E1822);
  border: 1px solid rgba(255,255,255,.08);
}
.ac-step:hover .ac-step-pic { transform: translateY(-6px); }
.ac-step-n { position: absolute; left: 14px; top: 14px; font-size: 12px; font-weight: 700; letter-spacing: .16em; color: var(--ac-accent); }
.ac-step h3 { margin-top: 14px; font-size: 16px; font-weight: 800; letter-spacing: -.01em; color: #fff; }
.ac-step p { margin-top: 6px; font-size: 13px; line-height: 1.55; color: rgba(255,255,255,.65); }
.ac-step b { display: block; margin-top: 10px; font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ac-tan); }

/* Interactive Simulated Autofill Preview */
.ac-stick { position: relative; overflow: hidden; background: var(--ac-deep); padding: clamp(100px, 11cqi, 170px) clamp(16px, 4cqi, 64px); }
.ac-demo-container { max-width: 1000px; margin: 48px auto 0; }
.ac-demo-tabs { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 32px; }
.ac-demo-tab {
  display: flex; flex-direction: column; align-items: center;
  padding: 10px 20px;
  border-radius: 99px;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.03);
  transition: all .2s;
}
.ac-demo-tab span { font-size: 14px; font-weight: 700; color: #fff; }
.ac-demo-tab small { font-size: 11px; color: rgba(255,255,255,.5); margin-top: 2px; }
.ac-demo-tab.is-active {
  background: var(--ac-accent);
  border-color: var(--ac-accent);
}
.ac-demo-tab.is-active small { color: rgba(255,255,255,.8); }

.ac-demo-stage {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
  background: rgba(0,0,0,.3);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 30px 60px rgba(0,0,0,.4);
}
.ac-demo-form-card {
  background: #181E28;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px;
  overflow: hidden;
}
.ac-demo-form-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
  background: rgba(0,0,0,.3);
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.ac-demo-assistant-card {
  background: #10151E;
  border: 1px solid rgba(0, 113, 227, 0.3);
  border-radius: 14px;
  padding: 20px;
  display: flex; flex-direction: column; justify-content: space-between;
}

/* Buttons */
.ac-btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 48px;
  padding: 0 26px;
  border-radius: 99px;
  background: var(--ac-accent);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  transition: transform .25s, background .25s;
}
.ac-btn:hover { transform: translateY(-2px); background: #0066CC; }
.ac-btn:active { transform: scale(.98); }
.ac-btn:disabled { opacity: .6; cursor: default; transform: none; }

/* Footer */
.ac-foot { position: relative; background: var(--ac-ink); padding: clamp(90px, 11cqi, 140px) clamp(16px, 4cqi, 64px) 30px; text-align: center; }
.ac-foot-mark { display: block; width: clamp(100px, 14cqi, 180px); height: auto; margin: 0 auto; overflow: visible; }
.ac-foot-fill { fill: var(--ac-accent); }
.ac-foot-outline { fill: none; stroke: var(--ac-accent); stroke-width: 1.5; stroke-linejoin: round; }
.ac-foot-line { max-width: 20ch; margin: 24px auto 0; font-size: clamp(20px, 2.2cqi, 28px); font-weight: 700; line-height: 1.25; color: #fff; }

.ac-foot-cols {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px;
  max-width: 480px;
  margin: 64px auto 0;
  text-align: left;
}
.ac-foot-cols h3 { margin-bottom: 12px; font-size: 11px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; opacity: .55; }
.ac-foot-cols li + li { margin-top: 8px; }
.ac-foot-cols a { font-size: 14px; opacity: .8; transition: opacity .2s, color .2s; }
.ac-foot-cols a:hover { opacity: 1; color: var(--ac-accent); }

.ac-foot-base {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 14px 24px;
  max-width: 1180px;
  margin: 64px auto 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, .1);
  font-size: 12px;
  color: rgba(255, 255, 255, .6);
}
.ac-foot-word { display: inline-flex; align-items: center; gap: 8px; color: var(--ac-accent); font-size: 15px; font-weight: 800; }
.ac-foot-social { display: flex; gap: 16px; }

/* Container Responsive Queries */
.ac-logo, .ac-nav a, .ac-login-link, .ac-pill { min-height:44px; }
.ac-logo, .ac-login-link { display:inline-flex; align-items:center; }
@container (max-width: 900px) {
  .ac-nav { display: none; }
  .ac-head-auth { display: none; }
  .ac-burger { display: inline-flex; }
  .ac-demo-stage { grid-template-columns: 1fr; }
  .ac-map-years { left: 16px; right: 16px; top: 76px; transform: none; flex-direction: row; justify-content: center; gap: 16px; }
  .ac-map-years button { align-items: center; padding: 0 0 10px; }
  .ac-map-years button::after { left: 10px; right: 10px; top: auto; bottom: 0; width: auto; height: 2px; transform: scaleX(.3); }
  .ac-map-years button.is-on::after { transform: scaleX(1); }
  .ac-map-blurb { display: none; }
}

@container (min-width: 901px) {
  .ac-menu { display: none; }
}

@container (max-width: 600px) {
  .ac-alt-label, .ac-alt-soil, .ac-field-cap, .ac-map-stage .ac-map-kicker,
  .ac-map-stage .ac-map-kicker + p, .ac-strip-head p, .ac-show-sub,
  .ac-demo-tab small, .ac-map-meta { display:none; }
  .ac-head { padding-inline:16px; }
  .ac-burger { min-width:44px; min-height:44px; }
  .ac-logo { min-height:44px; display:inline-flex; align-items:center; }
  .ac-pill, .ac-login-link, .ac-menu a, .ac-demo-tab, .ac-map-years button, .ac-foot-cols a { min-height:44px; }
  .ac-foot-cols a { display:inline-flex; align-items:center; }
  .ac-hero-title { font-size:clamp(38px, 11cqi, 64px); }
  .ac-hero-button { margin-top:12px; }
  .ac-demo-container { padding-inline:12px; }
  .ac-demo-stage { padding:12px; gap:16px; }
  .ac-demo-stage > *, .ac-demo-form-card, .ac-demo-assistant-card { min-width:0; overflow-wrap:anywhere; }
  .ac-demo-tabs { gap:8px; flex-wrap:wrap; }
  .ac-demo-tab { padding:8px 12px; }
  .ac-demo-tab span { font-size:12px; }
  .ac-demo-form-header { flex-wrap:wrap; gap:6px; }
  .ac-show { margin-top:64px; }
  .ac-crop-body { max-width:calc(100% - 32px); font-size:14px; }
  .ac-foot { padding-top:64px; }
  .ac-foot-cols { gap:24px; }
  .ac-field-art { width: 72%; }
  .ac-line { white-space: normal; text-wrap: balance; }
  .ac-crop-stats { grid-template-columns: 1fr; }
  .ac-crop-stats div + div { border-left: 0; border-top: 1px solid rgba(255, 255, 255, .2); margin-top: 16px; }
  .ac-disc { width: 60cqi; margin: -30cqi 0 0 -30cqi; }
  .ac-cherry-wrap { width: 84cqi; margin-left: -42cqi; }
  .ac-crop-body { margin-top: 180px; }
  .ac-hud-scale { display: none; }
  .ac-hud { top: 80px; transform: none; }
  .ac-hud-read b { font-size: 22px; }
}

/* Reduced Motion Mode */
@media (prefers-reduced-motion: reduce) {
  .ac-hero { height: var(--h); }
  .ac-hero-cue { display: none; }
  .ac-origins { height: auto; }
  .ac-map-stage { position: relative; }
  .ac-strip { height: auto; }
  .ac-strip-stage { position: relative; height: auto; min-height: 0; padding: 80px 0; }
  .ac-strip-track { width: auto; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 12px; }
  .ac-step { scroll-snap-align: start; }
  .ac-strip-bar { display: none; }
  .ac-cloud i, .ac-map-pin i, .ac-hero-cue i { animation: none; }
  .ac-root *, .ac-root *::before, .ac-root *::after {
    transition-duration: .01ms !important;
    transition-delay: 0s !important;
  }
}
`;

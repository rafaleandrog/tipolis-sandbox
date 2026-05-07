# TIPOLIS UI SPEC (Canonical)

> **Reference visual source (must match):** `general/index.html` and published preview at `https://rafaleandrog.github.io/tipolis-sandbox/general/`.
> 
> **Mandatory rule for the entire repository:** every interface in this repo must inherit this same visual language automatically by importing both shared stylesheets:
> 
> ```html
> <link rel="stylesheet" href="../assets/css/tipolis-design-system.css" />
> <link rel="stylesheet" href="../assets/css/style.css" />
> ```
> 
> (Use `./assets/...` only for root-level pages.)
>
> **UI contract:** Any new page, card, dashboard, or text section that does not follow these tokens/components is considered out of spec and must be refactored before merge.

---

## 1. Guiding Aesthetic

Tipolis presents itself as a **premium institutional governance brand** — think sovereign wealth fund meets architectural firm. The visual language is:

| Dimension | Direction |
|---|---|
| Tone | Authoritative, refined, optimistic |
| Complexity | Disciplined minimalism with deliberate moments of weight |
| Spacing | Generous — white space is structural, not decorative |
| Motion | Subtle and purposeful; never playful or distracting |
| Typography | Hierarchical, legible, slightly editorial |
| Imagery/Icons | Thin-line monochrome; never filled/flat-color icon sets |

The brand does **not** use: rounded pill buttons, gradients, shadows with color tint, emoji, playful illustrations, or any visual element that would appear in a consumer SaaS product.

---

## 2. Color System

All colors are defined as CSS custom properties and **must** be referenced by token name — never hardcoded in component styles.

```css
:root {
  /* ── Core Palette ────────────────────────────── */
  --color-navy-950:   #07111F;   /* Deepest background, hero sections        */
  --color-navy-900:   #0D1E35;   /* Primary dark background                  */
  --color-navy-800:   #152844;   /* Card backgrounds, dark panels            */
  --color-navy-700:   #1E3A5F;   /* Hover state on dark surfaces             */
  --color-navy-600:   #274C7A;   /* Borders on dark backgrounds              */

  --color-gold-400:   #D4A84B;   /* Primary accent — headlines, dividers     */
  --color-gold-300:   #E0BF7A;   /* Hover state for gold elements            */
  --color-gold-200:   #EDD9A3;   /* Subtle gold tint, backgrounds            */
  --color-gold-100:   #F7EEDB;   /* Near-white with warmth                  */

  --color-white:      #FFFFFF;
  --color-off-white:  #F8F8F6;   /* Page backgrounds, light sections         */
  --color-gray-100:   #F0EFEB;   /* Subtle section dividers                  */
  --color-gray-200:   #DDD9D0;   /* Rule lines, borders on light backgrounds */
  --color-gray-400:   #9B9488;   /* Secondary body text on light backgrounds */
  --color-gray-600:   #5C5748;   /* Body text on light backgrounds           */
  --color-gray-800:   #2A2722;   /* Primary text on light backgrounds        */

  /* ── Semantic Tokens ─────────────────────────── */
  --color-bg-page:         var(--color-off-white);
  --color-bg-dark:         var(--color-navy-900);
  --color-bg-card-dark:    var(--color-navy-800);
  --color-bg-card-light:   var(--color-white);

  --color-text-primary:    var(--color-gray-800);
  --color-text-secondary:  var(--color-gray-600);
  --color-text-muted:      var(--color-gray-400);
  --color-text-on-dark:    var(--color-white);
  --color-text-accent:     var(--color-gold-400);

  --color-accent-primary:  var(--color-gold-400);
  --color-accent-hover:    var(--color-gold-300);
  --color-border-light:    var(--color-gray-200);
  --color-border-dark:     var(--color-navy-600);
  --color-divider-accent:  var(--color-gold-400);
}
```

### Color Usage Rules

- **Dark sections** (`--color-bg-dark`): Section headers, hero slides, call-to-action banners. All text is `--color-text-on-dark` or `--color-text-accent`.
- **Light sections** (`--color-bg-page` / `--color-bg-card-light`): Content slides, data displays, explanatory text.
- **Gold** is an accent — use sparingly. It appears on: divider lines, hover states, label subtitles above section headings, active states. Never use gold as a large block fill.
- **Never mix** dark navy text on dark navy backgrounds, or gold on gold.

---

## 3. Typography

### Font Families

```css
:root {
  /* Display/Heading font — geometric, editorial weight range */
  --font-display: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;

  /* UI/Body font — clean, legible, humanist */
  --font-body:    'Jost', 'DM Sans', system-ui, sans-serif;

  /* Mono — data tables, code snippets */
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;
}
```

> **Load order in `<head>`:**
> ```html
> <link rel="preconnect" href="https://fonts.googleapis.com">
> <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
> ```

### Type Scale

```css
:root {
  /* Scale (major third — 1.25 ratio) */
  --text-xs:   0.75rem;     /*  12px — labels, captions, footnotes      */
  --text-sm:   0.875rem;    /*  14px — secondary UI, table cells        */
  --text-base: 1rem;        /*  16px — body copy                        */
  --text-lg:   1.125rem;    /*  18px — lead paragraphs                  */
  --text-xl:   1.25rem;     /*  20px — card titles, subtitles           */
  --text-2xl:  1.5rem;      /*  24px — section subheadings              */
  --text-3xl:  1.875rem;    /*  30px — section headings                 */
  --text-4xl:  2.25rem;     /*  36px — page headings                    */
  --text-5xl:  3rem;        /*  48px — hero headings                    */
  --text-6xl:  3.75rem;     /*  60px — display / full-bleed titles      */
  --text-7xl:  4.5rem;      /*  72px — maximum display size             */

  /* Line heights */
  --leading-tight:  1.15;
  --leading-snug:   1.35;
  --leading-normal: 1.6;
  --leading-relaxed:1.75;

  /* Letter spacing */
  --tracking-tight:  -0.02em;
  --tracking-normal:  0;
  --tracking-wide:    0.05em;
  --tracking-widest:  0.12em;   /* All-caps labels */
}
```

### Typographic Roles

| Role | Font Family | Size | Weight | Case | Color |
|---|---|---|---|---|---|
| Hero display title | `--font-display` | `--text-6xl` / `--text-7xl` | 300 | Sentence | `--color-text-on-dark` |
| Section heading (dark bg) | `--font-display` | `--text-4xl` / `--text-5xl` | 400 | Sentence | `--color-text-on-dark` |
| Section heading (light bg) | `--font-body` | `--text-3xl` / `--text-4xl` | 300 | Sentence | `--color-navy-900` |
| Label above heading | `--font-body` | `--text-xs` | 500 | ALL CAPS | `--color-gold-400` |
| Card title | `--font-body` | `--text-xl` | 400 | Sentence | `--color-navy-900` |
| Body copy | `--font-body` | `--text-base` | 300–400 | Sentence | `--color-text-primary` |
| Secondary/support text | `--font-body` | `--text-sm` | 300 | Sentence | `--color-text-secondary` |
| Stat/KPI number | `--font-body` | `--text-4xl` / `--text-5xl` | 600 | — | `--color-text-on-dark` |
| Stat label | `--font-body` | `--text-sm` | 400 | Sentence | `--color-gray-400` |
| Table header | `--font-body` | `--text-xs` | 500 | ALL CAPS | `--color-text-muted` |
| Table cell | `--font-body` | `--text-sm` | 400 | — | `--color-text-primary` |
| Navigation item | `--font-body` | `--text-sm` | 400 | Sentence | `--color-text-on-dark` |
| Button text | `--font-body` | `--text-sm` | 500 | Sentence | varies |
| Footnote / source | `--font-body` | `--text-xs` | 300 | Sentence | `--color-text-muted` |

---

## 4. Spacing & Layout

### Spacing Scale

```css
:root {
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;
  --space-16:  64px;
  --space-20:  80px;
  --space-24:  96px;
  --space-32: 128px;
  --space-40: 160px;
}
```

### Layout Grid

```css
:root {
  --grid-columns:   12;
  --grid-gutter:    var(--space-8);      /* 32px */
  --container-max:  1280px;
  --container-pad:  var(--space-12);     /* 48px side padding */
  --container-pad-sm: var(--space-6);   /* 24px on small screens */
}

.container {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
}

@media (max-width: 768px) {
  .container { padding-inline: var(--container-pad-sm); }
}
```

### Section Padding

- **Full-bleed dark sections:** `padding-block: var(--space-20)` (80px top/bottom)
- **Content sections:** `padding-block: var(--space-16)` (64px top/bottom)
- **Card internal padding:** `padding: var(--space-8)` (32px)
- **Compact card padding:** `padding: var(--space-6)` (24px)

---

## 5. Core UI Components

### 5.1 The Gold Vertical Divider

The most distinctive Tipolis brand element. A thin vertical gold line appears between a left-aligned heading and right-side content.

```css
.tipolis-section-layout {
  display: grid;
  grid-template-columns: 1fr 3px 2fr;
  gap: 0 var(--space-12);
  align-items: start;
}

.tipolis-divider-line {
  width: 3px;
  background: var(--color-divider-accent);
  align-self: stretch;
  min-height: 120px;
}
```

**Usage:** Any two-column layout where a heading faces body content. The divider always runs the full height of the taller column.

---

### 5.2 Section Label + Heading Pattern

Every content section begins with:
1. A small all-caps label in gold (the "eyebrow")
2. The main heading in the appropriate scale

```html
<div class="section-header">
  <span class="section-label">The Challenge</span>
  <h2 class="section-heading">Standard SEZs Are No Longer Enough</h2>
</div>
```

```css
.section-label {
  display: block;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--color-text-accent);
  margin-bottom: var(--space-3);
}

.section-heading {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 300;
  line-height: var(--leading-tight);
  color: inherit;  /* inherits from section background context */
}

/* On dark backgrounds */
.dark-section .section-heading { color: var(--color-text-on-dark); }
/* On light backgrounds */
.light-section .section-heading { color: var(--color-navy-900); }
```

---

### 5.3 Dark Feature Cards

Dark navy cards used to display features, benefits, and capability lists. Always arranged in a 2×3 or 2×2 grid.

```html
<div class="feature-card">
  <div class="feature-card__icon"><!-- SVG icon --></div>
  <p class="feature-card__text">Attracting Foreign Direct Investment</p>
</div>
```

```css
.feature-card {
  background: var(--color-bg-card-dark);
  padding: var(--space-6);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  border: 1px solid var(--color-border-dark);
  border-radius: 0;             /* NO border radius — institutional, sharp */
  transition: background 200ms ease;
}

.feature-card:hover {
  background: var(--color-navy-700);
}

.feature-card__icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  color: var(--color-text-on-dark);
  opacity: 0.85;
}

.feature-card__icon svg {
  width: 100%;
  height: 100%;
  stroke: currentColor;
  stroke-width: 1.5;
  fill: none;                   /* Always outline/stroke icons, never filled */
}

.feature-card__text {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 400;
  color: var(--color-text-on-dark);
  line-height: var(--leading-snug);
}

/* Grid layout for feature cards */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;           /* Hairline gap creates a grid-line effect */
}
```

---

### 5.4 KPI / Stat Block

Large metric displays on dark backgrounds.

```html
<div class="stat-block">
  <span class="stat-block__value">$354M</span>
  <span class="stat-block__label">2023 Revenue, up 23% YoY</span>
</div>
```

```css
.stat-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-6);
}

.stat-block__value {
  font-family: var(--font-body);
  font-size: var(--text-4xl);
  font-weight: 600;
  color: var(--color-text-on-dark);
  line-height: 1;
}

.stat-block__label {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-gray-400);
  line-height: var(--leading-snug);
}
```

---

### 5.5 Navigation

Top navigation bar for multi-page sections and dashboards.

```css
.nav {
  background: var(--color-bg-dark);
  padding: var(--space-5) 0;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--color-border-dark);
}

.nav__logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-decoration: none;
}

.nav__logo-text {
  font-family: var(--font-body);
  font-size: var(--text-xl);
  font-weight: 500;
  color: var(--color-text-on-dark);
  letter-spacing: var(--tracking-wide);
}

.nav__links {
  display: flex;
  gap: var(--space-8);
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav__link {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 400;
  color: rgba(255,255,255,0.65);
  text-decoration: none;
  letter-spacing: var(--tracking-wide);
  transition: color 150ms ease;
  position: relative;
}

.nav__link::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 1px;
  background: var(--color-gold-400);
  transition: width 200ms ease;
}

.nav__link:hover,
.nav__link.active {
  color: var(--color-text-on-dark);
}

.nav__link:hover::after,
.nav__link.active::after {
  width: 100%;
}
```

---

### 5.6 Buttons

```css
/* Primary button — used for main CTAs */
.btn-primary {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: var(--tracking-wide);
  color: var(--color-navy-900);
  background: var(--color-gold-400);
  border: none;
  padding: var(--space-3) var(--space-8);
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: background 150ms ease;
  border-radius: 0;             /* Sharp — no border-radius */
}

.btn-primary:hover {
  background: var(--color-gold-300);
}

/* Secondary / Ghost button */
.btn-secondary {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: var(--tracking-wide);
  color: var(--color-text-on-dark);
  background: transparent;
  border: 1px solid rgba(255,255,255,0.35);
  padding: var(--space-3) var(--space-8);
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: border-color 150ms ease, color 150ms ease;
  border-radius: 0;
}

.btn-secondary:hover {
  border-color: var(--color-gold-400);
  color: var(--color-gold-300);
}
```

---

### 5.7 Data Tables

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-body);
}

.data-table thead tr {
  border-bottom: 1px solid var(--color-border-light);
}

.data-table th {
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--tracking-widest);
  color: var(--color-text-muted);
  text-align: left;
  padding: var(--space-3) var(--space-4);
}

.data-table td {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-text-primary);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-100);
  vertical-align: middle;
}

.data-table tr:last-child td {
  border-bottom: none;
}

/* Highlighted row (e.g., Próspera in the doing-business table) */
.data-table tr.row-highlight td {
  background: var(--color-navy-900);
  color: var(--color-text-on-dark);
  font-weight: 600;
}

/* On dark backgrounds */
.dark-table .data-table th { color: rgba(255,255,255,0.45); }
.dark-table .data-table td { color: var(--color-text-on-dark); border-color: var(--color-border-dark); }
```

---

### 5.8 Timeline / Progress Steps

Used in roadmap and step sequences (e.g., "Months 1–3 → 4–9 → 10+").

```css
.timeline {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0;
  position: relative;
}

.timeline::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--color-border-light);
}

.timeline__step {
  padding-top: var(--space-10);
  padding-right: var(--space-8);
  position: relative;
}

.timeline__step::before {
  content: '';
  position: absolute;
  top: 14px;
  left: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-gold-400);
}

.timeline__period {
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}

.timeline__title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 400;
  color: var(--color-navy-900);
  margin-bottom: var(--space-4);
}

.timeline__items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.timeline__item {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  padding-left: var(--space-4);
  position: relative;
}

.timeline__item::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--color-gold-400);
}
```

---

### 5.9 Hero / Full-Bleed Dark Section

```css
.hero {
  background: var(--color-navy-950);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: var(--space-20);
  position: relative;
  overflow: hidden;
}

/* Subtle background texture / overlay — matches the aerial photo treatment */
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    rgba(7, 17, 31, 0.85) 0%,
    rgba(7, 17, 31, 0.60) 100%
  );
  z-index: 1;
}

.hero__bg {
  position: absolute;
  inset: 0;
  object-fit: cover;
  opacity: 0.35;   /* Desaturated, dim — image is contextual not decorative */
  filter: saturate(0.4) brightness(0.6);
}

.hero__content {
  position: relative;
  z-index: 2;
}

.hero__overline {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--color-gold-400);
  margin-bottom: var(--space-4);
  display: block;
}

.hero__title {
  font-family: var(--font-display);
  font-size: clamp(var(--text-4xl), 6vw, var(--text-7xl));
  font-weight: 300;
  line-height: var(--leading-tight);
  color: var(--color-text-on-dark);
  max-width: 14ch;
}

.hero__date {
  font-size: var(--text-xs);
  color: rgba(255,255,255,0.35);
  position: absolute;
  bottom: var(--space-8);
  left: var(--container-pad);
  letter-spacing: var(--tracking-wide);
}
```

---

### 5.10 Icon Usage

Icons appear throughout all sections. Rules:

- **Style:** Thin outline / stroke icons only. Stroke width: `1.5px` at 24px, `1px` at 40px+.
- **Fill:** Always `fill: none`. Never use filled/solid icons.
- **Color:** On dark backgrounds: `stroke: rgba(255,255,255,0.85)`. On light: `stroke: var(--color-navy-800)`.
- **Size:** 24px (inline text), 40px (feature cards), 48px (large feature blocks).
- **Source:** Use [Lucide](https://lucide.dev/) or equivalent thin-stroke library. Never use Heroicons Solid, Font Awesome filled, or any other filled icon set.

```css
.icon {
  display: inline-block;
  flex-shrink: 0;
}

.icon svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon--sm  { width: 20px; height: 20px; }
.icon--md  { width: 24px; height: 24px; }
.icon--lg  { width: 40px; height: 40px; }
.icon--xl  { width: 48px; height: 48px; }
```

---

## 6. Page Structure Patterns

### 6.1 Standard Content Page

```
┌─────────────────────────────────────────┐
│  NAV (dark, sticky)                     │
├─────────────────────────────────────────┤
│  HERO (dark bg, full-bleed, min-100vh)  │
├─────────────────────────────────────────┤
│  SECTION — light bg                     │
│  ┌──────────┬───┬──────────────────┐    │
│  │ Heading  │ │ │ Body / Cards     │    │  ← Gold divider pattern
│  └──────────┴───┴──────────────────┘    │
├─────────────────────────────────────────┤
│  SECTION — dark bg (feature cards)      │
│  ┌──────────┬───┬──────────────────┐    │
│  │ Heading  │ │ │ 2×3 Card Grid    │    │
│  └──────────┴───┴──────────────────┘    │
├─────────────────────────────────────────┤
│  SECTION — light bg (data / stats)      │
├─────────────────────────────────────────┤
│  CTA SECTION — dark bg                  │
├─────────────────────────────────────────┤
│  FOOTER — dark bg                       │
└─────────────────────────────────────────┘
```

### 6.2 Dashboard / Report Page

```
┌─────────────────────────────────────────┐
│  NAV                                    │
├─────────────────────────────────────────┤
│  PAGE HEADER — dark bg, compact (80px)  │
│  Label + Title + subtitle               │
├─────────────────────────────────────────┤
│  KPI ROW — light bg                     │
│  ┌───────┐ ┌───────┐ ┌───────┐          │
│  │ Stat  │ │ Stat  │ │ Stat  │          │
│  └───────┘ └───────┘ └───────┘          │
├─────────────────────────────────────────┤
│  MAIN CONTENT AREA                      │
│  ┌──────────────┐ ┌─────────────────┐   │
│  │ Chart / Map  │ │ Table / List    │   │
│  └──────────────┘ └─────────────────┘   │
├─────────────────────────────────────────┤
│  SECONDARY CONTENT ROW                  │
└─────────────────────────────────────────┘
```

---

## 7. Section Alternation Rule

Pages **must** alternate between dark and light sections. The sequence is:

```
Dark (Hero) → Light (Content) → Dark (Features) → Light (Data) → Dark (CTA)
```

Never place two light sections back-to-back without a visual separator (at minimum a full-width `border-top: 1px solid var(--color-border-light)`).

---

## 8. Borders, Dividers, and Edges

```css
:root {
  --radius-none: 0;       /* Default — all cards, buttons, inputs */
  --radius-sm:   2px;     /* Only for: progress bars, small badges */
  /* NEVER use --radius-md or larger values */
}
```

- **No border-radius** on cards, modals, buttons, or panels. The Tipolis aesthetic is architectural — sharp edges signal institutional authority.
- Dividers: `1px solid` using `--color-border-light` (light sections) or `--color-border-dark` (dark sections).
- The gold divider line is always `3px solid var(--color-gold-400)`.

---

## 9. Motion & Animation

```css
:root {
  --transition-fast:   150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow:   400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

### Rules

- **Hover transitions:** color, background, border-color — always `var(--transition-fast)`.
- **Page-level reveals:** Use `opacity: 0 → 1` + `transform: translateY(16px) → 0` on section entry. Duration: `400ms`, stagger: `80ms` between elements.
- **No:** bounce, elastic, spring, rotate, scale animations on content. These undermine institutional credibility.
- **Charts:** Bars/lines animate in from bottom/left, duration `600ms`, `ease-out`.
- **Loading states:** A thin gold progress line at the top of the viewport. Never spinners.

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeInUp var(--transition-slow) both;
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  .animate-in { animation: none; }
}
```

---

## 10. Logo Usage

The Tipolis logo consists of:
1. A **shield icon** with three vertical bars/columns (representing governance pillars)
2. The wordmark **"Tipolis"** in `--font-body` weight 500

```css
.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.logo__icon {
  width: 36px;
  height: 36px;
  color: var(--color-text-on-dark);
}

.logo__wordmark {
  font-family: var(--font-body);
  font-size: var(--text-xl);
  font-weight: 500;
  letter-spacing: var(--tracking-wide);
  color: var(--color-text-on-dark);
}

/* On light backgrounds */
.logo--dark .logo__icon,
.logo--dark .logo__wordmark {
  color: var(--color-navy-900);
}
```

**Logo clear space:** Always maintain `16px` of clear space around the logo on all sides.  
**Minimum size:** Logo icon minimum 24px height. Never scale below this.  
**Placement:** Top-left of navigation, centered on hero slides.

---

## 11. Imagery Treatment

When background or contextual images are used:

```css
/* Aerial/architectural imagery — desaturated, dimmed */
.img-context {
  filter: saturate(0.3) brightness(0.5);
  object-fit: cover;
}

/* As overlay behind text sections */
.section-with-bg {
  position: relative;
}
.section-with-bg .img-context {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.25;
}
.section-with-bg .section-content {
  position: relative;
  z-index: 1;
}
```

**Never:** Use brightly colored, high-saturation photography. All images are treated as atmospheric texture, not focal content.  
**Architectural impressions** (sketches/renders): Can appear at higher opacity (up to 0.9) as they are line-art, not photography.

---

## 12. Subdirectory Page Templates

Each folder in the repository represents a department/section. All should follow these templates:

### `/general/index.html` — Overview/Landing
Use: Full hero + alternating content sections pattern (Section 6.1).

### `/business-development/`, `/real-estate/`, etc. — Department Pages
Use: Compact page header (dark, 120px) + dashboard layout (Section 6.2).

### `/city-bonds/`, `/digital-money/`, `/strc-treasury/` — Financial Data Pages
Use: Dashboard pattern with KPI row + data tables + charts.

### `/press-research-communications/` — Document/Editorial Page
Use: Single-column editorial layout. Max-width: `760px` for body text. Generous `--leading-relaxed` line height.

### `/infrastructure-development/` — Project/Timeline Page
Use: Timeline component (Section 5.8) as primary content structure.

---

## 13. Responsive Breakpoints

```css
/* Mobile-first breakpoints */
:root {
  --bp-sm:  480px;
  --bp-md:  768px;
  --bp-lg:  1024px;
  --bp-xl:  1280px;
  --bp-2xl: 1536px;
}

@media (max-width: 768px) {
  /* Gold divider layout becomes stacked */
  .tipolis-section-layout {
    grid-template-columns: 1fr;
  }
  .tipolis-divider-line {
    display: none;
  }
  /* Add left border instead */
  .tipolis-section-layout > :last-child {
    border-left: 3px solid var(--color-gold-400);
    padding-left: var(--space-6);
  }

  /* Feature grids go single column */
  .feature-grid {
    grid-template-columns: 1fr;
  }

  /* Hero typography scales down */
  .hero__title {
    font-size: var(--text-4xl);
  }
}
```

---

## 14. Accessibility Standards

- **Color contrast:** All text must meet WCAG AA (4.5:1 for body, 3:1 for large text). The dark navy + white combination passes AAA.
- **Focus states:** `outline: 2px solid var(--color-gold-400); outline-offset: 3px;` — never remove focus outlines.
- **Semantic HTML:** Use `<main>`, `<nav>`, `<section>`, `<article>`, `<aside>` correctly.
- **ARIA:** All icon-only buttons must have `aria-label`. All charts must have accessible descriptions.
- **Motion:** Always include `prefers-reduced-motion` overrides (see Section 9).

---

## 15. Anti-Patterns (Never Do)

The following are strictly prohibited across all Tipolis pages:

| Anti-Pattern | Reason |
|---|---|
| Purple/violet/teal color accents | Off-brand; reserved palette is navy + gold |
| Rounded buttons or cards (`border-radius > 2px`) | Undermines institutional tone |
| Drop shadows with color tint | Use only `box-shadow: 0 2px 8px rgba(0,0,0,0.15)` if needed |
| Gradient fills on hero backgrounds | Use image overlay technique instead |
| Filled/solid icon styles | Always outline/stroke only |
| Font sizes below 12px | Accessibility violation |
| Decorative dividers other than the gold line | Breaks design system cohesion |
| "Card hover lift" animation (translateY on hover) | Too playful for the brand |
| Multiple accent colors | Only `--color-gold-400` series as accent |
| Generic stock-photo style images (happy people, handshakes) | Use aerial/architectural imagery only |
| Comic-style or friendly illustration | Not appropriate for governance brand |
| Loading spinners | Use linear progress bar only |
| Modal dialog with backdrop blur | Use full-panel overlay instead |
| Social media share buttons prominently displayed | Not appropriate in the context of this brand |
| Auto-playing videos with sound | Always muted + controls visible |

---

## 16. CSS Custom Property Bootstrap

Every HTML file in the repository must include this block at the top of its `<style>` tag or as the first imported stylesheet:

```css
/* ================================================================
   TIPOLIS DESIGN SYSTEM — REQUIRED BOOTSTRAP
   Load this before any component styles.
   Source of truth: TIPOLIS_UI_SPEC.md
   ================================================================ */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  /* Colors */
  --color-navy-950:   #07111F;
  --color-navy-900:   #0D1E35;
  --color-navy-800:   #152844;
  --color-navy-700:   #1E3A5F;
  --color-navy-600:   #274C7A;
  --color-gold-400:   #D4A84B;
  --color-gold-300:   #E0BF7A;
  --color-gold-200:   #EDD9A3;
  --color-gold-100:   #F7EEDB;
  --color-white:      #FFFFFF;
  --color-off-white:  #F8F8F6;
  --color-gray-100:   #F0EFEB;
  --color-gray-200:   #DDD9D0;
  --color-gray-400:   #9B9488;
  --color-gray-600:   #5C5748;
  --color-gray-800:   #2A2722;

  /* Semantic */
  --color-bg-page:         var(--color-off-white);
  --color-bg-dark:         var(--color-navy-900);
  --color-bg-card-dark:    var(--color-navy-800);
  --color-bg-card-light:   var(--color-white);
  --color-text-primary:    var(--color-gray-800);
  --color-text-secondary:  var(--color-gray-600);
  --color-text-muted:      var(--color-gray-400);
  --color-text-on-dark:    var(--color-white);
  --color-text-accent:     var(--color-gold-400);
  --color-accent-primary:  var(--color-gold-400);
  --color-accent-hover:    var(--color-gold-300);
  --color-border-light:    var(--color-gray-200);
  --color-border-dark:     var(--color-navy-600);
  --color-divider-accent:  var(--color-gold-400);

  /* Typography */
  --font-display: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
  --font-body:    'Jost', 'DM Sans', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;

  --text-xs:   0.75rem;
  --text-sm:   0.875rem;
  --text-base: 1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.25rem;
  --text-2xl:  1.5rem;
  --text-3xl:  1.875rem;
  --text-4xl:  2.25rem;
  --text-5xl:  3rem;
  --text-6xl:  3.75rem;
  --text-7xl:  4.5rem;

  --leading-tight:  1.15;
  --leading-snug:   1.35;
  --leading-normal: 1.6;
  --leading-relaxed:1.75;

  --tracking-tight:  -0.02em;
  --tracking-normal:  0;
  --tracking-wide:    0.05em;
  --tracking-widest:  0.12em;

  /* Spacing */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;
  --space-16:  64px;
  --space-20:  80px;
  --space-24:  96px;
  --space-32: 128px;
  --space-40: 160px;

  /* Layout */
  --container-max:     1280px;
  --container-pad:     48px;
  --container-pad-sm:  24px;

  /* Motion */
  --transition-fast:   150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow:   400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

html {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--color-text-primary);
  background: var(--color-bg-page);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.container {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
}

@media (max-width: 768px) {
  .container { padding-inline: var(--container-pad-sm); }
}

:focus-visible {
  outline: 2px solid var(--color-gold-400);
  outline-offset: 3px;
}
```

---

## 17. File & Asset Conventions

- **Stylesheets:** `assets/css/tipolis-design-system.css` — contains the bootstrap above.
- **Icons:** `assets/icons/` — SVG files only, always outlined stroke style.
- **Fonts:** Loaded via Google Fonts CDN (see Section 3). No local font files needed.
- **Images:** `assets/images/` — processed to meet the imagery treatment rules in Section 11.
- **Spec file:** `docs/ui/TIPOLIS_UI_SPEC.md` — canonical UI spec document.

---

## 18. Quick-Reference Cheat Sheet for AI Agents

When building any page in this repository:

1. **Read `docs/ui/TIPOLIS_UI_SPEC.md` first.**
2. Include the font link tags (Section 3).
3. Include the CSS bootstrap block (Section 16) as the first style block.
4. Use dark (`--color-bg-dark`) for hero/header sections, light (`--color-bg-page`) for content.
5. Alternate dark/light sections (Section 7).
6. Apply the gold vertical divider pattern to all heading/content columns (Section 5.1).
7. Use `var(--color-gold-400)` as the only accent color.
8. All icons: thin outline, `stroke-width: 1.5`, `fill: none`.
9. All cards: `border-radius: 0`. No rounded corners anywhere except `2px` on minor UI elements.
10. All buttons: `border-radius: 0`, gold primary or ghost secondary.
11. Typography hierarchy: gold all-caps label → display heading → body text.
12. Motion: `fadeInUp` on section entry, `150ms` on hover states. Nothing else.
13. Check the anti-patterns list (Section 15) before finalizing.

---

*This specification was authored from analysis of the Tipolis "International Cities" pitch deck (May 2026) and the `tipolis-sandbox` GitHub repository structure. It supersedes any ad-hoc styling decisions made in individual files.*

# Landing Page — NotionAI OSS

> **One-stop guide** for anyone building or customising the landing page at `/landing`.
> The ready-to-use page is already at `src/app/landing/page.tsx`.

---

## 1. What this project is

**NotionAI OSS** is an open-source, pay-as-you-go alternative to Notion AI.
Instead of paying Notion's flat subscription ($10–20 / month), users bring their own
[OpenRouter](https://openrouter.ai) API key and pay **only for the tokens they consume** —
typically a few cents per month.

Key differentiators to highlight on the landing page:

| Notion AI | NotionAI OSS |
|-----------|--------------|
| Subscription required | Pay-per-token via OpenRouter |
| Closed source | MIT open source |
| Notion-chosen models | Any model (GPT, Claude, Gemini, Llama...) |
| No self-hosting | Self-hostable |

---

## 2. Project structure (relevant files)

```
src/
├── app/
│   ├── layout.tsx          ← root layout (Geist font, global CSS)
│   ├── globals.css         ← Tailwind v4 + CSS variables (Notion palette)
│   ├── page.tsx            ← main app (authenticated dashboard)
│   ├── login/              ← login route
│   └── landing/
│       └── page.tsx        ← THE LANDING PAGE (ready to use)
└── components/
    └── ui/                 ← shadcn/base-ui component library
```

**Route:** `http://localhost:3000/landing`

---

## 3. Tech stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 15** (App Router, `src/` layout) |
| Styling | **Tailwind CSS v4** (`@import "tailwindcss"`) |
| Fonts | Geist Sans / Geist Mono (root `layout.tsx`) |
| Components | Base UI + shadcn primitives |
| Language | TypeScript |

> **Breaking change note:** This project uses Next.js 15 App Router.
> File-based routing lives under `src/app/` — there is no `pages/` directory.
> Always add `"use client"` to files that use `useState`, `useEffect`, or event handlers.

---

## 4. Design language (Notion style)

### Colour palette

```css
/* Backgrounds */
--notion-white:        #ffffff
--notion-light:        #f7f6f3
--notion-hover:        #f0efea
--notion-border:       #e8e7e3

/* Text */
--notion-black:        #1e1e1e
--notion-body:         #37352f
--notion-muted:        #787774
--notion-subtle:       #a4a3a1

/* Accent (Notion purple — use sparingly) */
--notion-purple:       #5c5bd4
--notion-purple-light: #f0efff
```

### Typography
- **Font:** Geist Sans (already loaded in root layout) → `Inter, system-ui, sans-serif` fallback
- **Headings:** `font-bold`, `tracking-tight`, fluid with `clamp()`
- **Body text:** 13–15px, `#787774` for secondary
- **Code:** Geist Mono, dark background `#1e1e1e`, green text for terminal snippets

### Spacing & shape
- Border radius: `rounded-md` (buttons), `rounded-xl` (cards)
- Shadows: `shadow-sm` default, `shadow-md` on hover — never dramatic
- Section padding: `py-24` for main sections, `py-12` for compact strips

### Motion
- Card hover: `hover:-translate-y-0.5 hover:shadow-md transition-all`
- Links: `transition-colors`
- No heavy animations — Notion is calm and focused

---

## 5. Page sections (in order)

### 5.1 Navigation
- Sticky top, `bg-white/80 backdrop-blur-md`, bottom border
- Logo: Notion "N" SVG + "NotionAI **OSS**" wordmark with purple accent
- Desktop links: Features · Pricing · FAQ · GitHub
- Right CTAs: "Log in" (ghost) + "Get started free →" (dark filled pill)
- Mobile: hamburger toggles a vertical menu

### 5.2 Hero
- Centered layout, `pt-20 pb-28`
- Subtle grid dot background (3% opacity)
- Pulsing badge: "Open source · MIT license · Free to self-host"
- H1 (fluid type): *"Notion AI, without the subscription."*
- Subtitle: OpenRouter + pay-per-token pitch, max 2 lines
- CTA pair: "Start for free →" (dark) + "View on GitHub" (bordered)
- App mockup: fake browser chrome with Notion sidebar + chat demo
- Floating cost badge (`$0.0009`) and model-switcher badge

### 5.3 Stats bar
- `bg-[#f7f6f3]`, full-width, `py-12`
- 4 animated counters: GitHub Stars · Models supported · Avg cost per query · Monthly fee
- Counters animate once when scrolled into view (IntersectionObserver)

### 5.4 Features grid (`id="features"`)
- Heading: *"Everything Notion AI has. Minus the paywall."*
- 3-col grid (1→2→3 responsive)
- 6 cards (emoji + title + body), first card purple-tinted

| # | Emoji | Title | Key point |
|---|-------|-------|-----------|
| 1 | 💸 | Pay as you go | No $20/mo — cents per query via OpenRouter |
| 2 | 🤖 | Any AI model | GPT-4o, Claude 3.7, Gemini 2.5 Flash, etc. |
| 3 | 📝 | Notion-native feel | Same sidebar, same editor, zero learning curve |
| 4 | 🔓 | Open source | MIT, self-hostable, forkable |
| 5 | 🔗 | Your API key | Data goes to model, not our servers |
| 6 | ⚡ | Lightning fast | Streaming, keyboard-first, optimistic UI |

### 5.5 How it works
- `bg-[#f7f6f3]`, 3-column horizontal steps
- Large muted step numbers (01 / 02 / 03)
- Terminal code block per step (dark bg, green mono text)

| Step | Title | Code |
|------|-------|------|
| 01 | Clone the repo | `git clone github.com/you/notion-ai-oss` |
| 02 | Add your key | `OPENROUTER_API_KEY=sk-or-...` |
| 03 | Start using AI | `npm run dev` |

### 5.6 Comparison table (`id="pricing"`)
- Heading: *"Notion AI vs. This project"*
- 3-column table: Feature · Notion AI · This project (purple header)
- Alternating row shading

| Feature | Notion AI | This project |
|---------|-----------|--------------|
| AI access | Notion AI plan ($10/mo) | Your OpenRouter key |
| Models | Notion-chosen only | GPT, Claude, Gemini, Llama... |
| Cost | $10–$20/mo flat | Pay per token used |
| Source code | Closed | Open source (MIT) |
| Self-host | No | Yes |
| Data privacy | Notion servers | Your key → model directly |

### 5.7 FAQ (`id="faq"`)
- `bg-[#f7f6f3]`, max-w-2xl centered
- Accordion (click to expand, `+` rotates 45° to `×`)

| Question | Answer summary |
|----------|----------------|
| What is OpenRouter? | API aggregator, pay-per-token, no subscriptions |
| Is my Notion data safe? | Direct to model via your key; we don't log anything |
| Can I self-host? | Yes — MIT license, clone + npm run dev |
| How much will I pay? | ~$1/mo typical; Gemini 2.5 Flash is $0.075 per 1M tokens |
| Does it feel like Notion AI? | Yes — same chat UX, slash commands, workspace context |

### 5.8 CTA banner
- Centered, generous whitespace (`py-28`)
- Large `✦` decorative glyph
- Heading: *"Ready to ditch the subscription?"*
- Repeat primary CTAs

### 5.9 Footer
- `border-t border-[#e8e7e3]`, minimal
- Logo + "NotionAI OSS — MIT License" left
- GitHub · OpenRouter · Login links right

---

## 6. Reusable component patterns

### Accordion
```tsx
function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#e8e7e3] py-5 cursor-pointer group"
         onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[15px] font-medium text-[#1e1e1e]">{q}</span>
        <span style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
              className="transition-transform duration-200 text-xl text-[#a4a3a1]">
          +
        </span>
      </div>
      {open && <p className="mt-3 text-[14px] text-[#787774] leading-relaxed">{a}</p>}
    </div>
  );
}
```

### Animated counter (scroll-triggered)
```tsx
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let n = 0;
      const step = Math.ceil(to / 60);
      const t = setInterval(() => {
        n = Math.min(n + step, to);
        setCount(n);
        if (n >= to) clearInterval(t);
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}
```

---

## 7. SEO / metadata

Since `landing/page.tsx` uses `"use client"`, put metadata in a **separate layout file**:

**Create `src/app/landing/layout.tsx`:**
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NotionAI OSS — Notion AI without the subscription",
  description:
    "Open-source Notion AI alternative powered by OpenRouter. " +
    "Pay per token, use any AI model (GPT-4o, Claude, Gemini), and self-host for free.",
  openGraph: {
    title: "NotionAI OSS",
    description: "Notion AI without the subscription. Pay-as-you-go via OpenRouter.",
    type: "website",
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

## 8. Customisation guide

### Change accent colour
Replace all `#5c5bd4` and `#f0efff` in `landing/page.tsx` globally.

### Real GitHub star count
```ts
// In a Server Component wrapper or useEffect:
const res = await fetch("https://api.github.com/repos/OWNER/REPO");
const { stargazers_count } = await res.json();
```

### Add a new section
1. Write `function NewSection() { ... }` in `page.tsx`
2. Place it between existing sections in the JSX return
3. Alternate backgrounds: `bg-white` ↔ `bg-[#f7f6f3]`

### Extract to component files
When the page grows, move sections to `src/components/landing/`:
```
src/components/landing/
  Hero.tsx
  Features.tsx
  HowItWorks.tsx
  ComparisonTable.tsx
  FAQ.tsx
  CTABanner.tsx
  Footer.tsx
```

---

## 9. Running locally

```bash
cd /path/to/notion-ai
npm run dev
# Visit: http://localhost:3000/landing
```

The landing page has **no auth or API dependencies** — it loads instantly without any `.env` config.

---

## 10. Pre-ship checklist

- [ ] Update all `href="https://github.com"` links to the real repository URL
- [ ] Replace hardcoded `2400` star count with a real fetch
- [ ] Create `src/app/landing/layout.tsx` with `metadata` export (SEO)
- [ ] Add `public/og.png` (1200×630) and reference it in metadata
- [ ] Update FAQ answers with accurate project-specific information
- [ ] Test responsive layout at 320px, 768px, 1280px
- [ ] Verify internal links: `/` (app), `/login`, GitHub URL
- [ ] Run `npm run lint` and fix any issues
- [ ] Run `npm run build` and confirm no build errors

# Chalk Talk Card — Style Template Prompt

Paste everything below the line into a new AI session, then add your topic content
(bullet points, a source article, or a rough outline). The output will be a
standalone card that matches the BloodSweatxED 2026 redesign.

After generating: save as `cards/<slug>/index.html`, then update the hub
(`cards/index.html`) and the homepage chip count (or run the `add-em-card` skill,
which handles both).

---

Build a single-file HTML page (no external dependencies except the two font files
and Google Fonts noted below) for an emergency medicine educational card on:
**[TOPIC]**. Audience: EM clinicians and trainees, written for use on shift.

## Design system — follow exactly

**Fonts**
- Display/headers: `Bungee` — self-hosted, load with:
  `@font-face{font-family:'Bungee';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/bungee-latin.woff2') format('woff2')}`
  Bungee is single-weight (400) and runs wide: keep h1 ≤ `clamp(32px,5.2vw,56px)`,
  h2 ≈ 21px, card titles 14–17px. Always `text-transform:uppercase`, `letter-spacing:0`.
- Body: `IBM Plex Sans` (400/500/600), labels/chips/code: `IBM Plex Mono` (400/500/600),
  both from Google Fonts. Mono labels get `letter-spacing:.1em–.14em` and uppercase.

**Color tokens — define both themes with CSS variables**
```css
:root{
  --chart:#F7F6F2; --ink:#11202D; --red:#C8102E; --green:#0E8A5F;
  --amber:#B47207; --steel:#5B6B77; --hairline:#DDD9CF; --card:#FFFFFF;
  --blue:#1F5C8B; --inkface:#11202D;
}
html[data-theme="dark"]{
  --chart:#0A121A; --ink:#E8EDF1; --steel:#93A4B1; --hairline:#26394B;
  --card:#1B2C3C; --blue:#6FB3DF; --green:#3DC48E; --amber:#E5B45A;
  --inkface:#0C1822;
}
```
Rules: `--ink` is TEXT color (it flips in dark mode) — never use it as a background.
Dark surfaces that stay dark in both themes (monitor strip, code blocks) use
`--inkface`. Body background is `--chart`; cards are `--card` with a 1px
`--hairline` border and 10px radius. Red is the only accent; green = good/do,
red = danger/don't, amber = caution.

**Dark/light theme — required plumbing**
Put this in `<head>` before any stylesheet:
```html
<script>
(function(){
  var q = new URLSearchParams(location.search).get('v');
  if(q === 'day') localStorage.setItem('bsxed-theme','light');
  if(q === 'night') localStorage.setItem('bsxed-theme','dark');
  var t = localStorage.getItem('bsxed-theme');
  if(!t){
    var h = parseInt(new Intl.DateTimeFormat('en-US',{hour:'numeric',hour12:false,timeZone:'America/New_York'}).format(new Date()),10);
    t = (h >= 19 || h < 7) ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = t;
})();
</script>
```
And a circular toggle button in the header (moon icon in light mode, sun in dark;
36px circle, 1.5px `--steel` border) that flips `document.documentElement.dataset.theme`
and saves to `localStorage['bsxed-theme']`. Hide the inactive icon with
`html[data-theme="dark"] .sun{display:block}` / `.moon{display:none}` etc.

**Required page furniture (top to bottom)**
1. **Monitor strip**: full-width `--inkface` bar, 3px `--red` bottom border, containing
   a small animated red ECG trace (SVG, `stroke-dasharray` sweep) and 3–4 topic
   "vitals" — big mono numbers with tiny uppercase mono labels (make them topic-specific
   and one of them witty).
2. **Header**: wordmark `BloodSweat<span class="x">x</span>ED` (Bungee, the x in red,
   links to `/`), nav of mono uppercase in-page anchor links, then the theme toggle.
3. **Hero**: red mono uppercase eyebrow `PRN EDUCATION · CHALK TALK · [TOPIC AREA]`,
   Bungee h1 ending in a period, 1–2 sentence lede in Plex Sans. Optional: faint
   ECG SVG behind the hero at ~10% opacity.
4. **Content sections** separated by `--hairline` rules, each with a Bungee h2 and a
   right-aligned mono `sec-note`. Use these patterns as fits the topic:
   - two-column indication cards (`+` bullets green for do, `!` red for caution)
   - numbered step cards (44px red-outlined circle numbers, mono)
   - a findings/numbers table (mono key/value, red values)
   - pearl cards with green GOOD / red PITFALL mono tags
   - callout boxes: green-left-border "look for" and red-left-border "red line"
5. **Epic note block** if documentation applies: dark `--inkface` code panel, mono text,
   blue SmartPhrase tokens (`#5FA8D3`), a copy button.
6. **Footer**: who-blurb (Andre, MD — EM attending, Montefiore/Einstein), links to
   `/cards/` and `/`, and this disclaimer in small mono:
   "Educational reference, not medical advice. Human curated, AI generated. Views are
   mine, not my institution's."

**Tone**: confident, terse, a little irreverent — "production or nothing" energy.
Short declarative sentences. No hedging boilerplate. Humor lives in the vitals strip
and section notes, never in the clinical content.

**Accessibility/motion**: `:focus-visible` 3px red outline;
`@media (prefers-reduced-motion:reduce)` disables ECG animations; semantic headings;
the page must read correctly in BOTH themes — check every hardcoded color against
both backgrounds.

Now generate the complete page for: **[TOPIC — paste your content/outline/source here]**

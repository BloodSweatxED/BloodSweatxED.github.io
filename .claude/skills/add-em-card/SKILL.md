---
name: add-em-card
description: Add a new educational EM card (or any PRN Education content) to the BloodSweatxED site. Use whenever the user wants to publish a card, add a reference page, add a section to the site, or update the PRN Education board. Handles the hub page, chip counts, day and night homepages, and push-to-deploy.
---

# Add an EM card to the site

The site is static HTML on GitHub Pages — no build step. Publishing = edit files, commit, push to `main` (or the designated feature branch), and Pages redeploys.

## Site framework

- `/index.html` — day homepage. `/v2/index.html` — night homepage (auto-served 19:00–07:00 ET). **Every homepage change must be made in BOTH files.**
- PRN Education sections each have a hub directory: `/pocus/`, `/procedures/`, `/meds/`, `/cards/` (Chalk Talk — the educational EM card deck). `/curbside/` lives in a separate repo.
- Each hub dir has `index.html` (the section landing page listing all entries) and a shared `<section>.css` copied from `meds/meds.css` (theme variables, monitor strip, hero, steps, pearls, Epic-note blocks, etc.).
- Shared design tokens: `--chart #F7F6F2`, `--ink #11202D`, `--red #C8102E`, `--green #0E8A5F`, `--amber #B47207`, `--steel #5B6B77`. Fonts: Big Shoulders Display (headings), IBM Plex Mono (labels), IBM Plex Sans (body).

## Routing rule (learned from The Curbside)

The homepage chip/row must ALWAYS link to the section hub (`/cards/`), never to an individual card. The hub is the router: it lists every card, so new cards only require a hub entry — the homepage link never changes.

## Steps to add a card

1. Create `cards/<card-slug>/index.html`. Model it on an existing content page (e.g. `iv-fluids/index.html` or a `procedures/*` page): monitor strip with 4 card-specific vitals, hero with eyebrow `PRN Education · Chalk Talk`, content sections, footer with disclaimer. Link `../cards.css` plus a small page-specific `<style>` block.
2. Add the card to the hub `cards/index.html` inside `<div class="hub">` — copy the commented template there. Assign the next `No. 00X`, newest first. Remove one "Dealing" placeholder if any remain.
3. Update the hub's monitor vitals (cards in the deck / being dealt).
4. Update the homepage row chip count in BOTH `index.html` and `v2/index.html` (e.g. `<span class="chip live">3 cards</span>` once cards are live; the row text stays pointed at `/cards/`).
5. Commit with a descriptive message (`Chalk Talk: add No. 003 <title>`), push. Verify no broken relative links (`grep -r "href=\"/cards" index.html v2/index.html cards/`).

## Content standards

- Human curated, AI generated: every card gets attending review before it ships; keep the tagline and the disclaimer intact.
- Teaching reference tone, not protocol: include the "not medical advice" disclaimer footer on every page.
- Epic note blocks use the `.epic-note` styles in the shared CSS when a sample note applies.

## Time-sensitive cards (snapshot treatment)

If a card is pinned to a live event (an active outbreak, a dated advisory, "today's forecast"), frame the dated data as a **point-in-time snapshot** so the card stays a useful teaching example after the event passes:

- Add a `.snapshot` banner near the header: an amber `Snapshot · <Month DD, YYYY>` tag plus a line saying the numbers capture one day, kept as a worked example, and to check the live source before applying. See `cards/wildfire-smoke/index.html` for the component and its CSS.
- In the `.meta` row use `Snapshot <date>` and `Status: Point-in-time example` instead of "Updated / Advisory active."
- Date any figure that will age: label AQI/case-count stats and strip items with the snapshot date (e.g. "AQI forecast, Jul 16").
- Keep the evergreen clinical approach (the pearl, the ED workflow) in present tense so it reads as timeless. Never change clinical content to make it "current" — only reframe the temporal claims.

# TTE (No. 006) — image drop folder

The page at `/pocus/tte/` renders every figure from a file in this folder. Any
file that is missing renders as a labelled capture slot instead of a broken
image, so the page is safe to view at any stage of filling this list.

Drop a file in with the exact name below and it appears. Nothing else to edit.

## Naming rule

`<view>-probe.webp`   photo of the probe on the patient
`<view>.webp`         the ultrasound image that probe position produces
`<view>-labeled.webp` the same image with anatomy labels (optional)

A `-labeled` file also switches on the **Labels** button over that frame. No
labeled file, no button — nothing breaks.

## The list

### Five views (10 required, 5 optional)

| File | What it is |
| --- | --- |
| `plax-probe.webp` | Probe at left sternal border, 3rd–5th ICS, indicator to right shoulder |
| `plax.webp` | PLAX: RV, septum, LV, MV, LA, LVOT, descending aorta behind the LA |
| `plax-labeled.webp` | *(optional)* same frame, labeled |
| `psax-probe.webp` | Same window as PLAX, rotated ~90° clockwise, indicator to left shoulder |
| `psax.webp` | PSAX at papillary level: round LV, both papillary muscles, crescent RV |
| `psax-labeled.webp` | *(optional)* same frame, labeled |
| `a4c-probe.webp` | Probe at PMI / inframammary fold, patient in LLD |
| `a4c.webp` | A4C: four chambers, septum vertical, LV forming the apex |
| `a4c-labeled.webp` | *(optional)* same frame, labeled |
| `subx-probe.webp` | Probe flat under the xiphoid, overhand grip, aimed at left shoulder |
| `subx.webp` | Subxiphoid: liver in near field, RV closest to probe |
| `subx-labeled.webp` | *(optional)* same frame, labeled |
| `ivc-probe.webp` | Sagittal from subxiphoid, indicator to the head |
| `ivc.webp` | IVC through the liver into the RA, hepatic vein joining |
| `ivc-labeled.webp` | *(optional)* same frame, labeled |

### Pathology gallery (6)

| File | What it is |
| --- | --- |
| `path-effusion.webp` | Pericardial effusion, anterior to the descending aorta in PLAX |
| `path-tamponade.webp` | Effusion with RV free-wall diastolic collapse |
| `path-dsign.webp` | PSAX septal flattening, D-shaped LV |
| `path-rv-strain.webp` | A4C with RV ≥ LV |
| `path-low-ef.webp` | Dilated LV, poor thickening, wide EPSS |
| `path-ivc.webp` | Flat/collapsing vs. plethoric IVC (a side-by-side works well here) |

## Prep

Export stills at roughly 4:3 or wider. Frames are `object-fit: contain` on a
black background, so a sector that doesn't fill the box looks correct — it
reads like a machine screen. Aim for ≤1600 px on the long edge.

Convert and compress:

```sh
# single file
cwebp -q 82 plax.png -o plax.webp

# whole folder of PNG/JPG exports
for f in *.png *.jpg; do cwebp -q 82 "$f" -o "${f%.*}.webp"; done
```

## Video embeds — needs a check

Each view card carries a `data-video` YouTube ID on the `<article>` in
`../index.html`. Nothing loads from YouTube until a reader presses the play
bar, so the page makes no third-party request on load.

**These five IDs are unverified.** They came from web search in an environment
with no access to YouTube, so nobody has watched them. Before publishing,
open each one and confirm it is the right view, is decent teaching, and still
exists:

| View | ID | Expected title |
| --- | --- | --- |
| PLAX | `UOpqcayai34` | Parasternal Long Axis Cardiac View |
| PSAX | `yHrzj5Mx6PY` | Parasternal Short Axis Cardiac View |
| A4C | `w7ddt2cT6tI` | Apical 4-Chamber Cardiac View |
| Subxiphoid | `n_KgMKjQG34` | Subxiphoid Cardiac View |
| IVC | `HFpPPCS1wAw` | Examining the IVC with POCUS (Stanford Medicine 25) |

Swap an ID by editing `data-video` on that card. Delete the `data-video` and
`data-video-title` attributes to drop the play bar from a card entirely.

## Before publishing

1. **Scrub every image.** Machine exports carry the patient banner (name, MRN,
   DOB, accession, date/time) burned into the pixels, and PNG/JPG exports can
   carry it again in EXIF. Crop the banner out, then strip metadata:
   `exiftool -all= *.webp`. Check the burned-in corners of each frame by eye —
   metadata tools do not touch pixels.
2. **Set the credit line.** `pocus/tte/index.html` has a placeholder marked
   `SET BEFORE PUBLISHING` above the credit paragraph under the views section.
   Replace it with the real provenance:
   - own de-identified teaching files → say so, and confirm it clears your
     department's policy on using clinical images for education;
   - a licensed source → use that source's required attribution string, and
     check the licence permits the use (some CC licences are non-commercial,
     and `ND` terms forbid adding your own labels to their image).
3. Delete the corresponding row above once a file has landed, so this list
   stays an accurate to-do.

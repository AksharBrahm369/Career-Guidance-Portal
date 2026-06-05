# Raw aptitude source drop

Put **raw fetched material** here, one folder per source, before converting it to
seed JSON. This keeps the original alongside a record of where it came from, so the
license check and conversion are auditable.

Suggested layout:

```
raw/
  icar/            # ICAR Letter/Number series, Verbal reasoning (text) + Matrix/3D rotation (images)
    source.txt     # the page/PDF text as fetched, with the URL + fetch date at the top
    images/        # any figural item images, named <itemId>-stem.png, <itemId>-a.png, ...
    LICENSE.txt    # the exact license terms copied from the source
  sandia/          # Sandia Matrices (figural)
    images/
    LICENSE.txt
  openpsych/       # Open Psychometrics text items
    source.txt
    LICENSE.txt
  nta/             # NTA/CUET released-paper items — DO NOT convert until reuse terms are confirmed
    LICENSE.txt    # record the confirmation (or the blocker) here
```

Do **not** drop copyrighted commercial test items here (e.g. Raven's Progressive
Matrices — Pearson). Only genuinely open / public-domain / clearly-licensed sources.

When a source folder is ready, follow `../instructions.html` to convert it to a
validated JSON file under `db/seed/items/` and seed it.

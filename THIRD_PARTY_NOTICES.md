# Third-Party Notices

This repository contains **no bundled or vendored third-party code**. All source
files, documentation, and icons in this repository are original works,
copyright 2026 Trimble Inc., licensed under the MIT license (see `LICENSE`).

The examples do load two resources at runtime from a content delivery network.
Both are published by Trimble and are not redistributed in this repository:

| Resource | Source | Publisher |
|----------|--------|-----------|
| SketchUp JavaScript API SDK | `https://cdn.habitat.sketchup.com/dist/sketchup-js-api/v2/sketchup-js-api.min.js` | Trimble Inc. |
| `sketchup-extension.css` | `https://cdn.habitat.sketchup.com/dist/experimental/css/latest/sketchup-extension.css` | Trimble Inc. |

## Fonts loaded at runtime

`sketchup-extension.css` imports the **Open Sans** typeface from Google Fonts:

```
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:...');
```

- **Component:** Open Sans
- **Source:** https://fonts.google.com/specimen/Open+Sans
- **License:** SIL Open Font License, Version 1.1
- **License text:** https://openfontlicense.org/open-font-license-official-text/
- **Modified:** No

Open Sans is fetched by the browser at runtime from Google's servers. No font
files are included in this repository or in the example `.zip` archives.

## Icons

The SVG icons in `css-demo/img/` and in each example folder are original line-art
drawings created for this repository. They are not derived from any commercial
or third-party icon set.

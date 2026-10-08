# Modal Form

A modal window with a form that draws a box of the size you enter.

## What's in this folder

- `manifest.json` — One command, with `window.type` set to `"modal"`
- `index.html` — Thin page shell that loads the stylesheet, the SDK, and the script
- `modal-form.js` — The form, and the box it draws
- `modal-form.css` — A style specific to this example
- `modal-form.svg` — Extension icon

## What it does

**Extensions > Modal Form** opens a centered window:

```
┌── Modal Form ───────────────────────┐
│ Width (inches)   [ 100            ] │
│ Depth (inches)   [ 100            ] │
│ Height (inches)  [ 100            ] │
│                                     │
│ [ Draw a Box ]                      │
└─────────────────────────────────────┘
```

**Draw a Box** draws the box as a group, in one undoable step.

## Going modal

One field does it:

```jsonc
{
  "window": { "type": "modal", "width": 360, "height": 420 },
}
```

A modal is always centered, so it takes a `width` and `height` but no position.
It blocks the model until the user closes it.

## Learn more

- [The Manifest: window](https://developer.trimble.com/docs/sketchup/jsa/welcome/manifest/#window) — every window type and the sizing fields each one takes

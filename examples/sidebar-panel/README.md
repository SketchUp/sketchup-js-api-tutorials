# Sidebar Panel

A panel docked in SketchUp's sidebar that logs each selection change.

## What's in this folder

- `manifest.json` — One command, with `window.type` set to `"sidebar"`
- `index.html` — Thin page shell that loads the stylesheet, the SDK, and the script
- `sidebar-panel.js` — The selection observer and the log panel
- `sidebar-panel.css` — A couple of styles specific to this example
- `sidebar-panel.svg` — Extension icon

## What it does

**Extensions > Sidebar Panel** opens the panel beside the model. Select
something and a line is logged:

```
Selection log
  10:42:07  2 elements selected
  10:42:03  1 element selected
            The selection forms a surface.
  10:41:58  Ready
            Listening for selection changes.
```

## Going sidebar

One field does it:

```jsonc
{
  "window": { "type": "sidebar", "height": 400 },
}
```

A sidebar takes only a `height`. Every sidebar panel shares one width, set by
SketchUp, and the panel is docked, so `width` and position are ignored.

## Observing the selection

```javascript
const handle = model.observeSelectionMetadata((metadata) => {
  console.log(`${metadata.totalNumberOfElements} selected`);
});

window.addEventListener('pagehide', () => handle.stop());
```

The handle is returned synchronously, so don't `await` it. Call `stop()` when
you're done, or SketchUp keeps sending changes.

## Learn more

- [The Manifest: window](https://developer.trimble.com/docs/sketchup/jsa/welcome/manifest/#window) — every window type and the sizing fields each one takes
- [Selection examples](https://developer.trimble.com/docs/sketchup/jsa/examples/selection/) — getting, filtering, streaming and changing the selection

# Hello World

A minimal SketchUp Web extension that demonstrates reading model info and
creating geometry.

## What's in this folder

- `manifest.json` — Extension manifest
- `index.html` — Thin page shell that loads the stylesheet, the SDK, and the script
- `hello-world.js` — All of the extension's logic
- `hello-world.css` — A couple of styles specific to this example
- `hello-world.svg` — Toolbar/menu icon

## What it does

- **Get Model Info** — Reads the active model and displays entity counts by
  type, material names, and component definition names.
- **Draw a Box** — Creates a 100&times;100&times;100 inch cube using
  `createFace` and `facePushPull`, inside a single undoable operation.

## How it works

`index.html` stays deliberately thin. It loads the shared stylesheet and the
JSA SDK, then hands off to `hello-world.js`:

```html
<link rel="stylesheet" href="https://cdn.habitat.sketchup.com/dist/experimental/css/latest/sketchup-extension.css">
<script type="application/javascript" src="https://cdn.habitat.sketchup.com/dist/sketchup-js-api/v2/sketchup-js-api.min.js"></script>
<script type="module" src="./hello-world.js"></script>
```

The SDK gives you a global `SketchUpApi` object. Connect to it once, then get a
handle on the model:

```javascript
await SketchUpApi.connect();
const model = await SketchUpApi.getActiveModel();
```

Because this extension has a floating window, it starts running as soon as that
window opens — there's nothing to wait for. Headless extensions (no window)
instead wait for a command with `SketchUpApi.ui.on()`.

Anything that changes the model goes inside `performOperation()`, which makes
the whole change a single undo step:

```javascript
await model.performOperation((op) => {
  const group = op.createGroup(op.model);
  const faceRef = op.createFace(group, [[0, 0, 0], [100, 0, 0], [100, 100, 0], [0, 100, 0]]);
  op.facePushPull(faceRef, -100, true);
}, 'Draw a Box');
```

## Learn more

- [Creating an extension](https://developer.trimble.com/docs/sketchup/jsa/welcome/extension/) — what goes in an extension bundle
- [Hand-Coded JS/HTML Extension](https://developer.trimble.com/docs/sketchup/jsa/tutorials/hand-coded/) — building one like this from scratch, step by step

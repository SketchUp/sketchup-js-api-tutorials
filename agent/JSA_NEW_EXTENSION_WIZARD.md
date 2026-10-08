# JSA Extension Creation Wizard

When the user asks to create a new JSA extension, guide them through the process
below. The end result is a ZIP file they can drag into the SketchUp Web Extension
Manager to install.

Official docs: [Creating an extension](https://developer.trimble.com/docs/sketchup/jsa/welcome/extension/).

---

## Step 1: Extension Name

Ask: **"What do you want your new extension to be called?"**

Use their answer to derive:
- `name`: The display name (e.g., "Box Buddy")
- `id`: Kebab-case ID (e.g., "box-buddy")
- Folder name: PascalCase (e.g., "BoxBuddy")

## Step 2: Window Type

Ask: **"What kind of window do you want?"**

Options:
1. **Floating** - A draggable/resizable window that floats over the model. Best for tools and panels.
2. **Sidebar** - A collapsible panel in the right sidebar (like the built-in inspectors). Best for property panels, selection info, or anything the user checks frequently while working.
3. **Modal** - A centered dialog that blocks interaction with the model. Best for wizards or setup flows.
4. **Tab** - Opens in a new browser tab that stays connected to SketchUp Web. Best for anything too big for a panel: long reports, big tables, side-by-side editors.
5. **Headless** - No visible window. The extension runs in the background. Best for menu actions, themes, or analytics.

## Step 3: Window Size & Position

Only floating, modal and sidebar windows take a size. Skip this step for **tab**
and **headless** — neither accepts a size or position.

If they chose **floating**, ask: **"Where do you want your window positioned and how big?"**

Offer presets:
1. **Right panel (default)** - 320x610, right: 200, top: 55
2. **Large floating** - 800x600, centered
3. **Custom** - Let them specify width, height, and position (top/bottom/left/right)

If they chose **modal**, ask: **"How big should the modal be?"**

Offer presets:
1. **Medium (default)** - 800x600
2. **Large** - 1200x700
3. **Custom** - Let them specify

If they chose **sidebar**, ask: **"How tall should the panel be?"**

Offer presets:
1. **Medium (default)** - 400
2. **Tall** - 700
3. **Custom** - Let them specify

Don't ask a sidebar for its width. Every panel in SketchUp's sidebar shares one
width set by the app, so a `width` in the manifest is ignored.

## Step 4: Create the Extension Files

Based on their answers, create a folder with the following structure:

### Folder Structure
```
{FolderName}/
  ├── manifest.json
  ├── index.html
  ├── {extension-id}.js
  └── {extension-id}.svg
```

### manifest.json

```json
{
  "manifestFormatVersion": "1.0.0",
  "id": "{extension-id}",
  "baseUrl": "/",
  "mainFile": "index.html",
  "name": "{Extension Title}",
  "icon": "{extension-id}.svg",
  "description": "{Brief description}",
  "version": "1.0.0",
  "commands": {
    "open-{extension-id}": {
      "title": "{Extension Title}",
      "description": "{Brief description}",
      "icon": "{extension-id}.svg"
    }
  },
  "menuItems": [
    { "type": "item", "commandId": "open-{extension-id}" }
  ],
  "window": {
    "type": "{floating|sidebar|modal|tab|headless}",
    "width": {width},
    "height": {height}
  }
}
```

Note: `baseUrl` is rewritten automatically when you install via ZIP. You can
leave it as-is — it won't cause problems.

The manifest above is the minimum. For the full set of fields — `menuItems`
entry types, `toolbars`, window types, and the `parentMenu` field (which takes
one of exactly four values, *not* a path) — see **JSA_MANIFEST.md** in this
folder. Don't invent a `parentMenu` value: anything outside that list is
silently ignored.

By default, menu items land in the Extensions menu. To group several items
under one heading there, use a top-level `subMenu` entry in `menuItems` — that,
not `parentMenu`, is how you make your own named menu.

### Choose an Icon

Create a simple line-art SVG named `{extension-id}.svg` in the extension folder.

- Use `viewBox="0 0 24 24"` and draw with strokes rather than fills
- Use `stroke="#0E416C"` (SketchUp brand blue) with `stroke-width="1.5"` and
  `stroke-linecap="round"` / `stroke-linejoin="round"`
- Keep it to a handful of paths — at menu size, detail is lost anyway

See the icons in `../examples/` for the house style.

**Icon selection guidelines:**
- Pick something visually descriptive of what the extension does
- A couple of geometric primitives usually reads better than a literal drawing

Only use icons you have the rights to. Don't copy path data out of a commercial
icon set unless the user holds a license for it — draw something simple instead,
or use a set published under an open license such as SIL OFL or CC BY.

### index.html (starter template)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Extension Title}</title>
  <link rel="stylesheet" href="https://cdn.habitat.sketchup.com/dist/experimental/css/latest/sketchup-extension.css">
  <script type="application/javascript" src="https://cdn.habitat.sketchup.com/dist/sketchup-js-api/v2/sketchup-js-api.min.js"></script>
  <script type="module" src="{extension-id}.js"></script>
</head>
<body>
</body>
</html>
```

Keep `index.html` thin: load the stylesheet, load the SDK, then point at your
script. Leave the `<body>` empty and build the UI from JavaScript — that keeps
all the logic and markup in one place.

### Main JS File (starter template)

```javascript
// Copyright {YEAR} {Your Name or Company}
// Licensed under the MIT license

/**
 * {Extension Title} — Brief description of what this extension does.
 *
 * What it does:
 *   (a sentence or two for a human reading this cold)
 *
 * How it works (high-level):
 *   1. ...
 *   2. ...
 *
 * Key JSA concepts demonstrated:
 *   - (list the main APIs or patterns used)
 */

// ---------------------------------------------------------------------------
// 1. UI
// ---------------------------------------------------------------------------

document.body.innerHTML = `
  <details class="info" open>
    <summary>About {Extension Title}</summary>
    Brief description of what the extension does and how to use it.
  </details>
  <p>Hello from {Extension Title}!</p>
`;

// ---------------------------------------------------------------------------
// 2. Init & Connection
// ---------------------------------------------------------------------------

try {
  await SketchUpApi.connect();
  const model = await SketchUpApi.getActiveModel();
  // Your code here
} catch (e) {
  console.error('{Extension Title} init error:', e);
}
```

If the extension is **headless** (no `window` in the manifest), don't connect on
load. Register the command handler first, then connect:

```javascript
SketchUpApi.ui.on('{command-id}', async () => {
  doTheThing();
});

await SketchUpApi.connect();
```

Extensions **with** a window start running as soon as the window opens, so they
don't need `ui.on` at all.

A headless extension has no DOM to show anything in, so don't build one and don't
load a stylesheet. To talk to the user, use `SketchUpApi.ui.getModalInput()` —
SketchUp draws the dialog for you, and it's the only channel available
(`alert()`/`confirm()`/`prompt()` don't work in an extension iframe):

```javascript
const result = await SketchUpApi.ui.getModalInput({
  actions: 'okcancel',
  message: 'How tall is your shape in inches?',
  inputs: { height: { widgetType: 'text', valueType: 'string', default: '100' } },
});

if (result.action !== 'ok') return;             // Cancel resolves, it doesn't throw
const height = Number.parseFloat(result.inputStates.height);  // Always a string
```

Surface errors the same way — a `console.error()` in a headless extension is
invisible to the user. See `JSA_RECIPES.md` → "Modal Input" for the full options.

## Step 5: Build the ZIP

Create a ZIP file from the folder contents. Best practice is to put
`manifest.json` at the root of the ZIP (not nested inside a wrapper folder):

```bash
cd {FolderName}
zip -r ../{FolderName}.zip .
cd ..
```

The resulting ZIP should contain:
```
manifest.json
index.html
{extension-id}.js
{extension-id}.svg
img/             ← subfolders are fine for organizing assets
css/
```

**Notes on ZIP structure:**
- `manifest.json` should be at the root of the ZIP, or inside a single
  top-level subfolder. The Extension Manager looks in both places.
- Subfolders within your extension are perfectly fine for organizing images,
  CSS, additional JS modules, etc. Reference them with relative paths in your
  code (e.g., `img/icon.svg`, `css/custom.css`).
- Avoid a nested wrapper folder (i.e., don't zip the folder itself — zip the
  contents). This keeps paths clean.

To install: open SketchUp Web → File → Extensions → Extension Manager → drag
the .zip onto the upload area.

---

## Step 6: JS Documentation Style

Extensions should follow consistent commenting conventions.

### File Header

Every JS file starts with a JSDoc block: title with em-dash, description, and
key concepts.

```javascript
/**
 * My Extension — One-line summary of what it does.
 *
 * Longer explanation if needed — what it does, how it works at a high level.
 *
 * Key JSA concepts demonstrated:
 *   - model.performOperation()  — modifying geometry
 *   - model.observeSelectionMetadata()  — live selection events
 */
```

### Section Dividers

Separate logical sections with box-drawing dividers:

```javascript
// ─── Section Name ───────────────────────────────────────────────────────────
```

Common sections: **State**, **UI**, **SketchUp Connection**, **Helpers**.

### Info Box

Every extension with a visible window should include an info box at the top of
its body HTML:

```html
<details class="info" open>
  <summary>About {Extension Title}</summary>
  Brief description of what it does and how to use it.
</details>
```

The `open` attribute shows it expanded by default. Users can collapse it to save
space.

---

## Step 7: Styling Guidelines

Every extension should include `sketchup-extension.css` in its `index.html`. It
provides SketchUp-consistent styling for buttons, inputs, typography, and layout:
```html
<link rel="stylesheet" href="https://cdn.habitat.sketchup.com/dist/experimental/css/latest/sketchup-extension.css">
```

Load it from the CDN rather than bundling a copy, so you pick up fixes
automatically. For styles specific to your extension, add a sibling stylesheet
named after the extension (`{extension-id}.css`) and load it *after* this one.
See `../css-demo/README.md` for what the shared stylesheet covers, and
`../css-demo/css-demo.html` for a live reference of every component.

### Built-in Components (Don't Reinvent)

| Component | HTML | Notes |
|-----------|------|-------|
| **Primary Button** | `<button>Click me</button>` | Blue, full-width by default |
| **Secondary Button** | `<button class="secondary">Cancel</button>` | Outlined style |
| **Icon Button** | `<button class="icon-button"><img src="..."></button>` | 40x40 image button |
| **Accordion** | `<details><summary>Title</summary>Content</details>` | Collapsible sections |
| **Columns** | `<div class="columns"><div>A</div><div>B</div></div>` | Auto-equal columns |
| **Switch** | `<input type="checkbox" role="switch">` | Toggle slider |
| **Icon Tabs** | `<menu><li><img src="..."></li></menu>` | Tab bar with icons |
| **Fixed Footer** | `<footer>...</footer>` | Body padding adjusts automatically |

### CSS Pitfalls to Avoid

1. **Don't override the font** — Open Sans with fallback is already configured
2. **Don't set body background** — The stylesheet sets it, light or dark
3. **Buttons are full-width** — That's intentional; don't fight it
4. **Base font size is 12px** — Keep text small and consistent
5. **Don't use `<header>`** — The containing window already displays the extension's name
6. **Minimize custom CSS** — Use the built-in classes, add only what's truly needed
7. **Don't hard-code colors** — Pages can be dark on hosts with a dark appearance. Use the
   `--su-*` variables (`var(--su-text-secondary)`, `var(--su-border)`, ...) or
   `light-dark(<light>, <dark>)` for your own colors. Navy `<img>` icons need a dark-mode
   treatment too; see `../css-demo/css-demo.html`. To keep an extension light-only, add
   `:root { color-scheme: light; }` to its stylesheet

---

## Step 8: Implement Functionality

Ask: **"Tell me what your extension should do. Describe the buttons,
interactions, all that jazz and I'll do my best to make it."**

Once the user describes what they want, implement it using the JSA API
documentation provided in `JSA_API_COMPLETE.md` in this folder.

### Common Patterns

```javascript
// Connect to SketchUp (always do this first)
await SketchUpApi.connect();
const model = await SketchUpApi.getActiveModel();

// Query the model
const entities = await model.entities.get();      // Things in the scene
const materials = await model.getMaterials();     // Colors and textures
const definitions = await model.getDefinitions();// Reusable building blocks
const scenes = await model.getScenes();          // Saved camera views

// Modify the model (ALL changes must be inside performOperation)
await model.performOperation(async (op) => {
  const group = op.createGroup(op.model);
  // Coordinates are [x, y, z] in INCHES. Z is UP.
  const face = op.createFace(group, [
    [0, 0, 0], [100, 0, 0], [100, 100, 0], [0, 100, 0]
  ]);
  op.facePushPull(face, -100, true);  // Extrude into a 3D box
}, 'Operation Name');  // This label appears in Edit > Undo
```

### Performance: Use entityBuilder for Bulk Geometry

When creating many faces/edges (grids, meshes, etc.), use `op.createBuilder()`
instead of calling `op.createFace()` in a loop. The builder batches everything
into a single round-trip, which is dramatically faster.

```javascript
await op.createBuilder((builder) => {
  const refs = triangles.map(tri => builder.createFace(tri));
  return refs;
})
.onPostBuild((converter, refs) => {
  for (const r of refs) {
    op.faceSetEdgeProperties(converter.asRef(r), 1, { smooth: true, soft: true });
  }
})
.build(groupRef);
```

---

## Quick Reference: Window Types

| Type | Use Case | Properties |
|------|----------|------------|
| `floating` | Tools, panels | width, height, top/bottom, left/right |
| `sidebar` | Inspectors, property panels | height only — sidebar width is fixed by SketchUp |
| `modal` | Wizards, setup | width, height (centered automatically) |
| `tab` | Roomy editors, dashboards, reports | Opens a new browser tab; no size/position |
| `headless` | Background tasks | No size/position needed |

Those five are the whole list. An unrecognized type quietly becomes `floating`,
so a typo here surfaces as a window in the wrong place rather than an error.

## Reference Files (in this package)

- **JSA_API_COMPLETE.md** — Full SDK reference with examples for all available methods
- **JSA_RECIPES.md** — Common patterns and recipes
- **JSA_MANIFEST.md** — Detailed manifest format documentation
- **../css-demo/README.md** — What the shared stylesheet provides, and the class names to use
- **../examples/** — Working example extensions (hello-world, menu-items, toolbar-headless, server-hosted)

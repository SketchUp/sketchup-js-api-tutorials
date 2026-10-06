# Menu Items

A tour of every menu entry type a JSA extension can declare, with a floating
panel that logs each command as it arrives.

## What's in this folder

- `manifest.json` — The interesting file in this example: three commands arranged
  into a menu with one of each entry type
- `index.html` — Thin page shell that loads the stylesheet, the SDK, and the script
- `menu-items.js` — Command handlers and the log panel
- `menu-items.css` — A couple of styles specific to this example
- `menu-items.svg` — Extension icon, also used by the Show Command Log command
- `menu-items-shape.svg` — A second icon, used by the two draw commands

## What it does

After installing, everything appears under a single root menu,
**Extensions > Menu Items Example**:

```
Extensions
└── Menu Items Example ▸   Show Command Log
                          ──────────────────
                          Draw a Box
                          More Shapes  ▸   Draw a Pyramid
                                           ──────────────────
                                           Again  ▸  Draw a Box
                                                     Draw a Pyramid
```

Pick any entry and the floating panel logs the `commandId` that was dispatched.
**Draw a Box** and **Draw a Pyramid** also add geometry, each as a single
undoable operation.

## The menu vocabulary

`menuItems` takes three entry types, and they nest:

| Entry | Shape | Notes |
|-------|-------|-------|
| Item | `{ "type": "item", "commandId": "draw-box" }` | Clickable action |
| Divider | `{ "type": "divider" }` | Visual separator |
| Submenu | `{ "type": "subMenu", "title": "More Shapes", "menuItems": [...] }` | Recursive — submenus can contain submenus |

Two details worth calling out:

**Commands are defined once and referenced anywhere.** `draw-box` appears in two
different menu entries (top level, and inside the nested `Again` submenu). Both
dispatch the same `commandId`, so there's one handler for it in the JS.

**A top-level `subMenu` is how you get your own root menu.** Everything here is
wrapped in one `subMenu` titled "Menu Items Example", so the extension occupies a
single heading in the Extensions menu instead of scattering entries across it.
Unwrap it and the entries sit directly in Extensions.

It's tempting to reach for `parentMenu` for this, but that field does something
different: it picks *which* of SketchUp's menus you attach to, and it accepts
only `"Extensions"` (the default), `"Export"`, `"Import"` and `"Download"`. It is
not a path, and an unrecognized value is silently ignored — you'd end up back in
the Extensions menu wondering why. See `../../agent/JSA_MANIFEST.md` for the
details.

## How it works

Each command in the manifest gets a handler:

```javascript
SketchUpApi.ui.on('draw-box', async () => {
  await drawBox();
});
```

Handlers are registered *before* `SketchUpApi.connect()`, so a command that
arrives during startup isn't dropped:

```javascript
registerHandlers();
await SketchUpApi.connect();
const model = await SketchUpApi.getActiveModel();
```

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

- [The Manifest: commands](https://developer.trimble.com/docs/sketchup/jsa/welcome/manifest/#commands) and [menu items](https://developer.trimble.com/docs/sketchup/jsa/welcome/manifest/#menu-items) — the full field reference

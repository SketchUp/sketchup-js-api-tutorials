# Toolbar Headless

A headless extension that adds three tool buttons. Each one asks how tall you
want your shape, then draws it. No HTML UI at all — every pixel the user sees
comes from SketchUp itself.

## What's in this folder

- `manifest.json` — Four commands — three on a `toolbars` entry, one on a menu —
  with `window.type` set to `"headless"`
- `index.html` — Thin page shell: loads the SDK and the script, nothing else
- `toolbar-headless.js` — Command handlers, the height prompt, and the geometry
- `toolbar-headless.svg` — Extension icon
- `toolbar-headless-cube.svg`, `toolbar-headless-cylinder.svg`,
  `toolbar-headless-pyramid.svg` — One icon per tool button

## What it does

After installing, three new tool buttons are available:

```
┌─────┬─────┬─────┐
│  ▣  │  ▮  │  ◭  │
└─────┴─────┴─────┘
  Cube  Cyl.  Pyr.
```

Click any of them and SketchUp shows a dialog:

```
┌── Draw a Cube ──────────────────────┐
│ How tall is your shape in inches?   │
│                                     │
│ Height  [ 100                     ] │
│                                     │
│               [ Cancel ]  [  OK  ]  │
└─────────────────────────────────────┘
```

Click OK and the shape is drawn at the model origin as a group, in one undoable
step. Click Cancel and nothing happens.

## Going headless

One field does it:

```jsonc
{
  "window": { "type": "headless" },
}
```

No window ever opens. `index.html` still loads in a hidden iframe, but `<body>`
is never seen — so don't build a DOM and don't load a stylesheet. Your only
channel to the user is `ui.getModalInput()`; `alert()` and `confirm()` don't work
in an extension iframe. That includes errors, which is why every handler here
catches and reports through a message box.

## Tool buttons

Each `toolbarItems` entry adds one tool button, referencing the same `commands`
your menu items do:

```jsonc
{
  "toolbars": [
    {
      "title": "Shapes",
      "toolbarItems": [
        { "type": "item", "commandId": "draw-cube" },
        { "type": "item", "commandId": "draw-cylinder" },
        { "type": "item", "commandId": "draw-pyramid" },
      ],
    },
  ],
}
```

**Give every tool button's command its own `icon`.** A button is nothing but its
icon, so commands without one all fall back to the extension icon and you get
three identical buttons.

`title` names the group the buttons belong to; on SketchUp Web they currently
surface individually in the tool overflow.

## Asking a question

`SketchUpApi.ui.getModalInput()` asks SketchUp to draw a native dialog and
resolves once the user dismisses it:

```javascript
const result = await SketchUpApi.ui.getModalInput({
  actions: 'okcancel',
  title: 'Draw a Cube',
  message: 'How tall is your shape in inches?',
  inputs: {
    height: { widgetType: 'text', valueType: 'string', default: '100', label: 'Height' },
  },
});

if (result.action !== 'ok') return;   // Cancel resolves, it doesn't throw
const height = Number.parseFloat(result.inputStates.height);   // Always a string
```

Omit `inputs` and `actions` and it's a plain message box — handy for errors, and
with no answer to wait for, so `void` it instead of awaiting.

Full option reference: [`../../agent/JSA_RECIPES.md`](../../agent/JSA_RECIPES.md).

## Tell the user where the buttons are

The fourth command draws no geometry. **Extensions > Toolbar Headless** shows a
message pointing at the tool overflow, because new buttons don't always land
where the user expects — they install your extension, see nothing happen, and
assume it's broken. A headless extension has no panel to explain itself in, and
the menu is somewhere they can always find.

Note the menu item is named after the extension rather than after what it does.
Someone hunting for help scans the Extensions menu for the name of the thing they
installed; the dialog has room to be descriptive, the menu row doesn't.

## Register handlers before connecting

Clicking a tool button is what creates a headless extension's iframe, so the
command that launched you is already in flight while your script runs. SketchUp
replays it once a handler exists:

```javascript
registerHandlers();
await SketchUpApi.connect();
```

Swap those two lines and the first click does nothing. This is also why a
headless extension doesn't need `loadAtLaunch`.


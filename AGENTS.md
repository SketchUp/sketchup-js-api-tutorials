# Working in this repo

This repo teaches the **SketchUp JavaScript API (JSA)** by example. People clone
it and ask an AI agent to build them a SketchUp Web extension. If that's what
you've been asked to do, this file tells you how to do it well.

You are almost certainly here to **create a new extension**, not to modify the
repo's own tooling. There is no build system, no package manager, and no test
suite. An extension is plain HTML/CSS/JS plus a `manifest.json`, zipped.

## Read these first

Read them in this order before writing code. They are written for you, not for
humans, as a condensed digest of the [official docs](https://developer.trimble.com/docs/sketchup/jsa/welcome/),
which are the source of truth. Prefer both over your own recall of the JSA,
which is a small and fast-moving API you likely know poorly.

| File                                                                       | When                                            |
| -------------------------------------------------------------------------- | ----------------------------------------------- |
| [`agent/JSA_NEW_EXTENSION_WIZARD.md`](./agent/JSA_NEW_EXTENSION_WIZARD.md) | Always, when scaffolding something new          |
| [`agent/JSA_API_COMPLETE.md`](./agent/JSA_API_COMPLETE.md)                 | Always — the full API surface, densely listed   |
| [`agent/JSA_RECIPES.md`](./agent/JSA_RECIPES.md)                           | Always — correct patterns for common tasks      |
| [`agent/JSA_MANIFEST.md`](./agent/JSA_MANIFEST.md)                         | When touching menus, toolbars, or window config |
| [`css-demo/README.md`](./css-demo/README.md)                               | When building a visible UI                      |

**If an API isn't in those docs, don't invent it.** Confirm it before you use it
— first in the official [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/), then in the SDK
bundle at
`https://cdn.habitat.sketchup.com/dist/sketchup-js-api/v2/sketchup-js-api.min.js`,
which is fetchable and greppable. If you discover something genuinely missing
from the docs, say so, and offer to add it.

## Copy an existing example

Pick the closest example in [`examples/`](./examples/) and follow its shape. Each
folder's README explains what it demonstrates.

| Example                                            | Start here when                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`hello-world`](./examples/hello-world/)           | Anything with a panel. Reads model info, writes geometry. Everything ships in the zip.       |
| [`menu-items`](./examples/menu-items/)             | The extension needs a real menu — submenus, dividers, its own root heading                   |
| [`toolbar-headless`](./examples/toolbar-headless/) | The extension needs tool buttons, or has no UI of its own and asks questions via native dialogs |
| [`modal-form`](./examples/modal-form/)             | The extension needs a blocking dialog built from its own HTML                                |
| [`sidebar-panel`](./examples/sidebar-panel/)       | The extension is a panel docked beside the model                                             |
| [`server-hosted`](./examples/server-hosted/)       | The extension is served from the user's own server — a local dev server, or a host they deploy to and update without reinstalls |

## Conventions to match

These are the conventions across every example here and in SketchUp's own JSA
samples. A new extension that follows them reads as if it belongs.

- **kebab-case** folder and file names; the `.js`, `.css` and `.svg` files are
  named after the folder (`my-thing/my-thing.js`).
- **`index.html` is a thin shell.** It loads the stylesheet, the SDK, then
  `<script type="module" src="./my-thing.js">`. `<body>` stays empty and the
  script builds the UI. Modules give you top-level `await`.
- **Every file carries the license header** — `Copyright 2026 Trimble Inc` /
  `Licensed under the MIT license`, as a comment in the file's own syntax.
- **Each extension gets a `README.md`** explaining what it demonstrates and the
  couple of non-obvious things a reader should take away.
- **Colors come from the shared stylesheet's `--su-*` variables**, or
  `light-dark()` for anything they don't cover, so the extension works in light
  and dark mode. No bare hex colors in an extension's own CSS.
- **Icons are 24×24 SVGs**, `fill="none"`, `stroke="#0E416C"`,
  `stroke-width="1.5"`, round caps and joins.
- **Command and `subMenu` titles are short — 20 characters or fewer.** The menu
  widens to fit the longest entry, and it's shared with every other extension.
  Detail goes in `description`.
- **The top-level menu entry is named after the extension**, since that's what
  users scan for. Entries nested inside a `subMenu` are named for what they do.
- **Comment for a reader who is learning.** These are teaching examples: explain
  _why_, in numbered sections. Don't narrate what the code obviously does.

## Rules that are easy to get wrong

Full detail is in the `agent/` docs; these are the ones that bite hardest.

- **Units are inches. Z is up.** X/Y is the ground plane. Angles are radians.
- **Every model mutation goes inside `model.performOperation(fn, 'Name')`.** That
  makes it one undo step. The name string appears in Edit > Undo.
- **Ground-plane faces point down**, so a _negative_ push-pull distance extrudes
  upward.
- **`Ref` types are operation-scoped.** A `FaceRef` is dead once the operation
  ends. Resolve to a persistent entity inside the operation if you need it later.
- **`await SketchUpApi.connect()` before any other API call.**
- **Register command handlers _before_ connecting.** Clicking a menu item or
  tool button is what creates the extension's iframe, so that command is
  already in flight. SketchUp buffers and replays it — but only if a handler
  exists by then.
- **`loadAtLaunch` is almost never needed.** Commands work without it.
- **`alert()`, `confirm()` and `prompt()` do not work** in an extension iframe.
  Use `SketchUpApi.ui.getModalInput()`.
- **`parentMenu` cannot create your own menu** and takes only four values. To get
  a named heading, wrap your items in a top-level `subMenu`.
- **Stop observers** with `handle.stop()`.
- **A `.zip` and a bare `.json` install differently, and it's not a detail.**
  Installing a `.zip` makes `baseUrl` **ignored** — files are served from inside
  the archive, and every icon the manifest names **must** be in there or the
  install fails outright. Installing a bare `manifest.json` **honors `baseUrl`**,
  fetching `mainFile` and icons from that server. So never zip a manifest that
  points at a server; it will silently look in the archive instead.

## Finishing up

An extension isn't done until it's installable:

```bash
cd examples/my-thing
zip -rX ../my-thing.zip . -x '.DS_Store' '__MACOSX*'
unzip -Z1 ../my-thing.zip   # verify manifest.json is at the root
```

**If you edit an example's source, regenerate its `.zip`.** The zips are checked
in, and a stale one silently ships the old code.

Tell the user how to install it: Extension Manager is at
**Extensions > Extension Manager** in [SketchUp Web JSA Labs](https://jsa-labs.sketchup.com),
and they drag the `.zip` onto the upload area.

You cannot run a SketchUp extension from the terminal, so don't claim an
extension works because it "looks right" — say what you verified and what you
didn't. If the user wants it actually exercised, it has to be loaded in SketchUp.

## When adding to this repo

A new example also needs rows added to the tables in [`README.md`](./README.md),
[`examples/README.md`](./examples/README.md), and the one above — plus its `.zip`
committed alongside the folder.

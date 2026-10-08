# Extension Manifest Reference (v2)

This document describes the manifest format used in `myextensions.json` and in
ZIP-uploaded extensions' `manifest.json`. Each extension uses the commands-based
v2 format where actions are defined once and referenced by ID.

Official docs: [The Manifest](https://developer.trimble.com/docs/sketchup/jsa/welcome/manifest/).

---

## Complete Example

Note that JSON doesn't strictly allow inline comments, so the // comments below are
for learning purposes. Your final manifests will need to be comment free.

```jsonc
{
  "manifestFormatVersion": "1.0.0", // Required. Always "1.0.0" for now.

  // ─── Identity (required) ───────────────────────────────────────────────────
  "id": "model-health-check", // Unique kebab-case identifier
  "name": "Model Health Check", // Human-readable display name
  "mainFile": "index.html", // Entry point HTML file

  // ─── Metadata & Lifecycle (all optional) ───────────────────────────────────
  "baseUrl": "/", // Base for resolving relative paths
  "icon": "img/health-check.svg", // Extension icon (relative to baseUrl)
  "disabled": false, // Skip during load
  "loadAtLaunch": true, // Run at startup, before any command is clicked
  "parentMenu": "Extensions", // Which menu to appear under. Four valid values — see below.
  "loader": "loader-virtual.html", // Custom loader HTML (default: loader.html)

  "description": "Run checks on your model health.", // Shown in extension manager
  "version": "1.0.0",
  "creator": "Cool Partner",
  "copyright": "2026 Cool Partner Co",
  "creatorIcon": "https://example.com/avatar.jpg",

  // ─── Window ────────────────────────────────────────────────────────────────
  "window": {
    "type": "floating", // "headless" | "floating" | "modal" | "sidebar" | "tab"
    "width": 420,
    "height": 600,
    "right": 200, // left/top take priority over right/bottom
    "top": 55,
  },

  // ─── Commands (define actions once, reference everywhere) ──────────────────
  // Each key becomes the commandId dispatched in messages.
  "commands": {
    "open-dashboard": {
      "title": "Model Health Check", // Display text in menus/tooltips
      "description": "Open the health-check dashboard.", // Hover/alt text (optional)
      "icon": "img/health-check.svg", // Optional; falls back to extension icon
    },
    "geometry-report": {
      "title": "Geometry Report",
      "description": "Scan for reversed faces, stray edges.",
      "icon": "img/geometry.svg",
    },
    "materials-report": {
      "title": "Materials Report",
      "description": "Find unused or duplicated materials.",
      "icon": "img/materials.svg",
    },
  },

  // ─── Toolbars ──────────────────────────────────────────────────────────────
  // Tool IDs are generated as EXT_<extensionId>_<commandId>
  "toolbars": [
    {
      "title": "Reports",
      "toolbarItems": [
        { "type": "item", "commandId": "geometry-report" },
        { "type": "item", "commandId": "materials-report" },
      ],
    },
  ],

  // ─── Menu Items ────────────────────────────────────────────────────────────
  // Three entry types: "item", "divider", "subMenu" (recursive)
  "menuItems": [
    { "type": "item", "commandId": "open-dashboard" },
    { "type": "divider" },
    {
      "type": "subMenu",
      "title": "Reports",
      "menuItems": [
        { "type": "item", "commandId": "geometry-report" },
        { "type": "item", "commandId": "materials-report" },
      ],
    },
  ],
}
```

---

## Section-by-Section Breakdown

### Required Fields

```jsonc
{
  "id": "model-health-check", // Unique kebab-case ID for event routing
  "name": "Model Health Check", // Display name
  "mainFile": "index.html", // Entry point HTML file
}
```

Two more are required when installing from a **ZIP**, but optional when an extension
is loaded from a URL:

```jsonc
{
  "manifestFormatVersion": "1.0.0", // Must be "1.0.0"
  "commands": { "open-dashboard": { "title": "..." } }, // At least one entry
}
```

Note that `mainFile` has no default — omitting it fails validation, even though a
web server would happily resolve a directory to `index.html`. Always set it.

### Metadata & Lifecycle

```jsonc
{
  "baseUrl": "/", // Base for relative paths; trailing slash added if missing
  "icon": "img/health-check.svg", // Relative to baseUrl, or absolute URL
  "disabled": false, // Skipped during load
  "loadAtLaunch": true, // Run at startup, before any command is clicked. See below.
  "parentMenu": "Extensions", // "Extensions" (default), "Export", "Import" or "Download"
  "loader": "loader-virtual.html", // Custom loader HTML (default: loader.html). Use loader-virtual.html for ZIPs.
  "description": "Run checks on your model health.",
  "version": "1.0.0",
  "creator": "Cool Partner",
  "copyright": "2026 Cool Partner Co",
  "creatorIcon": "https://example.com/avatar.jpg",
}
```

**Most extensions don't need `loadAtLaunch`.** It is _not_ required for your
commands to work. Clicking a menu item already creates the extension's iframe and
then delivers the command, and a command that arrives before your `on()` handler
is registered gets buffered and replayed once you register — so a headless
extension that only reacts to menu items works fine without it.

Set it when the extension has to run with no user action at all: an observer that
watches the model, analytics, or a theme that should apply as soon as a model
opens. It's ignored for `tab` windows.

### Window Configuration

```jsonc
{
  "window": {
    "type": "floating", // "headless" | "floating" | "modal" | "sidebar" | "tab"
    "width": 420,
    "height": 600,
    "right": 200, // left/top take priority over right/bottom
    "top": 55, // Omit both axes to center
  },
}
```

Five window types:

| Type       | Use case                                                     |
| ---------- | ------------------------------------------------------------ |
| `headless` | Background work — menu actions with no UI                    |
| `floating` | Draggable/resizable panel over the model                     |
| `modal`    | Centered dialog that blocks the model                        |
| `sidebar`  | Docked panel, alongside SketchUp's own inspectors            |
| `tab`      | A new browser tab, which stays connected to SketchUp Web |

Which of these fields actually apply depends on the window type:

| Type       | `width`                                       | `height` | Position               |
| ---------- | --------------------------------------------- | -------- | ---------------------- |
| `floating` | ✅                                            | ✅       | ✅                     |
| `modal`    | ✅                                            | ✅       | Centered automatically |
| `sidebar`  | Ignored — SketchUp's sidebar is a fixed width | ✅       | Docked                 |
| `tab`      | Ignored                                       | Ignored  | Ignored                |
| `headless` | Ignored                                       | Ignored  | Ignored                |

Setting `width` on a `sidebar` isn't an error, it just has no effect: every panel
in SketchUp's sidebar shares one width, so the app decides it, not your manifest.
`headless` has no window at all, and a `tab` fills a browser tab.

A `tab` extension runs in its own browser tab rather than inside the SketchUp
page, and keeps talking to the model through the same `SketchUpApi` — connect and
call it exactly as you would from a floating panel. Reach for it when a panel is
too cramped: long reports, tables, side-by-side editors.

The fallbacks are worth knowing, because none of them produce an error:

- Omit `window` entirely, or omit `type`, and you get `headless`.
- An unrecognized `type` becomes `floating`, with a console warning.

### Commands

All actions (menu items and tool buttons) reference commands
by their key in this object. Define each action once; reuse everywhere.

```jsonc
{
  "commands": {
    "open-dashboard": {
      "title": "Model Health Check", // Display text in menus and toolbar tooltips
      "description": "Open the health-check dashboard.", // Hover/alt text. Optional, falls back to title.
      "icon": "img/health-check.svg", // Relative to baseUrl, or absolute. Falls back to extension icon.
    },
  },
}
```

The command key (e.g. `"open-dashboard"`) is dispatched as the `menuItemId` in
`extension_menu_action` messages when the user clicks.

**Keep `title` short — aim for 20 characters or fewer.** Titles aren't truncated;
instead the menu grows to fit the longest one, so a single verbose entry makes a
wide menu that's awkward to navigate — and your entry shares that menu with every
other installed extension. "Model Health Check" (18) is about as long as you want;
"Run a Complete Health Check on This Model" is too long. Put the detail in
`description`, which is where there's room for it. The same limit applies to
`subMenu` titles.

### Parent Menu

`parentMenu` chooses **which** of SketchUp's menus your `menuItems` appear under.
It takes one of exactly four values:

| Value          | Menu                                                                 |
| -------------- | -------------------------------------------------------------------- |
| `"Extensions"` | The Extensions menu. This is the default — omit the field to get it. |
| `"Export"`     | File > Export                                                        |
| `"Import"`     | File > Import                                                        |
| `"Download"`   | File > Download                                                      |

```jsonc
{
  "parentMenu": "Export", // Put this extension's items in File > Export
}
```

Three things to know:

- **It is not a path.** `"Diagnostics"`, `"Examples/Menus"`, or any other value is
  invalid and silently falls back to the Extensions menu. Nothing warns you.
- **The values are case-sensitive.** `"export"` falls back to Extensions.
- **It cannot create your own named menu.** To gather your items under a single
  heading, put them in a top-level `subMenu` entry inside `menuItems` (see below)
  and leave `parentMenu` alone.

Use `"Export"` / `"Import"` / `"Download"` only if your extension really is an
importer, exporter or downloader — that's where users look for those.

> **Subject to change.** `parentMenu` is still being reworked. The four values
> above are what ships today, but treat this field as unstable: build so your
> extension is still usable if its items land in the Extensions menu instead.

### Menu Items

```jsonc
{
  "menuItems": [
    { "type": "item", "commandId": "open-dashboard" }, // Clickable action
    { "type": "divider" }, // Visual separator
    {
      "type": "subMenu",
      "title": "Reports",
      "menuItems": [
        // Recursive nesting
        { "type": "item", "commandId": "geometry-report" },
      ],
    },
  ],
}
```

Three entry types:

- `{ type: "item", commandId }` — Clickable action.
- `{ type: "divider" }` — Visual separator.
- `{ type: "subMenu", title, menuItems[] }` — Nested submenu (recursive).

An item's label comes from its command's `title`, so the 20-character guidance
above applies here too — for `subMenu` titles as well.

**Name your top-level entry after your extension.** Users scan the Extensions
menu for the name of the thing they installed, not for a verb. Whether you expose
one item or a whole `subMenu`, that outermost label should be your extension's
name — `"Toolbar Headless"`, not `"Find My Tools"`. Inside a `subMenu`, name the
entries for what they do.

### Toolbars

```jsonc
{
  "toolbars": [
    {
      "title": "Reports",
      "toolbarItems": [
        { "type": "item", "commandId": "geometry-report" }, // Tool ID = EXT_<extId>_<commandId>
      ],
    },
  ],
}
```

Each `toolbarItems` entry adds one **tool button**. `title` names the group they
belong to; how prominently that grouping is presented is up to the host — on
SketchUp Web the buttons currently surface individually in the tool overflow (the
"..." at the end of the tool palette), where the user can drag them wherever they
like. Don't write copy that depends on the group name being visible.

Unlike `menuItems`, `toolbarItems` takes exactly one entry type —
`{ "type": "item", "commandId" }`. No dividers, no nesting. Tool buttons and menu
items reference the same `commands`, so one command can appear in both and a
single `ui.on()` handler serves them.

**Give every tool button's command its own `icon`.** A button is nothing but its
icon, and a command without one falls back to the extension icon — three commands,
three identical buttons. A command's `title` becomes the button's tooltip.

**Tell users where the buttons are.** A user who installs your extension and
doesn't find its buttons assumes it's broken. A menu item that points them at the
tool overflow is cheap insurance — see
`../examples/toolbar-headless/` for one.

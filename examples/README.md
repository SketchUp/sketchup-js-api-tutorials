# Example Extensions

Each subfolder is a complete JSA extension. Most ship a `.zip` that's ready to
drag into the SketchUp Web Extension Manager.

## Examples

| Folder               | Description                                                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **hello-world**      | Minimal extension. Loads the SDK and stylesheet, reads model info, and creates geometry. Everything runs from the installed zip.                                           |
| **menu-items**       | A tour of every menu entry type — items, dividers, and nested submenus — all gathered under one root menu, with a panel that logs each command as it fires.                |
| **toolbar-headless** | A headless extension — no UI of its own. Three tool buttons draw a cube, cylinder, or pyramid, asking for a height through SketchUp's native modal input dialog.           |
| **server-hosted**    | Your files served from a web server — localhost while developing, or your own host in production — instead of from a zip. Installs a bare manifest rather than an archive. |

All of these except `server-hosted` are self-contained: the zip carries
everything and the extension runs entirely from it.

## Installing

1. Open [SketchUp Web JSA Labs](https://jsa-labs.sketchup.com)
2. **Extensions > Extension Manager**
3. Drag a file onto the upload area — a `.zip` for most examples, or
   `server-hosted`'s `manifest-*.json`
4. The extension appears in your Extensions menu

**Which file you drop changes the behavior**, so it's worth knowing:

| You install        | `baseUrl` | Where files come from     |
| ------------------ | --------- | ------------------------- |
| a **`.zip`**       | ignored   | inside the archive        |
| a bare **`.json`** | honored   | your server, at `baseUrl` |

That's why `server-hosted` ships manifests instead of a zip — see its README.

## Building Your Own ZIP

Each zippable folder contains `manifest.json` + source files + an icon SVG.
To create a ZIP from a folder:

```bash
cd hello-world
zip -rX ../my-extension.zip . -x '.DS_Store' '__MACOSX*'
```

`manifest.json` must be at the root of the ZIP, or inside a single top-level
folder — the Extension Manager looks in both places, so zipping the folder itself
works too. Nesting it any deeper than that won't be found. Subfolders for
organizing assets (`img/`, `css/`, etc.) are fine.

**Every icon your manifest names must be in the zip.** Icon paths are resolved
against the manifest's location inside the archive, and a missing file fails the
whole install with `Icon file not found in extension bundle`.

**Don't zip a manifest that points at a server.** Zipping makes `baseUrl` be
ignored, so the extension will look for its files in the archive instead. If
you're serving your own files, install the bare `.json` — that's what
`server-hosted` demonstrates, and it's why it has no zip.

To inspect a ZIP you've built:

```bash
unzip -Z1 my-extension.zip
```

## Conventions used here

These match the conventions used across SketchUp's own JSA examples:

- Folder and file names are kebab-case, and the `.js` / `.css` / `.svg` files
  are named after the folder.
- `index.html` is a thin shell: it loads the stylesheet and SDK, then a
  `<script type="module">` pointing at the logic. The `<body>` stays empty and
  the script builds the UI.
- Anything that changes the model is wrapped in `model.performOperation()` so it
  becomes a single undo step.
- Extensions with a window start running when the window opens. Headless
  extensions instead wait for `SketchUpApi.ui.on('<commandId>', ...)`.
- Headless extensions build no DOM and load no stylesheet — they talk to the user
  through `SketchUpApi.ui.getModalInput()` instead.

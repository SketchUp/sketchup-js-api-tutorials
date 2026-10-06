# SketchUp JavaScript API Tutorials

Agent-friendly documentation and working examples for building SketchUp Web
extensions with the SketchUp JavaScript API (JSA).

The official documentation lives at
[developer.trimble.com](https://developer.trimble.com/docs/sketchup/jsa/welcome/) — guides, tutorials and the full API
reference. This repo is its companion: clone it and experiment.

New to SketchUp development? Learn about the developer program and sign up at
[developer.sketchup.com](https://developer.sketchup.com/).

Looking for the Ruby API instead? See
[sketchup-ruby-api-tutorials](https://github.com/SketchUp/sketchup-ruby-api-tutorials).

## Quickest start

Clone this repo, open it in [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (or your preferred AI coding tool), and ask it to build you an extension:

```bash
git clone https://github.com/SketchUp/sketchup-js-api-tutorials.git
cd sketchup-js-api-tutorials
claude
```

> "Build me an extension that counts all faces in my model and displays the result in a floating panel."

[`AGENTS.md`](./AGENTS.md) in the repo root tells the agent where to look and which
conventions to follow, so it will read the reference docs in `agent/`, copy the
closest example, and produce a working extension you can install in SketchUp.
(Claude Code picks this up via `CLAUDE.md`; Cursor, Codex and others read
`AGENTS.md` directly.) For a full walkthrough, see the
[Build with Claude Code](https://developer.trimble.com/docs/sketchup/jsa/tutorials/claude-code/) tutorial.

Prefer to read rather than generate? Start with
[`examples/hello-world/`](./examples/hello-world/) — it's about 130 lines of
commented JavaScript that covers both reading from and writing to the model.
The docs walk through the same ground step by step, in
[plain JS/HTML](https://developer.trimble.com/docs/sketchup/jsa/tutorials/hand-coded/)

## Contents

### [`AGENTS.md`](./AGENTS.md)

Instructions for AI coding agents: which reference docs to read, the conventions
every example follows, and the JSA rules that are easiest to get wrong.

### [`agent/`](./agent/)

Structured reference docs optimized for AI coding agents:

- [`JSA_API_COMPLETE.md`](./agent/JSA_API_COMPLETE.md) — Full API surface reference
- [`JSA_RECIPES.md`](./agent/JSA_RECIPES.md) — Common patterns and usage examples
- [`JSA_MANIFEST.md`](./agent/JSA_MANIFEST.md) — Manifest format documentation
- [`JSA_NEW_EXTENSION_WIZARD.md`](./agent/JSA_NEW_EXTENSION_WIZARD.md) — Scaffolding guide
- [`README.md`](./agent/README.md) — Priority guide for which docs to read first

### [`examples/`](./examples/)

Working extension examples demonstrating different patterns:

- [`hello-world/`](./examples/hello-world/) — Minimal extension with model info + geometry creation
- [`menu-items/`](./examples/menu-items/) — Every menu entry type: items, dividers, nested submenus, one root menu
- [`toolbar-headless/`](./examples/toolbar-headless/) — A headless extension that adds three tool buttons, asking for input via SketchUp's native modal dialog
- [`modal-form/`](./examples/modal-form/) — A modal window with a form: centered, and blocking the model until closed
- [`sidebar-panel/`](./examples/sidebar-panel/) — A panel docked in the sidebar that logs selection changes
- [`server-hosted/`](./examples/server-hosted/) — Files served from a web server instead of a zip: localhost while developing, your own host in production

Most examples include a ready-to-install `.zip` file — drag it into Extension Manager to try it immediately. `server-hosted` is the exception: you install its manifests directly.

### [`css-demo/`](./css-demo/)

- [`README.md`](./css-demo/README.md) — The shared stylesheet that gives your extension a native SketchUp look
- [`css-demo.html`](./css-demo/css-demo.html) — Visual reference showing available UI components

## Installing an example

1. Open [SketchUp Web JSA Labs](https://jsa-labs.sketchup.com)
2. Open a model or create a new one.
3. Go to **Main Menu → Extensions → Extension Manager**
4. Click the "Upload an Extension" button or select the plus icon.
5. Drag a `.zip` file from the [`examples/`](./examples/) folder onto the upload area.
6. Your extension appears in the **Extensions** menu!

The upload area takes a bare `manifest.json` as well as a `.zip`, and the two
behave differently: a zip runs the files inside it, while a manifest tells
SketchUp to load your files from the `baseUrl` you point at. See
[`examples/server-hosted/`](./examples/server-hosted/) for that pattern.

## Contributing

If you have an example of your own that you think would be useful, open a pull
request and follow the conventions of the existing examples (see
[`examples/README.md`](./examples/README.md)). Corrections and clarifications to
the docs are equally welcome — open an issue or a PR.

Questions about the API itself, or have a bug to report?
See [Get Help](https://developer.trimble.com/docs/sketchup/jsa/welcome/help/) for ways to contact the team.

## License

Licensed under the MIT license. See [LICENSE](./LICENSE).
Third-party components are listed in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

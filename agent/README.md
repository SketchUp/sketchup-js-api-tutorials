# Agent Reference Docs

These files are optimized for AI agents (Claude, Gemini, etc.) to consume as
context when generating JSA extensions. Include them in your AI's context window
to enable it to write working SketchUp extensions.

Looking for docs written for people? The official documentation is at
[developer.trimble.com](https://developer.trimble.com/docs/sketchup/jsa/welcome/),
and its [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)
is the source of truth for every class. If these files and the live docs ever
disagree, trust the live docs.

## Files

| File | Purpose |
|------|---------|
| `JSA_API_COMPLETE.md` | The common API surface, grouped by domain: names, parameters and return types, with a `Length` section. Core classes are listed in full; rarer ones get a line each and a pointer to the live API Reference. Dense lookup table. |
| `JSA_RECIPES.md` | Usage recipes and code examples for common tasks, including working with units and `Length`. |
| `JSA_NEW_EXTENSION_WIZARD.md` | Step-by-step wizard for scaffolding a new extension from scratch. |
| `JSA_MANIFEST.md` | Detailed manifest.json format documentation (commands, menus, toolbars, window config). |

## Recommended Usage

For best results, include all four files in your AI context. If context is
limited, prioritize in this order:

1. `JSA_API_COMPLETE.md` — needed to know what's possible
2. `JSA_RECIPES.md` — needed to write correct code patterns
3. `JSA_NEW_EXTENSION_WIZARD.md` — needed to scaffold new extensions
4. `JSA_MANIFEST.md` — needed only if customizing menus, toolbars, or window behavior

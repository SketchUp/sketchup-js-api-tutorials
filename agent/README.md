# Agent Reference Docs

These files are optimized for AI agents (Claude, Gemini, etc.) to consume as
context when generating JSA extensions. Include them in your AI's context window
to enable it to write working SketchUp extensions.

## Files

| File | Purpose |
|------|---------|
| `JSA_API_COMPLETE.md` | Full API surface — every method, grouped by domain. Dense lookup table. |
| `JSA_RECIPES.md` | Usage recipes and code examples for common tasks. |
| `JSA_NEW_EXTENSION_WIZARD.md` | Step-by-step wizard for scaffolding a new extension from scratch. |
| `JSA_MANIFEST.md` | Detailed manifest.json format documentation (commands, menus, toolbars, window config). |

## Recommended Usage

For best results, include all four files in your AI context. If context is
limited, prioritize in this order:

1. `JSA_API_COMPLETE.md` — needed to know what's possible
2. `JSA_RECIPES.md` — needed to write correct code patterns
3. `JSA_NEW_EXTENSION_WIZARD.md` — needed to scaffold new extensions
4. `JSA_MANIFEST.md` — needed only if customizing menus, toolbars, or window behavior

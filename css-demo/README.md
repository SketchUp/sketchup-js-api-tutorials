# SketchUp Extension CSS

`sketchup-extension.css` is a lightweight stylesheet that gives your extension
the native SketchUp look and feel — buttons, forms, typography, accordions, and
layout all match the host application.

## How It's Used

Include it in your extension's `index.html` from the CDN:

```html
<link rel="stylesheet" href="https://cdn.habitat.sketchup.com/dist/experimental/css/latest/sketchup-extension.css">
```

Load it from the CDN rather than copying it into your ZIP. That way your
extension picks up fixes and platform adjustments automatically.

Anything specific to your extension goes in a sibling stylesheet, loaded after
this one — see `examples/hello-world/hello-world.css` for a small example.

## What it gives you

- Styled `<h1>`&ndash;`<h4>`, `<p>`, `<ul>`, `<hr>`, `<table>` and form controls
  with no classes required
- `.button`, `.secondary`, `.icon-button`, `.disabled` for buttons
- `details.info` for the collapsible "about this extension" block
- `.columns` for simple multi-column layout
- `.selected` for list selection state
- Font size custom properties (`--font-size-base` and friends) you can override
  in your own stylesheet without editing this one
- Light and dark mode, following SketchUp's appearance

## Colors and dark mode

Every color comes from a `--su-*` custom property that has a light and a dark
value: `--su-bg`, `--su-bg-surface`, `--su-bg-header`, `--su-bg-hover`,
`--su-bg-selected`, `--su-text`, `--su-text-secondary`, `--su-text-accent`,
`--su-link`, `--su-border` and `--su-border-subtle`. Use them in your own
stylesheet so your styles switch along with it:

```css
.stamp { color: var(--su-text-secondary); }
```

For a color the variables don't cover, use `light-dark()`:

```css
.error { color: light-dark(#c0392b, #ff8a7a); }
```

Images aren't recolored. `css-demo.html` shows one way to lighten navy icons
on a dark background. For anything drawn from JavaScript, such as a canvas,
check `matchMedia('(prefers-color-scheme: dark)')` and listen for its `change`
event.

To keep an extension light-only, add this to your stylesheet:

```css
:root { color-scheme: light; }
```

It must be in your stylesheet: a `<meta name="color-scheme">` tag is
overridden by this one. A light-only page should not key anything off
`prefers-color-scheme`, which still reports SketchUp's appearance.

## Visual Reference

Open `css-demo.html` in a browser to see every available component and the
markup for it. It loads the stylesheet from the CDN, so it reflects the current
version.

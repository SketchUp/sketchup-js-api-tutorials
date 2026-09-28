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

## Visual Reference

Open `css-demo.html` in a browser to see every available component and the
markup for it. It loads the stylesheet from the CDN, so it reflects the current
version.

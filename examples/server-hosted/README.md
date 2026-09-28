# Server Hosted

An extension whose files live on a web server instead of inside a zip — either
`localhost` while you're developing, or your own host in production. Both are the
same pattern; only `baseUrl` differs.

## What's in this folder

- `manifest-localhost.json` — `baseUrl` is `https://localhost:9000/`
- `manifest-remote.json` — `baseUrl` is `https://example.com/my-jsa-extension/`
- `index.html`, `server-hosted.js` — **the files you serve**
- `server-hosted.svg` — An icon you can point at once you're serving this folder
- No `.zip`, and no `manifest.json`. Both of those are deliberate — see below.

The two manifests are otherwise byte-identical. `diff` them: the only difference
is the `baseUrl` line.

## Install the manifest, not a zip

**This is the part that surprises everyone.** The Extension Manager accepts
a bare manifest file. That's all you need for server hosted extensions.

So to use this example, drag **`manifest-localhost.json` itself** onto the
Extension Manager's upload area. Don't zip it.

## Setup: localhost

1. **Serve this folder over HTTPS on port 9000.** HTTPS is not optional —
   SketchUp Web is served over HTTPS, and browsers block an HTTPS page from
   loading `http://` resources, so a plain-HTTP server will silently fail to
   load. The official docs have a ready-made `mkcert` + Python recipe.
2. Drag `manifest-localhost.json` onto the Extension Manager.
3. Open **Extensions > Server Hosted**. The panel reports the origin that served
   it — if that says `https://localhost:9000`, `baseUrl` is working.
4. Edit `server-hosted.js`, save, and reopen the panel. Your change is live with
   no reinstall.

## Setup: your own host

Same thing with a different `baseUrl`:

1. Deploy `index.html` and `server-hosted.js` to your host.
2. Edit `baseUrl` in `manifest-remote.json` to point at them.
3. Drag that manifest onto the Extension Manager.

`https://example.com/my-jsa-extension/` is a placeholder — example.com is a real
site reserved for documentation, but it won't serve JSA code, of course.

Your server also needs to allow embedding in SketchUp's iframe and send CORS
headers, or assets like your icon won't load.

The payoff: your code lives on infrastructure you control, so you can ship
updates without users reinstalling anything. Bump `version` in the manifest only
when the manifest itself changes.

## Your icon comes from your server too

Both manifests ship `"icon": "PATH/TO/YOUR/ICON.svg"`, which is a deliberate
placeholder — **and it will 404 until you change it**, so the extension shows no
icon at first. That's the honest default, because on this install path `icon` is
resolved against `baseUrl` just like `mainFile`, and fetched over the network
from your server. It is not read out of any archive.

Point it at `server-hosted.svg` once you're serving this folder, or at your own
file. A missing icon is harmless — the field is optional and SketchUp just
renders no image.

// Copyright 2026 Trimble Inc
// Licensed under the MIT license

/**
 * Server Hosted — A SketchUp Web extension served from a web server.
 *
 * What it does:
 *   Reports which origin served this page, then connects and reads the active
 *   model's name. The origin readout is the point: it proves SketchUp fetched
 *   this file from your server rather than from an installed archive.
 *
 * How it works (high-level):
 *   1. You serve this folder over HTTPS — localhost or a real host
 *   2. You install a manifest whose baseUrl points at that server
 *   3. SketchUp resolves mainFile against baseUrl and loads this page from there
 *   4. We connect and read the model, same as any other extension
 *
 * Key JSA concepts demonstrated:
 *   - Installing a bare manifest.json instead of a zip, which is what makes
 *     baseUrl take effect at all
 *   - Iterating without reinstalling: edit, save, reopen the panel
 *
 * Nothing about the JSA itself changes when you host your own files. Only where
 * the browser fetches them from changes — see README.md for why that matters.
 */

// ---------------------------------------------------------------------------
// 1. UI
// ---------------------------------------------------------------------------

document.body.innerHTML = `
  <details class="info" open>
    <summary>Server Hosted</summary>
    This page came from the server in your manifest's <code>baseUrl</code>,
    not from a zip. Edit it, save, and reopen this panel to see the change.
  </details>

  <div id="origin"></div>
  <div id="status">Connecting to SketchUp...</div>
`;

const statusDiv = document.getElementById('status');

// The whole point of this example: if this says localhost (or your own host)
// rather than a sketchup.com sandbox, baseUrl is being honored.
document.getElementById('origin').textContent =
  `Served from: ${window.location.origin}`;

// ---------------------------------------------------------------------------
// 2. Init & Connection
// ---------------------------------------------------------------------------

try {
  await SketchUpApi.connect();
  const model = await SketchUpApi.getActiveModel();
  statusDiv.textContent = `Connected. Model: ${model.name || '(unsaved)'}`;
} catch (e) {
  console.error('Server Hosted init error:', e);
  statusDiv.textContent = `Failed to connect to SketchUp: ${e.message}`;
}

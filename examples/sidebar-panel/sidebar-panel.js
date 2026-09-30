// Copyright 2026 Trimble Inc
// Licensed under the MIT license

/**
 * Sidebar Panel — A panel docked in SketchUp's sidebar.
 *
 * What it does:
 *   Logs each selection change while you work in the model.
 *
 * How it works (high-level):
 *   1. manifest.json sets window.type to "sidebar"
 *   2. This script observes the selection and logs each change
 *   3. The observer stops when the page goes away
 *
 * Key JSA concepts demonstrated:
 *   - Sidebar windows: docked beside the model, not over it
 *   - model.observeSelectionMetadata() and ObserverHandle.stop()
 */

// ---------------------------------------------------------------------------
// 1. State
// ---------------------------------------------------------------------------

let model = null;
let selectionObserver = null;

// ---------------------------------------------------------------------------
// 2. UI — The extension's visible interface
// ---------------------------------------------------------------------------

document.body.innerHTML = `
  <details class="info" open>
    <summary>About Sidebar Panel</summary>
    Select things in the model while this panel is open. Each change to the
    selection is logged below.
  </details>

  <h2>Selection log</h2>
  <ol id="log" reversed></ol>
  <button class="secondary" id="btn-clear">Clear log</button>
`;

const logEl = document.getElementById('log');

/** Prepend one entry to the on-screen log. Newest first. */
function log(summary, note) {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('li');

  const stamp = document.createElement('span');
  stamp.className = 'stamp';
  stamp.textContent = time;

  entry.append(stamp, summary);

  if (note) {
    const detail = document.createElement('div');
    detail.className = 'detail';
    detail.textContent = note;
    entry.append(detail);
  }

  logEl.prepend(entry);
}

// ---------------------------------------------------------------------------
// 3. Observing the selection
// ---------------------------------------------------------------------------

function logSelection(metadata) {
  const count = metadata.totalNumberOfElements;

  if (count === 0) {
    log('Nothing selected');
    return;
  }

  let note;
  if (metadata.isCurve) note = 'The selection forms a curve.';
  else if (metadata.isSurface) note = 'The selection forms a surface.';

  log(count === 1 ? '1 element selected' : `${count} elements selected`, note);
}

/** Returns its handle synchronously, so there's nothing to await. */
function startObserving() {
  selectionObserver = model.observeSelectionMetadata(logSelection);
}

function stopObserving() {
  selectionObserver?.stop();
  selectionObserver = null;
}

// ---------------------------------------------------------------------------
// 4. Init & Connection
// ---------------------------------------------------------------------------

try {
  await SketchUpApi.connect();
  model = await SketchUpApi.getActiveModel();

  startObserving();
  window.addEventListener('pagehide', stopObserving);

  document.getElementById('btn-clear').addEventListener('click', () => {
    logEl.replaceChildren();
  });

  log('Ready', 'Listening for selection changes.');
} catch (e) {
  console.error('Sidebar Panel init error:', e);
  document.body.innerHTML =
    `<p class="error">Failed to connect to SketchUp: ${e.message}</p>`;
}

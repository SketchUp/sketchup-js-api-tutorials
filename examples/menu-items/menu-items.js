// Copyright 2026 Trimble Inc
// Licensed under the MIT license

/**
 * Menu Items — A tour of every menu entry type a JSA extension can declare.
 *
 * What it does:
 *   Adds a menu with one of each entry type — plain items, dividers, a submenu,
 *   and a submenu nested inside that submenu — then logs every command as it
 *   arrives so you can see which commandId each entry dispatches.
 *
 * How it works (high-level):
 *   1. manifest.json declares three commands and arranges them into a menu
 *   2. This script registers a handler per command with ui.on()
 *   3. Each handler appends a line to the on-screen log
 *   4. The two "draw" commands also add geometry, so the menu does real work
 *
 * Key JSA concepts demonstrated:
 *   - SketchUpApi.ui.on(commandId, handler) — receiving menu commands
 *   - One command referenced from several menu entries (define once, reuse)
 *   - performOperation() wrapping createFace/facePushPull
 *
 * Everything lives under Extensions > Menu Items Example, because the manifest
 * wraps every entry in one top-level "subMenu". That — not the parentMenu
 * field — is how you give an extension its own named menu.
 */

// ---------------------------------------------------------------------------
// 1. State
// ---------------------------------------------------------------------------

let model = null;

// ---------------------------------------------------------------------------
// 2. UI — The extension's visible interface
// ---------------------------------------------------------------------------

document.body.innerHTML = `
  <details class="info" open>
    <summary>About Menu Items</summary>
    Open <b>Extensions &gt; Menu Items Example</b> and pick any entry.
    Each one logs the commandId it dispatched. The two draw commands also add
    geometry to the model.
  </details>

  <h2>Command log</h2>
  <ol id="log" reversed></ol>
  <button class="secondary" id="btn-clear">Clear log</button>
`;

const logEl = document.getElementById('log');

/** Prepend one entry to the on-screen log. Newest first. */
function log(commandId, note) {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('li');

  // Only the commandId is user data in spirit, but build the row from text
  // nodes anyway rather than interpolating into innerHTML.
  const code = document.createElement('code');
  code.textContent = commandId;

  const stamp = document.createElement('span');
  stamp.className = 'stamp';
  stamp.textContent = time;

  entry.append(stamp, code);

  if (note) {
    const detail = document.createElement('div');
    detail.className = 'detail';
    detail.textContent = note;
    entry.append(detail);
  }

  logEl.prepend(entry);
}

// ---------------------------------------------------------------------------
// 3. Writing to the model
// ---------------------------------------------------------------------------

/**
 * Create a 100" cube. Everything inside performOperation() becomes a single
 * entry in SketchUp's undo stack, so one Ctrl+Z removes the whole box.
 */
async function drawBox() {
  model = await SketchUpApi.getActiveModel();

  await model.performOperation((op) => {
    // Group the geometry so it doesn't merge with whatever is already there.
    const group = op.createGroup(op.model);

    // A face is defined by a closed loop of points, in inches.
    const faceRef = op.createFace(group, [
      [0, 0, 0],
      [100, 0, 0],
      [100, 100, 0],
      [0, 100, 0],
    ]);

    // Extrude it. Negative distance pushes along the reversed normal, which
    // for a ground-plane face means upward.
    op.facePushPull(faceRef, -100, true);
  }, 'Draw a Box');
}

/**
 * Create a square pyramid: one base face plus four triangles meeting at an
 * apex 100" above the center of the base.
 */
async function drawPyramid() {
  model = await SketchUpApi.getActiveModel();

  const base = [
    [0, 0, 0],
    [100, 0, 0],
    [100, 100, 0],
    [0, 100, 0],
  ];
  const apex = [50, 50, 100];

  await model.performOperation((op) => {
    const group = op.createGroup(op.model);

    op.createFace(group, base);

    // Walk the base edge by edge, lifting each one to the apex.
    for (let i = 0; i < base.length; i++) {
      const next = base[(i + 1) % base.length];
      op.createFace(group, [base[i], next, apex]);
    }
  }, 'Draw a Pyramid');
}

// ---------------------------------------------------------------------------
// 4. Command handlers
// ---------------------------------------------------------------------------
// One handler per command in the manifest. A command can appear in as many
// menu entries as you like — "draw-box" is referenced twice in this manifest
// and both entries land here.

/** Wrap a handler so a failure shows up in the log instead of vanishing. */
function handler(commandId, fn) {
  return async () => {
    try {
      const note = fn ? await fn() : undefined;
      log(commandId, note);
    } catch (e) {
      console.error(`${commandId} failed:`, e);
      log(commandId, `Error: ${e.message}`);
    }
  };
}

function registerHandlers() {
  // A plain item. The window is already open when this fires — there's nothing
  // to do but acknowledge it.
  SketchUpApi.ui.on('open-panel', handler('open-panel'));

  SketchUpApi.ui.on('draw-box', handler('draw-box', async () => {
    await drawBox();
    return 'Box created (100×100×100 inches).';
  }));

  SketchUpApi.ui.on('draw-pyramid', handler('draw-pyramid', async () => {
    await drawPyramid();
    return 'Pyramid created (100×100 base, 100 inches tall).';
  }));
}

// ---------------------------------------------------------------------------
// 5. Init & Connection
// ---------------------------------------------------------------------------
// Register the handlers *before* connecting, so a command that arrives during
// startup isn't dropped.

try {
  registerHandlers();

  await SketchUpApi.connect();
  model = await SketchUpApi.getActiveModel();

  document.getElementById('btn-clear').addEventListener('click', () => {
    logEl.replaceChildren();
  });

  log('ready', 'Listening for menu commands.');
} catch (e) {
  console.error('Menu Items init error:', e);
  document.body.innerHTML =
    `<p class="error">Failed to connect to SketchUp: ${e.message}</p>`;
}

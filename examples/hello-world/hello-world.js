// Copyright 2026 Trimble Inc
// Licensed under the MIT license

/**
 * Hello World — A SketchUp Web extension
 *
 * What it does:
 *   Demonstrates the two halves of the JavaScript API: reading information
 *   out of the model, and writing geometry back into it.
 *
 * How it works (high-level):
 *   1. Builds a small UI with two buttons
 *   2. Connects to SketchUp and gets a handle on the active model
 *   3. "Get Model Info" queries entity counts, materials and definitions
 *   4. "Draw a Box" creates a face and extrudes it, inside one undoable operation
 *
 * Key JSA concepts demonstrated:
 *   - SketchUpApi.connect() and getActiveModel()
 *   - Reading the model: entities.get(), getMaterials(), getDefinitions()
 *   - Writing to the model: performOperation() wrapping createFace/facePushPull
 *
 * This extension has a floating window, so it runs as soon as the window opens.
 * Headless extensions (no window) instead wait for SketchUpApi.ui.on().
 */

// ---------------------------------------------------------------------------
// 1. Constants & State
// ---------------------------------------------------------------------------

let model = null;

// SketchUp reports entity types as numeric codes. These are the common ones.
const TYPE_NAMES = {
  0: 'Vertex', 1: 'Edge', 2: 'Face', 3: 'Group',
  4: 'Component Instance', 10: 'Construction Point',
  11: 'Construction Line', 14: 'Section Plane',
};

// ---------------------------------------------------------------------------
// 2. UI — The extension's visible interface
// ---------------------------------------------------------------------------
// The extension runs inside an iframe. We build the UI by writing HTML into
// the document body. The shared stylesheet provides the base look;
// hello-world.css adds the few styles specific to this example.

document.body.innerHTML = `
  <details class="info" open>
    <summary>Hello World</summary>
    A minimal extension that shows reading from and writing to the model.
  </details>

  <button id="btn-info">Get Model Info</button>
  <div id="info-output"></div>
  <hr>
  <button id="btn-box">Draw a Box</button>
  <div id="box-output"></div>
`;

const infoOutput = document.getElementById('info-output');
const boxOutput = document.getElementById('box-output');

// ---------------------------------------------------------------------------
// 3. Reading from the model
// ---------------------------------------------------------------------------

/** Query the model and dump what we find as formatted JSON. */
async function getModelInfo() {
  try {
    // Re-fetch the model so we see the current state, not a stale snapshot.
    model = await SketchUpApi.getActiveModel();

    const [entities, materials, definitions] = await Promise.all([
      model.entities.get(),
      model.getMaterials(),
      model.getDefinitions(),
    ]);

    // Tally the top-level entities by type.
    const entityTypes = {};
    for (const entity of entities) {
      const name = TYPE_NAMES[entity.type] || `Type ${entity.type}`;
      entityTypes[name] = (entityTypes[name] || 0) + 1;
    }

    const info = {
      guid: model.guid,
      entities: entityTypes,
      materials: materials.values.map((m) => m.name),
      definitions: definitions.map((d) => d.name),
    };

    infoOutput.innerHTML = `<pre>${JSON.stringify(info, null, 2)}</pre>`;
  } catch (e) {
    console.error(e);
    infoOutput.innerHTML = `<p class="error">Error: ${e.message}</p>`;
  }
}

// ---------------------------------------------------------------------------
// 4. Writing to the model
// ---------------------------------------------------------------------------

/**
 * Create a 100" cube. Everything inside performOperation() becomes a single
 * entry in SketchUp's undo stack, so one Ctrl+Z removes the whole box.
 */
async function drawBox() {
  try {
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

      // Extrude it. Negative distance pushes along the reversed normal.
      op.facePushPull(faceRef, -100, true);
    }, 'Draw a Box');

    boxOutput.innerHTML = '<p>Box created (100&times;100&times;100 inches).</p>';
  } catch (e) {
    console.error(e);
    boxOutput.innerHTML = `<p class="error">Error: ${e.message}</p>`;
  }
}

// ---------------------------------------------------------------------------
// 5. Init & Connection
// ---------------------------------------------------------------------------

try {
  await SketchUpApi.connect();
  model = await SketchUpApi.getActiveModel();

  document.getElementById('btn-info').addEventListener('click', getModelInfo);
  document.getElementById('btn-box').addEventListener('click', drawBox);
} catch (e) {
  console.error('Hello World init error:', e);
  document.body.innerHTML =
    `<p class="error">Failed to connect to SketchUp: ${e.message}</p>`;
}

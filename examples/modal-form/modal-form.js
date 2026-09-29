// Copyright 2026 Trimble Inc
// Licensed under the MIT license

/**
 * Modal Form — A modal window with a form.
 *
 * What it does:
 *   Asks for a width, depth and height, then draws a box of that size.
 *
 * How it works (high-level):
 *   1. manifest.json sets window.type to "modal"
 *   2. This script builds a form with three number fields
 *   3. Submitting the form draws the box in one undoable operation
 *
 * Key JSA concepts demonstrated:
 *   - Modal windows: centered, and blocking the model until closed
 *   - performOperation() wrapping createFace/facePushPull
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
    <summary>About Modal Form</summary>
    Enter a size and draw a box at the model origin. The model is blocked
    until you close this window.
  </details>

  <form id="box-form">
    <label>Width (inches)
      <input type="number" name="width" value="100" min="1" step="any" required>
    </label>
    <label>Depth (inches)
      <input type="number" name="depth" value="100" min="1" step="any" required>
    </label>
    <label>Height (inches)
      <input type="number" name="height" value="100" min="1" step="any" required>
    </label>
    <button type="submit">Draw a Box</button>
  </form>
  <div id="output"></div>
`;

const form = document.getElementById('box-form');
const output = document.getElementById('output');

// ---------------------------------------------------------------------------
// 3. Writing to the model
// ---------------------------------------------------------------------------

/** Draw a box as one undo step. */
async function drawBox(width, depth, height) {
  model = await SketchUpApi.getActiveModel();

  await model.performOperation((op) => {
    // Group it so it doesn't merge with existing geometry.
    const group = op.createGroup(op.model);

    const faceRef = op.createFace(group, [
      [0, 0, 0],
      [width, 0, 0],
      [width, depth, 0],
      [0, depth, 0],
    ]);

    // Ground-plane faces point down, so a negative distance extrudes upward.
    op.facePushPull(faceRef, -height, true);
  }, 'Draw a Box');
}

// ---------------------------------------------------------------------------
// 4. Submitting the form
// ---------------------------------------------------------------------------

async function submit(event) {
  event.preventDefault();

  const { width, depth, height } = form.elements;

  try {
    await drawBox(width.valueAsNumber, depth.valueAsNumber, height.valueAsNumber);

    output.innerHTML = `<p>Box created (${width.value}&times;${depth.value}`
      + `&times;${height.value} inches). Close this window to get back to the model.</p>`;
  } catch (e) {
    console.error(e);
    output.innerHTML = `<p class="error">Error: ${e.message}</p>`;
  }
}

// ---------------------------------------------------------------------------
// 5. Init & Connection
// ---------------------------------------------------------------------------

try {
  await SketchUpApi.connect();
  model = await SketchUpApi.getActiveModel();

  form.addEventListener('submit', submit);
} catch (e) {
  console.error('Modal Form init error:', e);
  document.body.innerHTML =
    `<p class="error">Failed to connect to SketchUp: ${e.message}</p>`;
}

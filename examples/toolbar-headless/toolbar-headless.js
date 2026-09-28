// Copyright 2026 Trimble Inc
// Licensed under the MIT license

/**
 * Toolbar Headless — A headless extension driven entirely by tool buttons.
 *
 * What it does:
 *   Adds three tool buttons — cube, cylinder, pyramid. Each asks "How tall is
 *   your shape in inches?" in a native SketchUp dialog, then draws that shape
 *   at the model origin. A fourth command sits in the Extensions menu and
 *   explains where those buttons are.
 *
 * How it works (high-level):
 *   1. manifest.json declares four commands: three on a toolbar, one on a menu
 *   2. manifest.json sets window.type to "headless", so no panel ever opens
 *   3. This script registers a handler per command with ui.on()
 *   4. Each draw handler calls ui.getModalInput() to ask for a height
 *   5. If the user clicks OK, performOperation() builds the geometry
 *
 * Key JSA concepts demonstrated:
 *   - Headless extensions — tool buttons and a menu, but no HTML UI of your own
 *   - manifest "toolbars" — buttons that dispatch commands just like menu items
 *   - SketchUpApi.ui.getModalInput() — asking a question and showing a message
 *     without building a dialog yourself
 *
 * Because the extension is headless there is no DOM to write to and no
 * stylesheet to load. Everything the user sees comes from SketchUp itself.
 */

// ---------------------------------------------------------------------------
// 1. Asking the user for a height
// ---------------------------------------------------------------------------

/**
 * Prompt for a height in inches. Returns null if the user cancelled or typed
 * something unusable.
 */
async function askForHeight(shapeName) {
  const result = await SketchUpApi.ui.getModalInput({
    actions: 'okcancel',
    title: `Draw a ${shapeName}`,
    message: 'How tall is your shape in inches?',
    inputs: {
      // 'text' and 'string' are the only values these two fields accept today.
      height: {
        widgetType: 'text',
        valueType: 'string',
        default: '100',
        label: 'Height',
      },
    },
  });

  // Cancelling resolves, it doesn't throw. Test for the action you want.
  if (result.action !== 'ok') return null;

  // inputStates values are always strings.
  const height = Number.parseFloat(result.inputStates.height);

  if (!Number.isFinite(height) || height <= 0) {
    // No inputs and no actions makes it a message box. Nothing to await.
    void SketchUpApi.ui.getModalInput({
      title: `Draw a ${shapeName}`,
      message: `"${result.inputStates.height}" is not a height. `
        + 'Enter a positive number of inches.',
    });
    return null;
  }

  return height;
}

// ---------------------------------------------------------------------------
// 2. Drawing the shapes
// ---------------------------------------------------------------------------
// Each shape is grouped so it doesn't merge with existing geometry, and wrapped
// in performOperation() so it's a single undo step. Ground-plane faces point
// down, so a negative push-pull distance extrudes upward.

/** Draw a cube whose every edge is `height` inches. */
async function drawCube(height) {
  const model = await SketchUpApi.getActiveModel();

  await model.performOperation((op) => {
    const group = op.createGroup(op.model);

    const face = op.createFace(group, [
      [0, 0, 0],
      [height, 0, 0],
      [height, height, 0],
      [0, height, 0],
    ]);

    op.facePushPull(face, -height, true);
  }, 'Draw a Cube');
}

/** Draw a 100" wide cylinder, `height` inches tall. */
async function drawCylinder(height) {
  const model = await SketchUpApi.getActiveModel();

  await model.performOperation((op) => {
    const group = op.createGroup(op.model);

    // createCircle gives you a curve, not a face. Turn its edges into one.
    const circle = op.createCircle(group, [0, 0, 0], [0, 0, 1], 50, 24);
    const face = op.createFaceFromEdges(group, circle.edges);

    op.facePushPull(face, -height, true);
  }, 'Draw a Cylinder');
}

/** Draw a square pyramid with a 100" base, `height` inches tall. */
async function drawPyramid(height) {
  const model = await SketchUpApi.getActiveModel();

  const base = [
    [0, 0, 0],
    [100, 0, 0],
    [100, 100, 0],
    [0, 100, 0],
  ];
  const apex = [50, 50, height];

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
// 3. Command handlers
// ---------------------------------------------------------------------------
// One handler per command in the manifest. Tool buttons and menu items dispatch
// the same way, so a handler can't tell which the user clicked.

const SHAPES = {
  'draw-cube': { name: 'Cube', draw: drawCube },
  'draw-cylinder': { name: 'Cylinder', draw: drawCylinder },
  'draw-pyramid': { name: 'Pyramid', draw: drawPyramid },
};

/** New tool buttons often land in the tool overflow, where users miss them. */
function showToolbarHelp() {
  void SketchUpApi.ui.getModalInput({
    actions: 'ok',
    title: 'Toolbar Headless',
    message: 'This extension adds three tool buttons — Cube, Cylinder and '
      + 'Pyramid. If you don\'t see them, look in the tool overflow (the "..." '
      + 'at the end of the tools), where you can drag them wherever you like.',
  });
}

function registerHandlers() {
  SketchUpApi.ui.on('where-are-my-tools', showToolbarHelp);

  for (const [commandId, shape] of Object.entries(SHAPES)) {
    SketchUpApi.ui.on(commandId, async () => {
      try {
        const height = await askForHeight(shape.name);
        if (height === null) return;

        await shape.draw(height);
      } catch (e) {
        // Headless has no panel to show an error in, so use a message box.
        console.error(`${commandId} failed:`, e);
        void SketchUpApi.ui.getModalInput({
          title: `Draw a ${shape.name}`,
          message: `Could not draw the ${shape.name.toLowerCase()}. ${e.message}`,
        });
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 4. Init & Connection
// ---------------------------------------------------------------------------
// Register handlers *before* connecting. Clicking a tool button is what creates
// this extension's iframe, so that command is already in flight while this file
// runs — SketchUp replays it once a handler exists. It's also why a headless
// extension doesn't need "loadAtLaunch". And getModalInput() requires the
// connection, so no handler can run useful work until connect() resolves.

try {
  registerHandlers();
  await SketchUpApi.connect();
} catch (e) {
  console.error('Toolbar Headless init error:', e);
}

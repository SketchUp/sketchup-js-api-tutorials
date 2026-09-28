# SketchUp JavaScript API (JSA) Reference

This file contains examples to help you (or Claude, or Gemini, or whoever) write
your first JSA code. It's not meant to be exhaustive documentation, more like a
set of LLM-friendly recipes.

For more complete docs, see the official JSA documentation.

Questions, corrections, or a recipe you'd like to see? Open an issue:
https://github.com/SketchUp/sketchup-js-api-tutorials/issues

## Scope of This Document

These examples are NOT exhaustive — the JSA can do far more than what's shown
here. This file focuses on common recipes and patterns to get you started.

For the complete API surface (every method, grouped by domain), see
`JSA_API_COMPLETE.md` in this folder.

## What is the JSA, from a coding perspective?

JSA is the SketchUp JavaScript API. (It was formerly called the JavaScript
Adapter, which is where the acronym comes from. You may still see the old name
in places.)

The JSA is an SDK written in TypeScript (but also usable in pure JavaScript)
providing methods for interacting with SketchUp models. The examples below call
the API exposed by that TypeScript.

Your SDK code executes inside a webpage. The webpages are loaded into SketchUp
as sandboxed iframes on the web, CEF dialogs on desktop, or WKWebViews on iOS.

## What are JSA Extensions?

JSA _Extensions_ add capabilities to SketchUp without the need for a new build.
You write an extension once and deploy it everywhere SketchUp exists.

An extension is a web page plus a `manifest.json` that tells SketchUp its name,
its icon, which menu items and toolbars to add, and what kind of window to open.
See `JSA_MANIFEST.md` for the manifest format.

With JSA Extensions you can do many of the same things the Ruby API has enabled
for years. Extensions might include things like:

- A new menu item that counts products in your model and calculates the total
  cost.
- A custom exporter for a weird file format.
- A modal popup that searches and imports 3D components from a supplier's
  catalog.
- An integration with an MCP server, allowing agentic analysis and control.
- etc.

## Okay, But How Do I Try It?

JSA extensions are basically webpages, so there are a few ways to develop one.

### Method 1: Localhost development

Best for iterating quickly — edit a file, reload, see the change.

1. Stand up a webpage using whatever stack or framework you prefer, served on a
   local port (say 9000). It must be **HTTPS** — SketchUp Web is HTTPS, and
   browsers block it from loading `http://` resources.
2. Include the SDK with a script tag (see Installation below).
3. Write a `manifest.json` whose `baseUrl` points at your dev server, e.g.
   `https://localhost:9000/`.
4. Install **that `manifest.json` file itself** via the Extension Manager — drag
   the `.json` onto the upload area. Do **not** zip it.

SketchUp now loads your page from localhost, so your edits show up on reload
without reinstalling anything. See `examples/server-hosted/` for a complete
working setup.

> **Don't zip it.** Installing a `.zip` makes `baseUrl` be ignored entirely and
> the files served from inside the archive instead, so a zipped localhost
> manifest either runs stale bundled code or fails to find its entry point. The
> upload area accepts a bare `.json`; that is what makes `baseUrl` take effect.

### Method 2: Remote hosting

Best for production. Same as above, but `baseUrl` points at a URL you deploy to,
and you install the manifest rather than a zip. You ship updates by deploying to
your server, with no reinstall. See `examples/server-hosted/`.

### Method 3: Everything in the zip

Best for simple, self-contained extensions. Put `index.html` and your scripts
directly in the zip alongside the manifest, with `baseUrl` set to `/`. Nothing
external to host. See `examples/hello-world/`.

## Installation

Include the SDK with a script tag. It defines the global `SketchUpApi` object:

```html
<script type="application/javascript" src="https://cdn.habitat.sketchup.com/dist/sketchup-js-api/v2/sketchup-js-api.min.js"></script>
```

Loading from the CDN is the recommended approach — you pick up fixes
automatically, and there's no build step required.

## Global Access

The SDK exposes `window.SketchUpApi` as the main entry point.

---

## Connection Pattern (Best Practice)

**Always connect on page load:**

```javascript
let model = null;

window.addEventListener('load', async () => {
  await SketchUpApi.connect();
  model = await SketchUpApi.getActiveModel();
});

window.addEventListener('beforeunload', async () => {
  await SketchUpApi.disconnect();
});
```

---

## Entity Types

### Drawing Elements (Geometry)

| Type                  | Description              | Key Properties                                       |
| --------------------- | ------------------------ | ---------------------------------------------------- |
| **Edge**              | Line segment             | `start`, `end`, `smooth`, `soft`, `hidden`           |
| **Face**              | Surface                  | `outerLoop`, `holes`, `materialId`, `backMaterialId` |
| **Group**             | Container with transform | `name`, `transform`, `locked`, `definitionId`        |
| **ComponentInstance** | Instance of component    | `definitionId`, `transform`, `name`, `guid`          |
| **ConstructionPoint** | Reference point          | `position`                                           |
| **ConstructionLine**  | Reference line           | `start`, `end`, `direction`                          |

### Other Entities

| Type          | Description         | Key Properties                                 |
| ------------- | ------------------- | ---------------------------------------------- |
| **Component** | Reusable definition | `name`, `description`, `isLive`, `behavior`    |
| **Material**  | Surface appearance  | `name`, `color`, `alpha`, `texture`, `exportThumbnail()` |
| **Tag**       | Visibility layer    | `name`, `visible`, `color`                     |
| **TagFolder** | Tag organizer       | `name`, `tags`, `tagFolders`, `visible`        |
| **Scene**     | Saved view state    | `name`, `camera`, `properties`                 |
| **Texture**   | Image asset         | `width`, `height`, `imageWidth`, `imageHeight` |

### Common Properties (All Drawing Elements)

- `id` - Entity identifier (session-specific)
- `tagId` - Associated tag ID
- `materialId` - Associated material ID
- `hidden` - Visibility flag
- `receivesShadows`, `castsShadows` - Shadow flags
- `attributes` - Custom key-value data (an `Attributes` class instance; see [Entity Attributes](#entity-attributes) for API details)

---

## Operations Pattern

**All model modifications must occur inside `performOperation()`:**

```javascript
await model.performOperation(async (op) => {
  // Create, modify, or delete entities here
  const group = op.createGroup(model);
  op.createFace(group, [
    [0, 0, 0],
    [100, 0, 0],
    [100, 100, 0],
    [0, 100, 0],
  ]);
}, 'Create a square');
```

The operation is committed automatically. If an error occurs, it's rolled back.

### Operation Refs vs. Persistent Entities

Methods like `op.createInstance()`, `op.createGroup()`, etc. return
**operation-scoped refs** (mapping IDs). These refs are only valid inside the
`performOperation` callback that created them. If you store a raw ref and try to
use it in a later `performOperation` call, you'll get an error like:

```
entityByMappingId(1).not.found
```

To keep a handle on an entity across operations, resolve the ref to a
**persistent entity** before the operation ends:

```javascript
let instance; // persists across operations

await model.performOperation(async (op) => {
  const ref = op.createInstance(model, component, transform);
  instance = await op.entityForRef(ref); // resolve to persistent entity
}, 'Place instance');

// 'instance' is now safe to use in subsequent operations
await model.performOperation(async (op) => {
  op.instanceApplyTransformation(instance, newTransform); // works!
}, 'Move instance');
```

The same pattern applies to all entity types (`op.entityForRef()`).
Always resolve refs when you need the entity outside its creating operation.

---

## Creating Geometry

### Create Edges

```javascript
await model.performOperation(async (op) => {
  const group = op.createGroup(model);

  // Create edges from point arrays
  const edgeRefs = op.createEdge(group, [
    [0, 0, 0],
    [100, 0, 0],
    [100, 100, 0],
  ]);
}, 'Create edges');
```

### Create Faces

```javascript
await model.performOperation(async (op) => {
  const group = op.createGroup(model);

  // Create face from point array (forms closed loop)
  op.createFace(group, [
    [0, 0, 0],
    [100, 0, 0],
    [100, 100, 0],
    [0, 100, 0],
  ]);
}, 'Create face');
```

### Create Face with Holes

```javascript
await model.performOperation(async (op) => {
  const group = op.createGroup(model);

  // Using entity builder for faces with holes
  await op
    .createBuilder((builder) => {
      builder.createFace(
        // Outer loop
        [
          [0, 0, 0],
          [0, 100, 0],
          [0, 100, 100],
          [0, 0, 100],
        ],
        // Holes array
        [
          [
            [0, 25, 25],
            [0, 75, 25],
            [0, 75, 75],
            [0, 25, 75],
          ],
        ]
      );
    })
    .build(group);
}, 'Create face with hole');
```

### Create Groups

```javascript
await model.performOperation(async (op) => {
  const groupRef = op.createGroup(model);

  // Add geometry to group
  op.createFace(groupRef, [
    [0, 0, 0],
    [100, 0, 0],
    [100, 100, 0],
    [0, 100, 0],
  ]);

  // Get group object
  const group = await op.entityForRef(groupRef);
  console.log('Group ID:', group.id);
}, 'Create group');
```

### Name a Group

```javascript
await model.performOperation(async (op) => {
  const groupRef = op.createGroup(model);
  op.groupSetName(groupRef, 'My Named Group');

  op.createFace(groupRef, [
    [0, 0, 0], [100, 0, 0], [100, 100, 0], [0, 100, 0],
  ]);
}, 'Create named group');
```

### Push-Pull Faces

```javascript
await model.performOperation(async (op) => {
  const group = op.createGroup(model);
  const faceRef = op.createFace(group, [
    [0, 0, 0],
    [100, 0, 0],
    [100, 100, 0],
    [0, 100, 0],
  ]);

  // Extrude face by 50 units
  op.facePushPull(faceRef, 50, true);
}, 'Create box via push-pull');
```

---

## Materials

### Create and Assign Material

```javascript
await model.performOperation(async (op) => {
  // Create material
  const materialRef = op.createMaterial('Red Material');
  op.materialSetColor(materialRef, { red: 255, green: 0, blue: 0, alpha: 255 });

  const material = await op.entityForRef(materialRef);

  // Create face and assign material
  const group = op.createGroup(model);
  const faceRef = op.createFace(group, [
    [0, 0, 0],
    [100, 0, 0],
    [100, 100, 0],
    [0, 100, 0],
  ]);

  op.faceSetFrontMaterial(faceRef, material);
  op.faceSetBackMaterial(faceRef, material);
}, 'Create colored face');
```

### Assign Material to a Group

Painting a group causes all default-material entities inside to inherit that
material. This is often preferable to painting individual faces.

```javascript
await model.performOperation(async (op) => {
  const groupRef = op.createGroup(model);
  op.createFace(groupRef, [
    [0, 0, 0],
    [100, 0, 0],
    [100, 100, 0],
    [0, 100, 0],
  ]);

  const matRef = op.createMaterial('Blue Group');
  op.materialSetColor(matRef, { red: 0, green: 0, blue: 255, alpha: 255 });
  const mat = await op.entityForRef(matRef);

  // Resolve the group ref to a persistent entity, then paint it.
  const group = await op.entityForRef(groupRef);
  op.drawingElementSetMaterial(group, mat);
}, 'Create group with material');
```

### Get All Materials

```javascript
const materials = await model.getMaterials();
const mat = materials.findMaterialByName('Red Material');
console.log('Color:', mat.color);
```

### Export Material Thumbnail

```javascript
// Get a material thumbnail as a data URL (can use directly in <img src>)
const materials = await model.getMaterials();
const material = materials.values[0];

// Export as PNG with max dimension of 64px
const thumbnailDataUrl = await material.exportThumbnail('png', { maxSize: 64 });

// Use in HTML
document.body.innerHTML += `<img src="${thumbnailDataUrl}" alt="${material.name}" />`;
```

**Supported file types**: `'png'`, `'jpg'`, `'jpeg'`, `'gif'`, `'bmp'`, `'tif'`

**Note**: `gif` is not supported on web platforms.

### Export Texture Image

```javascript
// If a material has a texture, export it as an image
const material = materials.values[0];

if (material.texture) {
  // Export texture as PNG
  const textureDataUrl = await material.texture.getImage('png');

  // Export with colorization applied (uses material's color tint)
  const colorizedDataUrl = await material.texture.getImage('png', { colorize: true });

  // Display in HTML
  document.body.innerHTML += `<img src="${textureDataUrl}" alt="Texture" />`;
}
```

### PBR Material Textures (SketchUp 2025+)

PBR materials can have multiple texture channels:

```javascript
const material = materials.values[0];

// Standard diffuse texture
if (material.texture) {
  const diffuse = await material.texture.getImage('png');
}

// Metallic texture
if (material.metallic.enabled && material.metallic.texture) {
  const metallic = await material.metallic.texture.getImage('png');
}

// Roughness texture
if (material.roughness.enabled && material.roughness.texture) {
  const roughness = await material.roughness.texture.getImage('png');
}

// Normal map texture
if (material.normal.enabled && material.normal.texture) {
  const normal = await material.normal.texture.getImage('png');
}

// Ambient occlusion texture
if (material.ambientOcclusion.enabled && material.ambientOcclusion.texture) {
  const ao = await material.ambientOcclusion.texture.getImage('png');
}
```

### Texture UV Positioning

Control how a texture maps onto a face by providing model-space to UV-space coordinate pairs. The material **must have a texture** — color-only materials will error.

```javascript
await model.performOperation(async (op) => {
  // Create a textured material
  const matRef = op.createMaterial('Positioned Texture');
  op.materialSetColor(matRef, { red: 200, green: 200, blue: 200, alpha: 255 });
  // Assign texture from a base64-encoded image (PNG or JPEG)
  op.materialSetTextureDataBase64(matRef, myBase64Png, {
    width: 10, height: 10,  // Size in model units (inches)
  });
  const mat = await op.entityForRef(matRef);

  // Create a face
  const faceRef = op.createFace(op.model, [
    [0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0],
  ]);
  const face = await op.entityForRef(faceRef);

  // Assign material to the face
  op.faceSetFrontMaterial(face, mat);

  // Position the texture with UV mapping pairs:
  //   [modelPoint1, uvPoint1, modelPoint2, uvPoint2, ...]
  // UV coords: x=u (0-1 horizontal), y=v (0-1 vertical)
  op.facePositionFrontMaterial(face, mat, [
    new Point3d(0, 0, 0),   new Point3d(0, 0, 0),    // bottom-left -> UV (0,0)
    new Point3d(10, 0, 0),  new Point3d(1, 0, 0),    // bottom-right -> UV (1,0)
    new Point3d(10, 10, 0), new Point3d(1, 1, 0),    // top-right -> UV (1,1)
    new Point3d(0, 10, 0),  new Point3d(0, 1, 0),    // top-left -> UV (0,1)
  ], undefined);  // no projection vector

  // Back material works the same way:
  // op.facePositionBackMaterial(face, mat, positions, projection);
}, 'Position texture on face');
```

**SketchupTexturePositioning** accepts 1–4 model/UV point pairs:
- **1 pair** `[model, uv]` — anchor point, texture uses default orientation
- **2 pairs** — defines position + scale/rotation
- **3 pairs** — defines position + skew
- **4 pairs** — full quad mapping (most control)

Optional `projection` parameter (`Vector3d`) sets the projection direction for projecting textures onto non-planar surfaces.

**EntitiesBuilder equivalent** (for bulk operations):
```javascript
const positioning = builder.createTexturePositioning(mat, [
  new Point3d(0, 0, 0), new Point3d(0, 0, 0),
  new Point3d(10, 0, 0), new Point3d(1, 0, 0),
], undefined);
builder.positionFaceFrontMaterial(faceRef, positioning);
```

---

## Tags (Layers)

### Create and Assign Tags

```javascript
await model.performOperation(async (op) => {
  // Create tag
  const tagRef = op.createTag('My Layer');
  const tag = await op.entityForRef(tagRef);

  // Create geometry
  const group = op.createGroup(model);
  op.createFace(group, [
    [0, 0, 0],
    [100, 0, 0],
    [100, 100, 0],
  ]);

  // Assign tag
  op.drawingElementAssignTag(group, tag);
}, 'Create tagged geometry');
```

### Tag Visibility

```javascript
await model.performOperation(async (op) => {
  op.tagSetVisible(tagRef, false); // Hide tag
}, 'Hide tag');
```

### Tag Folders

```javascript
await model.performOperation(async (op) => {
  const folderRef = op.createTagFolder('My Folder');
  const tagRef = op.createTag('Nested Tag', folderRef);
}, 'Create tag in folder');
```

---

## Selection

### Update Selection

```javascript
// Get entities first
const entities = await model.entities.get();
const face = entities.find((e) => e.type === 2); // Face type = 2

// Add to selection
await model.updateSelection(face, 'add');

// Replace selection
await model.updateSelection([face], 'replace');

// Remove from selection
await model.updateSelection(face, 'remove');

// Toggle selection
await model.updateSelection([face], 'toggle');

// Clear selection
await model.updateSelection([], 'replace');
```

### Get Current Selection

```javascript
const selection = await model.getSelection();
console.log('Selected count:', selection.totalNumberOfElements);

const selected = await selection.getSelection();
selected.drawingElements.forEach((entity) => {
  console.log('Entity ID:', entity.id, 'Type:', entity.type);
});
```

### Filtered Selection

```javascript
// Get only faces from the current selection
const selection = await model.getSelection({
  filter: 'typeIn',
  values: [SketchUpApi.EntityType.Face]
});

// totalNumberOfElements is the FULL selection count (ignoring filter)
console.log('Total selected:', selection.totalNumberOfElements);

// drawingElements contains only the filtered results (faces only)
console.log('Faces:', selection.drawingElements);
```

### Get Selection Metadata

```javascript
// Get lightweight metadata about the selection (no entity data transferred)
const metadata = await model.getSelectionMetadata();

// When no filter is supplied, matchingDrawingElements === totalNumberOfElements
console.log('Total selected:', metadata.totalNumberOfElements);
console.log('Matching elements:', metadata.matchingDrawingElements);
```

### Filtered Selection Metadata

```javascript
// Get metadata for only specific entity types
const metadata = await model.getSelectionMetadata({
  filter: 'typeIn',
  values: [SketchUpApi.EntityType.Face, SketchUpApi.EntityType.Edge]
});

// totalNumberOfElements is still the FULL selection count
console.log('Total selected:', metadata.totalNumberOfElements);

// matchingDrawingElements is the count of faces + edges only
console.log('Matching faces + edges:', metadata.matchingDrawingElements);
```

### Observe Selection Metadata

```javascript
// Watch for selection changes in real-time
const handle = model.observeSelectionMetadata((metadata) => {
  console.log(`Selection changed: ${metadata.totalNumberOfElements} entities selected`);
});

// IMPORTANT: Close the observer when you no longer need it
handle.stop();
```

### Filtered Observe Selection Metadata

```javascript
// Observe only metadata about specific entity types
const handle = model.observeSelectionMetadata((metadata) => {
  console.log(`${metadata.matchingDrawingElements} faces selected`);
}, { filter: 'typeIn', values: [SketchUpApi.EntityType.Face] });

// Close when done
handle.stop();
```

### Example: Observe Selection and React

A common pattern is to observe selection changes and fetch entity data when something is selected. This example watches for groups/component instances being selected and logs their info.

```javascript
const model = await SketchUpApi.getActiveModel();

// Start observing — filtered to groups (3) and component instances (4)
const handle = model.observeSelectionMetadata(async (metadata) => {
  if (metadata.matchingDrawingElements === 0) {
    console.log('Selection cleared');
    return;
  }

  // Fetch the actual selected entities
  const selection = await model.getSelection({
    filter: 'typeIn',
    values: [3, 4]
  });

  for (const entity of selection.drawingElements) {
    console.log(`Selected: ${entity.name || '(unnamed)'}`,
      `type=${entity.type}`, `id=${entity.id}`);
  }

  // Optional: clear selection so re-clicking the same object fires again
  await model.updateSelection([], 'replace');
}, { filter: 'typeIn', values: [3, 4] });

// Later, when your extension unloads:
handle.stop();
```

### Invert Selection

```javascript
await model.invertSelection();
```

---

## Scenes

### Create Scene

```javascript
await model.performOperation(async (op) => {
  const sceneRef = op.createScene('My Scene', {
    use_camera: true,
    use_hidden_geometry: true,
    use_shadow_info: true,
  });

  const scene = await op.entityForRef(sceneRef);
  console.log('Scene name:', scene.name);
}, 'Create scene');
```

### Navigate Scenes

```javascript
// Get all scenes
const scenes = await model.getScenes();

// Get current scene
const current = await model.getCurrentScene();

// Set current scene
await model.setCurrentScene(scenes[0]);
```

### Scene Visibility

```javascript
await model.performOperation(async (op) => {
  // Hide entity in specific scene
  op.sceneSetDrawingElementVisibility(scene, group, false);

  // Hide tag in specific scene
  op.sceneSetTagVisibility(scene, tag, false);
}, 'Set scene visibility');
```

---

## Complete Scene Operations

This section covers all scene-related operations with comprehensive examples.

### Scene Creation & Management

```javascript
await model.performOperation(async (op) => {
  // Create a scene with default properties (captures current view)
  const sceneRef = op.createScene('My Scene');

  // Create scene with specific properties
  const sceneRef2 = op.createScene('Camera Only', {
    use_camera: true,
    use_hidden_geometry: false,
    use_hidden_layers: false,
    use_shadow_info: false,
    use_axes: false,
  });

  // Create scene at specific position (0 = first)
  const sceneRef3 = op.createScene('First Scene', {}, 0);

  // Get scene object from reference
  const scene = await op.entityForRef(sceneRef);
  console.log('Created scene:', scene.name);
}, 'Create scenes');

// Remove a scene
await model.performOperation(async (op) => {
  op.removeScene(scene);
}, 'Remove scene');

// Reorder a scene (move to index 0 = first position)
await model.performOperation(async (op) => {
  op.sceneReorder(scene, 0);
}, 'Reorder scene');
```

### Scene Metadata

```javascript
// Read scene metadata
const scenes = await model.getScenes();
const scene = scenes[0];
console.log('Name:', scene.name);
console.log('Label:', scene.label);
console.log('Description:', scene.description);

// Set scene metadata
await model.performOperation(async (op) => {
  op.sceneSetName(scene, 'New Name');
  op.sceneSetDescription(scene, 'This scene shows the front elevation');
}, 'Update scene metadata');
```

### Scene Animation Settings

```javascript
await model.performOperation(async (op) => {
  // Set delay before transition starts (in seconds)
  op.sceneSetAnimationDelayTime(scene, 2.0);

  // Set transition duration (in seconds)
  op.sceneSetAnimationTransitionTime(scene, 3.0);

  // Include or exclude from animation playback
  op.sceneSetIncludedInAnimation(scene, true);
}, 'Configure animation');
```

### Scene Properties (use\_\* flags)

```javascript
await model.performOperation(async (op) => {
  // Update which properties the scene captures/restores
  op.sceneSetProperties(scene, {
    use_camera: true, // Save/restore camera position
    use_hidden_geometry: true, // Save/restore hidden geometry state
    use_hidden_layers: true, // Save/restore tag visibility
    use_shadow_info: true, // Save/restore shadow settings
    use_axes: true, // Save/restore axes position
  });

  // Recapture scene from current model state
  op.sceneUpdate(scene, {
    use_camera: true,
    use_shadow_info: true,
  });
}, 'Update scene properties');
```

### Scene Camera

```javascript
// Get camera from scene
const camera = scene.getCamera();
console.log('Eye position:', camera.eye); // Where camera is located
console.log('Target:', camera.target); // What camera looks at
console.log('Up vector:', camera.up); // Camera orientation
console.log('Field of view:', camera.fov); // Perspective angle
console.log('Is perspective:', camera.isPerspective);

// Set camera for scene
await model.performOperation(async (op) => {
  op.sceneSetCamera(scene, {
    eye: [100, 100, 50], // Camera position
    target: [0, 0, 0], // Look at origin
    up: [0, 0, 1], // Z is up
    fov: 35, // 35 degree field of view
    isPerspective: true,
  });
}, 'Set scene camera');
```

### Scene Axes

```javascript
// Get axes from scene
const axes = scene.getAxes();
console.log('Origin:', axes.origin);
console.log('X axis:', axes.xaxis);
console.log('Y axis:', axes.yaxis);
console.log('Z axis:', axes.zaxis);

// Set custom axes for scene
await model.performOperation(async (op) => {
  op.sceneSetAxes(
    scene,
    [10, 10, 0], // New origin
    [1, 0, 0], // X axis direction
    [0, 1, 0], // Y axis direction
    [0, 0, 1] // Z axis direction
  );
}, 'Set scene axes');
```

### Scene Shadow Info

```javascript
// Get shadow info from scene
const shadowInfo = scene.getShadowInfo();
console.log('Display shadows:', shadowInfo.displayShadows);
console.log('Dark value:', shadowInfo.dark);
console.log('Light value:', shadowInfo.light);
console.log('Latitude:', shadowInfo.latitude);
console.log('Longitude:', shadowInfo.longitude);

// Set shadow info for specific scene
await model.performOperation(async (op) => {
  // Enable/disable shadows
  op.shadowInfoSetDisplayShadows(true, scene);

  // Shadow darkness (0-100, higher = darker shadows)
  op.shadowInfoSetDark(50, scene);

  // Light intensity (0-100)
  op.shadowInfoSetLight(80, scene);

  // Geographic location
  op.shadowInfoSetLatitude(40.7128, scene); // New York latitude
  op.shadowInfoSetLongitude(-74.006, scene); // New York longitude
  op.shadowInfoSetCity('New York', scene);
  op.shadowInfoSetCountry('USA', scene);

  // Time zone offset from UTC (in seconds)
  op.shadowInfoSetTZOffset(-18000, scene); // UTC-5

  // Daylight savings
  op.shadowInfoSetDaylightSavings(true, scene);

  // Display options
  op.shadowInfoSetDisplayOnGroundPlane(true, scene);
  op.shadowInfoSetDisplayOnAllFaces(true, scene);
  op.shadowInfoSetEdgesCastShadows(true, scene);

  // North angle (radians from Y axis)
  op.shadowInfoSetNorthAngle(0, scene);
  op.shadowInfoSetDisplayNorth(true, scene);

  // Sun time (Unix epoch seconds)
  op.shadowInfoSetShadowTimeEpochSeconds(1625140800, scene); // July 1, 2021 12:00 PM
}, 'Configure shadows');
```

### Scene Visibility (Per-Scene Hidden State)

```javascript
// Get hidden items in scene
const hiddenTags = scene.getHiddenTags();
const hiddenFolders = scene.getHiddenTagFolders();
const hiddenElements = scene.getHiddenElements();

console.log(
  'Hidden tags:',
  hiddenTags.map((t) => t.name)
);
console.log(
  'Hidden folders:',
  hiddenFolders.map((f) => f.name)
);
console.log('Hidden elements:', hiddenElements.length);

// Set visibility for specific scene
await model.performOperation(async (op) => {
  // Hide/show tag in this scene only
  op.sceneSetTagVisibility(scene, tag, false);

  // Hide/show tag folder in this scene
  op.sceneSetTagFolderVisibility(scene, folder, false);

  // Hide/show specific drawing element in this scene
  op.sceneSetDrawingElementVisibility(scene, group, false);
}, 'Set scene-specific visibility');
```

### Scene Attributes

```javascript
// Set custom attributes on scene
await model.performOperation(async (op) => {
  op.entitySetAttribute(scene, ['MyExtension'], 'version', '1.0');
  op.entitySetAttribute(scene, ['MyExtension'], 'author', 'John Doe');
  op.entitySetAttribute(scene, ['MyExtension'], 'locked', true);
}, 'Set scene attributes');

// Read attributes from scene
const version = scene.attributes.findValue('MyExtension', 'version');
const author = scene.attributes.findValue(
  'MyExtension',
  'author',
  { default: 'Unknown' }
);
```

---

## Transformations

Transformations move, rotate, and scale geometry in 3D space. This section
provides human-readable examples for common operations.

### Angle Reference Table

| Degrees | Radians | JavaScript        |
| ------- | ------- | ----------------- |
| 30°     | π/6     | `Math.PI / 6`     |
| 45°     | π/4     | `Math.PI / 4`     |
| 60°     | π/3     | `Math.PI / 3`     |
| 90°     | π/2     | `Math.PI / 2`     |
| 180°    | π       | `Math.PI`         |
| 270°    | 3π/2    | `3 * Math.PI / 2` |
| 360°    | 2π      | `2 * Math.PI`     |

**Tip:** To convert degrees to radians: `degrees * Math.PI / 180`

### SET vs APPLY Transformations

```javascript
// SET - Replace entire transformation (absolute positioning)
// Use when you want to move something to a specific location
op.groupSetTransformation(group, [100, 50, 0]);

// APPLY - Compound with existing transformation (relative movement)
// Use when you want to move something from its current position
op.groupApplyTransformation(group, [10, 0, 0]);
```

### Move (Translation)

**Note:** The `[x, y, z]` shorthand for translations works reliably with refs created in the same operation (e.g., from `op.createGroup()`). When working with entities fetched from `model.entities.get()`, use `Transformation.translation()` explicitly to avoid errors.

```javascript
await model.performOperation(async (op) => {
  // Move a group upward by 12 inches (works with refs from createGroup)
  op.groupApplyTransformation(group, [0, 0, 12]);

  // Move a component instance 5 feet to the right (60 inches)
  op.instanceApplyTransformation(instance, [60, 0, 0]);

  // RECOMMENDED: Use Transformation.translation() when working with
  // entities fetched from model.entities.get() - more reliable
  const move = Sketchup.Transformation.translation([10, 20, 0]);
  op.groupApplyTransformation(existingGroup, move);

  // Move a group diagonally: 10 right, 20 forward, 5 up
  op.groupApplyTransformation(group, [10, 20, 5]);

  // Move to an absolute position (replaces existing transform)
  op.groupSetTransformation(group, [100, 100, 0]);
}, 'Move geometry');

// Using Transformation class for clarity
await model.performOperation(async (op) => {
  const Transformation = SketchUpApi.Transformation;

  // Move the group 24 inches to the left
  const moveLeft = Transformation.translation([-24, 0, 0]);
  op.groupApplyTransformation(group, moveLeft);
}, 'Move with Transformation class');
```

### Scale

```javascript
await model.performOperation(async (op) => {
  const Transformation = SketchUpApi.Transformation;

  // Scale the group 2x larger uniformly (all directions)
  op.groupApplyTransformation(group, Transformation.scaling(2));

  // Scale the group to half size
  op.groupApplyTransformation(group, Transformation.scaling(0.5));

  // Scale non-uniformly: 2x wide, 1.5x deep, half height
  op.instanceApplyTransformation(
    instance,
    Transformation.scaling(2, 1.5, 0.5)
  );

  // Scale from a specific center point (not the origin)
  // Scale 2x around point [50, 50, 0]
  const scaleFromCenter = Transformation.scaling([50, 50, 0], 2);
  op.groupApplyTransformation(group, scaleFromCenter);

  // Scale only in X direction (stretch horizontally)
  op.groupApplyTransformation(group, Transformation.scaling(2, 1, 1));

  // Scale only in Z direction (stretch vertically)
  op.groupApplyTransformation(group, Transformation.scaling(1, 1, 3));
}, 'Scale geometry');
```

### Rotate

```javascript
await model.performOperation(async (op) => {
  const Transformation = SketchUpApi.Transformation;

  // Rotate 45 degrees around the Z axis (spin on the floor)
  // Parameters: point (center), axis (direction), angle (radians)
  op.groupApplyTransformation(
    group,
    Transformation.rotation([0, 0, 0], [0, 0, 1], Math.PI / 4)
  );

  // Rotate 90 degrees around the X axis (tilt forward)
  op.groupApplyTransformation(
    group,
    Transformation.rotation([0, 0, 0], [1, 0, 0], Math.PI / 2)
  );

  // Rotate 90 degrees around the Y axis (tilt sideways)
  op.groupApplyTransformation(
    group,
    Transformation.rotation([0, 0, 0], [0, 1, 0], Math.PI / 2)
  );

  // Rotate around a specific pivot point
  // Rotate 30 degrees around Z axis, centered at [100, 100, 0]
  op.groupApplyTransformation(
    group,
    Transformation.rotation([100, 100, 0], [0, 0, 1], Math.PI / 6)
  );

  // Rotate 180 degrees (flip upside down around X axis)
  op.groupApplyTransformation(
    group,
    Transformation.rotation([0, 0, 0], [1, 0, 0], Math.PI)
  );
}, 'Rotate geometry');

// Helper function for rotating by degrees
function rotateDegrees(point, axis, degrees) {
  const radians = (degrees * Math.PI) / 180;
  return SketchUpApi.Transformation.rotation(point, axis, radians);
}

await model.performOperation(async (op) => {
  // Rotate 45 degrees using helper
  op.groupApplyTransformation(group, rotateDegrees([0, 0, 0], [0, 0, 1], 45));
}, 'Rotate by degrees');
```

### Mirror / Reflect

```javascript
await model.performOperation(async (op) => {
  const Transformation = SketchUpApi.Transformation;

  // Mirror across the YZ plane (flip X, like a left/right mirror)
  op.groupApplyTransformation(group, Transformation.scaling(-1, 1, 1));

  // Mirror across the XZ plane (flip Y, like a front/back mirror)
  op.groupApplyTransformation(group, Transformation.scaling(1, -1, 1));

  // Mirror across the XY plane (flip Z, like a floor/ceiling mirror)
  op.groupApplyTransformation(group, Transformation.scaling(1, 1, -1));

  // Mirror across all axes (invert through origin)
  op.groupApplyTransformation(group, Transformation.scaling(-1, -1, -1));
}, 'Mirror geometry');
```

### Combined Transformations

```javascript
await model.performOperation(async (op) => {
  const Transformation = SketchUpApi.Transformation;

  // Move up 12 inches, then rotate 45 degrees
  const moveUp = Transformation.translation([0, 0, 12]);
  const rotate45 = Transformation.rotation([0, 0, 0], [0, 0, 1], Math.PI / 4);

  // Use applyTo to combine transformations (order matters!)
  // This applies rotate45 AFTER moveUp
  const combined = rotate45.applyTo(moveUp);
  op.groupApplyTransformation(group, combined);
}, 'Combined transform');

await model.performOperation(async (op) => {
  const Transformation = SketchUpApi.Transformation;

  // Scale, then rotate, then move
  const scale = Transformation.scaling(2);
  const rotate = Transformation.rotation([0, 0, 0], [0, 0, 1], Math.PI / 2);
  const move = Transformation.translation([100, 0, 0]);

  // Chain transformations: scale -> rotate -> move
  const result = move.applyTo(rotate.applyTo(scale));
  op.groupApplyTransformation(group, result);
}, 'Scale, rotate, then move');
```

### Transformation Class Reference

```javascript
const Transformation = SketchUpApi.Transformation;

// Translation - move by [x, y, z]
const t1 = Transformation.translation([10, 20, 30]);

// Scaling - uniform or per-axis
const t2 = Transformation.scaling(2); // 2x all directions
const t3 = Transformation.scaling(2, 3, 1); // 2x X, 3x Y, 1x Z
const t4 = Transformation.scaling([50, 50, 0], 2); // 2x from point

// Rotation - around axis through point
const t5 = Transformation.rotation(
  [0, 0, 0], // Point on axis
  [0, 0, 1], // Axis direction (Z = vertical)
  Math.PI / 4 // Angle in radians (45 degrees)
);

// Identity - no change
const t6 = Transformation.identity;

// Axes - create from origin and direction vectors
// NOTE: requires Point3d/Vector3d objects, NOT plain arrays
const t7 = Transformation.axes(
  new SketchUpApi.Point3d(0, 0, 0),   // Origin
  new SketchUpApi.Vector3d(1, 0, 0),  // X axis
  new SketchUpApi.Vector3d(0, 1, 0),  // Y axis
  new SketchUpApi.Vector3d(0, 0, 1),  // Z axis (optional, computed from cross product)
);

// From array - build directly from a 16-element column-major matrix
// Useful when you already have axis vectors and origin as raw numbers
const t7b = Transformation.fromArray([
  1, 0, 0, 0,  // X axis + 0
  0, 1, 0, 0,  // Y axis + 0
  0, 0, 1, 0,  // Z axis + 0
  0, 0, 0, 1,  // Origin + 1
]);

// Interpolate - blend between two transformations (for animation)
const t8 = Transformation.interpolate(t1, t5, 0.5); // 50% between t1 and t5

// From array - create from 16-element matrix
const t9 = Transformation.fromArray([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);

// Combine transformations
const combined = t1.applyTo(t2); // Apply t1 to t2

// Get transformation properties
console.log('Is identity:', t1.identity); // boolean
console.log('Origin:', t1.origin); // Point3d
console.log('X axis:', t1.xaxis); // Vector3d
console.log('Y axis:', t1.yaxis); // Vector3d
console.log('Z axis:', t1.zaxis); // Vector3d
console.log('Inverse:', t1.inverse); // Transformation
console.log('As array:', t1.toArray()); // number[16]

// Apply to geometry
const point = new SketchUpApi.Point3d(0, 0, 0);
const transformedPoint = t1.applyTo(point); // Returns Point3d

const vector = new SketchUpApi.Vector3d(1, 0, 0);
const transformedVector = t1.applyTo(vector); // Returns Vector3d
```

### Reading Transform Data from Entities

Groups and component instances have a `.transform` property you can decompose
into translation, rotation, and scale. The raw matrix is available via `.toArray()`
as a 16-element column-major array.

```javascript
// --- Translation (position) ---
// The origin property gives the entity's position as a Point3d.
const pos = entity.transform.origin;
console.log(`Position: ${pos.x}, ${pos.y}, ${pos.z}`); // inches

// --- Scale factors ---
// The SDK's .xaxis/.yaxis/.zaxis are normalized (always length 1),
// so extract scale from the raw matrix column vector magnitudes.
const m = entity.transform.toArray();
const sx = Math.sqrt(m[0] ** 2 + m[1] ** 2 + m[2] ** 2);
const sy = Math.sqrt(m[4] ** 2 + m[5] ** 2 + m[6] ** 2);
const sz = Math.sqrt(m[8] ** 2 + m[9] ** 2 + m[10] ** 2);
console.log(`Scale: ${sx}, ${sy}, ${sz}`); // 1.0 = no scaling

// --- Rotation (Euler angles, ZYX decomposition) ---
// First normalize the rotation sub-matrix columns to remove scale.
const r00 = m[0]/sx, r10 = m[1]/sx, r20 = m[2]/sx;
const r01 = m[4]/sy, r11 = m[5]/sy, r21 = m[6]/sy;
const r02 = m[8]/sz, r12 = m[9]/sz, r22 = m[10]/sz;

const toDeg = 180 / Math.PI;
let rx, ry, rz;
if (Math.abs(r20) < 0.99999) {
  ry = Math.asin(-r20);
  rx = Math.atan2(r21, r22);
  rz = Math.atan2(r10, r00);
} else {
  // Gimbal lock: ry is +/-90 degrees
  ry = r20 < 0 ? Math.PI / 2 : -Math.PI / 2;
  rx = Math.atan2(r01, r11);
  rz = 0;
}
console.log(`Rotation: X=${rx * toDeg}, Y=${ry * toDeg}, Z=${rz * toDeg}`); // degrees

// --- Surface area (Newell method) ---
// Compute area of a face from its vertex loops. The first loop is the
// outer boundary; subsequent loops are holes (subtracted).
const faces = await container.faces(); // container = group or definition
let totalArea = 0;
for (const face of faces) {
  const loops = face.closedVertexLoops;
  if (!loops || loops.length === 0) continue;

  for (let i = 0; i < loops.length; i++) {
    const verts = loops[i];
    // Newell method: cross-product sum over the polygon edges
    let nx = 0, ny = 0, nz = 0;
    for (let j = 0; j < verts.length; j++) {
      const a = verts[j], b = verts[(j + 1) % verts.length];
      nx += a.y * b.z - a.z * b.y;
      ny += a.z * b.x - a.x * b.z;
      nz += a.x * b.y - a.y * b.x;
    }
    const loopArea = Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
    totalArea += i === 0 ? loopArea : -loopArea; // subtract holes
  }
}
console.log(`Total area: ${totalArea} sq inches`);
```

### Bulk Transformations

```javascript
await model.performOperation(async (op) => {
  const Transformation = SketchUpApi.Transformation;

  // Transform all entities in a container
  const moveAll = Transformation.translation([0, 0, 100]);
  op.entitiesApplyTransformation(group, moveAll);

  // Transform filtered entities (e.g., only faces)
  op.entitiesApplyTransformation(group, moveAll, {
    filter: 'typeIn',
    values: [2], // Face type = 2
  });

  // Transform specific drawing elements
  const elements = [group1, group2, instance1];
  op.drawingElementsApplyTransformation(elements, moveAll);
}, 'Bulk transform');
```

---

## Querying Entities

### Get All Entities

```javascript
const entities = await model.entities.get();
// e.id is a raw number (persistent ID) — useful for display/logging
// e.sketchupId is { type, value } — required by API methods like findEntity, getEntityBoundsById
entities.forEach((e) => console.log(e.type, e.id, e.sketchupId));
```

### Filter by Type

```javascript
// Entity type enum values
// Vertex=0, Edge=1, Face=2, Group=3, ComponentInstance=4, Component=5
// Material=6, Tag=7, ConstructionPoint=10, ConstructionLine=11, Scene=12

const faces = await group.entities({
  filter: 'typeIn',
  values: [2], // Face
});

const groups = await model.entities({
  filter: 'typeIn',
  values: [3], // Group
});
```

### Find Entity by ID

**Important:** These methods require a `sketchupId` (object with `{ type, value }`), NOT a raw `.id` number.

```javascript
// Use entity.sketchupId, not entity.id
const entity = await model.findEntity(someEntity.sketchupId);

// Batch lookup (preserves order)
const entities = await model.findEntities([e1.sketchupId, e2.sketchupId]);
```

### Get Entity Bounds

```javascript
// Pass entity.sketchupId (not entity.id) — the API needs { type, value }
const bounds = await model.getEntityBoundsById(entity.sketchupId);
console.log('Min:', bounds.min, 'Max:', bounds.max);
```

---

## Components

### Load Component from URL

```javascript
await model.performOperation(async (op) => {
  const componentRef = await op.loadDefinition('/path/to/model.skp');
  const component = await op.entityForRef(componentRef);
  console.log('Loaded:', component.name);
}, 'Load component');
```

### Create Component Instance

```javascript
await model.performOperation(async (op) => {
  const component = await op.entityForRef(componentRef);
  const group = op.createGroup(model);

  const instanceRef = op.createInstance(
    group,
    component,
    SketchUpApi.Transformation.translation([100, 100, 0])
  );
}, 'Create instance');
```

### Get All Components

```javascript
const components = await model.getDefinitions();
components.forEach((c) => console.log(c.name, c.isLive));
```

### Get Entities Inside a Component Definition

Component **definitions** (not instances) support `.entities()` to access their children:

```javascript
const components = await model.getDefinitions();
const myComponent = components.find((c) => c.name === 'Chair');

// Get all child component instances within this definition
const subInstances = await myComponent.entities({
  filter: 'typeIn',
  values: [4], // ComponentInstance
});

// Map each instance back to its definition name
for (const inst of subInstances) {
  const def = components.find((c) => c.id === inst.definitionId);
  console.log('Sub-component:', def?.name);
}
```

---

## Entity Attributes

Attributes are custom key-value data stored in named dictionaries on entities.
They are available on most entity types: Component, ComponentInstance, Group,
Face, Edge, Material, Tag, TagFolder, and Scene.

**Important**: Attributes are always included automatically when you query
entities. No special flags or options are needed — just access `.attributes`
on the returned objects.

### Attributes Class API

The `.attributes` property returns an `Attributes` class instance (not a plain
object). It provides these methods:

| Method | Description |
|--------|-------------|
| `findValue(dict, key)` | Get value; throws if not found |
| `findValue(dict, key, { default: fallback })` | Get value with fallback |
| `findValue(path[], key)` | Get nested attribute; throws if not found |
| `findValue(path[], key, { default: fallback })` | Get nested with fallback |
| `hasValue(dict, key)` | Check if dictionary + key exist |
| `findDictionary(name)` | Get `AttributeDictionary` by name, or `undefined` |
| `dictionaries` | Getter returning `readonly AttributeDictionary[]` |

Each `AttributeDictionary` has:
- `.name` — the dictionary name (string)
- `.values` — a **`Map<string, value>`** (not a plain object!)
- `.attributes` — nested `Attributes` (or undefined)

### Set Attributes

```javascript
await model.performOperation(async (op) => {
  const group = op.createGroup(model);

  // Set attribute: entitySetAttribute(entity, path, key, value)
  op.entitySetAttribute(group, ['MyDict'], 'myKey', 123);
  op.entitySetAttribute(group, ['MyDict'], 'name', 'Example');

  // Nested dictionaries use longer paths
  op.entitySetAttribute(group, ['MyDict', 'SubDict'], 'nestedKey', 'value');
}, 'Set attributes');
```

### Read Attributes

```javascript
const entity = await model.findEntity(id);

// Read a single value (throws if not found)
const value = entity.attributes.findValue('MyDict', 'myKey');

// Read with a default (returns default if not found)
const withDefault = entity.attributes.findValue(
  'MyDict',
  'missing',
  { default: 'default' }
);

// Check if an attribute exists before reading
if (entity.attributes.hasValue('MyDict', 'myKey')) {
  const val = entity.attributes.findValue('MyDict', 'myKey');
}

// Read nested attributes
const nested = entity.attributes.findValue(
  ['MyDict', 'SubDict'],
  'nestedKey'
);
```

### Enumerate All Attributes on an Entity

Use `.dictionaries` to iterate over all attribute dictionaries. Note that
`.values` is a `Map`, so use `Map` methods (not `Object.entries()`).

```javascript
// CORRECT: Using Map iteration
const dictionaries = entity.attributes.dictionaries;
for (const dict of dictionaries) {
  console.log('Dictionary:', dict.name);
  dict.values.forEach((value, key) => {
    console.log(`  ${key}: ${JSON.stringify(value)}`);
  });
}

// WRONG: These will NOT work
// Object.entries(dict.values)           — values is a Map, not a plain object
// for (const [k,v] of Object.entries(dict.values)) — returns empty array for Maps
```

### Read Attributes on Components and Instances

Attributes are included automatically when querying components and instances.
No extra flags or query options are needed.

```javascript
// Component definitions
const components = await model.getDefinitions();
for (const comp of components) {
  // comp.attributes is an Attributes instance — ready to use
  if (comp.attributes.hasValue('dynamic_attributes', 'lenx')) {
    const len = comp.attributes.findValue('dynamic_attributes', 'lenx');
    console.log(`${comp.name} length: ${len}`);
  }
}

// Component instances
const instances = await model.entities({ filter: 'typeIn', values: [4] });
for (const inst of instances) {
  // inst.attributes is also an Attributes instance
  const dicts = inst.attributes.dictionaries;
  console.log(`Instance ${inst.id} has ${dicts.length} attribute dictionaries`);
}
```

### Delete Attributes

```javascript
await model.performOperation(async (op) => {
  // Delete a single attribute key
  op.entityDeleteAttribute(entity, ['MyDict'], 'myKey');
}, 'Delete attribute');
```

### Erase Drawing Elements

```javascript
await model.performOperation(async (op) => {
  // Erase a single drawing element (edge, face, group, etc.)
  op.drawingElementErase(entityRef);
}, 'Erase entity');
```

To erase locked groups or component instances, use the force variant which unlocks before erasing:

```javascript
await model.performOperation(async (op) => {
  op.drawingElementEraseWithForce(lockedGroupRef);
}, 'Force erase locked group');
```

Example — erase everything in the current selection:

```javascript
const selection = await model.getSelection();
if (selection.drawingElements.length > 0) {
  await model.performOperation(async (op) => {
    for (const entity of selection.drawingElements) {
      op.drawingElementErase(entity);
    }
  }, 'Erase selection');
}
```

---

## Drawing Element Properties

### Set Properties

```javascript
await model.performOperation(async (op) => {
  op.drawingElementSetProperties(entityRef, {
    hidden: true,
    receivesShadows: false,
    castsShadows: false,
  });
}, 'Set properties');
```

### Edge-Specific Properties

```javascript
await model.performOperation(async (op) => {
  op.edgeSetProperties(edgeRef, {
    hidden: false,
    smooth: true,
    soft: true,
  });
}, 'Set edge properties');
```

### Set Face Edge Properties

```javascript
await model.performOperation(async (op) => {
  // EdgeUsageType: Any=0, Shared=1, UniqueToFace=2, UniqueOrUnboundToFace=3, UnboundToFace=4
  op.faceSetEdgeProperties(faceRef, 0, {
    // Any edge
    hidden: true,
    smooth: true,
    soft: true,
  });
}, 'Set face edge properties');
```

---

## Model Information

```javascript
console.log('Model ID:', model.id);
console.log('Model name:', model.name);
console.log('Model GUID:', model.guid);
console.log('Revision:', model.revision);

// Model bounds
const bounds = await model.getBounds();
console.log('Bounds:', bounds.min, bounds.max);

// Number of faces
const numFaces = await model.getNumberOfFaces();

// Model axes
const axes = await model.getAxes();
console.log('Origin:', axes.origin);
```

### Model Units

Access the model's unit settings via `model.options.unitOptions`:

```javascript
const unitOptions = model.options.unitOptions;

// Length units
console.log(unitOptions.lengthUnit);      // 0=Inches, 1=Feet, 2=mm, 3=cm, 4=m, 5=yd
console.log(unitOptions.lengthFormat);    // 0=Decimal, 1=Architectural, 2=Engineering, 3=Fractional
console.log(unitOptions.lengthPrecision); // number of decimal places

// Area units
console.log(unitOptions.areaUnit);        // 0=sq in, 1=sq ft, 2=sq mm, 3=sq cm, 4=sq m, 5=sq yd
console.log(unitOptions.areaPrecision);   // number of decimal places
```

All SketchUp internal values (vertex positions, edge lengths, face areas) are stored
in **inches** (and **square inches** for area). Convert to display units using the
factors above.

**Important:** The model object returned by `getActiveModel()` caches its option values
as a snapshot. If the user changes units (or other model options) while your extension
is running, you must call `getActiveModel()` again to get a fresh model with updated
options. Simply re-reading `model.options.unitOptions` from the same model object will
return stale values.

---

## Entity Builder Pattern

For efficient batch creation:

```javascript
await model.performOperation(async (op) => {
  const group = op.createGroup(model);

  await op
    .createBuilder((builder) => {
      // Create multiple entities
      const edge = builder.createEdge([0, 0, 0], [100, 0, 0]);
      const face = builder.createFace([
        [0, 0, 0],
        [100, 0, 0],
        [100, 100, 0],
        [0, 100, 0],
      ]);
      return { edge, face };
    })
    .onPostBuild((converter, { edge, face }) => {
      // Modify after creation
      op.edgeSetProperties(converter.asRef(edge), { smooth: true });
    })
    .build(group);
}, 'Batch create');
```

---

## Observing (Real-time Updates)

### Observe Active Model

Use `observeActiveModel` to get notified whenever the model changes (transaction
commit, undo, redo) or a different model is loaded. Returns an `ObserverHandle`
with an `end()` method to cancel.

```javascript
let lastModelInfo = undefined;
const handle = SketchUpApi.observeActiveModel((modelInfo) => {
  if (!lastModelInfo || modelInfo.isDifferentModel(lastModelInfo)) {
    console.log('Different model loaded, id:', modelInfo.id);
    // modelInfo.getModel() returns a Promise<Model> if you need
    // to query the full model data.
  } else if (modelInfo.isModelChanged(lastModelInfo)) {
    console.log('Model revision changed:', modelInfo.revision);
  }
  lastModelInfo = modelInfo;
});

// Later: stop observing
handle.stop();
```

The callback receives a `SketchupObservedModel` with:
- `id` — model id
- `revision` — revision number (increments on commit, undo, redo)
- `isDifferentModel(prev)` — true if a different model was loaded
- `isModelChanged(prev)` — true if model id or revision differs
- `getModel()` — returns `Promise<Model>` (full queryable model)

---

## Real-time Animation (Experimental)

**WARNING**: This is experimental and could lead to unexpected behavior.

To achieve real-time animation with visible intermediate frames, use these options:

1. **`instructionsPerBatch: 1`** - Forces each instruction to flush immediately
2. **`op.synchronize()`** - Waits for SketchUp to process the instruction

```javascript
await model.performOperation(async (op) => {
  const steps = 72;
  const stepAngle = -5 * Math.PI / 180; // 5 degrees per step
  const center = [6, 6, 0];

  for (let i = 0; i < steps; i++) {
    const rotate = Sketchup.Transformation.rotation(center, [0, 0, 1], stepAngle);
    op.groupApplyTransformation(myGroup, rotate);
    await op.synchronize(); // Force flush - triggers render
  }
}, 'Animate rotation', { instructionsPerBatch: 1 });
```

**Performance Notes:**
- The JS side may report 100+ FPS, but SketchUp's actual render rate is likely slower
- SketchUp catches up asynchronously - the visual may lag behind the JS loop
- Without `synchronize()`, all changes batch up and only render on operation commit

---

## View Camera

You can read and set the active camera to control the user's viewport.

### Reading the Camera

```javascript
const cam = await model.view.getCamera();
// cam has: eye (Point3d), target (Point3d), up (Vector3d),
//          type, fieldOfView, aspectRatio, imageWidth
console.log('Eye:', cam.eye.x, cam.eye.y, cam.eye.z);
console.log('Target:', cam.target.x, cam.target.y, cam.target.z);
```

### Setting the Camera

```javascript
await model.view.setCamera({
  eye: new SketchUpApi.Point3d(100, -500, 300),
  target: new SketchUpApi.Point3d(0, 0, 30),
  up: cam.up,           // preserve the original up vector
  type: cam.type,       // preserve perspective/ortho type
  fieldOfView: cam.fieldOfView,
  aspectRatio: cam.aspectRatio,
  imageWidth: cam.imageWidth,
});
```

**Important:** `eye`, `target`, and `up` must be proper `Point3d`/`Vector3d` instances (not plain objects or arrays) because the serializer calls `.toArray()` on them.

### Smooth Camera Follow (Game Pattern)

```javascript
// Lerp the camera toward a desired position each frame
const SMOOTHING = 0.1; // 0–1, lower = smoother/laggier
camera.eye.x += (desiredEye.x - camera.eye.x) * SMOOTHING;
camera.eye.y += (desiredEye.y - camera.eye.y) * SMOOTHING;
camera.eye.z += (desiredEye.z - camera.eye.z) * SMOOTHING;
```

---

## Geometry Primitives

```javascript
// Point3d - coordinates (also accept arrays [x,y,z])
const point = new SketchUpApi.Point3d(100, 50, 0);

// Vector3d - direction
const vector = new SketchUpApi.Vector3d(1, 0, 0);

// BoundingBox
const bbox = new SketchUpApi.BoundingBox(
  new SketchUpApi.Point3d(0, 0, 0), // min
  new SketchUpApi.Point3d(100, 100, 100) // max
);
console.log('Width:', bbox.width, 'Height:', bbox.height, 'Depth:', bbox.depth);
```

---

## Modal Input (Asking the User a Question)

`SketchUpApi.ui.getModalInput()` asks SketchUp to draw a **native dialog** and
resolves when the user dismisses it. Use it instead of building your own dialog
when all you need is a value or a confirmation — and use it *always* in a
headless extension, where it is the only channel you have to the user.

> `alert()`, `confirm()` and `prompt()` do not work inside an extension iframe.
> `getModalInput()` is the replacement for all three.

### Ask for a Value

```javascript
const result = await SketchUpApi.ui.getModalInput({
  actions: 'okcancel',
  title: 'Draw a Cube',
  message: 'How tall is your shape in inches?',
  inputs: {
    height: {
      widgetType: 'text',   // must be exactly 'text'
      valueType: 'string',  // must be exactly 'string'
      default: '100',
      label: 'Height',      // optional
    },
  },
});

// Cancel RESOLVES — it does not reject. Always check `action` first.
if (result.action !== 'ok') return;

// inputStates is keyed like `inputs`, and every value is a string.
const height = Number.parseFloat(result.inputStates.height);
if (!Number.isFinite(height) || height <= 0) return;
```

The resolved value is always `{ action, inputStates }`:

| Field         | Type                     | Notes                                               |
| ------------- | ------------------------ | --------------------------------------------------- |
| `action`      | `string`                 | Which button was clicked                            |
| `inputStates` | `{ [key: string]: string }` | Same keys as `inputs`; `{}` if you passed no inputs |

### Ask a Yes/No Question

```javascript
const { action } = await SketchUpApi.ui.getModalInput({
  actions: 'yesno',
  message: 'Should the face be extruded?',
});

const extrude = action === 'yes';
```

Four presets, and `action` returns the lowercased button name:

| `actions`        | Buttons            | Possible `action` values      |
| ---------------- | ------------------ | ----------------------------- |
| `'ok'`           | OK                 | `'ok'`                        |
| `'okcancel'`     | OK, Cancel         | `'ok'`, `'cancel'`            |
| `'yesno'`        | Yes, No            | `'yes'`, `'no'`               |
| `'yesnocancel'`  | Yes, No, Cancel    | `'yes'`, `'no'`, `'cancel'`   |

**Test for the action you want, not the one you don't.** A dialog dismissed
without clicking a button (Escape, the window's close control) can report
`'cancel'` even when you didn't ask for a Cancel button. `if (action !== 'ok')
return;` is safe; `if (action === 'cancel') return;` is not.

### Show a Message

With no `inputs` and no `actions`, it's a message box. There's no answer to wait
for, so `void` it rather than awaiting — especially inside a `catch`.

```javascript
void SketchUpApi.ui.getModalInput({ message: 'Created your face.' });

try {
  await doSomething();
} catch (e) {
  console.error(e);
  void SketchUpApi.ui.getModalInput({ message: `Something went wrong. ${e.message}` });
}
```

### Custom Buttons

Pass an array instead of a preset. `id` comes back as `action`. `style` is
optional and takes `'primary'`, `'secondary'` or `'danger'`.

```javascript
const { action } = await SketchUpApi.ui.getModalInput({
  title: 'Purge Unused',
  message: 'This cannot be undone.',
  actions: [
    { id: 'purge', label: 'Purge Everything', style: 'danger' },
    { id: 'keep', label: 'Keep Them', style: 'secondary' },
  ],
});

if (action === 'purge') await purge();
```

`id` and `label` must both be non-empty strings, and `id`s must be unique across
the array — the SDK throws on violations rather than failing silently.

### Gotchas

- **Connect first.** `getModalInput()` throws
  `"Cannot getModalInput when JSA not connected"` if called before
  `await SketchUpApi.connect()` resolves.
- **No number widget.** `widgetType` accepts only `'text'` and `valueType` only
  `'string'`. Parse and range-check yourself; re-prompt or show a message box on
  bad input.
- **One dialog at a time.** Chain them sequentially with `await`; don't fire two
  in parallel and expect both to appear.
- **Ask before you mutate.** A dialog awaited *inside* `performOperation()`
  holds the operation open while the user thinks. Collect input first, then open
  the operation.

See `../examples/toolbar-headless/` for a complete headless extension built
around this call.

---

## Tips for Agents

1. **Z is up in SketchUp** - The coordinate system uses Z as the vertical axis. X/Y form the ground plane. When moving along the ground, change X and Y; when moving up/down, change Z.
2. **Connect on page load** - Don't connect per-operation
3. **Use `performOperation()`** - All modifications must be wrapped
4. **Entity IDs are session-specific** - Don't persist them
5. **Arrays work for coordinates** - `[x,y,z]` instead of `new Point3d(x,y,z)`
6. **Operations are atomic** - Errors roll back entire operation
7. **Use entity builder** - For batch geometry creation
8. **Check integration tests** - `/integration/src/` has comprehensive examples

---

## Entity Type Enum Values

For use with type filters:

```javascript
const EntityType = {
  Vertex: 0,
  Edge: 1,
  Face: 2,
  Group: 3,
  ComponentInstance: 4,
  Component: 5,
  Material: 6,
  Tag: 7,
  TagFolder: 8,
  TagManager: 9,
  ConstructionPoint: 10,
  ConstructionLine: 11,
  Scene: 12,
  Texture: 13,
};
```

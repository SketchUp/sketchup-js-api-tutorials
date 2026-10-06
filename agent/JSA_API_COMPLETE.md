# JSA Complete API Reference

Dense lookup table of the full SketchUp JavaScript API (JSA) surface.
Optimized for AI agent consumption — minimal prose, maximum signal.

For usage recipes and code examples, see `JSA_RECIPES.md` in this folder.

Official docs: the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/) (every class, with full
signatures) and [Naming](https://developer.trimble.com/docs/sketchup/jsa/welcome/naming/) (the conventions behind async
methods, operations and lookups).

---

## Critical Rules

- All units are **inches**. Z is **up**. X/Y form the ground plane.
- All model mutations must be inside `model.performOperation(async (op) => { ... }, 'name')`
- `Ref` types (FaceRef, GroupRef, etc.) are only valid within their operation — resolve to persistent entities before the operation ends if you need them later
- Ground-plane faces point downward — use **negative** pushpull distance to extrude upward
- `await SketchUpApi.connect()` must be called before any other API call
- Observer handles must be stopped with `handle.stop()` to avoid leaks
- Use `op.createBuilder()` for bulk geometry creation (not loops of createFace)
- Coordinates are `[x, y, z]` number arrays
- Angles are **radians** (convert: `degrees * Math.PI / 180`)
- Colors are `{ red, green, blue, alpha }` — RGB 0-255, alpha 0-1
- Entity properties are read-only snapshots; use `op.*` methods to mutate
- The operation name string (2nd arg to performOperation) appears in Edit > Undo

---

## 1. Connection & Model

```
SketchUpApi.connect() → Promise<void>
SketchUpApi.disconnect() → Promise<void>
SketchUpApi.getActiveModel() → Promise<Model>
SketchUpApi.serverProtocolVersion() → Version
SketchUpApi.platform → PlatformInfo
SketchUpApi.features → FeatureFlags

model.performOperation(fn, name) → Promise<T>  ← all mutations go here
model.startOperation(name) → Promise<Operation>  ← manual commit/abort control
model.undo() → Promise<void>
model.redo() → Promise<void>
model.refresh() → Promise<Model>  ← get fresh snapshot after external changes
model.getSkp(options) → Promise<string>  ← returns data URL of SKP file
model.getNumberOfFaces() → Promise<number>
model.findEntity(ref) → Promise<Entity | undefined>
model.getAxes() → Promise<Axes>
model.getBounds() → Promise<BoundingBox>
model.guid → string
model.id → string
model.name → string
```

---

## 2. Geometry: Faces & Edges

```
op.createFace(container, vertices) → FaceRef  ← vertices are [[x,y,z], ...] forming a closed loop
op.createFaceFromEdges(container, edges) → FaceRef
op.facePushPull(face, distance, copy) → void  ← negative = extrude along reversed normal; copy=true leaves original face
op.faceFollowMe(face, edges) → Promise<boolean>  ← extrude face along a path
op.faceReverse(face) → void  ← flip normal direction
op.faceSetFrontMaterial(face, material) → void
op.faceSetBackMaterial(face, material) → void
op.faceSetEdgeProperties(face, usageType, {smooth, soft, hidden}) → void
op.facePositionFrontMaterial(face, material, positions, projection) → void

op.createEdge(container, points) → EdgeRef[]  ← returns array; one ref per segment
op.edgeSetProperties(ref, {smooth, soft, hidden}) → void

face.area → number  ← square inches
face.normal → [x, y, z]
face.outerLoop → EdgeUse[]
face.holes → EdgeUse[][]
face.frontMaterial → Material | null
face.backMaterial → Material | null
face.plane → Plane

edge.start → Vertex
edge.end → Vertex
edge.smooth → boolean
edge.soft → boolean
edge.length → number
```

---

## 3. Geometry: Curves & Arcs

```
op.createCurve(container, points) → CurveRef  ← polyline through points
op.createArc(container, center, normal, xAxis, radius, startAngle, endAngle) → ArcCurveRef
op.createCircle(container, center, normal, radius, segments?) → ArcCurveRef  ← segments default ~24
op.createNgon(container, center, normal, radius, sides) → CurveRef  ← regular polygon
op.createCurveByWeldingEdges(container, edges) → CurveRef  ← join edges into one curve
op.curveMoveVertices(curve, vertexIndex, newPoints) → void
op.findCurvesForEdges(edges) → Promise<(Curve | ArcCurve)[]>
```

---

## 4. Geometry: Construction

```
op.createConstructionPoint(container, position) → ConstructionPointRef
op.createConstructionLine(container, start, end) → ConstructionLineRef
op.createSnap(container, position) → SnapRef
```

---

## 5. Groups & Components

```
op.createGroup(container) → GroupRef
op.groupSetName(group, name) → void
op.groupSetDescription(group, desc) → void
op.groupSetLocked(group, locked) → void
op.groupSetTransformation(group, transform) → void
op.groupApplyTransformation(group, transform) → void  ← compounds with existing transform
op.groupGetEntities(group) → Promise<DrawingElement[]>
op.groupClearEntities(group) → void

op.createDefinition(name) → ComponentDefinitionRef  ← creates empty definition
op.definitionSetName(ref, name) → void
op.definitionSetDescription(ref, desc) → void
op.definitionSetToFaceCamera(ref, value) → void  ← always-face-camera behavior
op.definitionSetToCutOpening(ref, value) → void  ← cut openings when glued to face
op.loadDefinition(options) → Promise<ComponentDefinitionRef>  ← load from URL or binary data
op.removeDefinition(ref) → void
op.purgeUnusedDefinitions() → void

op.createInstance(container, component, transform) → ComponentInstanceRef
op.instanceSetName(ref, name) → void
op.instanceSetLocked(ref, locked) → void
op.instanceSetTransformation(ref, transform) → void
op.instanceApplyTransformation(ref, transform) → void
op.instanceSetGluedTo(instance, element) → void  ← glue to a face

model.getDefinitions() → Promise<ComponentDefinition[]>

group.transformation → Transformation
group.locked → boolean
group.entities() → Promise<DrawingElement[]>

instance.transformation → Transformation
instance.locked → boolean
instance.definition → ComponentDefinitionRef
```

---

## 6. Materials & Textures

```
op.createMaterial(name) → MaterialRef
op.removeMaterial(material) → void
op.purgeUnusedMaterials() → void
op.setCurrentMaterial(material) → void  ← set the paint bucket material
op.loadMaterial(options) → Promise<MaterialRef>  ← load from URL or binary data

op.materialSetName(material, name) → void
op.materialSetColor(material, {red, green, blue}) → void
op.materialSetAlpha(material, alpha) → void  ← 0.0 (transparent) to 1.0 (opaque)
op.materialSetTexture(material, path, options?) → void
op.materialSetTextureDataBase64(material, data, options?) → void
op.materialSetTextureFromHtmlImage(material, element, options?) → void
op.materialSetTextureImageRep(material, options) → void
op.materialClearTexture(material) → void

op.materialSetMetalnessEnabled(material, enabled) → void  ← PBR
op.materialSetMetallicFactor(material, factor) → void  ← 0.0-1.0
op.materialSetRoughnessEnabled(material, enabled) → void  ← PBR
op.materialSetRoughnessFactor(material, factor) → void  ← 0.0-1.0
op.materialSetNormalEnabled(material, enabled) → void  ← PBR
op.materialSetNormalScale(material, scale) → void
op.materialSetAmbientOcclusionEnabled(material, enabled) → void  ← PBR
op.materialSetAmbientOcclusionStrength(material, strength) → void

model.getMaterials() → Promise<Materials>  ← Materials.values is the array
model.getCurrentMaterial() → Promise<Material | undefined>

material.name → string
material.color → Color
material.alpha → number
material.texture → TextureInfo | null
material.pbr → PBRInfo  ← metallic, roughness, normal, ambientOcclusion
```

---

## 7. Tags (Layers)

```
op.createTag(name) → TagRef
op.tagSetName(tag, name) → void
op.tagSetVisible(tag, visible) → void
op.tagSetColor(tag, color) → void
op.removeTag(tag) → void
op.tagAssignParent(tag, folder) → void  ← move tag into a folder

op.createTagFolder(container, name) → TagFolderRef
op.tagFolderSetName(folder, name) → void
op.tagFolderSetVisible(folder, visible) → void
op.removeTagFolder(folder) → void
op.tagFolderAssignParent(folder, parent) → void

op.drawingElementSetTag(element, tag) → void  ← assign tag to entity
op.drawingElementSetTagName(element, tagName) → void

model.getTagManager() → Promise<TagManager>

entity.tagId → string | null
```

---

## 8. Scenes & Camera

```
op.createScene(name, properties?, index?) → SceneRef
op.sceneUpdate(scene, data) → void  ← recapture current view into scene
op.removeScene(scene) → void
op.sceneApplyAndActivate(scene) → Promise<void>

model.getScenes(options?) → Promise<Scene[]>
model.getCurrentScene() → Promise<Scene | undefined>
model.setCurrentScene(scene) → Promise<void>

model.view.getCamera() → Promise<Camera>
model.view.setCamera(camera, duration?) → Promise<void>  ← duration in seconds for animation
model.view.observeCamera(callback) → ObserverHandle
model.view.getScreenshot(fileType?, options?) → Promise<string>  ← returns data URL
model.view.getViewInfo() → Promise<ViewInfo>
model.view.observeViewInfo(callback) → ObserverHandle

scene.getCamera() → Camera
scene.getShadowInfo() → ShadowInfo
scene.getRenderingOptions() → RenderingOptions
scene.getAxes() → Axes
scene.activeSectionPlanes() → SectionPlane[]
scene.getHiddenTags(filter?) → Tag[]
```

**Camera construction:**

```
Camera.default()
  .setOrientation(eye, target, up)  ← eye/target are [x,y,z], up is [0,0,1] typically
  .setFieldOfView(fov)  ← degrees (not radians, exception to the rule)
  .setOrtho(true/false)
  .build()
```

---

## 9. Selection

```
model.getSelection(filter?) → Promise<Selection>
model.getSelectionMetadata(filter?) → Promise<SelectionMetadata>
model.updateSelection(entities, mode) → Promise<SelectionMetadata>  ← mode: 'set'|'add'|'remove'|'toggle'
model.invertSelection() → Promise<SelectionMetadata>
model.observeSelectionMetadata(callback, filter?) → ObserverHandle

selection.drawingElements → DrawingElement[]
selection.totalNumberOfElements → number
```

---

## 10. Drawing Elements (shared operations)

These work on any drawing element (faces, edges, groups, instances, images, etc.):

```
op.drawingElementErase(ref) → void
op.drawingElementEraseWithForce(ref) → void  ← bypasses locked state
op.drawingElementSetProperties(ref, {hidden, castsShadows, receivesShadows}) → void
op.drawingElementSetMaterial(ref, material) → void
op.drawingElementSetMaterialName(ref, name) → void
op.drawingElementSetTag(ref, tag) → void
op.drawingElementsApplyTransformation(refs, transform, options?) → void  ← move/rotate multiple
op.drawingElementsBulkTransformation(refs, transforms) → void  ← individual transforms per entity

op.entitiesClear(container) → void  ← delete all entities in a group/model
op.entitiesSetEdgeProperties(container, usageType, properties) → void  ← bulk edge props
op.entitiesApplyTransformation(container, transform, filter?) → void

entity.id → string
entity.type → number
entity.hidden → boolean
entity.castsShadows → boolean
entity.receivesShadows → boolean
entity.bounds → BoundingBox
entity.attributes → Attributes
```

---

## 11. Text & Dimensions

```
op.createText(container, origin, attachment?, string?) → TextRef
op.textSetText(text, content) → void
op.textSetPoint(text, point) → void
op.textSetVector(text, vector) → void  ← leader line direction
op.textSetArrowType(text, type) → void
op.textSetLeaderType(text, type) → void
op.textSetAttachedTo(text, attachment) → void  ← attach leader to entity

op.createDimensionLinear(container, start, end, offset) → DimensionLinearRef
op.createDimensionRadial(container, center, radius) → DimensionRadialRef
op.dimensionSetText(dim, text) → void  ← override auto-measured text
op.dimensionSetArrowType(dim, type) → void
op.dimensionLinearSetStart(dim, point) → void
op.dimensionLinearSetEnd(dim, point) → void
op.dimensionLinearSetOffsetVector(dim, vector) → void

model.texts() → Promise<Text[]>
text.text → string
text.point → [x, y, z]
```

---

## 12. Images

```
op.createImage(container, options) → ImageEntityRef | Promise<ImageEntityRef>
  ← options: { url | blob | dataUrl, insertion: [x,y,z], width?, height? }
op.imageSetDimensions(image, {width, height}) → void
op.imageSetTransformation(image, transform) → void
op.imageApplyTransformation(image, transform) → void
op.imageSetOrigin(image, point) → void
op.imageSetGluedTo(image, element) → void
op.imageExport(image, format) → Promise<string>

image.transformation → Transformation
image.width → number
image.height → number
```

---

## 13. Section Planes

```
op.createSectionPlane(container, plane) → SectionPlaneRef  ← plane: {point, normal}
op.sectionPlaneSetPlane(ref, {point, normal}) → void
op.sectionPlaneSetName(ref, name) → void
op.sectionPlaneSetSymbol(ref, symbol) → void
op.sectionPlaneActivate(ref) → void  ← turns on the cut
op.sectionPlaneDeactivate(ref) → void

model.activeSectionPlanes() → Promise<SectionPlane[]>

sectionPlane.active → boolean
sectionPlane.plane → Plane
```

---

## 14. Styles & Rendering

```
model.getStyles(filter?) → Promise<Style[]>
model.getSelectedStyle() → Promise<SelectedStyle>
model.getRenderingOptions() → Promise<RenderingOptions>
model.updateRenderingOptions(update) → Promise<void>

op.loadStyle(resource, deduplicate?) → Promise<StyleRef>
op.removeStyle(style) → void
op.purgeUnusedStyles() → void
op.setSelectedStyle(style) → void
op.updateSelectedStyle() → void  ← save current view into selected style
op.styleSetName(style, name) → void
op.styleSetDescription(style, desc) → void
op.styleUpdateRenderingOptions(style, update) → void
op.createDuplicateStyle(style) → StyleRef
```

---

## 15. Attributes

Custom key-value metadata on any entity or the model itself:

```
op.entitySetAttribute(entity, dictionaryPath, key, value) → void
op.entityDeleteAttribute(entity, path, key) → void
op.entityDeleteAttributes(entity, path) → void  ← delete entire dictionary
op.modelSetAttribute(path, key, value) → void
op.modelDeleteAttribute(path, key) → void
op.modelDeleteAttributes(path) → void

entity.attributes.findValue(dict, key) → any  ← throws if not found
entity.attributes.findValue(dict, key, { default: fallback }) → any
entity.attributes.findValue(path[], key) → any  ← path-based lookup
entity.attributes.findValue(path[], key, { default: fallback }) → any
entity.attributes.hasValue(dict, key) → boolean
entity.attributes.findDictionary(name) → AttributeDictionary | undefined
entity.attributes.dictionaries → readonly AttributeDictionary[]
```

---

## 16. Streaming & Events

All return an `ObserverHandle` with `.stop()` to stop observing. Note they return
the handle **synchronously** — unlike most of the JSA, these are not `async`, so
don't `await` them:

```
model.view.observeCamera(callback) → ObserverHandle
model.view.observeViewInfo(callback) → ObserverHandle
model.observeSelectionMetadata(callback, filter?) → ObserverHandle
model.observeActivePath(callback) → ObserverHandle
model.observeRenderingOptions(callback) → ObserverHandle
model.observeOptionsChanges(callback) → ObserverHandle

SketchUpApi.onEvent(name, handler) → EventHandle
SketchUpApi.sendEvent(name, event) → void
```

---

## 17. Bulk Operations & EntitiesBuilder

For creating many entities efficiently (grids, meshes, terrain, etc.):

```
op.createBuilder(fn) → EntitiesBuilderCall  ← fn receives builder with same create methods
  .onPostBuild(fn) → EntitiesBuilderCall  ← runs after build; use converter.asRef() to get refs
  .build(container) → Promise<Entity[]>

op.drawingElementsApplyTransformation(refs, transform) → void  ← transform many at once
op.drawingElementsBulkTransformation(refs, transforms) → void  ← different transform per entity
op.entitiesApplyTransformation(container, transform, filter?) → void  ← transform all in container
```

Builder example pattern:

```
await op.createBuilder((builder) => {
  return faces.map(pts => builder.createFace(pts));
})
.onPostBuild((converter, refs) => {
  // refs from builder phase; use converter.asRef(r) for op methods
})
.build(groupRef);
```

---

## 18. Entity Properties (read-only snapshots)

These are available on entities returned from queries. To modify, use `op.*` methods.

**Face:** `id, type, tagId, materialId, backMaterialId, hidden, castsShadows, receivesShadows, area, normal, plane, outerLoop, holes, frontMaterial, backMaterial, attributes, bounds`

**Edge:** `id, type, tagId, materialId, smooth, soft, hidden, start, end, length, midpoint, curve, attributes, bounds`

**Group:** `id, type, name, description, guid, tagId, materialId, locked, hidden, transformation, bounds, attributes` + `entities()`, `faces()`, `edges()`, `groups()`, `componentInstances()`

**ComponentInstance:** `id, type, name, tagId, materialId, locked, hidden, transformation, definition, bounds, attributes` + `entities()`, `faces()`, etc.

**ComponentDefinition:** `id, type, name, description, bounds, isLive, instances`

**Material:** `id, type, name, displayName, color, alpha, useAlpha, materialType, texture, pbr, attributes`

**Scene:** `id, name, description, includedInAnimation, animationDelayTime, animationTransitionTime` + `getCamera()`, `getShadowInfo()`, `getRenderingOptions()`, `getHiddenTags()`

**Tag:** `id, name, visible, color, folder`

**Text:** `id, text, point, vector, attachedTo, arrowType, leaderType`

---

## 19. Geometry Helpers

```
Transformation.identity → Transformation
Transformation.translation(vector) → Transformation
Transformation.rotation(origin, axis, angle) → Transformation  ← angle in radians
Transformation.scaling(factor) → Transformation  ← uniform scale
Transformation.scaling(xFactor, yFactor, zFactor) → Transformation  ← non-uniform

Point3d(x, y, z)  ← or just use [x, y, z] arrays
Vector3d(x, y, z)
Color(red, green, blue, alpha?)
BoundingBox  ← has .min, .max, .center, .width, .height, .depth
```

---

## 20. Model Options

```
model.options.unitOptions → { lengthUnit, areaUnit, volumeUnit, angleUnit, ... }
model.options.sceneOptions → SceneOptions
model.options.slideshowOptions → SlideshowOptions
model.options.has(optionName) → boolean
model.observeOptionsChanges(callback) → ObserverHandle
```

---

## 21. Shadow Info

```
model.getShadowInfo() → Promise<ShadowInfo>
op.shadowSetTime(dateTime) → void
op.shadowSetLatLon(latitude, longitude) → void
op.shadowSetNorth(north) → void  ← degrees from Y axis

shadowInfo.dark → number
shadowInfo.light → number
shadowInfo.time → DateTime
```

---

## 22. Extension UI (commands & modal dialogs)

```
SketchUpApi.ui.on(commandId, handler) → void  ← receive a menu/toolbar command
SketchUpApi.ui.getModalInput(settings) → Promise<ModalInputResult>  ← native dialog
```

`commandId` matches a key in the manifest's `commands` object. Commands that
arrive before a handler is registered are buffered and replayed, so register
handlers **before** `connect()`.

### getModalInput(settings)

Asks SketchUp to draw a native dialog. Resolves when the user dismisses it.
Requires an active connection — throws `"Cannot getModalInput when JSA not
connected"` otherwise. Every field is optional.

```
settings.title → string
settings.message → string
settings.actions → 'ok' | 'okcancel' | 'yesno' | 'yesnocancel' | Action[]
settings.inputs → { [key: string]: Input }

Action → { id: string, label: string, style?: 'primary' | 'secondary' | 'danger' }
  ← id and label must be non-empty; ids must be unique across the array

Input → { widgetType: 'text', valueType: 'string', default?: string, label?: string }
  ← widgetType must be exactly 'text'; valueType must be exactly 'string'
```

```
ModalInputResult.action → string  ← 'ok' | 'cancel' | 'yes' | 'no', or a custom Action id
ModalInputResult.inputStates → { [key: string]: string }  ← keyed like settings.inputs
```

- **All values return as strings.** Parse and validate numbers yourself.
- **Cancel resolves, it does not reject.** Check `action` before reading
  `inputStates`.
- **Omit `inputs` and `actions` for a message box.** Nothing to await — use
  `void SketchUpApi.ui.getModalInput({ message })`.
- The only interaction channel available to a `headless` extension. `alert()` /
  `confirm()` / `prompt()` do not work in an extension iframe.

See `JSA_RECIPES.md` → "Modal Input" for worked examples.

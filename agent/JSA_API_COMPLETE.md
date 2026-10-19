# JSA Complete API Reference

Dense lookup table of the common SketchUp JavaScript API (JSA) surface: names, parameters and return types.
Optimized for AI agent consumption — minimal prose, maximum signal. Deprecated and internal methods are
deliberately left out; if you remember a name that isn't here, check the live docs before using it.
"Common" means the classes a typical extension touches are listed in full, while rarer capabilities
(rendering options, dimensions, section planes, and so on) are one line each under "Also available".

For usage recipes and code examples, see `JSA_RECIPES.md` in this folder.

Live docs (the source of truth): the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)
(every class, with full signatures) and [Naming](https://developer.trimble.com/docs/sketchup/jsa/welcome/naming/)
(the conventions behind async methods, operations and lookups).

---

## Critical Rules

- All units are **inches**. Z is **up**. X/Y form the ground plane. Angles are **radians** (`degrees * Math.PI / 180`).
- When a user talks in other units (meters, feet-and-inches, millimeters…), use `Length` — see [Lengths](#lengths). Never hand-convert.
- All model mutations must be inside `model.performOperation(async (op) => { ... }, 'name')`. The name appears in Edit > Undo.
- `Ref` types (`FaceRef`, `GroupRef`, …) are only valid within their operation — resolve to persistent entities before the operation ends if you need them later.
- Ground-plane faces point downward — use a **negative** `facePushPull` distance to extrude upward.
- `await SketchUpApi.connect()` must be called before any other API call. Register command handlers (`SketchUpApi.ui.on(...)`) **before** connecting.
- Observer handles must be stopped with `handle.stop()` to avoid leaks.
- Use `op.createBuilder()` for bulk geometry creation (not loops of `createFace`).
- Points and vectors: anywhere a `Point3Like` / `Vector3Like` is accepted you can pass a `Point3d` / `Vector3d`, a tuple `[x, y, z]` or `[x, y]` (z defaults to 0), or an object `{x, y, z?}`. Each component may be a number (inches) or a `Length`. The `new Point3d(x, y, z)` constructor takes three separate values, not an array.
- Colors are `Color` instances: red, green, blue **and alpha** are integers 0–255. (`op.materialSetAlpha` takes 0–1.)
- Entity properties are read-only snapshots; use `op.*` methods to mutate. Methods named `getX()` fetch fresh data and are async.
- Only one operation can be open per model. To queue instead of failing, `connect({ whenOperationInProgress: 'queue' })` or pass the option per operation.

---

## SketchUpApi namespace

Constructors and enums for plain-JavaScript (script-tag) pages — `new SketchUpApi.Point3d(1, 2, 3)`, `SketchUpApi.EntityType.Face`:

`AreaUnit`, `BoundingBox`, `Camera`, `CameraType`, `ChangeSource`, `Color`, `ComponentSnapTo`, `CRSLocation`, `CRSScale`, `DimensionAlignedTextPosition`, `DimensionArrowType`, `DimensionTextPosition`, `EdgeColorMode`, `EdgeDisplayMode`, `EdgeType`, `EdgeUsageType`, `EntityType`, `FacePointClassification`, `InstancePath`, `Length`, `LengthFormat`, `LengthUnit`, `MaterialColorizeType`, `MaterialNormalStyle`, `MaterialOwnerType`, `MaterialTextureType`, `MaterialType`, `MaterialWorkflow`, `OperationAbortStrategy`, `OperationStatus`, `Plane`, `Point3d`, `RenderMode`, `TextArrowType`, `TextLeaderType`, `Transformation`, `TransparencySort`, `Vector3d`, `VolumeUnit`. Also `SketchUpApi.Constants` (scene property flags), `SketchUpApi.ui`, `SketchUpApi.version`.

`Ray3d` and `Point2d` are exported by the TypeScript package but are **not** on this namespace, so a script-tag page can't construct them directly.

---

## Lengths

`Length` stores a value in inches and converts to and from every unit. Prefer it whenever the user thinks in non-inch units.

```js
const w = SketchUpApi.Length.meters(2.5);       // also inches(), feet(), yards(), miles(), millimeters(), centimeters(), kilometers()
w.inches; w.feet; w.meters;                     // read in any unit (inches is the stored value)
w.scale(2);                                     // new Length, multiplied
w.add(SketchUpApi.Length.feet(1));              // new Length; accepts number (inches) or Length
w + 3;                                          // valueOf() → inches as a plain number
SketchUpApi.Length.parse(`5' 3 1/2"`, model);   // → Length | undefined (undefined when invalid)
w.format(model);                                // string in the model's unit format
```

- `Length.parse(text, model)` uses the model's unit settings for unit-less input (so `5` means 5 in the model's unit); pass no model and a bare number means inches. Always check for `undefined`.
- `Numeric` = `number | Length` (a bare number is inches). These accept a `Numeric` today:

  - `BoundingBox`: `contains`
  - `Camera`: `withHeight`
  - `Length`: `add`
  - `Operation`: `createArc`, `createCircle`, `createImage`, `createNgon`, `facePushPull`, `imageSetDimensions`
  - `Point2d`: `constructor`
  - `Point3d`: `equalTo`, `isOnLine`, `isOnPlane`, `offset`, `constructor`
  - `Vector3d`: `constructor`

- Attribute values of type length come back as `Length` instances.
- Live docs: [Length class](https://developer.trimble.com/docs/sketchup/jsa/api/classes/length/).

---

## Querying entities

```js
const model = await SketchUpApi.getActiveModel();
const faces = await model.entities.get({ filterBy: { types: ['Face'] } });   // also: tags, visible, attribute, and/or/not
```

Containers (`model`, groups, definitions) expose `.entities`; `get()` returns snapshots, narrowed by the filter. Use the `EntityType` enum or the type name string.

---


## 1. Connection & Events

### SketchUpApi (the `Sketchup` class instance)
Main entry point to the SketchUp JavaScript API.
Properties: `readonly Constants: Readonly<{ ALL_SCENE_PROPS: SketchupSceneProperties; NO_SCENE_PROPS: SketchupSceneProperties; }>`, `readonly features: Features`, `readonly isInSketchUp: () => boolean`, `readonly platform: Platform`, `readonly ui: UI`, `version: string`
- `closeWindow(): void`
- `async connect(options: ConnectOptions = { queryChunkBatchSize: 8192 }, logger?: Logger): Promise<ConnectResponse>`
- `async disconnect(): Promise<void>`
- `getActiveModel(): Promise<Model>`
- `observeActiveModel(callback: (streamModel: ModelRevision) => void): ObserverHandle`
- `onEvent(name: 'su:command', handler: EventHandler<UICommandEvent>): EventHandle`
- `onEvent<T = unknown>(name: string, handler: EventHandler<T>): EventHandle`
- `sendEvent<Event>(name: string, event?: Event): void`

### ConnectOptions
Options you can pass when establishing the connection to SketchUp.
Properties: `readonly clientDiagnostics?: boolean | undefined`, `readonly queryChunkBatchSize?: number | undefined`, `readonly replaceAlreadyConnected?: boolean | undefined`, `readonly serverDiagnostics?: boolean | undefined`, `readonly whenOperationInProgress?: OperationInProgressResolution | undefined`

### ObserverHandle
Handle for managing an observer subscription. Call stop() to stop receiving updates.
- `stop(): void`

**Also available** (one line each; full details in the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)):

- `ConnectResponse` — Response returned by the bootstrapping mechanism
- `ModelRevision` — Represents a model revision pair typically coming from an observer.
- `EventHandle` — A handle returned when registering an event handler, used to remove the registration later.
- `EventHandler` — The function signature for an event handler.
- `Tools` — Access to SketchUp's active tool — read it, watch for changes, and trigger component placement.
- `Tool` — Information about a SketchUp tool — its name and numeric ID.
- `ToolState` — The active tool and its current state code.
- `ToolEvent` — A tool lifecycle event delivered to `observeToolChanges()` callbacks.

---

## 2. Extension UI (commands & modal dialogs)

### UI
Methods for showing and handling UI stuff.
- `async getModalInput<Settings extends ModalInputSettings>(settings: Settings): Promise<ModalInputResponseForSettings<Settings>>`  ← values in inputStates come back as strings
- `async getModalInput(settings: ModalInputSettings): Promise<ModalInputResponse>`  ← values in inputStates come back as strings
- `on(commandId: string, handler: (event: UICommandEvent) => void): void`

### UICommandEvent
The payload delivered when a Web Extension command fires.
`type UICommandEvent = { id: string; timestamp: number; };`

---

## 3. Model & Options

- `LengthUnit`: Inches = 0, Feet = 1, Millimeter = 2, Centimeter = 3, Meter = 4, Yard = 5
- `LengthFormat`: Decimal = 0, Architectural = 1, Engineering = 2, Fractional = 3
- `AreaUnit`: SquareInches = 0, SquareFeet = 1, SquareMillimeter = 2, SquareCentimeter = 3, SquareMeter = 4, SquareYard = 5
- `VolumeUnit`: CubicInches = 0, CubicFeet = 1, CubicMillimeter = 2, CubicCentimeter = 3, CubicMeter = 4, CubicYard = 5, Liter = 6, USGallon = 7

### Model
The central object for reading and modifying a SketchUp model.
Properties: `readonly attributes: Attributes`, `readonly entities: Entities`, `readonly guid: string`, `readonly id: number`, `readonly name: string`, `readonly options: ModelOptions`, `readonly revision: number`, `readonly title: string`, `readonly tools: Tools`, `readonly view: View`
- `name`  ← was empty in testing for both saved and unsaved models; use `title` for the display name
- `title`  ← the model's display name (e.g. "Title Test"); empty until the model has been saved
- `findEntities(id: readonly SketchupId[]): Promise<(Entity | undefined)[]>`  ← 4 overloads; first 2 shown
- `findEntities<T extends Entity>(snapshot: readonly T[]): Promise<(T | undefined)[]>`  ← 4 overloads; first 2 shown
- `findEntity(id: SketchupId, options: StrictlyFindEntityOptions): Promise<Entity>`  ← 6 overloads; first 2 shown
- `findEntity(id: SketchupId, options?: FindEntityOptions): Promise<Entity | undefined>`  ← 6 overloads; first 2 shown
- `async getActivePath(): Promise<ActivePath>`
- `getActiveSectionPlanes(options?: EntityQuery): Promise<readonly SectionPlane[]>`
- `getAxes(): Promise<Axes>`
- `getBounds(): Promise<BoundingBox>`
- `getClassifications(): Promise<ClassificationSchema[]>`
- `async getCRSLocation(): Promise<undefined | CRSLocation>`
- `getCurrentMaterial(): Promise<Material | undefined>`
- `getCurrentScene(): Promise<Scene | undefined>`
- `async getCurvesForEdges(edges: readonly (Edge | EdgeRef)[]): Promise<(Curve | ArcCurve)[]>`
- `getDefinitions(): Promise<readonly ComponentDefinition[]>`
- `async getEntitiesBoundsByIds(ids: readonly SketchupId[]): Promise<BoundingBox[]>`
- `getEntityBoundsById(id: SketchupId): Promise<BoundingBox>`
- `async getFacesAreas(faces: (Face | FaceRef)[], transformLike?: TransformationLike): Promise<[Face | FaceRef, number][]>`
- `async getFaceUVs(requests: FaceBulkRequest): Promise<FaceBulkResponse>`
- `getMaterials(): Promise<Materials>`
- `getNumberOfFaces(): Promise<number>`
- `async getRenderingOptions(): Promise<RenderingOptions>`
- `getScenes(options?: EntityQuery): Promise<Scene[]>`
- `async getSelectedStyle(): Promise<SelectedStyle>`
- `async getSelection(options?: EntityQuery<EntityFilter>): Promise<Selection>`
- `async getSelectionMetadata(options?: EntityQuery<EntityFilter>): Promise<SelectionMetadata>`
- `getShadowInfo(): Promise<ShadowInfo>`
- `getSkp(options?: { // Option that only exists for the Ruby backend, by setting this to true the model will be force saved. // When false, if trying to save a model that has not been saved before an error will occur. // When true, if trying to save a model that has not been saved, // the model will be "normal" saved and the user will see the temporary filename. // Defaults to false force: boolean; }): Promise<string>`
- `async getStyles(options?: EntityQuery<EntityFilter>): Promise<Style[]>`
- `getTagManager(): Promise<TagManager>`
- `async invertSelection(): Promise<SelectionMetadata>`
- `observeActivePath(callback: (activePath: ActivePath) => void): ObserverHandle`
- `observeOptionsChanges(callback: (options: ModelOptions) => void): ObserverHandle`
- `observeRenderingOptions(callback: (data: RenderingOptionsStreamData) => void): ObserverHandle`
- `observeSelectionMetadata(callback: (options: SelectionMetadata) => void, options?: EntityQuery<EntityFilter>): ObserverHandle`
- `performOperation<T>(instructions: (operation: Operation) => Promise<T> | T, name: string, options?: OperationOptions): Promise<T>`  ← callback may be sync or async; if it throws, the operation aborts and rolls back; resolves to the callback's return value
- `redo(): Promise<void>`
- `refresh(): Promise<Model>`  ← returns a NEW Model snapshot; existing snapshots stay stale
- `setCurrentScene(scene: Scene | SceneRef): Promise<void>`
- `startOperation(name: string, options?: OperationOptions): Promise<Operation>`  ← manual control: you must commit() or abort(); prefer performOperation
- `undo(): Promise<void>`
- `async updateRenderingOptions(update: RenderingOptionsUpdate): Promise<void>`
- `async updateSelection(drawingElements: | readonly (DrawingElement | DrawingElementRef)[] | readonly DrawingElement[] | readonly DrawingElementRef[] | DrawingElement | DrawingElementRef, updateType: 'add' | 'remove' | 'replace' | 'toggle'): Promise<SelectionMetadata>`

### ModelOptions
Represents a snapshot of the options for a SketchUp model
Properties: `readonly sceneOptions: SceneOptions`, `readonly slideshowOptions: SlideshowOptions`, `readonly unitOptions: UnitOptions`
- `get(key: string): OptionsProvider`
- `has(key: string): boolean`
- `async refresh(): Promise<ModelOptions>`
- `toArray(): OptionsProvider[]`

### UnitOptions
The measurement unit settings for the model — length, area, volume, angle, and snapping.
Properties: `readonly anglePrecision: number`, `readonly angleSnapEnabled: boolean`, `readonly areaPrecision: number`, `readonly areaUnit: AreaUnit`, `readonly forceInchDisplay: boolean`, `readonly lengthFormat: LengthFormat`, `readonly lengthPrecision: number`, `readonly lengthSnapEnabled: boolean`, `readonly lengthSnapLength: number`, `readonly lengthUnit: LengthUnit`, `readonly name: string`, `readonly options: OptionsProvider`, `readonly snapAngle: number`, `readonly suppressUnitsDisplay: boolean`, `readonly volumePrecision: number`, `readonly volumeUnit: VolumeUnit`
- `async refresh(): Promise<UnitOptions>`
- `update(updates: UnitOptionsUpdate): Promise<string[]>`  ← keys are PascalCase, e.g. `{ LengthUnit: SketchUpApi.LengthUnit.Meter }`, unlike the camelCase getters (`lengthUnit`); resolves to the array of rejected keys, so `[]` means success

### Selection
A snapshot of the drawing elements currently selected in SketchUp.
Properties: `readonly drawingElements: readonly DrawingElement[]`, `readonly isCurve: boolean`, `readonly isSingleObject: boolean`, `readonly isSurface: boolean`, `readonly totalNumberOfElements: number`
- `refresh(): Promise<Selection>`

### ScreenshotOptions
Properties: `antialias?: boolean | undefined`, `compression?: number | undefined`, `height?: number | undefined`, `renderOptions?: { thumbnail?: boolean | undefined; disableShadows?: boolean | undefined; disableAnnotations?: boolean | undefined; whiteBackground?: boolean | undefined; disableWatermarks?: boolean | undefined; enableAxes?: boolean | undefined; retainAxes?: boolean | undefined; disableAspectRatioBands?: boolean | undefined; retainV...`, `scaleFactor?: number | undefined`, `transparent?: boolean | undefined`, `width?: number | undefined`

**Also available** (one line each; full details in the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)):

- `SceneOptions` — Settings that control how scene transitions animate in SketchUp.
- `SlideshowOptions` — Settings that control how the scene slideshow plays back.
- `Axes` — Represents a snapshot of the modeling Axes in SketchUp
- `ActivePath` — A snapshot of where the user is currently editing inside a SketchUp model.
- `InstancePath` — An address describing where an entity lives inside nested groups or components.
- `CRSLocation` — The Coordinate Reference System (CRS) that maps SketchUp model coordinates to real-world geographic…
- `CRSScale` (Meters, Feet, USSurveyFeet) — Scale factors that convert from SketchUp inches to common CRS unit systems.
- `SelectionMetadata` — Lightweight selection information — just counts and flags, no entity data.

---

## 4. Operation (all mutations)

### Operation
The mutation API for SketchUp models — every geometry change, material assignment, and entity modification happens…
Properties: `readonly currentStatus: "open" | "committed" | "aborted" | "closed_backend"`, `readonly model: Model`, `readonly name: string`, `readonly operationId: number`, `readonly status: "open" | "committed" | "aborted" | "closed_backend"`
- `async abort(): Promise<OperationAbortResult>`
- `async commit(): Promise<OperationCommitResult>`
- `createArc(container: EntitiesContainerRef | EntitiesContainer, center: Point3Like, xaxis: Vector3Like, normal: Vector3Like, radius: Numeric, startAngle: number, endAngle: number, numSegments?: number): ArcCurveAndComponents`
- `createBuilder<A>(func: (entityBuilder: EntitiesBuilder) => Promise<A> | A): EntityBuilderCall<A, A>`
- `createCircle(container: EntitiesContainerRef | EntitiesContainer, center: Point3Like, normal: Vector3Like, radius: Numeric, numSegments: number = 24): ArcCurveAndComponents`
- `createCurve(container: EntitiesContainerRef | EntitiesContainer, points: Point3Like[]): CurveAndComponents`
- `async createCurveByWeldingEdges(edges: readonly (Edge | EdgeRef)[]): Promise<CurveRef[]>`
- `createDefinition(name: string): ComponentDefinitionRef`
- `createEdge(ref: EntitiesContainerRef | EntitiesContainer, vertices: readonly Point3Like[]): readonly EdgeRef[]`  ← connects the vertices in order; returns one EdgeRef per edge
- `createFace(ref: EntitiesContainerRef | EntitiesContainer, vertices: readonly Point3Like[]): FaceRef`
- `createFaceFromEdges(ref: EntitiesContainerRef | EntitiesContainer, edges: readonly (Edge | EdgeRef)[]): FaceRef`
- `createGroup(ref: EntitiesContainerRef | EntitiesContainer): GroupRef`
- `createInstance(ref: EntitiesContainerRef | EntitiesContainer, componentRef: ComponentDefinitionRef | ComponentDefinition, transform?: TransformationLike): ComponentInstanceRef`
- `createMaterial(name: string): MaterialRef`
- `createNgon(container: EntitiesContainerRef | EntitiesContainer, center: Point3Like, normal: Vector3Like, radius: Numeric, numSegments: number = 24): ArcCurveAndComponents`
- `createScene(name: string | undefined = undefined, properties: Partial<SketchupSceneProperties> = ALL_SCENE_PROPS, index: number | undefined = undefined): SceneRef`
- `createTag(name: string, parent?: TagManager | TagFolder | TagFolderRef): TagRef`
- `createTagFolder(name: string, parent?: TagManager | TagFolder | TagFolderRef): TagFolderRef`
- `curveMoveVertices(curve: Curve | CurveRef | ArcCurve | ArcCurveRef, newPoints: Point3Like[]): void`
- `definitionSetDescription(ref: ComponentDefinitionRef | ComponentDefinition, value: string): void`
- `definitionSetName(ref: ComponentDefinitionRef | ComponentDefinition, value: string): void`
- `drawingElementErase(ref: DrawingElementRef | DrawingElement): void`
- `drawingElementEraseWithForce(ref: DrawingElementRef | DrawingElement): void`
- `drawingElementsApplyTransformation(refs: TransformableArray | Transformable, transform: TransformationLike, options?: { // hint that needs to be supplied for protocol version >= 0.8.0 < 1.11.0 parent?: EntitiesContainer | EntitiesContainerRef; }): void`
- `drawingElementsBulkTransformation(refs: TransformableArray | Transformable, transforms: TransformationLike[]): void`
- `drawingElementSetMaterial(ref: DrawingElementRef | DrawingElement, materialRef: MaterialRef | Material): void`
- `drawingElementSetMaterialName(ref: DrawingElementRef | DrawingElement, materialName: string): void`
- `drawingElementSetProperties(ref: DrawingElementRef | DrawingElement, properties: DrawingElementPropertiesUpdate): void`
- `drawingElementSetTag(ref: DrawingElementRef | DrawingElement, tag: TagRef | Tag): void`
- `drawingElementSetTagName(ref: DrawingElementRef | DrawingElement, tagName: string): void`
- `edgeSetProperties(ref: EdgeRef | Edge, edgeProperties: EdgePropertiesUpdate): void`
- `entitiesApplyTransformation(ref: EntitiesContainerRef | EntitiesContainer, transformation: TransformationLike, options?: EntityQuery<EntityFilter>): void`
- `entitiesClear(ref: EntitiesContainerRef | EntitiesContainer): void`
- `entitiesForRefs<E extends EntityRef>(refs: readonly E[]): Promise<Entity[]>`  ← same as entityForRef, for several refs
- `entitiesSetActivateSectionPlane(ref: EntitiesContainerRef | EntitiesContainer, sectionPlaneRef?: SectionPlaneRef | null): void`
- `entitiesSetEdgeProperties(ref: EntitiesContainerRef | EntitiesContainer, edgeUsageType: EdgeUsageType | EdgeUsageTypeName, edgeProperties: EdgePropertiesUpdate): void`
- `entityDeleteAttribute(ref: EntityRef | Entity, path: readonly string[] | string, key: string): void`
- `entityDeleteAttributes(ref: EntityRef | Entity, path: readonly string[] | string): void`
- `entityForRef<E extends EntityRef>(ref: E): Promise<Entity>`  ← returns the entity class matching the ref (FaceRef → Face); snapshot of something created or changed earlier in this operation, so return it from performOperation to use it afterward; throws if deleted
- `entitySetAttribute(ref: EntityRef | Entity, path: readonly string[] | string, key: string, value: WritableAttributeValue): void`
- `faceFollowMe(face: FaceRef | Face, edges: readonly (Edge | EdgeRef)[]): Promise<boolean>`
- `facePushPull(face: FaceRef | Face, distance: Numeric, copy: boolean = false): void`  ← distance is signed along the face normal. A face created on the ground plane points down, so a NEGATIVE distance extrudes upward and a positive one downward (confirmed in SketchUp). `copy` made no visible difference on a lone ground face; the repo's examples pass `true`
- `faceReverse(face: FaceRef | Face): void`
- `faceSetBackMaterial(face: FaceRef | Face, material: MaterialRef | Material): void`
- `faceSetBackMaterialName(face: FaceRef | Face, materialName: string): void`
- `faceSetEdgeProperties(ref: FaceRef | Face, edgeUsageType: EdgeUsageType | EdgeUsageTypeName, edgeProperties: EdgePropertiesUpdate): void`
- `faceSetFrontMaterial(ref: FaceRef | Face, materialRef: MaterialRef | Material): void`
- `faceSetFrontMaterialName(ref: DrawingElementRef | DrawingElement, materialName: string): void`
- `flush(): void`
- `groupApplyTransformation(ref: GroupRef | Group, transformation: TransformationLike): void`
- `groupSetDescription(ref: GroupRef | Group, description: string): void`
- `groupSetLocked(ref: GroupRef | Group, locked: boolean): void`
- `groupSetName(ref: GroupRef | Group, name: string): void`
- `groupSetTransformation(ref: GroupRef | Group, transformation: TransformationLike): void`
- `instanceApplyTransformation(ref: ComponentInstanceRef | ComponentInstance, transformation: TransformationLike): void`
- `instanceSetGluedTo(entity: ComponentInstance | ComponentInstanceRef | Group | GroupRef, element: CanBeGluedTo | CanBeGluedToRef | undefined): void`
- `instanceSetLocked(ref: ComponentInstanceRef | ComponentInstance, value: boolean): void`
- `instanceSetName(ref: ComponentInstanceRef | ComponentInstance, value: string): void`
- `instanceSetTransformation(ref: ComponentInstanceRef | ComponentInstance, transformation: TransformationLike): void`
- `async loadDefinition(options: ComponentLoadOptions): Promise<ComponentDefinitionRef>`
- `async loadMaterial(options: MaterialLoadOptions): Promise<MaterialRef>`
- `materialSetAlpha(material: MaterialRef | Material, alpha: number): void`  ← opacity 0-1 (unlike Color alpha, which is 0-255)
- `materialSetColor(material: MaterialRef | Material, color: Color): void`
- `materialSetName(material: MaterialRef | Material, name: string): void`
- `materialSetTexture(material: Material | MaterialRef, texture: Texture | undefined, options?: { textureType: MaterialTextureType; }): void`
- `materialSetTextureDataBase64(material: MaterialRef | Material, base64Data: string, options?: { textureType?: MaterialTextureType; }): void`
- `materialSetTextureFromHtmlImage(material: MaterialRef | Material, element: HTMLImageElement, options_or_type?: | string | { type?: string; quality?: number; textureType?: MaterialTextureType; }, quality?: number): void`
- `materialSetTextureImageRep(material: MaterialRef | Material, options: SetTextureFromImageRepOptions): void`
- `modelDeleteAttribute(path: readonly string[] | string, key: string): void`
- `modelDeleteAttributes(path: readonly string[] | string): void`
- `modelSetActivePath(path: (ActivePathEntity | ActivePathEntityRef)[]): void`
- `modelSetAttribute(path: readonly string[] | string, key: string, value: WritableAttributeValue): void`
- `modelSetAxes(origin: Point3Like, xaxis: Vector3Like, yaxis: Vector3Like, zaxis: Vector3Like): void`
- `modelSetName(name: string): void`
- `purgeUnusedDefinitions(): void`
- `purgeUnusedMaterials(): void`
- `removeDefinition(ref: ComponentDefinitionRef | ComponentDefinition): void`
- `removeMaterial(material: MaterialRef | Material): void`
- `removeScene(scene: Scene | SceneRef): void`
- `removeTag(ref: TagRef | Tag, removeEntities: boolean = false): void`
- `removeTagFolder(ref: TagFolderRef | TagFolder, parent?: TagManager | TagFolder | TagFolderRef): void`
- `removeTagFromFolder(ref: TagRef | Tag, tagFolderRef: TagFolder | TagFolderRef): void`
- `sceneReorder(scene: Scene | SceneRef, index: number): void`
- `sceneSetAxes(scene: Scene | SceneRef, origin: Point3Like, xaxis: Vector3Like, yaxis: Vector3Like, zaxis: Vector3Like): void`
- `sceneSetCamera(scene: Scene | SceneRef, camera: CameraData | Camera): void`
- `sceneSetDescription(scene: Scene | SceneRef, description: string): void`
- `sceneSetDrawingElementVisibility(scene: Scene | SceneRef, element: DrawingElement | DrawingElementRef, visible: boolean): void`
- `sceneSetName(scene: Scene | SceneRef, name: string): void`
- `sceneSetProperties(scene: Scene | SceneRef, properties: Partial<SketchupSceneProperties>): void`
- `sceneSetTagFolderVisibility(scene: Scene | SceneRef, folder: TagFolder | TagFolderRef, visible: boolean): void`
- `sceneSetTagVisibility(scene: Scene | SceneRef, tag: Tag | TagRef, visible: boolean): void`
- `sceneUpdate(scene: Scene | SceneRef, properties: Partial<SketchupSceneProperties>): void`
- `setCurrentMaterial(material: MaterialRef | Material | undefined): void`
- `async synchronize(): Promise<OperationStatusResult>`
- `tagAssignParent(ref: TagRef | Tag, parent: TagManager | TagFolder | TagFolderRef): void`
- `tagFolderAssignParent(ref: TagFolderRef | TagFolder, parent: TagManager | TagFolder | TagFolderRef): void`
- `tagFolderSetName(ref: TagFolderRef | TagFolder, name: string): void`
- `tagFolderSetVisible(ref: TagFolderRef | TagFolder, visible: boolean): void`
- `tagSetColor(ref: TagRef | Tag, color: Color): void`
- `tagSetName(ref: TagRef | Tag, name: string): void`
- `tagSetVisible(ref: TagRef | Tag, visible: boolean): void`

**Also on Operation** (names only; signatures on the [Operation class page](https://developer.trimble.com/docs/sketchup/jsa/api/classes/operation/)):
- Shadow info setters (see `ShadowInfo`): `shadowInfoSetCity`, `shadowInfoSetCountry`, `shadowInfoSetDark`, `shadowInfoSetDaylightSavings`, `shadowInfoSetDisplayNorth`, `shadowInfoSetDisplayOnAllFaces`, `shadowInfoSetDisplayOnGroundPlane`, `shadowInfoSetDisplayShadows`, `shadowInfoSetEdgesCastShadows`, `shadowInfoSetLatitude`, `shadowInfoSetLight`, `shadowInfoSetLongitude`, `shadowInfoSetNorthAngle`, `shadowInfoSetShadowTimeEpochSeconds`, `shadowInfoSetTZOffset`, `shadowInfoSetUseSunForAllShading`
- Dimensions: `createDimensionLinear`, `createDimensionRadial`, `dimensionLinearSetAlignedTextPosition`, `dimensionLinearSetEnd`, `dimensionLinearSetOffset`, `dimensionLinearSetStart`, `dimensionLinearSetTextPosition`, `dimensionRadialSetArcCurve`, `dimensionRadialSetLeaderBreakPoint`, `dimensionSetArrowType`, `dimensionSetHasAlignedText`, `dimensionSetText`
- Text: `createText`, `textSetArrowType`, `textSetAttachedTo`, `textSetDisplayLeader`, `textSetLeaderType`, `textSetLineWeight`, `textSetPoint`, `textSetText`, `textSetVector`
- Construction guides: `constructionLineReverse`, `constructionLineSetDirection`, `constructionLineSetEnd`, `constructionLineSetPosition`, `constructionLineSetStart`, `constructionLineSetStipple`, `createConstructionLine`, `createConstructionPoint`
- Section planes: `createSectionPlane`, `sectionPlaneActivate`, `sectionPlaneDeactivate`, `sectionPlaneSetName`, `sectionPlaneSetPlane`, `sectionPlaneSetSymbol`
- Snaps: `createSnap`, `snapSetPose`
- Images: `createImage`, `imageApplyTransformation`, `imageSetDimensions`, `imageSetGluedTo`, `imageSetOrigin`, `imageSetTransformation`
- Material PBR and colorize setters: `materialSetAmbientOcclusionEnabled`, `materialSetAmbientOcclusionStrength`, `materialSetColorizeType`, `materialSetMetallicFactor`, `materialSetMetalnessEnabled`, `materialSetNormalEnabled`, `materialSetNormalScale`, `materialSetNormalStyle`, `materialSetRoughnessEnabled`, `materialSetRoughnessFactor`
- Scene animation: `sceneSetAnimationDelayTime`, `sceneSetAnimationTransitionTime`, `sceneSetIncludedInAnimation`
- Styles and rendering options: `createDuplicateStyle`, `loadStyle`, `purgeUnusedStyles`, `removeStyle`, `sceneUpdateRenderingOptions`, `setSelectedStyle`, `styleSetDescription`, `styleSetName`, `styleUpdateRenderingOptions`, `updateSelectedStyle`
- Geolocation and classification: `definitionAddClassification`, `definitionRemoveClassification`, `definitionSetClassificationValue`, `modelLoadSchemaFromUrl`, `modelSetCRSLocation`, `modelUnloadSchema`
- Component behavior flags: `definitionSetNoScaleMask`, `definitionSetShadowsToFaceSun`, `definitionSetTo2d`, `definitionSetToCutOpening`, `definitionSetToFaceCamera`, `definitionSetToSnapTo`
- Texture positioning: `faceClearBackTexturePosition`, `faceClearBackTextureProjection`, `faceClearFrontTexturePosition`, `faceClearFrontTextureProjection`, `facePositionBackMaterial`, `facePositionFrontMaterial`

### OperationOptions
Options you can pass to control how an operation executes.
`type OperationOptions = { disableUi?: boolean; abortStrategy?: OperationAbortStrategy | OperationAbortStrategyName; instructionsPerBatch?: number; transparent?: boolean; whenOperationInProgress?: OperationInProgressResolution; };`

### OperationInProgressResolution
Determines the behavior of the API when an operation is started while another is in progress.
`type OperationInProgressResolution = | 'error' | 'queue' | { queueUpTo: { millis: number }; };`

**Also available** (one line each; full details in the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)):

- `OperationStatus` (open, committed, aborted, abortedOnError) — Represents the current status of an operation
- `OperationStatusResult` — Returned from a call to operation.synchronize()
- `OperationAbortStrategy` (AbortOnAll, AbortOnError, AbortNever) — Modifier for an that determines how failures in SketchUp are to be handled.
- `OperationAbortResult` — Returned from a call to operation.abort()
- `OperationCommitResult` — Returned from a call to operation.commit()
- `OperationCommitError` — Thrown during operation.performOperation if the operation failed with an error during commit
- `OperationIssue` — Represents an issue that has occurred during the processing of an operation.
- `TimeoutError` — A timeout occurred

---

## 5. Bulk Creation: EntitiesBuilder

### EntitiesBuilder
A high-performance batch builder for creating large amounts of geometry in one shot.
- `addCallback(callback: () => void): void`
- `createEdge(start: Point3Like, end: Point3Like): EntityBuilderEdgeRef`
- `createFace(outerLoop: readonly Readonly<Point3Like>[], holes: readonly (readonly Readonly<Point3Like>[])[] = []): EntityBuilderFaceRef`
- `createTexturePositioning(material: MaterialRef | Material, positions: TexturePositioning, projection: Vector3d | undefined): EntityBuilderTexturePositioningRef`
- `positionFaceBackMaterial(ref: EntityBuilderFaceRef, positioning: EntityBuilderTexturePositioningRef): void`
- `positionFaceFrontMaterial(ref: EntityBuilderFaceRef, positioning: EntityBuilderTexturePositioningRef): void`

### EntityBuilderCall
Represents a call to perform geometry ingestion with an entity builder
- `build(ref: EntitiesContainerRef | EntitiesContainer): Promise<PostBuildResult>`
- `onPostBuild<T>(func: PostBuildFunction<BuildResult, T>): EntityBuilderCall<BuildResult, T>`
- `withOptions(callOptions: Partial<CallOptions>): EntityBuilderCall<BuildResult, PostBuildResult>`

### EntityBuilderRefConverter
Converts entity builder references into operation references for further modification
- `asRef(face: EntityBuilderFaceRef): FaceRef`
- `asRef(edge: EntityBuilderEdgeRef): EdgeRef`

**Also available** (one line each; full details in the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)):

- `EntityBuilderEdgeRef` — A lightweight placeholder for an Edge created inside an callback.
- `EntityBuilderFaceRef` — A lightweight placeholder for a Face created inside an callback.
- `EntityBuilderTexturePositioningRef` — A lightweight placeholder for a texture positioning created inside an callback.

---

## 6. Geometry Helpers & Units

### Length
Represents a length in the standard SketchUp unit (inches).
Constructors: `new Length(readonly inches: number)`
Properties: `readonly centimeters: number`, `readonly feet: number`, `readonly inches: number`, `readonly kilometers: number`, `readonly meters: number`, `readonly miles: number`, `readonly millimeters: number`, `readonly type: "length"`, `readonly yards: number`
- `static centimeters(length: number): Length`
- `static feet(length: number): Length`
- `static inches(length: number): Length`
- `static kilometers(length: number): Length`
- `static meters(length: number): Length`
- `static miles(length: number): Length`
- `static millimeters(length: number): Length`
- `static parse(string: string, options?: | Model | { lengthFormat?: LengthFormat; lengthUnit?: LengthUnit; }): Length | undefined`
- `static yards(length: number): Length`
- `add(other: Numeric): Length`
- `format(options?: | Model | { lengthFormat?: LengthFormat; lengthPrecision?: number; lengthUnit: LengthUnit; forceInchDisplay?: boolean; forceShowFraction?: boolean; suppressUnitsDisplay?: boolean; }): string`
- `scale(scale: number): Length`
- `valueOf(): number`

### Point3d
A position in 3D space, measured in inches.
Constructors: `new Point3d(x: Numeric = 0, y: Numeric = 0, z: Numeric = 0)`
Properties: `readonly x: number`, `readonly y: number`, `readonly z: number`
- `static create(input: Readonly<Point3Like>): Point3d`
- `static fromLinearCombination(w1: number, p1: Readonly<Point3Like>, w2: number, p2: Readonly<Point3Like>): Point3d`
- `add(input: Readonly<Point3Like>): Point3d`
- `distance(point: Readonly<Point3Like>): number`
- `distanceToLine(ray: Readonly<Ray3dLike>): number`
- `distanceToPlane(plane: Readonly<PlaneLike>): number`
- `equalTo(point: Readonly<Point3Like>, tol: Numeric = Point3d.EqualTol): boolean`
- `isOnLine(ray: Readonly<Ray3dLike>, tolerance: Numeric = Point3d.EqualTol): boolean`
- `isOnPlane(plane: Readonly<PlaneLike>, tolerance: Numeric = Point3d.EqualTol): boolean`
- `offset(input: Readonly<Vector3Like>, distance?: Numeric): Point3d`
- `projectToLine(ray: Readonly<Ray3dLike>): Point3d`
- `projectToPlane(plane: Readonly<PlaneLike>): Point3d`
- `signedDistanceToPlane(plane: Readonly<PlaneLike>): number`
- `subtract(input: Readonly<Point3Like>): Point3d`
- `toArray(): [number, number, number]`
- `toVector(): Vector3d`
- `with(partialPoint: Partial<{ x: number | null; y: number | null; z: number | null; }>): Point3d`

### Point2d
Properties: `static readonly EqualTol: 0.001`, `readonly x: number`, `readonly y: number`
- `static fromPoint2Like(array: [number, number]): Point2d`
- `add(vector: Point2d | [number, number]): Point2d`
- `equalTo(point: Point2d): boolean`
- `subtract(vector: Point2d | [number, number]): Point2d`
- `toArray(): [number, number]`

### Vector3d
A direction and magnitude in 3D space.
Constructors: `new Vector3d(x: Numeric = 0, y: Numeric = 0, z: Numeric = 0)`
Properties: `readonly axes: [Vector3d, Vector3d, Vector3d]`, `readonly length: number`, `readonly normalize: Vector3d`, `readonly reverse: Vector3d`, `readonly x: number`, `readonly y: number`, `readonly z: number`
- `static create(input: Readonly<Vector3Like>): Vector3d`
- `static direction(eye: Readonly<Point3Like>, target: Readonly<Point3Like>): Vector3d`
- `static fromLinearCombination(w1: number, v1: Readonly<Vector3Like>, w2: number, v2: Readonly<Vector3Like>): Vector3d`
- `static fromOrigin(point: Readonly<Point3Like>): Vector3d`
- `add(vector2: Readonly<Vector3Like>): Vector3d`
- `angleBetween(vector2: Readonly<Vector3Like>): number`
- `cross(vector: Readonly<Vector3Like>): Vector3d`
- `dot(vector: Readonly<Vector3Like>): number`
- `equalTo(vector2: Readonly<Vector3Like>): boolean`
- `isParallel(vector2: Readonly<Vector3Like>): boolean`
- `isPerpendicular(vector2: Readonly<Vector3Like>): boolean`
- `isSameDirectionAs(vector2: Readonly<Vector3Like>): boolean`
- `isUnitVector(): boolean`
- `minus(vector2: Readonly<Vector3Like>): Vector3d`
- `scale(by: number): Vector3d`
- `toArray(): [number, number, number]`
- `with(partialVector: Partial<{ x: number | null; y: number | null; z: number | null; }>): Vector3d`

### Plane
A 3D plane defined by the equation ax + by + cz + d = 0.
Constructors: `new Plane(readonly a: number = 0, readonly b: number = 0, readonly c: number = 0, readonly d: number = 0)`
Properties: `readonly a: number`, `readonly b: number`, `readonly c: number`, `readonly d: number`, `readonly normal: Vector3d`, `readonly origin: Point3d`, `readonly reverse: Plane`
- `static create(input: Readonly<PlaneLike>): Plane`
- `static fromVertices(vertices: readonly Point3Like[]): Plane | undefined`
- `applyTransform(transform: Transformation): Plane`
- `distanceToPoint(pointLike: Readonly<Point3Like>): number`
- `projectPoint(pointLike: Readonly<Point3Like>): Point3d`
- `signedDistanceToPoint(pointLike: Readonly<Point3Like>): number`
- `toArray(): [number, number, number, number]`

### Ray3d
Represents an immutable ray (or line) in 3d coordinates
Properties: `readonly direction: Vector3d`, `readonly origin: Point3d`
- `static between(start: Readonly<Point3Like>, end: Readonly<Point3Like>): Ray3d`
- `static create(input: Readonly<Ray3dLike>): Ray3d`
- `projectPoint(point: Readonly<Point3Like>): Point3d`

### Transformation
A 4x4 matrix describing a position, rotation, and scale in 3D space.
Properties: `static readonly identity: Transformation`, `readonly identity: boolean`, `readonly inverse: Transformation`, `readonly origin: Point3d`, `readonly xaxis: Vector3d`, `readonly yaxis: Vector3d`, `readonly zaxis: Vector3d`
- `static axes(origin: Point3d, xaxis: Vector3d, yaxis: Vector3d, zaxis: Vector3d | undefined = undefined): Transformation`
- `static create(transform: Readonly<TransformationLike>): Transformation`
- `static fromArray(array: readonly number[]): Transformation`
- `static interpolate(transform1: Transformation, transform2: Transformation, weight: number): Transformation`
- `static originAndDirection(origin: Point3Like, direction: Vector3Like): Transformation`
- `static rotation(point: Point3Like, vector: Vector3Like, angle: number): Transformation`
- `static scaling(scale: number): Transformation`  ← 4 overloads; first 2 shown
- `static scaling(xscale: number, yscale: number, zscale: number): Transformation`  ← 4 overloads; first 2 shown
- `static translation(arg: Readonly<Vector3Like | Point3Like>): Transformation`
- `applyTo(point: Point3d): Point3d`  ← 7 overloads; first 2 shown
- `applyTo(vector: Vector3d): Vector3d`  ← 7 overloads; first 2 shown
- `toArray(): SketchupTransform`

### BoundingBox
An axis-aligned box that encloses a set of geometry.
Constructors: `new BoundingBox(min?: [number, number, number] | Point3d, max?: [number, number, number] | Point3d)`
Properties: `readonly center: Point3d`, `readonly depth: number`, `readonly empty: boolean`, `readonly height: number`, `readonly max: Point3d`, `readonly min: Point3d`, `readonly width: number`
- `add(point: Point3d): BoundingBox`  ← 3 overloads; first 2 shown
- `add(boundingBox: BoundingBox): BoundingBox`  ← 3 overloads; first 2 shown
- `clear(): BoundingBox`
- `contains(point_or_bb: Point3d | BoundingBox, tol: Numeric = 0): boolean`

### Color
An RGBA color value.
Constructors: `new Color(readonly red: number, readonly green: number, readonly blue: number, readonly alpha: number = 255)`
Properties: `readonly alpha: number`, `readonly blue: number`, `readonly green: number`, `readonly red: number`
- `static fromHex(hex: string): Color`
- `toHex(): string`
- `toNumber(): number`

### Numeric
This type alias allows lengths to be used implicitly as arguments to create Vectors and Points.
`type Numeric = number | Length;`

### Point3Like
Any value that can be interpreted as a 3D point.
`type Point3Like = | Point3d | [Numeric, Numeric, Numeric] | [Numeric, Numeric] | { x: Numeric; y: Numeric; z?: Numeric };`

### Vector3Like
Any value that can be interpreted as a 3D vector.
`type Vector3Like = | Vector3d | [Numeric, Numeric, Numeric] | [Numeric, Numeric] | { x: Numeric; y: Numeric; z?: Numeric };`

### PlaneLike
Any value that can be interpreted as a plane.
`type PlaneLike = [number, number, number, number] | Plane | [Point3Like, Vector3Like];`

### Ray3dLike
Any value that can be interpreted as a 3D Ray.
`type Ray3dLike = Ray3d | [Point3d, Point3d] | [Point3Like, Point3Like];`

### TransformationLike
Any value that can be interpreted as a transformation.
`type TransformationLike = | Transformation | SketchupTransform | TransformationIdentity;`

---

## 7. Entities & Queries

- `EntityType`: Vertex = 0, Edge = 1, Face = 2, Group = 3, ComponentInstance = 4, ComponentDefinition = 5, Material = 6, Tag = 7, TagFolder = 8, TagManager = 9, ConstructionPoint = 10, ConstructionLine = 11, Scene = 12, Texture = 13, SectionPlane = 14, Snap = 15, Image = 16, Text = 17, Curve = 18, ArcCurve = 19, DimensionLinear = 20, DimensionRadial = 21, Style = 22

### Entities
The gateway to querying drawing elements owned by a container.
Properties: `readonly parent: EntitiesContainer | EntitiesContainerRef`
- `async get<Filter extends EntityFilter = EntityFilter>(options?: EntityQuery<Filter>): Promise<DrawingElement[]>`
- `async getActiveSectionPlane(): Promise<SectionPlane | undefined>`
- `async getCurves<Filter extends EntityFilter = EntityFilter>(options?: EntityQuery<Filter>): Promise<Curve | ArcCurve[]>`

### EntitiesContainer
Objects that contain entities
`type EntitiesContainer = Model | Group | ComponentDefinition;`

### Entity
The root union type encompassing all SketchUp objects you can query, reference, or manipulate through the API.
`type Entity = | ArcCurve | Curve | DrawingElement | Material | Scene | Tag | TagFolder | Texture | Vertex | Style;`

### DrawingElement
A union of all entity types that can physically exist in the modeling space.
`type DrawingElement = | ComponentDefinition | ComponentInstance | ConstructionLine | ConstructionPoint | DimensionLinear | DimensionRadial | Edge | Face | Group | ImageEntity | SectionPlane | Snap | Text;`

### EntityRef
An entity is the root of the object hierarchy in SketchUp, representing physical geometry and other meta types.
`type EntityRef = | ArcCurveRef | CurveRef | DrawingElementRef | ImageEntityRef | MaterialRef | SceneRef | TagRef | TagFolderRef | UnknownEntityRef | VertexRef | StyleRef;`

### DrawingElementRef
A reference to a drawing element which may not exist yet.
`type DrawingElementRef = | ComponentInstanceRef | ComponentDefinitionRef | ConstructionLineRef | ConstructionPointRef | DimensionLinearRef | DimensionRadialRef | EdgeRef | FaceRef | GroupRef | ImageEntityRef | SectionPlaneRef | SnapRef | TextRef;`

### EntitiesContainerRef
A reference to an entity that contain entities
`type EntitiesContainerRef = GroupRef | ComponentDefinitionRef;`

### EntityQuery
Standard options for any query that returns multiple entities.
`type EntityQuery<Filter extends EntityFilter = EntityFilter> = { filterBy?: Filter | undefined; };`

### EntityFilter
A filter that selects which entities are included in a query or operation.
`type EntityFilter = EntityAndFilter | EntityOrFilter | EntityNotFilter | EntityLeafFilter;`

### EntityLeafFilter
A simple (non-composed) filter — one of the four leaf types: attribute, tag, type, or visibility.
`type EntityLeafFilter = | EntityAttributeFilter | EntityTagFilter | EntityTypeFilter | EntityVisibilityFilter;`

### EntityAndFilter
Matches when ALL sub-filters match.
`type EntityAndFilter = { and: EntityFilter[]; };`

### EntityOrFilter
Matches when at least one sub-filter matches.
`type EntityOrFilter = { or: EntityFilter[]; };`

### EntityNotFilter
Matches when the sub-filter does NOT match.
`type EntityNotFilter = { not: EntityFilter; };`

### EntityVisibilityFilter
Matches drawing elements by their hidden/visible state.
`type EntityVisibilityFilter = { visible: boolean; };`

### EntityTypeFilter
Matches entities of the given types.
`type EntityTypeFilter = { types: (EntityType | EntityName)[]; };`

### EntityTagFilter
Matches drawing elements assigned to one of the given tags.
`type EntityTagFilter = { tags: (SketchupId | Tag | TagRef)[]; };`

### EntityAttributeFilter
Matches entities that have a specific attribute value.
`type EntityAttributeFilter = { attribute: { path: string[]; key: string; value: AttributeValue; }; };`

---

## 8. Faces, Edges & Vertices

### Face
A flat surface bounded by edges, the fundamental geometry for 3D modeling.
Properties: `readonly attributes: Attributes`, `readonly backMaterialRef: MaterialRef | undefined`, `readonly backTextureInfo: { projection: Vector3d | undefined; positioned: boolean; } | undefined`, `readonly boundingBox: BoundingBox`, `readonly castsShadows: boolean`, `readonly closedVertexLoops: Vertex[][]`, `readonly edges: Edge[]`, `readonly frontTextureInfo: { projection: Vector3d | undefined; positioned: boolean; } | undefined`, `readonly gluedInstanceCount: number`, `readonly hidden: boolean`, `readonly holes: readonly (readonly EdgeUse[])[]`, `readonly id: number`, `readonly materialRef: MaterialRef | undefined`, `readonly normal: Vector3d`, `readonly outerLoop: readonly EdgeUse[]`, `readonly plane: Plane`, `readonly receivesShadows: boolean`, `readonly sketchupId: SketchupId`, `readonly tagRef: TagRef | undefined`, `readonly type: EntityType.Face`, `readonly typeName: string`
- `area(transformLike?: TransformationLike): number`
- `classifyPoint(point: Point3Like): FacePointClassification`
- `coplanarWith(other: Face): boolean`
- `async getArea(transformLike?: TransformationLike): Promise<number>`
- `getBounds(): Promise<BoundingBox>`
- `async getGluedInstances<Filter extends EntityFilter = EntityFilter>(options?: EntityQuery<Filter>): Promise<(ComponentInstance | Group | ImageEntity)[]>`
- `async getMaterial(): Promise<Material | undefined>`
- `async getTag(): Promise<Tag | undefined>`
- `async getUVs(uvRequest: UVRequest): Promise<UVResponse>`
- `async getUVTiles(uvRequest: UVRequest): Promise<UVTileResponse>`
- `refresh(): Promise<Face>`

### Edge
A straight line segment between two vertices in the model.
Properties: `readonly attributes: Attributes`, `readonly castsShadows: boolean`, `readonly curve: ArcCurveRef | CurveRef | undefined`, `readonly end: Vertex`, `readonly hidden: boolean`, `readonly id: number`, `readonly materialRef: MaterialRef | undefined`, `readonly receivesShadows: boolean`, `readonly sketchupId: SketchupId`, `readonly smooth: boolean`, `readonly soft: boolean`, `readonly start: Vertex`, `readonly tagRef: TagRef | undefined`, `readonly type: EntityType.Edge`, `readonly typeName: string`
- `getBounds(): Promise<BoundingBox>`
- `async getCurve(): Promise<Curve | ArcCurve | undefined>`
- `async getMaterial(): Promise<Material | undefined>`
- `async getTag(): Promise<Tag | undefined>`
- `refresh(): Promise<Edge>`

### EdgeUse
A directed edge within a face loop, indicating which way the edge runs.
Properties: `readonly edge: Edge`, `readonly end: Vertex`, `readonly reverse: boolean`, `readonly start: Vertex`

### Vertex
A point in 3D space where edges meet.
Properties: `readonly attributes: Attributes`, `readonly id: number`, `readonly point: Point3d`, `readonly sketchupId: SketchupId`, `readonly type: EntityType.Vertex`, `readonly typeName: string`, `readonly x: number`, `readonly y: number`, `readonly z: number`
- `refresh(): Promise<Vertex>`

**Also available** (one line each; full details in the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)):

- `EdgeUsageType` (Any, Shared, UniqueToFace, UniqueOrUnboundToFace, UnboundToFace) — Numeric filter for the edge usage type
- `EdgeUsageTypeName` — Named equivalent of for convenience.
- `FacePointClassification` (PointUnknown, PointInside, PointOnVertex, PointOnEdge, PointOutside, PointNotOnPlane) — Describes where a 3D point sits relative to a face.
- `FaceBulkRequest`
- `FaceBulkResponse`
- `UVRequest` — Represents a request to get the UV values for some given points on the front or back of a face.
- `UVResponse` — Represents a response from a UVRequest
- `UVMap` — Represents an individual UV mapping point
- `UVTile` — The UV Tiles
- `UVTileResponse` — Represents a response from a UVRequest
- `DrawingElementPropertiesUpdate` — Used to mutate the properties of one or drawing elements.
- `EdgePropertiesUpdate` — Used to mutate the properties of one or more edges.

---

## 9. Curves & Arcs

### Curve
A collection of connected edges that form a smooth path in the model.
Properties: `readonly attributes: Attributes`, `readonly edges: Edge[]`, `readonly firstEdge: Edge`, `readonly id: number`, `readonly isPolygon: boolean`, `readonly lastEdge: Edge`, `readonly length: number`, `readonly sketchupId: SketchupId`, `readonly type: EntityType.Curve`, `readonly typeName: string`, `readonly vertices: Vertex[]`
- `refresh(): Promise<Curve>`

### ArcCurve
A curve formed from edges arranged in a circular arc or full circle.
Properties: `readonly attributes: Attributes`, `readonly center: Point3d`, `readonly circular: boolean`, `readonly edges: Edge[]`, `readonly endAngle: number`, `readonly firstEdge: Edge`, `readonly id: number`, `readonly isPolygon: boolean`, `readonly lastEdge: Edge`, `readonly length: number`, `readonly normal: Vector3d`, `readonly plane: Plane`, `readonly radius: number`, `readonly sketchupId: SketchupId`, `readonly startAngle: number`, `readonly type: EntityType.ArcCurve`, `readonly typeName: string`, `readonly vertices: Vertex[]`, `readonly xAxis: Vector3d`, `readonly yAxis: Vector3d`
- `refresh(): Promise<ArcCurve>`

---

## 10. Groups & Components

### Group
A container that collects geometry into a single, movable unit.
Properties: `readonly attributes: Attributes`, `readonly castsShadows: boolean`, `readonly definition: ComponentDefinitionRef`, `readonly definitionId: number`, `readonly description: string | undefined`, `readonly entities: Entities`, `readonly gluedToId: SketchupId | undefined`, `readonly guid: string | undefined`, `readonly hidden: boolean`, `readonly id: number`, `readonly locked: boolean`, `readonly materialRef: MaterialRef | undefined`, `readonly name: string | undefined`, `readonly receivesShadows: boolean`, `readonly sketchupId: SketchupId`, `readonly tagRef: TagRef | undefined`, `readonly transform: Transformation`, `readonly type: EntityType.Group`, `readonly typeName: string`
- `getBounds(): Promise<BoundingBox>`
- `async getMaterial(): Promise<Material | undefined>`
- `async getTag(): Promise<Tag | undefined>`
- `refresh(): Promise<Group>`

### ComponentInstance
A placed copy of a component definition in the model.
Properties: `readonly attributes: Attributes`, `readonly castsShadows: boolean`, `readonly definition: ComponentDefinitionRef`, `readonly definitionId: number`, `readonly gluedToId: SketchupId | undefined`, `readonly guid: string | undefined`, `readonly hidden: boolean`, `readonly id: number`, `readonly locked: boolean`, `readonly materialRef: MaterialRef | undefined`, `readonly name: string | undefined`, `readonly receivesShadows: boolean`, `readonly sketchupId: SketchupId`, `readonly tagRef: TagRef | undefined`, `readonly transform: Transformation`, `readonly type: EntityType.ComponentInstance`, `readonly typeName: string`
- `getBounds(): Promise<BoundingBox>`
- `async getMaterial(): Promise<Material | undefined>`
- `async getTag(): Promise<Tag | undefined>`
- `refresh(): Promise<ComponentInstance>`

### ComponentDefinition
A reusable blueprint that defines the geometry and behavior of component instances in the model.
Properties: `readonly attributes: Attributes`, `readonly behavior: ComponentBehavior`, `readonly castsShadows: boolean`, `readonly description: string`, `readonly entities: Entities`, `readonly guid: string`, `readonly hidden: boolean`, `readonly id: number`, `readonly isGroup: boolean`, `readonly isImage: boolean`, `readonly isInternal: boolean`, `readonly isLive: boolean`, `readonly materialRef: MaterialRef | undefined`, `readonly name: string`, `readonly path: string`, `readonly receivesShadows: boolean`, `readonly sketchupId: SketchupId`, `readonly tagRef: TagRef | undefined`, `readonly type: EntityType.ComponentDefinition`, `readonly typeName: string`
- `findClassifications(schemaName: string): Attributes | undefined`
- `findClassificationValue(schemaName: string, path: string[]): AttributeValue`
- `getBounds(): Promise<BoundingBox>`
- `getInstances(): Promise<ComponentInstance[]>`
- `async getMaterial(): Promise<Material | undefined>`
- `async getTag(): Promise<Tag | undefined>`
- `observeInstanceChanges(callback: (added: ComponentInstance[], removedIds: number[], source: ChangeSourceEnum) => void): ObserverHandle`
- `refresh(): Promise<ComponentDefinition>`

**Also available** (one line each; full details in the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)):

- `ComponentBehavior` — Summary of how a Component Instance behaves
- `ComponentScaling` — Modifier for a component that affects how the scale tool behaves for instances of the associated .
- `ComponentSnapTo` (Arbitrary, Horizontal, Vertical, Sloped) — Determines how an associated component instance will glue (snap) to faces and other component instances.
- `ClassificationSchema` — Represents a snapshot of the ClassificationSchema in SketchUp

---

## 11. Annotations, Guides, Section Planes & Images

**Also available** (one line each; full details in the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)):

- `Text` — A 3D text label that can float in space or attach to geometry with a leader line.
- `TextAttachment` — Describes where a text label should be anchored when creating it. Provide a point in model space, and…
- `TextAttachedTo` — Describes the geometry a Text entity is currently attached to. Includes the resolved instance path (as…
- `TextArrowType` (None, Slash, Dot, Closed, Open) — Arrow type for a SketchUp Text entity, mirroring the `Dimension::ARROW_*` constants.
- `TextLeaderType` (View, Model) — Leader type for a SketchUp Text entity, mirroring the `Text::ALeader*` constants.
- `Dimension`
- `DimensionLinear` — A linear dimension that measures and displays the distance between two points in 3D space.
- `DimensionRadial` — An annotation that measures the radius or diameter of a circle or arc.
- `DimensionPointRef` — Represents an attachment point for a linear dimension
- `DimensionArrowType` (None, Slash, Dot, Closed, Open) — The kind of arrow used in the rendering of the dimension
- `DimensionTextPosition` (OutsideStart, Centered, OutsideEnd) — The horizontal position of the dimension text
- `DimensionAlignedTextPosition` (Above, Center, Outside) — The vertical position of the dimension text
- `ConstructionLine` — A guide line used for alignment — either infinite or finite depending on how it was created.
- `ConstructionPoint` — A guide point in 3D space used for alignment and reference.
- `Snap` — A custom inference point that tools can snap to.
- `SectionPlane` — A clipping plane that cuts through the model to reveal interior geometry.
- `ImageEntity` — A flat image placed in 3D space, used for reference photos, decals, or texture previews.
- `ImageRep`

---

## 12. Materials & Textures

### Material
A surface appearance that can be applied to faces — color, texture, transparency, or PBR properties.
Properties: `readonly alpha: number`, `readonly ambientOcclusion: Readonly<AmbientOcclusionTextureInfo>`, `readonly attributes: Attributes`, `readonly color: Color`, `readonly colorizeDeltas: readonly [number, number, number]`, `readonly colorizeType: MaterialColorizeType`, `readonly displayName: string`, `readonly id: number`, `readonly materialType: MaterialType`, `readonly metallic: Readonly<MetallicTextureInfo>`, `readonly name: string`, `readonly normal: Readonly<NormalTextureInfo>`, `readonly ownerType: MaterialOwnerType`, `readonly roughness: Readonly<RoughnessTextureInfo>`, `readonly sketchupId: SketchupId`, `readonly texture: Texture | undefined`, `readonly type: EntityType.Material`, `readonly typeName: string`, `readonly useAlpha: boolean`, `readonly workflow: MaterialWorkflow`
- `async exportThumbnail(fileType: ImageFileType, options: { maxSize: number; }): Promise<string>`
- `async getSkm(): Promise<string>`
- `refresh(): Promise<Material>`

### Materials
The collection of all materials in the model.
Properties: `readonly values: readonly Material[]`
- `findMaterialById(id: number): Material | undefined`
- `findMaterialByName(name: string): Material | undefined`
- `refresh(): Promise<Materials>`

### Texture
The image data behind a textured material.
Properties: `readonly attributes: Attributes`, `readonly color: Color`, `readonly height: number`, `readonly id: number`, `readonly imageHeight: number`, `readonly imageWidth: number`, `readonly sketchupId: SketchupId`, `readonly type: EntityType.Texture`, `readonly typeName: string`, `readonly width: number`
- `async getImage(fileType: ImageFileType, options?: TextureExportOptions): Promise<string>`
- `refresh(): Promise<Texture>`

### TexturePositioning
`type TexturePositioning = | [Point3Like, Point3Like] | [Point3Like, Point3Like, Point3Like, Point3Like] | [Point3Like, Point3Like, Point3Like, Point3Like, Point3Like, Point3Like] | [ Point3Like, Point3Like, Point3Like, Point3Like, Point3Like, Point3Like, Point3Like, Point3Like, ];`

**Also available** (one line each; full details in the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)):

- `TextureExportOptions`
- `MaterialType` (Solid, Textured, Colorized) — Categorization of the type of material.
- `MaterialWorkflow` (Classic, PBR) — The workflow for a given .
- `MaterialOwnerType` (Manager, Image, Layer) — Identifies the owner of a given material.
- `MaterialTextureType` (Standard, AmbientOcclusion, Metallic, Normal, Roughness) — Categorization of a texture type, mostly use in mutation operations.
- `MaterialColorizeType` (Shift, Tint) — Defines how the is colored.
- `MaterialNormalStyle` (OpenGL, DirectX) — The rendering backend used when exporting texture images.
- `AmbientOcclusionTextureInfo`
- `MetallicTextureInfo`
- `NormalTextureInfo`
- `RoughnessTextureInfo`

---

## 13. Tags (Layers)

### Tag
A tag (formerly "layer") that controls the visibility of drawing elements in the model.
Properties: `readonly attributes: Attributes`, `readonly color: Color`, `readonly folderRef: TagFolderRef | undefined`, `readonly id: number`, `readonly name: string`, `readonly sketchupId: SketchupId`, `readonly type: EntityType.Tag`, `readonly typeName: string`, `readonly visible: boolean`
- `async getFolder(): Promise<TagFolder | undefined>`
- `refresh(): Promise<Tag>`

### TagFolder
A named group of tags that organizes them into collapsible sections in the Tags panel.
Properties: `readonly attributes: Attributes`, `readonly folderRef: TagFolderRef | undefined`, `readonly id: number`, `readonly name: string`, `readonly sketchupId: SketchupId`, `readonly tagFolders: readonly TagFolder[]`, `readonly tags: readonly Tag[]`, `readonly type: EntityType.TagFolder`, `readonly typeName: string`, `readonly visible: boolean`
- `findTag(name: string): Tag | undefined`
- `findTagFolder(name: string): TagFolder | undefined`
- `async getFolder(): Promise<TagFolder | undefined>`
- `refresh(): Promise<TagFolder>`

### TagManager
A snapshot of all tags and tag folders in the model.
Properties: `readonly attributes: Attributes`, `readonly tagFolders: readonly TagFolder[]`, `readonly tags: readonly Tag[]`, `readonly type: EntityType.TagManager`
- `findTag(name: string): Tag | undefined`
- `findTagFolder(name: string): TagFolder | undefined`
- `refresh(): Promise<TagManager>`

---

## 14. Scenes, Camera & View

- `CameraType`: parallel = 0, perspective = 1, perspective2d = 2, parallel2d = 3

### Scene
A saved camera position and view state — like a bookmark for a particular viewpoint in the model.
Properties: `readonly animation: Readonly<SketchupSceneAnimationInfo>`, `readonly attributes: Attributes`, `readonly axes: Axes | undefined`, `readonly camera: Camera`, `readonly description: string | undefined`, `readonly environmentId: number | undefined`, `readonly id: number`, `readonly label: string | undefined`, `readonly name: string | undefined`, `readonly properties: Readonly<SketchupSceneProperties>`, `readonly sketchupId: SketchupId`, `readonly style: StyleRef | undefined`, `readonly type: EntityType.Scene`, `readonly typeName: string`
- `async getActiveSectionPlanes(options?: EntityQuery<EntityFilter>): Promise<SectionPlane[]>`
- `getAxes(): Promise<Axes | undefined>`
- `getCamera(): Promise<Camera>`
- `async getRenderingOptions(): Promise<RenderingOptions | undefined>`
- `getShadowInfo(): Promise<ShadowInfo | undefined>`
- `refresh(): Promise<Scene>`

### Camera
A mutable camera you can position and configure, then apply to the current view.
Constructors: `new Camera(camera: CameraData | Camera)`
Properties: `readonly aspectRatio: number`, `readonly center_2d: Point2d`, `readonly computePerspectiveEye: Point3d`, `readonly data: CameraData`, `readonly description: string | undefined`, `readonly direction: Vector3d`, `readonly eye: Point3d`, `readonly fieldOfView: number`, `readonly focalLength: number`, `readonly height: number`, `readonly scale_2d: number`, `readonly target: Point3d`, `readonly type: CameraType`, `readonly up: Vector3d`, `readonly xAxis: Vector3d`, `readonly yAxis: Vector3d`, `readonly zAxis: Vector3d`
- `static default(): Camera`
- `build(): Readonly<CameraData>`
- `withDescription(description: string): Camera`
- `withFieldOfView(fov: number): Camera`  ← degrees (most other angles in the API are radians)
- `withFocalLength(focalLengthMM: number): Camera`
- `withHeight(heightInches: Numeric): Camera`
- `withImageWidth(imageWidth: number): Camera`
- `withOrbit(radians: number): Camera`
- `withOrientation(eye: Point3Like, target: Point3Like, up: Vector3Like): Camera`
- `withPerspective(perspective: boolean): Camera`
- `withTransform(transform: Transformation): Camera`
- `withVerticalOrbit(angle: number): Camera`

### View
Access to the SketchUp viewport — camera, screenshots, and view dimensions.
- `async getCamera(): Promise<Camera>`
- `async getScreenshot(fileType: ImageFileType, options: ScreenshotOptions = {}): Promise<string>`
- `async getViewInfo(): Promise<Readonly<ViewInfo>>`
- `observeCamera(callback: (camera: Camera) => void): ObserverHandle`
- `observeViewInfo(callback: (viewInfo: ViewInfo) => void): ObserverHandle`
- `setCamera(camera: CameraData | Camera, transitionTimeSeconds?: number): Promise<void>`

**Also available** (one line each; full details in the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)):

- `ShadowInfo` — A snapshot of SketchUp's shadow and sun settings.
- `ViewInfo` — Represents a snapshot of the Sketchup view
- `CameraData`
- `ParallelCameraData` — Represents a parallel camera
- `Parallel2dCameraData` — Represents a parallel camera with 2d enabled.
- `PerspectiveCameraData` — Represents a perspective camera
- `Perspective2dCameraData` — Represents a perspective camera with 2d enabled.

---

## 15. Styles & Rendering Options

**Also available** (one line each; full details in the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/)):

- `Style` — A saved collection of visual display settings — edge style, face colors, background, watermarks, and…
- `SelectedStyle` — The currently active style and whether it has unsaved changes.
- `ActiveStyleInfo` — Metadata about the currently active style in a SketchUp model.
- `RenderingOptions` — The visual display settings that control how a model looks in the SketchUp viewport.
- `RenderingOptionsChange` — A single rendering options change event — the full snapshot plus the keys that actually changed.
- `RenderingOptionsUpdate` — A partial update to rendering options. Pass any subset of `RenderingOptionsData` properties to…
- `RenderingOptionsColorUpdates` — A variant of `RenderingOptionsData` for update operations where color properties accept either a `Color`…
- `RenderMode` (Wireframe, Hidden, Flat, Smooth, NoMaterials, PhysicallyBased) — The shading style used to render faces in the viewport.
- `EdgeType` (Standard, Sketchy) — The line-drawing algorithm used to render edges.
- `EdgeColorMode` (Object, Foreground, Direction) — How edge colors are determined when rendering.
- `EdgeDisplayMode` (None, All, Standalone) — Which edges are drawn in the viewport.
- `TransparencySort` (Faster, Medium, Nicer) — The algorithm used to sort transparent faces when rendering.

---

## 16. Attributes

### Attributes
A collection of named attribute dictionaries attached to a model or entity.
Properties: `readonly dictionaries: readonly AttributeDictionary[]`
- `findDictionary(name: string): AttributeDictionary | undefined`
- `findValue<T extends AttributeValue>(dictOrPath: string | string[], key: string, options?: { default: NoInfer<T> }): T`
- `hasValue(dict: string | string[], key: string): boolean`

### AttributeDictionary
A named group of key-value pairs attached to a model or entity.
Properties: `readonly attributes: Attributes | undefined`, `readonly name: string`, `readonly values: Map<string, AttributeValue>`

### AttributeValue
Represents all the valid attribute types to store in/read from SketchUp
`type AttributeValue = | number | string | boolean | Length | Date | Point3d | Vector3d | Color | AttributeValue[] | undefined;`

---

## 17. Refs

Operation-scoped handles. `op.createFace()` and similar return them; pass them back into other `op.*` calls inside the same operation. Every `Ref` has `sketchupId`, `type` (an `EntityType`) and `typeName`.

`ArcCurveRef`, `ComponentDefinitionRef`, `ComponentInstanceRef`, `ConstructionLineRef`, `ConstructionPointRef`, `CurveRef`, `DimensionLinearRef`, `DimensionRadialRef`, `DimensionRef`, `EdgeRef`, `FaceRef`, `GroupRef`, `ImageEntityRef`, `MaterialRef`, `SceneRef`, `SectionPlaneRef`, `SnapRef`, `StyleRef`, `TagFolderRef`, `TagRef`, `TextRef`, `UnknownEntityRef`, `VertexRef`

---

## 18. Option & result types used in the signatures above

Structure only (these names aren't importable; pass plain objects).

- `type ActivePathEntity = Group | ComponentInstance;`
- `type ActivePathEntityRef = GroupRef | ComponentInstanceRef;`
- `type ArcCurveAndComponents = { readonly curve: ArcCurveRef; readonly edges: EdgeRef[]; } ;`
- `type CameraData = | ParallelCameraData | PerspectiveCameraData | Perspective2dCameraData | Parallel2dCameraData;`
- `type ClassificationSchema = { readonly name: string; readonly namespace: string; };`
- `type ComponentLoadOptions = { resource: Exclude<ResourceSource, ResourceSourceHtmlImageElement>; allowNewer?: boolean; addOperationError?: boolean; } ;`
- `type ConnectResponse = { readonly type: 'connect'; readonly requestId: number; readonly connectionId: number; readonly error?: string; readonly protocolVersion: BootstrapSemver; readonly communicationPreference: CommunicationType; readonly language: string; readonly platform: string; readonly sketchupVersion: string; readonly is_pro: string; readonly features: string[]; };`
- `type CurveAndComponents = { readonly curve: CurveRef; readonly edges: EdgeRef[]; } ;`
- `type EdgeUsageTypeName = keyof typeof EdgeUsageType;`
- `type EventHandler<T = unknown> = (eventName: string, event: T) => void;`
- `type FaceBulkRequest = readonly [Face | FaceRef, UVRequest][];`
- `type FaceBulkResponse = [Face | FaceRef, UVResponse][];`
- `type ImageFileType = 'png' | 'jpg' | 'jpeg' | 'gif' | 'bmp' | 'tif';`
- `type MaterialLoadOptions = { resource: ResourceSource; addOperationError?: boolean; } ;`
- `type ModalInputAction = 'ok' | 'cancel' | 'yes' | 'no';`
- `type ModalInputActions = ModalInputActionSettings | readonly ModalInputCustomAction[];`
- `type ModalInputCustomAction = { id: string; label: string; style?: 'primary' | 'secondary' | 'danger'; };`
- `type ModalInputResponse< Action extends string = ModalInputAction, InputStates = Record<string, string>, > = { action: Action; inputStates: InputStates; } ;`
- `type ModalInputSettings = { title?: string; message?: string; inputs?: DeclarativeUIInputs; actions?: ModalInputActions; } ;`
- `type Parallel2dCameraData = { type: CameraType.parallel2d; eye: Point3d; target: Point3d; up: Vector3d; description?: string; aspectRatio: number; fieldOfView: number; // value needed in order to swap from parallel to perspective correctly height: number; scale_2d: number; center_2d: Point2d; };`
- `type ParallelCameraData = { type: CameraType.parallel; eye: Point3d; target: Point3d; up: Vector3d; description?: string; aspectRatio: number; fieldOfView: number; // value needed in order to swap from parallel to perspective correctly height: number; };`
- `type Perspective2dCameraData = { type: CameraType.perspective2d; eye: Point3d; target: Point3d; up: Vector3d; description?: string; aspectRatio: number; fieldOfView: number; imageWidth: number; scale_2d: number; center_2d: Point2d; };`
- `type PerspectiveCameraData = { type: CameraType.perspective; eye: Point3d; target: Point3d; up: Vector3d; description?: string; aspectRatio: number; fieldOfView: number; imageWidth: number; };`
- `type RenderingOptionsColorUpdates = { BackgroundColor: Color | string; BandColor: Color | string; ConstructionColor: Color | string; FaceBackColor: Color | string; FaceFrontColor: Color | string; FogColor: Color | string; ForegroundColor: Color | string; GroundColor: Color | string; HighlightColor: Color | string; HorizonColor: Color | string; LockedColor: Color | string; SectionActiveColor: Color | string;…`
- `type RenderingOptionsUpdate = Partial< Omit<RenderingOptionsData, keyof RenderingOptionsColorUpdates> & RenderingOptionsColorUpdates >;`
- `type ResourceSource = | ResourceSourceBlob | ResourceSourceDataUrl | ResourceSourceFetch | ResourceSourceHtmlImageElement;`
- `type ResourceSourceBlob = { blob: Blob; } ;`
- `type ResourceSourceDataUrl = { dataUrl: string; } ;`
- `type ResourceSourceFetch = { request: RequestInfo | URL; init?: RequestInit; } ;`
- `type ResourceSourceHtmlImageElement = { htmlElement: HTMLImageElement; imageType?: string; imageQuality?: number; } ;`
- `type SetTextureFromImageRepOptions = { width: number; height: number; bitsPerPixel: 8 | 24 | 32; rowPadding: number; imageData: string; byteOrder?: 'rgb' | 'bgr'; textureType?: MaterialTextureType; } ;`
- `interface SketchupId = { type: SketchupIdType; value: number }` — an entity's identifier. Read it from `entity.sketchupId` and pass it to `findEntity`, `findEntities` or `getEntityBoundsById`. `SketchupIdType` is `EntityId = 0 | PersistentId = 1 | MappingId = 2`; a `MappingId` is only valid inside the operation that created it
- `type SketchupSceneAnimationInfo = { included: boolean; delayTime: number; transitionTime: number; } ;`
- `type SketchupSceneProperties = { use_axes: boolean; use_camera: boolean; use_environment: boolean; use_hidden_geometry: boolean; use_hidden_tags: boolean; use_hidden_objects: boolean; use_rendering_options: boolean; use_section_planes: boolean; use_shadow_info: boolean; } ;`
- `type SketchupTransform = [number × 16]` — a column-major 4×4 matrix, the form `transformation.toArray()` returns and `Transformation.fromArray()` takes
- `type TransformationIdentity = null` — means "no change"
- `type TransformationLike = Transformation | SketchupTransform | TransformationIdentity | number | Point3Like | Vector3Like` — a Transformation, a 16-number column-major array, `null` (no change), a number (uniform scale) or a point/vector (a translation, e.g. `[0, 0, 12]`)
- `type UVMap = { point: Point3d; uv: Point3d; };`
- `type UVRequest = { front?: Point3Like[]; back?: Point3Like[]; };`
- `type UVResponse = { front: UVMap[]; back: UVMap[]; };`
- `type UVTile = UVMap[];`
- `type UVTileResponse = { front: (UVTile | undefined)[]; back: (UVTile | undefined)[]; };`
- `type UnitOptionsUpdate = Partial<{ LengthPrecision: number; LengthFormat: number; LengthUnit: LengthUnit; LengthSnapEnabled: boolean; LengthSnapLength: number; AnglePrecision: number; AngleSnapEnabled: boolean; SnapAngle: number; SuppressUnitsDisplay: boolean; ForceInchDisplay: boolean; AreaUnit: AreaUnit; AreaPrecision: number; VolumeUnit: VolumeUnit; VolumePrecision: number; } >;`
- `type WritableAttributeValue = | AttributeValue |{ type: 'length'; data: number} ;`

---

## 19. Deliberately not listed

Connection internals, transport, platform/feature flags and load-error classes are left out because extension code rarely touches them: `BootstrapSemver`, `CallableEntities`, `CommunicationType`, `Communicator`, `CommunicatorOptions`, `CommunicatorSetup`, `ComponentLoadError`, `CRSLocationData`, `DisconnectResponse`, `EntityName`, `EntityTypeForFilter`, `Features`, `ImageLoadError`, `Logger`, `MaterialLoadError`, `ModalInputAction`, `ModalInputActions`, `ModalInputCustomAction`, `OptionsProvider`, `Platform`, `RenderingOptionsData`, `RenderingOptionsStreamData`, `SchemaLoadError`, `SketchupId`, `SketchupIdType`, `StyleLoadError`, `TenantOptions`, `Version`. Look them up in the [API Reference](https://developer.trimble.com/docs/sketchup/jsa/api/overview/) if you need one.


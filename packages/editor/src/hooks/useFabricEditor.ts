"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActiveSelection, Canvas, Circle, FabricImage, FabricObject, IText, Point, Rect, type TEvent, type TPointerEventInfo } from "fabric";
import { useEditorStore } from "../store/editorStore";
import type { ActiveObjectState, Alignment, CanvasSnapshot, EditorActions, FabricObjectWithId, LayerDirection } from "../types/editor";
import { deserializeCanvas, serializeCanvas, snapshotsEqual } from "../utils/history";
import { createObjectId, ensureObjectMetadata, toActiveObjectState, toLayerState } from "../utils/object";

const WORKSPACE_WIDTH = 1920;
const WORKSPACE_HEIGHT = 1080;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const SNAP_THRESHOLD = 6;
const GRID_SIZE = 10;

type ClipboardObject = FabricObject | ActiveSelection | null;
type TransformEvent = Partial<TEvent> & { target?: FabricObject };
type PointerEventInfo = TPointerEventInfo & { target?: FabricObject };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getObjectId(object: FabricObject): string | null {
  return (object as FabricObjectWithId).id ?? null;
}

function isEditingText(object: FabricObject | undefined): boolean {
  return object instanceof IText && object.isEditing === true;
}

function prepareInteractiveObject<T extends FabricObjectWithId>(object: T, name?: string): T {
  ensureObjectMetadata(object, name);
  const prepared = object as T & { __editorPrepared?: boolean };
  if (prepared.__editorPrepared) return object;
  object.set({
    borderColor: "#06b6d4",
    cornerColor: "#06b6d4",
    cornerStrokeColor: "#ffffff",
    cornerStyle: "circle",
    transparentCorners: false,
    borderScaleFactor: 1.5,
    padding: 2
  });
  object.setControlsVisibility({ mtr: true });
  prepared.__editorPrepared = true;
  return object;
}

export function useFabricEditor() {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const clipboardRef = useRef<ClipboardObject>(null);
  const isRestoringRef = useRef(false);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);

  const clearPendingHistory = useCallback(() => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
  }, []);

  const refreshLayers = useCallback(() => {
    const instance = canvasRef.current;
    if (!instance) return;
    const layers = instance.getObjects().map((object, index) => toLayerState(prepareInteractiveObject(object as FabricObjectWithId), index)).reverse();
    useEditorStore.getState().setLayers(layers);
  }, []);

  const refreshSelection = useCallback(() => {
    const instance = canvasRef.current;
    if (!instance) return;
    const active = instance.getActiveObject();
    if (!active) {
      useEditorStore.getState().setActiveObject(null);
      useEditorStore.getState().setSelectedIds([]);
      return;
    }

    if (active.type === "activeselection" && "getObjects" in active) {
      const objects = (active as ActiveSelection).getObjects() as FabricObjectWithId[];
      useEditorStore.getState().setSelectedIds(objects.map((object) => getObjectId(prepareInteractiveObject(object))).filter((id): id is string => Boolean(id)));
      useEditorStore.getState().setActiveObject(null);
      return;
    }

    const object = prepareInteractiveObject(active as FabricObjectWithId);
    useEditorStore.getState().setSelectedIds([object.id ?? ""]);
    useEditorStore.getState().setActiveObject(toActiveObjectState(object));
  }, []);

  const commitHistory = useCallback((force = false) => {
    const instance = canvasRef.current;
    if (!instance || isRestoringRef.current) return;

    const snapshot = serializeCanvas(instance);
    const history = useEditorStore.getState().history;
    const current = history[history.length - 1] ?? null;
    if (!force && snapshotsEqual(current, snapshot)) return;
    useEditorStore.getState().pushHistory(snapshot);
  }, []);

  const scheduleHistory = useCallback(() => {
    if (isRestoringRef.current) return;
    clearPendingHistory();
    historyTimerRef.current = setTimeout(() => {
      historyTimerRef.current = null;
      commitHistory();
    }, 250);
  }, [clearPendingHistory, commitHistory]);

  const resizeCanvas = useCallback(() => {
    const instance = canvasRef.current;
    const viewport = viewportRef.current;
    if (!instance || !viewport) return;
    instance.setDimensions({ width: viewport.clientWidth, height: viewport.clientHeight });
    instance.requestRenderAll();
  }, []);

  const zoomTo = useCallback((zoom: number, point?: Point) => {
    const instance = canvasRef.current;
    if (!instance) return;
    const nextZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    const center = point ?? new Point(instance.getWidth() / 2, instance.getHeight() / 2);
    instance.zoomToPoint(center, nextZoom);
    useEditorStore.getState().setZoom(nextZoom);
    instance.requestRenderAll();
  }, []);

  const centerWorkspace = useCallback(() => {
    const instance = canvasRef.current;
    const viewport = viewportRef.current;
    if (!instance || !viewport) return;
    const zoom = Math.min(viewport.clientWidth / WORKSPACE_WIDTH, viewport.clientHeight / WORKSPACE_HEIGHT) * 0.82;
    const nextZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    const panX = (viewport.clientWidth - WORKSPACE_WIDTH * nextZoom) / 2;
    const panY = (viewport.clientHeight - WORKSPACE_HEIGHT * nextZoom) / 2;
    instance.setViewportTransform([nextZoom, 0, 0, nextZoom, panX, panY]);
    useEditorStore.getState().setZoom(nextZoom);
    instance.requestRenderAll();
  }, []);

  const addObject = useCallback((object: FabricObjectWithId) => {
    const instance = canvasRef.current;
    if (!instance) return;
    prepareInteractiveObject(object);
    instance.add(object);
    instance.setActiveObject(object);
    refreshLayers();
    refreshSelection();
    commitHistory(true);
    instance.requestRenderAll();
  }, [commitHistory, refreshLayers, refreshSelection]);

  const removeSelection = useCallback(() => {
    const instance = canvasRef.current;
    if (!instance) return;
    const selected = instance.getActiveObjects();
    if (selected.length === 0) return;
    selected.forEach((object) => instance.remove(object));
    instance.discardActiveObject();
    refreshLayers();
    refreshSelection();
    commitHistory(true);
    instance.requestRenderAll();
  }, [commitHistory, refreshLayers, refreshSelection]);

  const loadSnapshot = useCallback(async (snapshot: CanvasSnapshot) => {
    const instance = canvasRef.current;
    if (!instance) return;
    clearPendingHistory();
    isRestoringRef.current = true;
    instance.discardActiveObject();
    try {
      await deserializeCanvas(instance, snapshot);
      instance.getObjects().forEach((object) => prepareInteractiveObject(object as FabricObjectWithId));
    } finally {
      isRestoringRef.current = false;
    }
    refreshLayers();
    refreshSelection();
    useEditorStore.getState().setZoom(instance.getZoom());
  }, [clearPendingHistory, refreshLayers, refreshSelection]);

  const updateActiveObject = useCallback((patch: Partial<ActiveObjectState>) => {
    const instance = canvasRef.current;
    const object = instance?.getActiveObject() as FabricObjectWithId | undefined;
    if (!instance || !object || object.type === "activeselection") return;

    const next: Record<string, unknown> = {};
    if (patch.left !== undefined) next.left = patch.left;
    if (patch.top !== undefined) next.top = patch.top;
    if (patch.angle !== undefined) next.angle = patch.angle;
    if (patch.opacity !== undefined) next.opacity = clamp(patch.opacity, 0, 1);
    if (patch.fill !== undefined) next.fill = patch.fill;
    if (patch.stroke !== undefined) next.stroke = patch.stroke;
    if (patch.fontFamily !== undefined) next.fontFamily = patch.fontFamily;
    if (patch.fontSize !== undefined) next.fontSize = patch.fontSize;
    if (patch.text !== undefined) next.text = patch.text;

    object.set(next);
    if (patch.width !== undefined && object.width) object.scaleX = patch.width / object.width;
    if (patch.height !== undefined && object.height) object.scaleY = patch.height / object.height;
    object.setCoords();
    refreshSelection();
    scheduleHistory();
    instance.requestRenderAll();
  }, [refreshSelection, scheduleHistory]);

  const align = useCallback((alignment: Alignment) => {
    const instance = canvasRef.current;
    const object = instance?.getActiveObject();
    if (!instance || !object) return;
    const bounds = object.getBoundingRect();
    const workspace = { left: 0, top: 0, width: WORKSPACE_WIDTH, height: WORKSPACE_HEIGHT };
    const patch: Record<string, number> = {};
    if (alignment === "left") patch.left = workspace.left;
    if (alignment === "center") patch.left = workspace.left + workspace.width / 2 - bounds.width / 2;
    if (alignment === "right") patch.left = workspace.left + workspace.width - bounds.width;
    if (alignment === "top") patch.top = workspace.top;
    if (alignment === "middle") patch.top = workspace.top + workspace.height / 2 - bounds.height / 2;
    if (alignment === "bottom") patch.top = workspace.top + workspace.height - bounds.height;
    object.set(patch);
    object.setCoords();
    refreshSelection();
    commitHistory(true);
    instance.requestRenderAll();
  }, [commitHistory, refreshSelection]);

  const orderLayer = useCallback((direction: LayerDirection) => {
    const instance = canvasRef.current;
    const object = instance?.getActiveObject();
    if (!instance || !object) return;
    if (direction === "front") instance.bringObjectToFront(object);
    if (direction === "forward") instance.bringObjectForward(object);
    if (direction === "backward") instance.sendObjectBackwards(object);
    if (direction === "back") instance.sendObjectToBack(object);
    refreshLayers();
    commitHistory(true);
    instance.requestRenderAll();
  }, [commitHistory, refreshLayers]);

  const copy = useCallback(async () => {
    const object = canvasRef.current?.getActiveObject();
    clipboardRef.current = object ? await object.clone() as ClipboardObject : null;
  }, []);

  const paste = useCallback(async () => {
    const instance = canvasRef.current;
    const clipboard = clipboardRef.current;
    if (!instance || !clipboard) return;
    const cloned = await clipboard.clone() as FabricObject | ActiveSelection;
    instance.discardActiveObject();
    const pastedObjects: FabricObject[] = [];
    if (cloned instanceof ActiveSelection) {
      cloned.canvas = instance;
      cloned.getObjects().forEach((object) => {
        const item = prepareInteractiveObject(object as FabricObjectWithId);
        item.id = createObjectId(item.type ?? "object");
        item.set({ left: (item.left ?? 0) + 24, top: (item.top ?? 0) + 24 });
        item.setCoords();
        instance.add(item);
        pastedObjects.push(item);
      });
      if (pastedObjects.length > 1) {
        const selection = new ActiveSelection(pastedObjects, { canvas: instance });
        instance.setActiveObject(selection);
      } else if (pastedObjects[0]) {
        instance.setActiveObject(pastedObjects[0]);
      }
    } else {
      const item = prepareInteractiveObject(cloned as FabricObjectWithId);
      item.id = createObjectId(item.type ?? "object");
      item.set({ left: (item.left ?? 0) + 24, top: (item.top ?? 0) + 24 });
      item.setCoords();
      instance.add(item);
      instance.setActiveObject(item);
    }
    refreshLayers();
    refreshSelection();
    commitHistory(true);
    instance.requestRenderAll();
  }, [commitHistory, refreshLayers, refreshSelection]);

  const duplicate = useCallback(async () => {
    await copy();
    await paste();
  }, [copy, paste]);

  const exportPng = useCallback(() => {
    const instance = canvasRef.current;
    if (!instance) return;
    const dataUrl = instance.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `canva-ai-design-${Date.now()}.png`;
    link.click();
  }, []);

  const actions = useMemo<EditorActions>(() => ({
    addText: () => addObject(prepareInteractiveObject(new IText("Double-click to edit", {
      left: 160,
      top: 160,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: 64,
      fill: "#0f172a",
      padding: 8
    }) as FabricObjectWithId, "Text")),
    addRectangle: () => addObject(prepareInteractiveObject(new Rect({ left: 220, top: 220, width: 320, height: 180, fill: "#38bdf8", rx: 24, ry: 24 }) as FabricObjectWithId, "Rectangle")),
    addCircle: () => addObject(prepareInteractiveObject(new Circle({ left: 280, top: 260, radius: 110, fill: "#a78bfa" }) as FabricObjectWithId, "Circle")),
    uploadImage: async (file: File) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const image = await FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
      image.scaleToWidth(480);
      image.set({ left: 240, top: 180 });
      addObject(prepareInteractiveObject(image as FabricObjectWithId, file.name));
    },
    updateActiveObject,
    align,
    orderLayer,
    undo: async () => {
      const entry = useEditorStore.getState().popUndo();
      if (entry) await loadSnapshot(entry.previous);
    },
    redo: async () => {
      const snapshot = useEditorStore.getState().popRedo();
      if (snapshot) await loadSnapshot(snapshot);
    },
    copy,
    paste,
    duplicate,
    removeSelection: () => {
      if (isEditingText(canvasRef.current?.getActiveObject())) return;
      removeSelection();
    },
    selectById: (id: string) => {
      const instance = canvasRef.current;
      if (!instance) return;
      const object = instance.getObjects().find((candidate) => getObjectId(candidate) === id);
      if (!object) return;
      instance.setActiveObject(object);
      refreshSelection();
      instance.requestRenderAll();
    },
    zoomIn: () => zoomTo((canvasRef.current?.getZoom() ?? 1) * 1.12),
    zoomOut: () => zoomTo((canvasRef.current?.getZoom() ?? 1) / 1.12),
    resetZoom: centerWorkspace,
    exportPng,
    serialize: () => canvasRef.current ? serializeCanvas(canvasRef.current) : null,
    deserialize: loadSnapshot
  }), [addObject, align, centerWorkspace, copy, duplicate, exportPng, loadSnapshot, orderLayer, paste, refreshSelection, removeSelection, updateActiveObject, zoomTo]);

  useEffect(() => {
    const element = canvasElementRef.current;
    const viewport = viewportRef.current;
    if (!element || !viewport || canvasRef.current) return;

    const instance = new Canvas(element, {
      width: viewport.clientWidth,
      height: viewport.clientHeight,
      backgroundColor: "#f8fafc",
      preserveObjectStacking: true,
      selection: true,
      controlsAboveOverlay: true,
      fireRightClick: true,
      stopContextMenu: true,
      uniformScaling: false,
      centeredScaling: false,
      centeredRotation: false,
      selectionFullyContained: false,
      targetFindTolerance: 8,
      perPixelTargetFind: false,
      enableRetinaScaling: true
    });

    canvasRef.current = instance;
    useEditorStore.setState({ activeObject: null, selectedIds: [], layers: [], history: [], redoStack: [], canUndo: false, canRedo: false });
    setCanvas(instance);
    centerWorkspace();
    commitHistory(true);

    const onSelection = () => refreshSelection();
    const onObjectChanged = () => {
      if (isRestoringRef.current) return;
      refreshSelection();
      refreshLayers();
      scheduleHistory();
    };
    const onObjectAddedRemoved = (event?: TransformEvent) => {
      if (event?.target) prepareInteractiveObject(event.target as FabricObjectWithId);
      refreshLayers();
      refreshSelection();
      if (!isRestoringRef.current) scheduleHistory();
    };
    const onTransforming = () => {
      refreshSelection();
      refreshLayers();
    };
    const onMoving = (event: TransformEvent) => {
      const target = event.target;
      if (!target) return;
      const left = target.left ?? 0;
      const top = target.top ?? 0;
      const leftRemainder = Math.abs(left % GRID_SIZE);
      const topRemainder = Math.abs(top % GRID_SIZE);
      const snappedLeft = leftRemainder <= SNAP_THRESHOLD || GRID_SIZE - leftRemainder <= SNAP_THRESHOLD ? Math.round(left / GRID_SIZE) * GRID_SIZE : left;
      const snappedTop = topRemainder <= SNAP_THRESHOLD || GRID_SIZE - topRemainder <= SNAP_THRESHOLD ? Math.round(top / GRID_SIZE) * GRID_SIZE : top;
      target.set({ left: snappedLeft, top: snappedTop });
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const delta = event.deltaY < 0 ? 1.08 : 0.92;
        zoomTo(instance.getZoom() * delta, new Point(event.offsetX, event.offsetY));
        return;
      }
      const transform = instance.viewportTransform;
      if (!transform) return;
      transform[4] -= event.deltaX;
      transform[5] -= event.deltaY;
      instance.setViewportTransform(transform);
      instance.requestRenderAll();
    };
    const onMouseDown = (event: { e: Event }) => {
      const native = event.e;
      if (!(native instanceof MouseEvent || native instanceof PointerEvent)) return;
      if (native.altKey || native.button === 1) {
        isPanningRef.current = true;
        lastPanPointRef.current = { x: native.clientX, y: native.clientY };
        instance.selection = false;
        useEditorStore.getState().setDragging(true);
      }
    };
    const onMouseMove = (event: { e: Event }) => {
      if (!isPanningRef.current || !lastPanPointRef.current) return;
      const native = event.e;
      if (!(native instanceof MouseEvent || native instanceof PointerEvent)) return;
      const transform = instance.viewportTransform;
      if (!transform) return;
      transform[4] += native.clientX - lastPanPointRef.current.x;
      transform[5] += native.clientY - lastPanPointRef.current.y;
      instance.setViewportTransform(transform);
      lastPanPointRef.current = { x: native.clientX, y: native.clientY };
    };
    const onMouseUp = () => {
      isPanningRef.current = false;
      lastPanPointRef.current = null;
      instance.selection = true;
      useEditorStore.getState().setDragging(false);
    };

    instance.on("selection:created", onSelection);
    instance.on("selection:updated", onSelection);
    instance.on("selection:cleared", onSelection);
    const onMouseWheel = (event: PointerEventInfo) => onWheel(event.e as WheelEvent);

    instance.on("object:modified", onObjectChanged);
    instance.on("object:added", onObjectAddedRemoved);
    instance.on("object:removed", onObjectAddedRemoved);
    instance.on("object:moving", onMoving);
    instance.on("object:moving", onTransforming);
    instance.on("object:scaling", onTransforming);
    instance.on("object:rotating", onTransforming);
    instance.on("object:skewing", onTransforming);
    instance.on("mouse:wheel", onMouseWheel);
    instance.on("mouse:down", onMouseDown);
    instance.on("mouse:move", onMouseMove);
    instance.on("mouse:up", onMouseUp);

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(viewport);

    return () => {
      observer.disconnect();
      instance.off("selection:created", onSelection);
      instance.off("selection:updated", onSelection);
      instance.off("selection:cleared", onSelection);
      instance.off("object:modified", onObjectChanged);
      instance.off("object:added", onObjectAddedRemoved);
      instance.off("object:removed", onObjectAddedRemoved);
      instance.off("object:moving", onMoving);
      instance.off("object:moving", onTransforming);
      instance.off("object:scaling", onTransforming);
      instance.off("object:rotating", onTransforming);
      instance.off("object:skewing", onTransforming);
      instance.off("mouse:wheel", onMouseWheel);
      instance.off("mouse:down", onMouseDown);
      instance.off("mouse:move", onMouseMove);
      instance.off("mouse:up", onMouseUp);
      clearPendingHistory();
      canvasRef.current = null;
      setCanvas(null);
      void instance.dispose();
    };
  }, [centerWorkspace, clearPendingHistory, commitHistory, refreshLayers, refreshSelection, resizeCanvas, scheduleHistory, zoomTo]);

  useEffect(() => {
    const onDragOver = (event: DragEvent) => event.preventDefault();
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (file?.type.startsWith("image/")) void actions.uploadImage(file);
    };
    const viewport = viewportRef.current;
    viewport?.addEventListener("dragover", onDragOver);
    viewport?.addEventListener("drop", onDrop);
    return () => {
      viewport?.removeEventListener("dragover", onDragOver);
      viewport?.removeEventListener("drop", onDrop);
    };
  }, [actions]);

  return { canvasElementRef, viewportRef, canvas, actions };
}

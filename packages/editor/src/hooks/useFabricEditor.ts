"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActiveSelection, Canvas, Circle, FabricImage, IText, Point, Rect, type FabricObject, type TEvent } from "fabric";
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
type TransformEvent = TEvent & { target?: FabricObject };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

  const refreshLayers = useCallback(() => {
    const instance = canvasRef.current;
    if (!instance) return;
    const layers = instance.getObjects().map((object, index) => toLayerState(ensureObjectMetadata(object as FabricObjectWithId), index)).reverse();
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
      useEditorStore.getState().setSelectedIds(objects.map((object) => ensureObjectMetadata(object).id ?? ""));
      useEditorStore.getState().setActiveObject(null);
      return;
    }

    const object = ensureObjectMetadata(active as FabricObjectWithId);
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
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => commitHistory(), 250);
  }, [commitHistory]);

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
    ensureObjectMetadata(object);
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
    isRestoringRef.current = true;
    instance.discardActiveObject();
    await deserializeCanvas(instance, snapshot);
    instance.getObjects().forEach((object) => ensureObjectMetadata(object as FabricObjectWithId));
    isRestoringRef.current = false;
    refreshLayers();
    refreshSelection();
    useEditorStore.getState().setZoom(instance.getZoom());
  }, [refreshLayers, refreshSelection]);

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
    if (cloned instanceof ActiveSelection) {
      cloned.canvas = instance;
      cloned.getObjects().forEach((object) => {
        const item = ensureObjectMetadata(object as FabricObjectWithId);
        item.id = createObjectId(item.type ?? "object");
        item.set({ left: (item.left ?? 0) + 24, top: (item.top ?? 0) + 24 });
        instance.add(item);
      });
      cloned.setCoords();
    } else {
      const item = ensureObjectMetadata(cloned as FabricObjectWithId);
      item.id = createObjectId(item.type ?? "object");
      item.set({ left: (item.left ?? 0) + 24, top: (item.top ?? 0) + 24 });
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
    addText: () => addObject(new IText("Double-click to edit", {
      left: 160,
      top: 160,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: 64,
      fill: "#0f172a",
      padding: 8
    }) as FabricObjectWithId),
    addRectangle: () => addObject(new Rect({ left: 220, top: 220, width: 320, height: 180, fill: "#38bdf8", rx: 24, ry: 24 }) as FabricObjectWithId),
    addCircle: () => addObject(new Circle({ left: 280, top: 260, radius: 110, fill: "#a78bfa" }) as FabricObjectWithId),
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
      addObject(image as FabricObjectWithId);
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
    removeSelection,
    zoomIn: () => zoomTo((canvasRef.current?.getZoom() ?? 1) * 1.12),
    zoomOut: () => zoomTo((canvasRef.current?.getZoom() ?? 1) / 1.12),
    resetZoom: centerWorkspace,
    exportPng,
    serialize: () => canvasRef.current ? serializeCanvas(canvasRef.current) : null,
    deserialize: loadSnapshot
  }), [addObject, align, centerWorkspace, copy, duplicate, exportPng, loadSnapshot, orderLayer, paste, removeSelection, updateActiveObject, zoomTo]);

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
      stopContextMenu: true
    });

    canvasRef.current = instance;
    setCanvas(instance);
    centerWorkspace();
    commitHistory(true);

    const onSelection = () => refreshSelection();
    const onObjectChanged = () => {
      refreshSelection();
      refreshLayers();
      scheduleHistory();
    };
    const onObjectAddedRemoved = () => {
      refreshLayers();
      refreshSelection();
      scheduleHistory();
    };
    const onMoving = (event: TransformEvent) => {
      const target = event.target;
      if (!target) return;
      const left = target.left ?? 0;
      const top = target.top ?? 0;
      const snappedLeft = Math.abs(left % GRID_SIZE) <= SNAP_THRESHOLD ? Math.round(left / GRID_SIZE) * GRID_SIZE : left;
      const snappedTop = Math.abs(top % GRID_SIZE) <= SNAP_THRESHOLD ? Math.round(top / GRID_SIZE) * GRID_SIZE : top;
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
    instance.on("object:modified", onObjectChanged);
    instance.on("object:added", onObjectAddedRemoved);
    instance.on("object:removed", onObjectAddedRemoved);
    instance.on("object:moving", onMoving);
    instance.on("mouse:wheel", (event) => onWheel(event.e as WheelEvent));
    instance.on("mouse:down", onMouseDown);
    instance.on("mouse:move", onMouseMove);
    instance.on("mouse:up", onMouseUp);

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(viewport);

    return () => {
      observer.disconnect();
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
      instance.dispose();
      canvasRef.current = null;
    };
  }, [centerWorkspace, commitHistory, refreshLayers, refreshSelection, resizeCanvas, scheduleHistory, zoomTo]);

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

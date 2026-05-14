import type { Canvas, FabricObject } from "fabric";

export type EditorTool = "templates" | "text" | "shapes" | "uploads";
export type LayerDirection = "front" | "forward" | "backward" | "back";
export type Alignment = "left" | "center" | "right" | "top" | "middle" | "bottom";

export interface CanvasSnapshot {
  version: string;
  objects: unknown[];
  background?: string;
  viewportTransform?: number[];
  zoom?: number;
}

export interface ActiveObjectState {
  id: string;
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  fill?: string;
  stroke?: string;
  fontFamily?: string;
  fontSize?: number;
  text?: string;
}

export interface LayerState {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface EditorActions {
  addText: () => void;
  addRectangle: () => void;
  addCircle: () => void;
  uploadImage: (file: File) => Promise<void>;
  updateActiveObject: (patch: Partial<ActiveObjectState>) => void;
  align: (alignment: Alignment) => void;
  orderLayer: (direction: LayerDirection) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  copy: () => Promise<void>;
  paste: () => Promise<void>;
  duplicate: () => Promise<void>;
  removeSelection: () => void;
  selectById: (id: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  exportPng: () => void;
  serialize: () => CanvasSnapshot | null;
  deserialize: (snapshot: CanvasSnapshot) => Promise<void>;
}

export interface EditorContextValue {
  canvas: Canvas | null;
  actions: EditorActions;
}

export type FabricObjectWithId = FabricObject & { id?: string; name?: string };

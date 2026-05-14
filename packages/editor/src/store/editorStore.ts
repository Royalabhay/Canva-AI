import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { ActiveObjectState, CanvasSnapshot, EditorTool, LayerState } from "../types/editor";

interface EditorStoreState {
  activeTool: EditorTool;
  activeObject: ActiveObjectState | null;
  selectedIds: string[];
  layers: LayerState[];
  history: CanvasSnapshot[];
  redoStack: CanvasSnapshot[];
  zoom: number;
  isDragging: boolean;
  canUndo: boolean;
  canRedo: boolean;
  setActiveTool: (tool: EditorTool) => void;
  setActiveObject: (object: ActiveObjectState | null) => void;
  setSelectedIds: (ids: string[]) => void;
  setLayers: (layers: LayerState[]) => void;
  pushHistory: (snapshot: CanvasSnapshot) => void;
  replaceHistoryTop: (snapshot: CanvasSnapshot) => void;
  popUndo: () => { current: CanvasSnapshot; previous: CanvasSnapshot } | null;
  popRedo: () => CanvasSnapshot | null;
  setZoom: (zoom: number) => void;
  setDragging: (isDragging: boolean) => void;
}

const MAX_HISTORY = 100;

function deriveHistoryFlags(history: CanvasSnapshot[], redoStack: CanvasSnapshot[]) {
  return { canUndo: history.length > 1, canRedo: redoStack.length > 0 };
}

export const useEditorStore = create<EditorStoreState>()(
  subscribeWithSelector((set, get) => ({
    activeTool: "templates",
    activeObject: null,
    selectedIds: [],
    layers: [],
    history: [],
    redoStack: [],
    zoom: 1,
    isDragging: false,
    canUndo: false,
    canRedo: false,
    setActiveTool: (activeTool) => set({ activeTool }),
    setActiveObject: (activeObject) => set({ activeObject }),
    setSelectedIds: (selectedIds) => set({ selectedIds }),
    setLayers: (layers) => set({ layers }),
    pushHistory: (snapshot) => set((state) => {
      const history = [...state.history, snapshot].slice(-MAX_HISTORY);
      return { history, redoStack: [], ...deriveHistoryFlags(history, []) };
    }),
    replaceHistoryTop: (snapshot) => set((state) => {
      const history = state.history.length === 0 ? [snapshot] : [...state.history.slice(0, -1), snapshot];
      return { history, ...deriveHistoryFlags(history, state.redoStack) };
    }),
    popUndo: () => {
      const { history, redoStack } = get();
      if (history.length < 2) return null;
      const current = history[history.length - 1];
      const previous = history[history.length - 2];
      const nextHistory = history.slice(0, -1);
      const nextRedo = [current, ...redoStack];
      set({ history: nextHistory, redoStack: nextRedo, ...deriveHistoryFlags(nextHistory, nextRedo) });
      return { current, previous };
    },
    popRedo: () => {
      const { redoStack, history } = get();
      const snapshot = redoStack[0];
      if (!snapshot) return null;
      const nextRedo = redoStack.slice(1);
      const nextHistory = [...history, snapshot].slice(-MAX_HISTORY);
      set({ history: nextHistory, redoStack: nextRedo, ...deriveHistoryFlags(nextHistory, nextRedo) });
      return snapshot;
    },
    setZoom: (zoom) => set({ zoom }),
    setDragging: (isDragging) => set({ isDragging })
  }))
);

export const editorSelectors = {
  activeTool: (state: EditorStoreState) => state.activeTool,
  activeObject: (state: EditorStoreState) => state.activeObject,
  selectedIds: (state: EditorStoreState) => state.selectedIds,
  layers: (state: EditorStoreState) => state.layers,
  zoom: (state: EditorStoreState) => state.zoom,
  canUndo: (state: EditorStoreState) => state.canUndo,
  canRedo: (state: EditorStoreState) => state.canRedo
};

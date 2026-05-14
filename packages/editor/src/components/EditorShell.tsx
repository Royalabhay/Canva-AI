"use client";

import { createContext, useContext, type ReactNode } from "react";
import { editorSelectors, useEditorStore } from "../store/editorStore";
import type { EditorContextValue, EditorTool } from "../types/editor";
import { useFabricEditor } from "../hooks/useFabricEditor";
import { useEditorKeyboard } from "../hooks/useEditorKeyboard";
import { useEditorAutosave, type AutosaveConfig } from "../hooks/useEditorAutosave";

const EditorContext = createContext<EditorContextValue | null>(null);

function useEditorContext(): EditorContextValue {
  const value = useContext(EditorContext);
  if (!value) throw new Error("Editor components must be rendered inside EditorShell");
  return value;
}

const toolConfig: Array<{ id: EditorTool; label: string; description: string }> = [
  { id: "templates", label: "Templates", description: "Reusable brand layouts" },
  { id: "text", label: "Text", description: "Headings and body copy" },
  { id: "shapes", label: "Shapes", description: "Vectors and primitives" },
  { id: "uploads", label: "Uploads", description: "Images from your device" }
];

function ShellSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 p-4">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function LeftSidebar() {
  const { actions } = useEditorContext();
  const activeTool = useEditorStore(editorSelectors.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <p className="text-sm font-semibold text-cyan-600">Canva AI</p>
        <h1 className="text-xl font-bold text-slate-950">Editor Engine</h1>
      </div>
      <ShellSection title="Library">
        <div className="grid gap-2">
          {toolConfig.map((tool) => (
            <button
              className={`rounded-xl border p-3 text-left transition ${activeTool === tool.id ? "border-cyan-400 bg-cyan-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              type="button"
            >
              <span className="block font-semibold text-slate-900">{tool.label}</span>
              <span className="text-xs text-slate-500">{tool.description}</span>
            </button>
          ))}
        </div>
      </ShellSection>
      <ShellSection title="Create">
        <div className="grid gap-2">
          <button className="rounded-xl bg-slate-950 px-4 py-3 text-left font-semibold text-white hover:bg-slate-800" onClick={actions.addText} type="button">Add text</button>
          <button className="rounded-xl border border-slate-200 px-4 py-3 text-left font-semibold hover:bg-slate-50" onClick={actions.addRectangle} type="button">Add rectangle</button>
          <button className="rounded-xl border border-slate-200 px-4 py-3 text-left font-semibold hover:bg-slate-50" onClick={actions.addCircle} type="button">Add circle</button>
          <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50">
            Upload image
            <input
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void actions.uploadImage(file);
                event.target.value = "";
              }}
              type="file"
            />
          </label>
        </div>
      </ShellSection>
      <ShellSection title="Layers">
        <LayerList />
      </ShellSection>
    </aside>
  );
}

function LayerList() {
  const layers = useEditorStore(editorSelectors.layers);
  const selectedIds = useEditorStore(editorSelectors.selectedIds);

  if (layers.length === 0) return <p className="text-sm text-slate-500">Add objects to start building layers.</p>;

  return (
    <div className="grid max-h-72 gap-2 overflow-auto pr-1">
      {layers.map((layer) => (
        <div className={`rounded-lg border px-3 py-2 text-sm ${selectedIds.includes(layer.id) ? "border-cyan-400 bg-cyan-50" : "border-slate-200"}`} key={layer.id}>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-slate-800">{layer.name}</span>
            <span className="text-[10px] uppercase text-slate-400">{layer.type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopToolbar({ autosaveStatus }: { autosaveStatus: string }) {
  const { actions } = useEditorContext();
  const zoom = useEditorStore(editorSelectors.zoom);
  const canUndo = useEditorStore(editorSelectors.canUndo);
  const canRedo = useEditorStore(editorSelectors.canRedo);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-2">
        <ToolbarButton disabled={!canUndo} onClick={() => void actions.undo()}>Undo</ToolbarButton>
        <ToolbarButton disabled={!canRedo} onClick={() => void actions.redo()}>Redo</ToolbarButton>
        <div className="mx-2 h-8 w-px bg-slate-200" />
        <ToolbarButton onClick={() => actions.align("left")}>Left</ToolbarButton>
        <ToolbarButton onClick={() => actions.align("center")}>Center</ToolbarButton>
        <ToolbarButton onClick={() => actions.align("middle")}>Middle</ToolbarButton>
        <ToolbarButton onClick={() => actions.orderLayer("backward")}>Back</ToolbarButton>
        <ToolbarButton onClick={() => actions.orderLayer("forward")}>Forward</ToolbarButton>
      </div>
      <div className="flex items-center gap-2">
        <ToolbarButton onClick={actions.zoomOut}>−</ToolbarButton>
        <button className="min-w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold" onClick={actions.resetZoom} type="button">{Math.round(zoom * 100)}%</button>
        <ToolbarButton onClick={actions.zoomIn}>+</ToolbarButton>
        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">{autosaveStatus}</span>
        <ToolbarButton onClick={actions.exportPng}>Export</ToolbarButton>
      </div>
    </header>
  );
}

function ToolbarButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function CanvasStage() {
  const { canvasElementRef, viewportRef } = useCanvasRefs();
  const isDragging = useEditorStore((state) => state.isDragging);

  return (
    <main className="relative flex-1 overflow-hidden bg-slate-100">
      <div className="absolute left-4 top-4 z-10 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-sm backdrop-blur">
        Scroll to pan · Ctrl/⌘ + scroll to zoom · Alt-drag to pan · Drag files to upload
      </div>
      <div ref={viewportRef} className={`h-full w-full ${isDragging ? "cursor-grabbing" : "cursor-default"}`}>
        <canvas ref={canvasElementRef} />
      </div>
    </main>
  );
}

function useCanvasRefs() {
  const context = useContext(CanvasRefsContext);
  if (!context) throw new Error("Canvas refs missing");
  return context;
}

const CanvasRefsContext = createContext<Pick<ReturnType<typeof useFabricEditor>, "canvasElementRef" | "viewportRef"> | null>(null);

function RightPropertiesPanel() {
  const { actions } = useEditorContext();
  const activeObject = useEditorStore(editorSelectors.activeObject);
  const selectedIds = useEditorStore(editorSelectors.selectedIds);

  return (
    <aside className="h-full w-80 shrink-0 overflow-auto border-l border-slate-200 bg-white">
      <ShellSection title="Selection">
        {selectedIds.length === 0 ? (
          <p className="text-sm text-slate-500">Select an object to edit its properties.</p>
        ) : activeObject ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">{activeObject.type}</p>
            <p className="truncate text-xs text-slate-500">{activeObject.id}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{selectedIds.length} objects selected. Use toolbar alignment and layer ordering.</p>
        )}
      </ShellSection>
      {activeObject ? (
        <>
          <ShellSection title="Position">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="X" value={activeObject.left} onChange={(left) => actions.updateActiveObject({ left })} />
              <NumberField label="Y" value={activeObject.top} onChange={(top) => actions.updateActiveObject({ top })} />
              <NumberField label="W" value={activeObject.width} onChange={(width) => actions.updateActiveObject({ width })} />
              <NumberField label="H" value={activeObject.height} onChange={(height) => actions.updateActiveObject({ height })} />
              <NumberField label="Rotate" value={activeObject.angle} onChange={(angle) => actions.updateActiveObject({ angle })} />
              <NumberField label="Opacity" max={1} min={0} step={0.05} value={activeObject.opacity} onChange={(opacity) => actions.updateActiveObject({ opacity })} />
            </div>
          </ShellSection>
          <ShellSection title="Colors">
            <div className="grid gap-3">
              <ColorField label="Fill" value={activeObject.fill ?? "#0f172a"} onChange={(fill) => actions.updateActiveObject({ fill })} />
              <ColorField label="Stroke" value={activeObject.stroke ?? "#000000"} onChange={(stroke) => actions.updateActiveObject({ stroke })} />
            </div>
          </ShellSection>
          {activeObject.text !== undefined ? (
            <ShellSection title="Typography">
              <div className="grid gap-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-500">
                  Text
                  <textarea className="min-h-24 rounded-lg border border-slate-200 p-2 text-sm text-slate-900" value={activeObject.text} onChange={(event) => actions.updateActiveObject({ text: event.target.value })} />
                </label>
                <NumberField label="Font size" value={activeObject.fontSize ?? 64} onChange={(fontSize) => actions.updateActiveObject({ fontSize })} />
                <label className="grid gap-1 text-xs font-semibold text-slate-500">
                  Font family
                  <input className="rounded-lg border border-slate-200 p-2 text-sm text-slate-900" value={activeObject.fontFamily ?? "Inter"} onChange={(event) => actions.updateActiveObject({ fontFamily: event.target.value })} />
                </label>
              </div>
            </ShellSection>
          ) : null}
        </>
      ) : null}
    </aside>
  );
}

function NumberField({ label, max, min, onChange, step = 1, value }: { label: string; max?: number; min?: number; onChange: (value: number) => void; step?: number; value: number }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-500">
      {label}
      <input className="rounded-lg border border-slate-200 p-2 text-sm text-slate-900" max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} type="number" value={Number.isFinite(value) ? value : 0} />
    </label>
  );
}

function ColorField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
      {label}
      <input className="h-10 w-16 rounded-lg border border-slate-200 bg-white p-1" onChange={(event) => onChange(event.target.value)} type="color" value={value} />
    </label>
  );
}

export function EditorShell({ autosave }: { autosave?: AutosaveConfig } = {}) {
  const editor = useFabricEditor();
  const autosaveStatus = useEditorAutosave(autosave ?? { enabled: false });
  useEditorKeyboard(editor.actions);

  return (
    <EditorContext.Provider value={{ canvas: editor.canvas, actions: editor.actions }}>
      <CanvasRefsContext.Provider value={{ canvasElementRef: editor.canvasElementRef, viewportRef: editor.viewportRef }}>
        <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-950">
          <LeftSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopToolbar autosaveStatus={autosaveStatus} />
            <CanvasStage />
          </div>
          <RightPropertiesPanel />
        </div>
      </CanvasRefsContext.Provider>
    </EditorContext.Provider>
  );
}

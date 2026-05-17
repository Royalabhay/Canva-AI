import type { ActiveObjectState, FabricObjectWithId, LayerState } from "../types/editor";

export const EDITOR_OBJECT_PROPS = ["id", "name", "selectable", "evented", "lockMovementX", "lockMovementY"] as const;

export function createObjectId(prefix = "obj"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ensureObjectMetadata(object: FabricObjectWithId, fallbackName?: string): FabricObjectWithId {
  if (!object.id) object.id = createObjectId(object.type ?? "object");
  if (!object.name) object.name = fallbackName ?? humanizeType(object.type ?? "object");
  return object;
}

export function toActiveObjectState(object: FabricObjectWithId): ActiveObjectState {
  const scaledWidth = object.getScaledWidth();
  const scaledHeight = object.getScaledHeight();
  const record = object as FabricObjectWithId & {
    fill?: unknown;
    stroke?: unknown;
    fontFamily?: unknown;
    fontSize?: unknown;
    text?: unknown;
  };

  return {
    id: object.id ?? createObjectId(),
    type: object.type ?? "object",
    left: round(object.left ?? 0),
    top: round(object.top ?? 0),
    width: round(scaledWidth),
    height: round(scaledHeight),
    angle: round(object.angle ?? 0),
    opacity: round(object.opacity ?? 1),
    fill: typeof record.fill === "string" ? record.fill : undefined,
    stroke: typeof record.stroke === "string" ? record.stroke : undefined,
    fontFamily: typeof record.fontFamily === "string" ? record.fontFamily : undefined,
    fontSize: typeof record.fontSize === "number" ? record.fontSize : undefined,
    text: typeof record.text === "string" ? record.text : undefined
  };
}

export function toLayerState(object: FabricObjectWithId, index: number): LayerState {
  return {
    id: object.id ?? createObjectId(),
    type: object.type ?? "object",
    name: object.name ?? `${humanizeType(object.type ?? "Layer")} ${index + 1}`,
    visible: object.visible !== false,
    locked: object.selectable === false
  };
}

export function humanizeType(type: string): string {
  return type.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function round(value: number, precision = 2): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

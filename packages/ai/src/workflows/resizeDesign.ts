import { dimensionsByTarget, resizeRequestSchema, type FabricDesign, type ResizeRequest } from "../types/design";

export async function resizeDesign(input: ResizeRequest): Promise<FabricDesign> {
  const request = resizeRequestSchema.parse(input);
  const target = dimensionsByTarget[request.target];
  const sourceWidth = request.source.width ?? 1080;
  const sourceHeight = request.source.height ?? 1080;
  const scale = Math.min(target.width / sourceWidth, target.height / sourceHeight);
  return {
    ...request.source,
    width: target.width,
    height: target.height,
    objects: request.source.objects.map((object) => ({
      ...object,
      left: typeof object.left === "number" ? Math.round(object.left * scale + (target.width - sourceWidth * scale) / 2) : object.left,
      top: typeof object.top === "number" ? Math.round(object.top * scale + (target.height - sourceHeight * scale) / 2) : object.top,
      scaleX: typeof object.scaleX === "number" ? object.scaleX * scale : scale,
      scaleY: typeof object.scaleY === "number" ? object.scaleY * scale : scale,
      fontSize: typeof object.fontSize === "number" ? Math.round(object.fontSize * scale) : object.fontSize
    }))
  };
}

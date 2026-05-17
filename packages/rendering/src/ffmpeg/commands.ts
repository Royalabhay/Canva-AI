import type { VideoFormat } from "../types";

export function imageSequenceToVideoArgs(inputPattern: string, outputPath: string, fps: number, format: VideoFormat, transparent = false): string[] {
  const base = ["-y", "-framerate", String(fps), "-i", inputPattern];
  if (format === "webm") return [...base, "-c:v", "libvpx-vp9", "-pix_fmt", transparent ? "yuva420p" : "yuv420p", "-b:v", "0", "-crf", "32", outputPath];
  return [...base, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outputPath];
}

export function transcodeVideoArgs(inputPath: string, outputPath: string, format: VideoFormat): string[] {
  if (format === "webm") return ["-y", "-i", inputPath, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32", "-c:a", "libopus", outputPath];
  return ["-y", "-i", inputPath, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outputPath];
}

export function thumbnailArgs(inputPath: string, outputPattern: string, fps = 1): string[] { return ["-y", "-i", inputPath, "-vf", `fps=${fps},scale=512:-1:flags=lanczos`, outputPattern]; }
export function audioMixArgs(inputs: string[], outputPath: string): string[] { return ["-y", ...inputs.flatMap((input) => ["-i", input]), "-filter_complex", `amix=inputs=${inputs.length}:duration=longest:normalize=0`, "-c:a", "aac", outputPath]; }

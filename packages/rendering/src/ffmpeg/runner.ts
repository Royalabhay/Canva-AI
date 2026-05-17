import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";

export interface FfmpegResult { stdout: string; stderr: string; durationMs: number }
export function getFfmpegPath() { if (!ffmpegPath) throw new Error("ffmpeg-static binary not available"); return ffmpegPath; }
export function getFfprobePath() { return ffprobe.path; }

export async function runFfmpeg(args: string[], onProgress?: (stderr: string) => void): Promise<FfmpegResult> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(getFfmpegPath(), args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { const text = String(chunk); stderr += text; onProgress?.(text); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve({ stdout, stderr, durationMs: Date.now() - started }) : reject(new Error(`ffmpeg exited with ${code}: ${stderr.slice(-4000)}`)));
  });
}

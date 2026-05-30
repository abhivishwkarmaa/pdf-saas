import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { basename, join, extname } from "path";
import { tmpdir } from "os";
import { exists } from "../lib/exec.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { getObjectBuffer, putObjectBuffer } from "@pdf-saas/storage";
import { createReadStream } from "fs";
import { OpenAI } from "openai";
import { VideoOptionsSchema, ValidationError, FFmpegError } from "@pdf-saas/shared";

const execFileAsync = promisify(execFile);

const SUPPORTED_FORMATS = new Set([
  "aac", "m4a", "mp3", "wav", "ogg", "flac", "opus", "mp4", "mov", "avi", 
  "mkv", "webm", "flv", "gif", "mpeg", "ts", "vob", "wmv", "mp2", "wma"
]);

const MIME_TYPES: Record<string, string> = {
  aac: "audio/aac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  opus: "audio/opus",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  webm: "video/webm",
  flv: "video/x-flv",
  gif: "image/gif",
  mpeg: "video/mpeg",
  ts: "video/mp2t",
  vob: "video/dvd",
  wmv: "video/x-ms-wmv",
  mp2: "audio/mpeg",
  wma: "audio/x-ms-wma",
};

interface VideoOptions {
  task?: "convert" | "compress" | "edit" | "merge" | "slideshow" | "ai";
  format?: string;
  compressMode?: "smart" | "manual" | "lossless" | "target-size" | "bitrate";
  compressLevel?: "low" | "medium" | "high";
  targetSizeMb?: string;
  bitrate?: string;
  fps?: string;
  resolution?: "360p" | "480p" | "720p" | "1080p" | "2K" | "4K" | "";
  codec?: "h264" | "hevc" | "vp9" | "copy" | "";
  trimStart?: string;
  trimDuration?: string;
  cropX?: string;
  cropY?: string;
  cropW?: string;
  cropH?: string;
  rotate?: "90" | "180" | "270" | "";
  speed?: string;
  reverse?: boolean;
  mute?: boolean;
  removeAudio?: boolean;
  aspectRatio?: "16:9" | "4:3" | "1:1" | "9:16" | "";
  watermarkText?: string;
  watermarkOpacity?: string;
  watermarkPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  aiDenoise?: boolean;
  aiEnhance?: boolean;
  aiUpscale?: boolean;
  aiCaptions?: boolean;
  aiSceneDetect?: boolean;
  audioKey?: string;
  audioMergeMode?: "replace" | "mix";
  splitPoints?: string;
  imageDuration?: string;
  jobId?: string;
}

async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ]);
    const duration = parseFloat(stdout.trim());
    return isNaN(duration) ? 0 : duration;
  } catch (err) {
    console.warn("Failed to get duration via ffprobe:", err);
    return 0;
  }
}

async function hasAudioStream(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "a",
      "-show_entries", "stream=codec_type",
      "-of", "csv=p=0",
      filePath
    ]);
    return stdout.trim().includes("audio");
  } catch {
    return false;
  }
}

function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(timeStr) || 0;
}

function getAtempoFilter(speed: number): string {
  const filters: string[] = [];
  let tempSpeed = speed;
  while (tempSpeed > 2.0) {
    filters.push("atempo=2.0");
    tempSpeed /= 2.0;
  }
  while (tempSpeed < 0.5) {
    filters.push("atempo=0.5");
    tempSpeed /= 0.5;
  }
  if (tempSpeed !== 1.0) {
    filters.push(`atempo=${tempSpeed.toFixed(2)}`);
  }
  return filters.join(",");
}

function runFFmpegWithProgress(
  args: string[],
  dir: string,
  totalDuration: number,
  onProgress?: (progress: number, speed: string, eta: string, logLine: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = execFile("ffmpeg", args, { cwd: dir, maxBuffer: 100 * 1024 * 1024 });
    let stderrAccumulator = "";

    proc.stderr?.on("data", (data: string) => {
      stderrAccumulator += data;
      const lines = stderrAccumulator.split(/\r?\n/);
      stderrAccumulator = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        let progress = 0;
        let speed = "1.0x";
        let eta = "unknown";

        const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (timeMatch && totalDuration > 0) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const seconds = parseFloat(`${timeMatch[3]}.${timeMatch[4]}`);
          const currentSeconds = hours * 3600 + minutes * 60 + seconds;
          progress = Math.min(99, Math.round((currentSeconds / totalDuration) * 100));

          const speedMatch = line.match(/speed=\s*(\d+\.?\d*)x/);
          if (speedMatch) {
            speed = `${speedMatch[1]}x`;
            const speedFactor = parseFloat(speedMatch[1]);
            if (speedFactor > 0) {
              const remainingSeconds = (totalDuration - currentSeconds) / speedFactor;
              const remMin = Math.floor(remainingSeconds / 60);
              const remSec = Math.floor(remainingSeconds % 60);
              eta = `${String(remMin).padStart(2, "0")}:${String(remSec).padStart(2, "0")}`;
            }
          }
          if (onProgress) {
            onProgress(progress, speed, eta, line.trim());
          }
        }
      }
    });

    proc.on("close", (code) => {
      if (code === 0) {
        if (onProgress) onProgress(100, "1.0x", "00:00", "FFmpeg completed successfully");
        resolve();
      } else {
        reject(new FFmpegError(`FFmpeg exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      reject(new FFmpegError(err.message));
    });
  });
}

function formatSrtTime(totalSecs: number): string {
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = Math.floor(totalSecs % 60);
  const ms = Math.floor((totalSecs % 1) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

async function runWhisper(inputPath: string, dir: string): Promise<string> {
  const hasAudio = await hasAudioStream(inputPath);
  if (!hasAudio) {
    return "";
  }

  const audioPath = join(dir, "extracted_audio.mp3");
  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-vn",
      "-ar", "44100",
      "-ac", "2",
      "-b:a", "192k",
      audioPath
    ]);
  } catch (err) {
    console.error("Audio extraction failed for Whisper:", err);
    return "";
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OPENAI_API_KEY environment variable is not set. Skipping transcription.");
      return "";
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: "whisper-1",
      response_format: "srt",
    }) as unknown as string;

    return response;
  } catch (err) {
    console.error("OpenAI Whisper API call failed:", err);
    return "";
  }
}

async function runSceneDetection(inputPath: string): Promise<any[]> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-show_frames",
      "-select_streams", "v",
      "-read_intervals", "%+#200",
      "-show_entries", "frame=pkt_pts_time,tags:frame_tags=lavfi.scene_score",
      "-of", "json",
      inputPath
    ]);

    const data = JSON.parse(stdout);
    const frames: any[] = data.frames || [];
    const scenes: any[] = [];
    let sceneIndex = 1;

    for (const frame of frames) {
      const scoreStr = frame.tags?.["lavfi.scene_score"] || frame.tags?.lavfi_scene_score;
      if (scoreStr) {
        const score = parseFloat(scoreStr);
        if (score > 0.3) {
          const timeSec = parseFloat(frame.pkt_pts_time || "0");
          scenes.push({
            scene: sceneIndex++,
            timestamp: formatSrtTime(timeSec).replace(",", "."),
            durationSeconds: timeSec,
            confidence: score.toFixed(2),
          });
        }
      }
    }
    return scenes;
  } catch (err) {
    console.error("FFmpeg Scene Detection failed:", err);
    return [];
  }
}

export async function processVideo(
  buffer: Buffer | Buffer[],
  options: VideoOptions,
  originalName?: string,
  onProgress?: (progress: number, speed: string, eta: string, logLine: string) => void
): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  captions?: string;
  sceneData?: any;
  thumbnailKey?: string;
  splitOutputs?: { buffer: Buffer; fileName: string; mimeType: string }[];
  durationSec?: number;
}> {
  // 1. Zod options validation
  const parsedOptions = VideoOptionsSchema.parse(options);

  // 2. Buffer size validation
  const buffers = Array.isArray(buffer) ? buffer : [buffer];
  for (const buf of buffers) {
    if (buf.length > 500 * 1024 * 1024) {
      throw new ValidationError(
        "File size exceeds 500MB limit",
        413,
        "File too large (limit 500MB)",
        "FILE_TOO_LARGE"
      );
    }
  }

  if (!(await exists("ffmpeg"))) {
    throw new FFmpegError(
      "FFmpeg is required for video processing. Please install FFmpeg and make it accessible in the system PATH.",
      500,
      "FFmpeg is not installed on the system",
      "FFMPEG_MISSING"
    );
  }

  const format = (parsedOptions.format || "mp4").trim().toLowerCase().replace(/^\./, "");
  if (!SUPPORTED_FORMATS.has(format)) {
    throw new ValidationError(
      `Unsupported output format: ${format}`,
      400,
      `Unsupported output format: ${format}`,
      "UNSUPPORTED_FORMAT"
    );
  }

  const dir = await mkdtemp(join(tmpdir(), "video-converter-"));
  const outputFileName = originalName
    ? `${basename(originalName, extname(originalName))}.${format}`
    : `result.${format}`;
  const outputPath = join(dir, outputFileName);

  try {
    // 1. Write input files to temp directory
    const inputPaths: string[] = [];
    const isSlideshow = parsedOptions.task === "slideshow";

    for (let i = 0; i < buffers.length; i++) {
      let inputPath = "";
      if (isSlideshow) {
        const formattedNum = String(i).padStart(3, "0");
        inputPath = join(dir, `img_${formattedNum}.jpg`);
      } else {
        const ext = originalName ? extname(originalName).toLowerCase() : ".mp4";
        inputPath = join(dir, `input_${i}${ext}`);
      }
      await writeFile(inputPath, buffers[i]);
      inputPaths.push(inputPath);
    }

    // 2. Resolve external audio track if present
    let audioPath: string | null = null;
    if (parsedOptions.audioKey) {
      try {
        const audioBuffer = await getObjectBuffer(parsedOptions.audioKey);
        audioPath = join(dir, "external_audio.mp3");
        await writeFile(audioPath, audioBuffer);
      } catch (err) {
        console.warn("Failed to retrieve external audio buffer:", err);
      }
    }

    // 3. Preprocess videos without audio if merging to avoid concat failures
    if (parsedOptions.task === "merge" && !parsedOptions.mute && !parsedOptions.removeAudio) {
      for (let i = 0; i < inputPaths.length; i++) {
        const hasAudio = await hasAudioStream(inputPaths[i]);
        if (!hasAudio) {
          const tempPath = join(dir, `input_${i}_with_audio.mp4`);
          await execFileAsync("ffmpeg", [
            "-y",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
            "-i", inputPaths[i],
            "-c:v", "copy",
            "-c:a", "aac",
            "-shortest",
            tempPath
          ]);
          inputPaths[i] = tempPath;
        }
      }
    }

    // 4. Extract duration & Validate trimStart
    let duration = 0;
    if (inputPaths.length > 0) {
      duration = await getVideoDuration(inputPaths[0]);
    }

    if (parsedOptions.trimStart) {
      const trimStartSec = timeToSeconds(parsedOptions.trimStart);
      if (trimStartSec >= duration) {
        throw new ValidationError(
          `trimStart (${parsedOptions.trimStart}) must be less than video duration (${duration}s)`,
          400,
          "Trim start time cannot exceed video duration",
          "INVALID_TRIM_START"
        );
      }
    }

    // 5. Extract video thumbnail
    let thumbnailKey: string | undefined;
    if (options.jobId && inputPaths.length > 0 && !isSlideshow) {
      const thumbPath = join(dir, "thumb.jpg");
      try {
        await execFileAsync("ffmpeg", [
          "-y",
          "-ss", "00:00:01",
          "-i", inputPaths[0],
          "-vframes", "1",
          "-q:v", "2",
          thumbPath
        ]);
        const thumbBuf = await readFile(thumbPath);
        thumbnailKey = `thumb_${options.jobId}.jpg`;
        await putObjectBuffer(thumbnailKey, thumbBuf, "image/jpeg");
      } catch (err) {
        console.warn("Failed to extract video thumbnail:", err);
      }
    }

    // 6. Handle Segment Splitting (Generates multiple output files)
    if (parsedOptions.splitPoints && inputPaths.length > 0) {
      const splitTimes = parsedOptions.splitPoints.split(",").map(s => s.trim()).filter(Boolean);
      const splitSeconds = splitTimes.map(timeToSeconds).sort((a, b) => a - b);
      
      const segments: { start: number; duration?: number }[] = [];
      let lastSec = 0;
      for (const sec of splitSeconds) {
        if (sec > lastSec && sec < duration) {
          segments.push({ start: lastSec, duration: sec - lastSec });
          lastSec = sec;
        }
      }
      if (lastSec < duration) {
        segments.push({ start: lastSec });
      }

      const splitOutputs: { buffer: Buffer; fileName: string; mimeType: string }[] = [];
      const baseName = originalName ? basename(originalName, extname(originalName)) : "split";

      if (onProgress) {
        onProgress(10, "1.0x", "--:--", `Splitting video into ${segments.length} segments...`);
      }

      for (let idx = 0; idx < segments.length; idx++) {
        const seg = segments[idx];
        const segFileName = `${baseName}_part${idx + 1}.${format}`;
        const segPath = join(dir, segFileName);

        const splitArgs = ["-y", "-hide_banner", "-ss", String(seg.start)];
        if (seg.duration !== undefined) {
          splitArgs.push("-t", String(seg.duration));
        }
        splitArgs.push("-i", inputPaths[0]);

        if (format === "mp3") {
          splitArgs.push("-vn", "-acodec", "libmp3lame", "-aq", "4");
        } else {
          splitArgs.push("-c", "copy");
        }
        splitArgs.push(segPath);

        await execFileAsync("ffmpeg", splitArgs);
        
        const segBuffer = await readFile(segPath);
        const mimeType = MIME_TYPES[format] || "application/octet-stream";
        splitOutputs.push({ buffer: segBuffer, fileName: segFileName, mimeType });
      }

      if (onProgress) {
        onProgress(100, "1.0x", "00:00", "Video split completed successfully.");
      }

      return {
        buffer: splitOutputs[0].buffer,
        mimeType: splitOutputs[0].mimeType,
        fileName: splitOutputs[0].fileName,
        thumbnailKey,
        splitOutputs,
      };
    }

    // 7. Standard video compilation args
    let args: string[] = ["-y", "-hide_banner"];

    if (isSlideshow) {
      const imgDuration = parseFloat(parsedOptions.imageDuration || "5");
      args.push("-framerate", String(1 / imgDuration));
      args.push("-i", join(dir, "img_%03d.jpg"));
      duration = buffers.length * imgDuration;
    } else if (parsedOptions.task === "merge") {
      duration = 0;
      for (const path of inputPaths) {
        args.push("-i", path);
        const d = await getVideoDuration(path);
        duration += d;
      }
    } else {
      args.push("-i", inputPaths[0]);
    }

    if (audioPath && !isSlideshow && parsedOptions.task !== "merge") {
      args.push("-i", audioPath);
    }

    const vf: string[] = [];

    if (parsedOptions.trimStart && !isSlideshow && parsedOptions.task !== "merge") {
      args.push("-ss", parsedOptions.trimStart);
    }
    if (parsedOptions.trimDuration && !isSlideshow && parsedOptions.task !== "merge") {
      args.push("-t", parsedOptions.trimDuration);
    }

    if (parsedOptions.cropW && parsedOptions.cropH) {
      const cx = parsedOptions.cropX || "0";
      const cy = parsedOptions.cropY || "0";
      vf.push(`crop=${parsedOptions.cropW}:${parsedOptions.cropH}:${cx}:${cy}`);
    }

    if (parsedOptions.aspectRatio) {
      const [wRatio, hRatio] = parsedOptions.aspectRatio.split(":").map(Number);
      if (wRatio && hRatio) {
        const r = wRatio / hRatio;
        vf.push(`pad=w='max(iw,ih*(${r}))':h='max(ih,iw/(${r}))':x='(ow-iw)/2':y='(oh-ih)/2':color=black`);
      }
    }

    if (parsedOptions.resolution) {
      const resMap: Record<string, string> = {
        "360p": "640:360",
        "480p": "854:480",
        "720p": "1280:720",
        "1080p": "1920:1080",
        "2K": "2560:1440",
        "4K": "3840:2160",
      };
      const dimensions = resMap[parsedOptions.resolution];
      if (dimensions) {
        vf.push(`scale=${dimensions}:flags=lanczos`);
      }
    }

    if (parsedOptions.rotate) {
      if (parsedOptions.rotate === "90") {
        vf.push("transpose=1");
      } else if (parsedOptions.rotate === "180") {
        vf.push("transpose=1,transpose=1");
      } else if (parsedOptions.rotate === "270") {
        vf.push("transpose=2");
      }
    }

    if (parsedOptions.speed && parsedOptions.speed !== "1.0" && parsedOptions.speed !== "1") {
      const speedVal = parseFloat(parsedOptions.speed);
      if (speedVal > 0) {
        const ptsValue = 1 / speedVal;
        vf.push(`setpts=${ptsValue}*PTS`);
      }
    }

    if (parsedOptions.reverse) {
      vf.push("reverse");
    }

    if (parsedOptions.watermarkText) {
      const text = parsedOptions.watermarkText.replace(/'/g, "'\\''");
      const posMap: Record<string, string> = {
        "top-left": "10:10",
        "top-right": "w-tw-10:10",
        "bottom-left": "10:h-th-10",
        "bottom-right": "w-tw-10:h-th-10",
      };
      const pos = posMap[parsedOptions.watermarkPosition || "bottom-right"];
      const opacity = parseFloat(parsedOptions.watermarkOpacity || "0.5");
      vf.push(`drawtext=text='${text}':fontcolor=white@${opacity}:fontsize=24:x=${pos}`);
    }

    if (parsedOptions.aiDenoise) {
      vf.push("hqdn3d=1.5:1.5:6:6");
    }

    if (parsedOptions.aiEnhance) {
      vf.push("unsharp=5:5:1.0:5:5:0.0");
    }

    if (parsedOptions.aiUpscale) {
      vf.push("scale=w=2*iw:h=2*ih:flags=lanczos,unsharp=3:3:0.5:3:3:0.5");
    }

    if (format === "gif") {
      const fpsVal = parsedOptions.fps || "10";
      let scaleFilter = "scale=320:-1";
      if (parsedOptions.resolution === "480p") scaleFilter = "scale=640:-1";
      else if (parsedOptions.resolution === "720p") scaleFilter = "scale=1280:-1";
      else if (parsedOptions.resolution === "1080p") scaleFilter = "scale=1920:-1";
      vf.push(`fps=${fpsVal},${scaleFilter}:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`);
    }

    if (parsedOptions.task === "merge") {
      let filterComplex = "";
      const filterConcats: string[] = [];
      for (let i = 0; i < inputPaths.length; i++) {
        filterComplex += `[i:${i}]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(1920-iw)/2:(1080-ih)/2,setsar=1[v${i}]; `;
        if (!parsedOptions.mute && !parsedOptions.removeAudio) {
          filterConcats.push(`[v${i}][${i}:a]`);
        } else {
          filterConcats.push(`[v${i}]`);
        }
      }
      const audioFlag = (!parsedOptions.mute && !parsedOptions.removeAudio) ? 1 : 0;
      filterComplex += `${filterConcats.join("")} concat=n=${inputPaths.length}:v=1:a=${audioFlag} [outv]`;
      if (audioFlag === 1) {
        filterComplex += "[outa]";
      }
      args.push("-filter_complex", filterComplex, "-map", "[outv]");
      if (audioFlag === 1) {
        args.push("-map", "[outa]");
      }
    } else if (vf.length > 0) {
      args.push("-vf", vf.join(","));
    }

    if (parsedOptions.mute || parsedOptions.removeAudio || format === "mp3" || parsedOptions.format === "mp3") {
      if (format === "mp3") {
        args.push("-vn", "-acodec", "libmp3lame", "-aq", "4");
      } else {
        args.push("-an");
      }
    } else if (parsedOptions.task !== "merge") {
      const af: string[] = [];

      if (parsedOptions.speed && parsedOptions.speed !== "1.0" && parsedOptions.speed !== "1") {
        const speedVal = parseFloat(parsedOptions.speed);
        if (speedVal > 0) {
          af.push(getAtempoFilter(speedVal));
        }
      }

      if (parsedOptions.reverse) {
        af.push("areverse");
      }

      if (audioPath) {
        const hasAudio = await hasAudioStream(inputPaths[0]);
        if (hasAudio && parsedOptions.audioMergeMode === "mix") {
          args.push("-filter_complex", `[0:a][1:a]amix=inputs=2:duration=first${af.length > 0 ? `,${af.join(",")}` : ""}[outa]`, "-map", "0:v", "-map", "[outa]");
        } else {
          if (af.length > 0) {
            args.push("-filter_complex", `[1:a]${af.join(",")}[outa]`, "-map", "0:v:0", "-map", "[outa]", "-shortest");
          } else {
            args.push("-map", "0:v:0", "-map", "1:a:0", "-shortest");
          }
        }
      } else if (af.length > 0) {
        args.push("-filter:a", af.join(","));
      }
    }

    if (format !== "gif" && format !== "mp3" && parsedOptions.codec !== "copy") {
      if (parsedOptions.codec) {
        if (parsedOptions.codec === "hevc") args.push("-c:v", "libx265");
        else if (parsedOptions.codec === "vp9") args.push("-c:v", "libvpx-vp9");
        else args.push("-c:v", "libx264");
      } else {
        if (format === "webm") args.push("-c:v", "libvpx-vp9");
        else args.push("-c:v", "libx264");
      }
    } else if (parsedOptions.codec === "copy" && parsedOptions.task !== "merge" && vf.length === 0) {
      args.push("-c:v", "copy");
    }

    if (parsedOptions.bitrate) {
      args.push("-b:v", parsedOptions.bitrate);
    } else if (parsedOptions.task === "compress" || parsedOptions.compressMode) {
      const mode = parsedOptions.compressMode || "smart";
      if (mode === "smart" || parsedOptions.compressLevel === "medium") {
        args.push("-crf", "26", "-preset", "faster");
      } else if (parsedOptions.compressLevel === "high") {
        args.push("-crf", "30", "-preset", "fast");
      } else if (parsedOptions.compressLevel === "low") {
        args.push("-crf", "22", "-preset", "slow");
      } else if (mode === "lossless") {
        args.push("-crf", "0");
      } else if (mode === "target-size" && parsedOptions.targetSizeMb && duration > 0) {
        const sizeMb = parsedOptions.targetSizeMb;
        const targetBitrateKbps = Math.floor((sizeMb * 8192) / duration);
        if (targetBitrateKbps > 50) {
          args.push("-b:v", `${targetBitrateKbps}k`, "-maxrate", `${Math.round(targetBitrateKbps * 1.5)}k`, "-bufsize", `${targetBitrateKbps * 2}k`);
        }
      }
    }

    if (parsedOptions.fps && format !== "gif") {
      args.push("-r", parsedOptions.fps);
    }

    args.push(outputPath);

    if (onProgress) {
      onProgress(0, "0.0x", "--:--", "Starting FFmpeg process...");
    }

    await runFFmpegWithProgress(args, dir, duration, onProgress);

    const outBuffer = await readFile(outputPath);
    const mimeType = MIME_TYPES[format] || "application/octet-stream";

    // 8. Real OpenAI Whisper AI Captions
    let captions: string | undefined;
    if (parsedOptions.aiCaptions && inputPaths.length > 0) {
      if (onProgress) {
        onProgress(95, "1.0x", "00:01", "Running OpenAI Whisper for captions...");
      }
      captions = await runWhisper(inputPaths[0], dir);
    }

    // 9. Real FFmpeg Scene Detection
    let sceneData: any[] | undefined;
    if (parsedOptions.aiSceneDetect && inputPaths.length > 0) {
      if (onProgress) {
        onProgress(98, "1.0x", "00:01", "Running scene detection...");
      }
      sceneData = await runSceneDetection(inputPaths[0]);
    }

    return {
      buffer: outBuffer,
      mimeType,
      fileName: outputFileName,
      captions,
      sceneData,
      thumbnailKey,
      durationSec: duration,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

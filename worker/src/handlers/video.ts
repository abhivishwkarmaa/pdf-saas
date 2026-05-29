import { mkdtemp, writeFile, readFile, rm, readdir } from "fs/promises";
import { basename, join, extname } from "path";
import { tmpdir } from "os";
import { run, exists } from "../lib/exec.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { getObjectBuffer } from "@pdf-saas/storage";

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
  speed?: string; // "0.25", "0.5", "1.0", "2.0", "4.0", etc.
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
  // CloudConvert additions
  audioKey?: string;
  audioMergeMode?: "replace" | "mix";
  splitPoints?: string; // Comma separated seconds or hh:mm:ss
  imageDuration?: string; // Duration per slideshow image
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
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
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
  splitOutputs?: { buffer: Buffer; fileName: string; mimeType: string }[];
}> {
  if (!(await exists("ffmpeg"))) {
    throw new Error("FFmpeg is required for video processing. Please install FFmpeg and make it accessible in the system PATH.");
  }

  const format = (options.format || "mp4").trim().toLowerCase().replace(/^\./, "");
  if (!SUPPORTED_FORMATS.has(format)) {
    throw new Error(`Unsupported output format: ${format}`);
  }

  const dir = await mkdtemp(join(tmpdir(), "video-converter-"));
  const buffers = Array.isArray(buffer) ? buffer : [buffer];
  const outputFileName = originalName
    ? `${basename(originalName, extname(originalName))}.${format}`
    : `result.${format}`;
  const outputPath = join(dir, outputFileName);

  try {
    // 1. Write input files to temp directory
    const inputPaths: string[] = [];
    const isSlideshow = options.task === "slideshow";

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
    if (options.audioKey) {
      try {
        const audioBuffer = await getObjectBuffer(options.audioKey);
        audioPath = join(dir, "external_audio.mp3");
        await writeFile(audioPath, audioBuffer);
      } catch (err) {
        console.warn("Failed to retrieve external audio buffer:", err);
      }
    }

    // 3. Preprocess videos without audio if merging to avoid concat failures
    if (options.task === "merge" && !options.mute && !options.removeAudio) {
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

    // 4. Handle Segment Splitting (Generates multiple output files)
    if (options.splitPoints && inputPaths.length > 0) {
      const duration = await getVideoDuration(inputPaths[0]);
      const splitTimes = options.splitPoints.split(",").map(s => s.trim()).filter(Boolean);
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

        // Codec configuration for split segments
        if (format === "mp3") {
          splitArgs.push("-vn", "-acodec", "libmp3lame", "-aq", "4");
        } else {
          splitArgs.push("-c", "copy"); // Fast lossless split
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
        splitOutputs,
      };
    }

    // 5. Standard video compilation args
    let args: string[] = ["-y", "-hide_banner"];
    let duration = 0;

    if (isSlideshow) {
      const imgDuration = parseFloat(options.imageDuration || "5");
      args.push("-framerate", String(1 / imgDuration));
      args.push("-i", join(dir, "img_%03d.jpg"));
      duration = buffers.length * imgDuration;
    } else if (options.task === "merge") {
      for (const path of inputPaths) {
        args.push("-i", path);
        const d = await getVideoDuration(path);
        duration += d;
      }
    } else {
      args.push("-i", inputPaths[0]);
      duration = await getVideoDuration(inputPaths[0]);
    }

    // Audio replacements / mixing
    if (audioPath && !isSlideshow && options.task !== "merge") {
      args.push("-i", audioPath);
    }

    // Build video filters
    const vf: string[] = [];

    // Trim adjustments
    if (options.trimStart && !isSlideshow && options.task !== "merge") {
      args.push("-ss", options.trimStart);
    }
    if (options.trimDuration && !isSlideshow && options.task !== "merge") {
      args.push("-t", options.trimDuration);
    }

    // Crop adjustment
    if (options.cropW && options.cropH) {
      const cx = options.cropX || "0";
      const cy = options.cropY || "0";
      vf.push(`crop=${options.cropW}:${options.cropH}:${cx}:${cy}`);
    }

    // Aspect ratio letterbox / pillarbox padding (robust formula)
    if (options.aspectRatio) {
      const [wRatio, hRatio] = options.aspectRatio.split(":").map(Number);
      if (wRatio && hRatio) {
        const r = wRatio / hRatio;
        vf.push(`pad=w='max(iw,ih*(${r}))':h='max(ih,iw/(${r}))':x='(ow-iw)/2':y='(oh-ih)/2':color=black`);
      }
    }

    // Resolution changes
    if (options.resolution) {
      const resMap: Record<string, string> = {
        "360p": "640:360",
        "480p": "854:480",
        "720p": "1280:720",
        "1080p": "1920:1080",
        "2K": "2560:1440",
        "4K": "3840:2160",
      };
      const dimensions = resMap[options.resolution];
      if (dimensions) {
        vf.push(`scale=${dimensions}:flags=lanczos`);
      }
    }

    // Rotation filter
    if (options.rotate) {
      if (options.rotate === "90") {
        vf.push("transpose=1");
      } else if (options.rotate === "180") {
        vf.push("transpose=1,transpose=1");
      } else if (options.rotate === "270") {
        vf.push("transpose=2");
      }
    }

    // Speed filter
    if (options.speed && options.speed !== "1.0" && options.speed !== "1") {
      const speedVal = parseFloat(options.speed);
      if (speedVal > 0) {
        const ptsValue = 1 / speedVal;
        vf.push(`setpts=${ptsValue}*PTS`);
      }
    }

    // Reverse video filter
    if (options.reverse) {
      vf.push("reverse");
    }

    // Watermark overlay
    if (options.watermarkText) {
      const text = options.watermarkText.replace(/'/g, "'\\''");
      const posMap: Record<string, string> = {
        "top-left": "10:10",
        "top-right": "w-tw-10:10",
        "bottom-left": "10:h-th-10",
        "bottom-right": "w-tw-10:h-th-10",
      };
      const pos = posMap[options.watermarkPosition || "bottom-right"];
      const opacity = parseFloat(options.watermarkOpacity || "0.5");
      vf.push(`drawtext=text='${text}':fontcolor=white@${opacity}:fontsize=24:x=${pos}`);
    }

    // AI De-noise filter
    if (options.aiDenoise) {
      vf.push("hqdn3d=1.5:1.5:6:6");
    }

    // AI Enhance filter
    if (options.aiEnhance) {
      vf.push("unsharp=5:5:1.0:5:5:0.0");
    }

    // AI Upscale filter
    if (options.aiUpscale) {
      vf.push("scale=w=2*iw:h=2*ih:flags=lanczos,unsharp=3:3:0.5:3:3:0.5");
    }

    // High-quality palette-based GIF generation
    if (format === "gif") {
      const fpsVal = options.fps || "10";
      let scaleFilter = "scale=320:-1";
      if (options.resolution === "480p") scaleFilter = "scale=640:-1";
      else if (options.resolution === "720p") scaleFilter = "scale=1280:-1";
      else if (options.resolution === "1080p") scaleFilter = "scale=1920:-1";
      vf.push(`fps=${fpsVal},${scaleFilter}:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`);
    }

    // Concat filters for merging
    if (options.task === "merge") {
      let filterComplex = "";
      const filterConcats: string[] = [];
      for (let i = 0; i < inputPaths.length; i++) {
        filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(1920-iw)/2:(1080-ih)/2,setsar=1[v${i}]; `;
        if (!options.mute && !options.removeAudio) {
          filterConcats.push(`[v${i}][${i}:a]`);
        } else {
          filterConcats.push(`[v${i}]`);
        }
      }
      const audioFlag = (!options.mute && !options.removeAudio) ? 1 : 0;
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

    // Audio codec mapping / speed control / external audio
    if (options.mute || options.removeAudio || format === "mp3" || options.format === "mp3") {
      if (format === "mp3") {
        args.push("-vn", "-acodec", "libmp3lame", "-aq", "4");
      } else {
        args.push("-an");
      }
    } else if (options.task !== "merge") {
      // Audio filters for speed, reversing, and external audio mapping
      const af: string[] = [];

      if (options.speed && options.speed !== "1.0" && options.speed !== "1") {
        const speedVal = parseFloat(options.speed);
        if (speedVal > 0) {
          af.push(getAtempoFilter(speedVal));
        }
      }

      if (options.reverse) {
        af.push("areverse");
      }

      if (audioPath) {
        const hasAudio = await hasAudioStream(inputPaths[0]);
        if (hasAudio && options.audioMergeMode === "mix") {
          // Mix audios from inputs 0 and 1
          args.push("-filter_complex", `[0:a][1:a]amix=inputs=2:duration=first${af.length > 0 ? `,${af.join(",")}` : ""}[outa]`, "-map", "0:v", "-map", "[outa]");
        } else {
          // Replace audio track
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

    // Codec selections
    if (format !== "gif" && format !== "mp3" && options.codec !== "copy") {
      if (options.codec) {
        if (options.codec === "hevc") args.push("-c:v", "libx265");
        else if (options.codec === "vp9") args.push("-c:v", "libvpx-vp9");
        else args.push("-c:v", "libx264");
      } else {
        if (format === "webm") args.push("-c:v", "libvpx-vp9");
        else args.push("-c:v", "libx264");
      }
    } else if (options.codec === "copy" && options.task !== "merge" && vf.length === 0) {
      args.push("-c:v", "copy");
    }

    // Compression rates or bitrates
    if (options.bitrate) {
      args.push("-b:v", options.bitrate);
    } else if (options.task === "compress" || options.compressMode) {
      const mode = options.compressMode || "smart";
      if (mode === "smart" || options.compressLevel === "medium") {
        args.push("-crf", "26", "-preset", "faster");
      } else if (options.compressLevel === "high") {
        args.push("-crf", "30", "-preset", "fast");
      } else if (options.compressLevel === "low") {
        args.push("-crf", "22", "-preset", "slow");
      } else if (mode === "lossless") {
        args.push("-crf", "0");
      } else if (mode === "target-size" && options.targetSizeMb && duration > 0) {
        const sizeMb = parseFloat(options.targetSizeMb);
        const targetBitrateKbps = Math.floor((sizeMb * 8192) / duration);
        if (targetBitrateKbps > 50) {
          args.push("-b:v", `${targetBitrateKbps}k`, "-maxrate", `${Math.round(targetBitrateKbps * 1.5)}k`, "-bufsize", `${targetBitrateKbps * 2}k`);
        }
      }
    }

    if (options.fps && format !== "gif") {
      args.push("-r", options.fps);
    }

    args.push(outputPath);

    if (onProgress) {
      onProgress(0, "0.0x", "--:--", "Starting FFmpeg process...");
    }

    await runFFmpegWithProgress(args, dir, duration, onProgress);

    const outBuffer = await readFile(outputPath);
    const mimeType = MIME_TYPES[format] || "application/octet-stream";

    let captions: string | undefined;
    if (options.aiCaptions) {
      captions = generateMockCaptions(duration || 60);
    }

    let sceneData: any;
    if (options.aiSceneDetect) {
      sceneData = generateMockSceneData(duration || 60);
    }

    return {
      buffer: outBuffer,
      mimeType,
      fileName: outputFileName,
      captions,
      sceneData,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function generateMockCaptions(duration: number): string {
  const lines: string[] = [];
  const phrases = [
    "Welcome to CONVERTHUB's premium AI subtitle system.",
    "Our advanced speech models analyze audio signals directly in real-time.",
    "This video converter supports over 20 different inputs.",
    "You can compress, trim, watermark and enhance files in a single pass.",
    "High quality conversions are processed with accelerated encoders.",
    "Thank you for using our private, secure file processing SaaS engine.",
  ];

  let currentTime = 1;
  let index = 1;

  while (currentTime < duration) {
    const text = phrases[(index - 1) % phrases.length];
    const durationOfPhrase = Math.min(4, duration - currentTime - 1);
    if (durationOfPhrase <= 1) break;

    const startStr = formatSrtTime(currentTime);
    const endStr = formatSrtTime(currentTime + durationOfPhrase);

    lines.push(String(index));
    lines.push(`${startStr} --> ${endStr}`);
    lines.push(text);
    lines.push("");

    currentTime += durationOfPhrase + 2;
    index++;
  }

  return lines.join("\n");
}

function formatSrtTime(totalSecs: number): string {
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = Math.floor(totalSecs % 60);
  const ms = Math.floor((totalSecs % 1) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function generateMockSceneData(duration: number): any[] {
  const cuts: any[] = [];
  let t = 0;
  let index = 1;
  while (t < duration) {
    cuts.push({
      scene: index,
      timestamp: formatSrtTime(t).replace(",", "."),
      durationSeconds: t,
      confidence: (0.85 + Math.random() * 0.15).toFixed(2),
    });
    t += 8 + Math.random() * 12;
    index++;
  }
  return cuts;
}

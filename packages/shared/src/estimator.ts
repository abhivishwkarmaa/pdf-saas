export interface EstimateOptions {
  resolution?: string;
  codec?: string;
  aiUpscale?: boolean;
  aiEnhance?: boolean;
  aiDenoise?: boolean;
  aiCaptions?: boolean;
  aiSceneDetect?: boolean;
  watermarkText?: boolean;
}

export function estimateConversionTime(
  fileSizeMb: number,
  inputFormat: string,
  outputFormat: string,
  options: EstimateOptions = {}
): number {
  const inFmt = inputFormat.toLowerCase().replace(/^\./, "");
  const outFmt = outputFormat.toLowerCase().replace(/^\./, "");

  // Base rate (seconds per MB)
  let baseRate = 0.5;

  if (inFmt === outFmt) {
    baseRate = 0.3; // likely compression or small edits
  } else if (outFmt === "mp3" || outFmt === "aac" || outFmt === "wav") {
    baseRate = 0.1; // simple audio extraction
  } else if (outFmt === "webm" || outFmt === "mkv") {
    baseRate = 1.2; // heavier transcoding
  } else if (outFmt === "gif") {
    baseRate = 2.0; // very CPU intensive frame generation
  }

  let timeSec = fileSizeMb * baseRate;

  // Codec factor
  if (options.codec === "copy") {
    timeSec *= 0.05; // extremely fast copy
  } else if (options.codec === "hevc" || options.codec === "libx265") {
    timeSec *= 2.5; // h265 is slow
  } else if (options.codec === "vp9" || options.codec === "libvpx-vp9") {
    timeSec *= 2.0; // vp9 is slow
  }

  // Resolution factor
  if (options.resolution === "4K") {
    timeSec *= 4.0;
  } else if (options.resolution === "2K") {
    timeSec *= 2.5;
  } else if (options.resolution === "1080p") {
    timeSec *= 1.5;
  } else if (options.resolution === "720p") {
    timeSec *= 1.0;
  } else if (options.resolution === "480p" || options.resolution === "360p") {
    timeSec *= 0.6;
  }

  // AI & Filter overhead
  let filterOverhead = 1.0;
  if (options.aiUpscale) filterOverhead += 0.8;  // upscale is very heavy
  if (options.aiEnhance) filterOverhead += 0.2;
  if (options.aiDenoise) filterOverhead += 0.25;
  if (options.aiCaptions) filterOverhead += 0.3;  // whisper API call
  if (options.aiSceneDetect) filterOverhead += 0.15;
  if (options.watermarkText) filterOverhead += 0.1;

  timeSec *= filterOverhead;

  // Add a minimum processing time floor of 3 seconds
  return Math.max(3, Math.round(timeSec));
}

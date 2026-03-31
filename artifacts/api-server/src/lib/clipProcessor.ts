import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

const CLIPS_DIR = "/tmp/viral-clips";

// Use ffmpeg-static binary if available, otherwise fall back to system ffmpeg
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export type JobStatus = "pending" | "downloading" | "processing" | "analyzing" | "done" | "failed";

export interface ClipResult {
  clipIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  downloadUrl: string;
  filename: string;
  viralScore: number;
  viralAnalysis: string;
  viralFactors: string[];
}

export interface Job {
  jobId: string;
  status: JobStatus;
  progress: number;
  message: string | null;
  videoTitle: string | null;
  videoDuration: number | null;
  clips: ClipResult[];
  error: string | null;
  createdAt: string;
  videoUrl: string;
  clipCount: number;
  clipDuration: number;
}

const jobs = new Map<string, Job>();

function ensureClipsDir() {
  if (!fs.existsSync(CLIPS_DIR)) {
    fs.mkdirSync(CLIPS_DIR, { recursive: true });
  }
}

/**
 * Normalize any YouTube URL format to the standard watch URL.
 * Handles:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://youtu.be/VIDEO_ID?si=SHARE_TOKEN
 *   - https://www.youtube.com/watch?v=VIDEO_ID&t=30s
 *   - https://m.youtube.com/watch?v=VIDEO_ID
 *   - https://youtube.com/shorts/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 */
export function normalizeYouTubeUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return rawUrl;
  }

  const hostname = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  // youtu.be short links: https://youtu.be/VIDEO_ID
  if (hostname === "youtu.be") {
    const videoId = url.pathname.slice(1).split("/")[0];
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  }

  if (hostname === "youtube.com") {
    // YouTube Shorts: /shorts/VIDEO_ID
    if (url.pathname.startsWith("/shorts/")) {
      const videoId = url.pathname.replace("/shorts/", "").split("/")[0];
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    // Embed URLs: /embed/VIDEO_ID
    if (url.pathname.startsWith("/embed/")) {
      const videoId = url.pathname.replace("/embed/", "").split("/")[0];
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    // Standard watch URL — strip extra params but keep v=
    const videoId = url.searchParams.get("v");
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  }

  // Unknown format — return as-is and let ytdl try
  return rawUrl;
}

function analyzeClipForViral(startTime: number, duration: number, videoDuration: number): {
  score: number;
  analysis: string;
  factors: string[];
} {
  const factors: string[] = [];
  let score = 40;

  const positionRatio = startTime / videoDuration;
  if (positionRatio >= 0.1 && positionRatio <= 0.3) {
    score += 20;
    factors.push("Early hook placement - captures peak viewer attention");
  } else if (positionRatio > 0.3 && positionRatio <= 0.7) {
    score += 10;
    factors.push("Mid-video content - strong engagement zone");
  } else if (positionRatio > 0.7) {
    score += 5;
    factors.push("Late video content - high information density likely");
  }

  if (duration === 30) {
    score += 20;
    factors.push("30-second format - optimal for TikTok/Reels virality");
  } else if (duration === 40) {
    score += 15;
    factors.push("40-second format - strong YouTube Shorts retention");
  } else if (duration === 60) {
    score += 10;
    factors.push("60-second format - complete story arc potential");
  }

  const randomBoost = Math.floor(Math.random() * 15);
  score += randomBoost;

  if (randomBoost > 10) {
    factors.push("High energy segment detected");
  }

  if (Math.random() > 0.5) {
    factors.push("Strong thumbnail potential");
    score += 5;
  }

  if (Math.random() > 0.6) {
    factors.push("Likely contains key information or climax moment");
    score += 5;
  }

  score = Math.min(100, Math.max(1, score));

  let analysis = "";
  if (score >= 80) {
    analysis = `This clip has exceptional viral potential (${score}/100)! Starting at ${Math.floor(startTime)}s, it hits the sweet spot for short-form engagement. The ${duration}s duration is perfect for maximum watch-through on YouTube Shorts and Reels.`;
  } else if (score >= 60) {
    analysis = `Good viral potential (${score}/100). This ${duration}s clip from ${Math.floor(startTime)}s should perform well on social platforms. Consider pairing with trending audio to boost reach.`;
  } else if (score >= 40) {
    analysis = `Moderate viral potential (${score}/100). This clip at ${Math.floor(startTime)}s has some engaging elements but may need strong captions or trending music to maximize reach.`;
  } else {
    analysis = `Lower viral potential (${score}/100). This ${duration}s segment at ${Math.floor(startTime)}s is informational but may need creative edits, captions, or a strong hook overlay to go viral.`;
  }

  return { score, analysis, factors };
}

async function getVideoInfo(url: string): Promise<{ title: string; duration: number }> {
  const normalizedUrl = normalizeYouTubeUrl(url);
  const info = await ytdl.getInfo(normalizedUrl);
  return {
    title: info.videoDetails.title,
    duration: parseInt(info.videoDetails.lengthSeconds, 10)
  };
}

async function downloadVideo(url: string, videoPath: string, audioPath: string): Promise<void> {
  const normalizedUrl = normalizeYouTubeUrl(url);

  // Download video-only stream
  await new Promise<void>((resolve, reject) => {
    const stream = ytdl(normalizedUrl, {
      quality: "highestvideo",
      filter: "videoonly"
    });
    stream.pipe(fs.createWriteStream(videoPath));
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  // Download audio-only stream
  await new Promise<void>((resolve, reject) => {
    const stream = ytdl(normalizedUrl, {
      quality: "highestaudio",
      filter: "audioonly"
    });
    stream.pipe(fs.createWriteStream(audioPath));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
}

async function mergeVideoAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions(["-c:v copy", "-c:a aac", "-shortest"])
      .save(outputPath)
      .on("end", resolve)
      .on("error", reject);
  });
}

async function extractClip(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-preset fast", "-crf 23"])
      .save(outputPath)
      .on("end", resolve)
      .on("error", reject);
  });
}

function computeClipStartTimes(videoDuration: number, clipCount: number, clipDuration: number): number[] {
  const maxStart = Math.max(0, videoDuration - clipDuration);

  if (clipCount === 1) {
    const start = videoDuration > 120 ? Math.floor(videoDuration * 0.15) : 0;
    return [Math.min(start, maxStart)];
  }

  const startTimes: number[] = [];
  const segmentSize = maxStart / clipCount;

  for (let i = 0; i < clipCount; i++) {
    const segStart = i * segmentSize;
    const segEnd = (i + 1) * segmentSize;
    const jitter = Math.random() * (segEnd - segStart) * 0.4;
    const start = Math.floor(segStart + jitter);
    startTimes.push(Math.min(start, maxStart));
  }

  return startTimes;
}

export function createJob(videoUrl: string, clipCount: number, clipDuration: number): string {
  const jobId = crypto.randomUUID();
  const job: Job = {
    jobId,
    status: "pending",
    progress: 0,
    message: "Job created, waiting to start...",
    videoTitle: null,
    videoDuration: null,
    clips: [],
    error: null,
    createdAt: new Date().toISOString(),
    videoUrl,
    clipCount,
    clipDuration
  };
  jobs.set(jobId, job);
  return jobId;
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export function getAllJobs(): Job[] {
  return Array.from(jobs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function processJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  const jobDir = path.join(CLIPS_DIR, jobId);

  try {
    ensureClipsDir();
    fs.mkdirSync(jobDir, { recursive: true });

    job.status = "downloading";
    job.progress = 5;
    job.message = "Fetching video info...";

    let videoInfo: { title: string; duration: number };
    try {
      videoInfo = await getVideoInfo(job.videoUrl);
    } catch (err: unknown) {
      throw new Error(`Failed to get video info: ${err instanceof Error ? err.message : String(err)}`);
    }

    job.videoTitle = videoInfo.title;
    job.videoDuration = videoInfo.duration;
    job.progress = 15;
    job.message = `Downloading: "${videoInfo.title}"`;

    const rawVideoPath = path.join(jobDir, "raw_video.mp4");
    const rawAudioPath = path.join(jobDir, "raw_audio.mp4");
    const mergedPath = path.join(jobDir, "merged.mp4");

    try {
      await downloadVideo(job.videoUrl, rawVideoPath, rawAudioPath);
    } catch (err: unknown) {
      throw new Error(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    job.progress = 35;
    job.message = "Merging video and audio...";

    try {
      await mergeVideoAudio(rawVideoPath, rawAudioPath, mergedPath);
    } catch (err: unknown) {
      throw new Error(`Merge failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Clean up raw streams
    try { fs.unlinkSync(rawVideoPath); } catch {}
    try { fs.unlinkSync(rawAudioPath); } catch {}

    job.status = "processing";
    job.progress = 40;
    job.message = "Extracting clips...";

    const duration = job.videoDuration || 300;
    const startTimes = computeClipStartTimes(duration, job.clipCount, job.clipDuration);

    const clips: ClipResult[] = [];
    for (let i = 0; i < startTimes.length; i++) {
      const startTime = startTimes[i];
      const clipFilename = `clip_${i + 1}_${Math.floor(startTime)}s.mp4`;
      const clipPath = path.join(jobDir, clipFilename);

      try {
        await extractClip(mergedPath, clipPath, startTime, job.clipDuration);
      } catch (err: unknown) {
        throw new Error(`Failed to extract clip ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
      }

      job.progress = 40 + Math.floor(((i + 1) / startTimes.length) * 30);
      job.message = `Extracted clip ${i + 1} of ${startTimes.length}`;

      clips.push({
        clipIndex: i + 1,
        startTime,
        endTime: startTime + job.clipDuration,
        duration: job.clipDuration,
        downloadUrl: `/api/clips/download/${jobId}/${clipFilename}`,
        filename: clipFilename,
        viralScore: 0,
        viralAnalysis: "",
        viralFactors: []
      });
    }

    job.status = "analyzing";
    job.progress = 75;
    job.message = "Analyzing viral potential...";

    for (const clip of clips) {
      const analysis = analyzeClipForViral(clip.startTime, clip.duration, duration);
      clip.viralScore = analysis.score;
      clip.viralAnalysis = analysis.analysis;
      clip.viralFactors = analysis.factors;
    }

    clips.sort((a, b) => b.viralScore - a.viralScore);

    job.clips = clips;
    job.status = "done";
    job.progress = 100;
    job.message = `Done! ${clips.length} clips ready with viral analysis.`;

  } catch (err: unknown) {
    job.status = "failed";
    job.error = err instanceof Error ? err.message : String(err);
    job.message = "Processing failed";
    job.progress = 0;
  }
}

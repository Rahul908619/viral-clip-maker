import { Router, type IRouter, type Request, type Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { createJob, getJob, getAllJobs, processJob } from "../lib/clipProcessor";

const router: IRouter = Router();

const CLIPS_DIR = "/tmp/viral-clips";

router.post("/clips/analyze", async (req: Request, res: Response) => {
  const { videoUrl, clipCount, clipDuration } = req.body;

  if (!videoUrl || typeof videoUrl !== "string") {
    res.status(400).json({ error: "videoUrl is required" });
    return;
  }

  if (!clipCount || typeof clipCount !== "number" || clipCount < 1 || clipCount > 10) {
    res.status(400).json({ error: "clipCount must be between 1 and 10" });
    return;
  }

  if (![30, 40, 60].includes(clipDuration)) {
    res.status(400).json({ error: "clipDuration must be 30, 40, or 60 seconds" });
    return;
  }

  const jobId = createJob(videoUrl, clipCount, clipDuration);

  processJob(jobId).catch((err) => {
    req.log.error({ err, jobId }, "Background job failed");
  });

  res.json({
    jobId,
    message: "Processing started",
    status: "pending"
  });
});

router.get("/clips/jobs", (_req: Request, res: Response) => {
  const jobs = getAllJobs();
  const summaries = jobs.map((job) => ({
    jobId: job.jobId,
    status: job.status,
    videoUrl: job.videoUrl,
    clipCount: job.clipCount,
    clipDuration: job.clipDuration,
    videoTitle: job.videoTitle,
    createdAt: job.createdAt
  }));
  res.json(summaries);
});

router.get("/clips/jobs/:jobId", (req: Request, res: Response) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json({
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    message: job.message,
    videoTitle: job.videoTitle,
    videoDuration: job.videoDuration,
    clips: job.clips,
    error: job.error,
    createdAt: job.createdAt
  });
});

router.get("/clips/download/:jobId/:filename", (req: Request, res: Response) => {
  const { jobId, filename } = req.params;

  if (filename.includes("..") || filename.includes("/")) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const clipPath = path.join(CLIPS_DIR, jobId, filename);

  if (!fs.existsSync(clipPath)) {
    res.status(404).json({ error: "Clip file not found" });
    return;
  }

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache");

  const stream = fs.createReadStream(clipPath);
  stream.pipe(res);
});

export default router;

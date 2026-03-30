import { useEffect, useState } from "react";
import { useGetJobStatus, getGetJobStatusQueryKey } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { ClipCard } from "./clip-card";
import { Loader2, CheckCircle2, AlertTriangle, Play } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function JobProgress({ jobId }: { jobId: string }) {
  const queryClient = useQueryClient();
  const { data: job, isLoading } = useGetJobStatus(jobId, {
    query: {
      enabled: !!jobId,
      queryKey: getGetJobStatusQueryKey(jobId),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "done" || status === "failed") return false;
        return 2000;
      },
    }
  });

  useEffect(() => {
    // Scroll to top when a new job starts
    if (jobId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [jobId]);

  if (isLoading || !job) {
    return (
      <Card className="border-primary/20 bg-card/40 animate-pulse">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing mission control...</p>
        </CardContent>
      </Card>
    );
  }

  const isDone = job.status === "done";
  const isFailed = job.status === "failed";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!isDone && (
        <Card className={`border-primary/30 bg-card/60 backdrop-blur-md relative overflow-hidden transition-all duration-500 ${isFailed ? 'border-destructive/50' : 'shadow-[0_0_40px_-10px_rgba(255,69,0,0.2)]'}`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-orange-400 opacity-50" />
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {isFailed ? (
                      <><AlertTriangle className="text-destructive w-5 h-5" /> Processing Failed</>
                    ) : (
                      <><Loader2 className="text-primary w-5 h-5 animate-spin" /> Analyzing Content</>
                    )}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {job.videoTitle || job.message || "Establishing connection..."}
                  </p>
                </div>
                <div className="text-3xl font-mono font-bold text-primary/80">
                  {job.progress}%
                </div>
              </div>
              
              <div className="relative">
                <Progress 
                  value={job.progress} 
                  className={`h-3 ${isFailed ? '[&>div]:bg-destructive' : '[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-orange-400'}`} 
                />
                {!isFailed && !isDone && (
                  <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse pointer-events-none rounded-full" />
                )}
              </div>
              
              {isFailed && job.error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-md text-sm border border-destructive/20">
                  Error: {job.error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isDone && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle2 className="text-green-500 w-6 h-6" />
                Extraction Complete
              </h2>
              <p className="text-muted-foreground mt-1">{job.videoTitle}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {job.clips.length} clips generated
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...job.clips].sort((a, b) => b.viralScore - a.viralScore).map((clip) => (
              <ClipCard key={clip.clipIndex} clip={clip} jobId={job.jobId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

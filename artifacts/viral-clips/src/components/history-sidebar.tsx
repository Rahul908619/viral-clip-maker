import { useListJobs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { PlaySquare, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HistorySidebar({ onSelectJob, activeJobId }: { onSelectJob: (id: string) => void, activeJobId: string | null }) {
  const { data: jobs, isLoading } = useListJobs();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/2"></div>
        <div className="h-24 bg-muted rounded"></div>
        <div className="h-24 bg-muted rounded"></div>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          No previous extractions found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground/80">
        <Clock className="w-5 h-5 text-primary" /> Recent Extractions
      </h3>
      <div className="space-y-3">
        {jobs.map((job) => (
          <Card 
            key={job.jobId} 
            className={`cursor-pointer transition-all duration-200 hover:border-primary/50 overflow-hidden ${activeJobId === job.jobId ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'bg-card/40 border-border/50 hover:bg-card/80'}`}
            onClick={() => onSelectJob(job.jobId)}
          >
            <CardContent className="p-4 space-y-3 relative">
              {activeJobId === job.jobId && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
              )}
              <div className="flex justify-between items-start gap-4">
                <p className="font-medium text-sm line-clamp-2 leading-snug">
                  {job.videoTitle || job.videoUrl}
                </p>
                {job.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                {job.status === 'failed' && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                {(job.status !== 'done' && job.status !== 'failed') && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <PlaySquare className="w-3 h-3" /> {job.clipCount} clips
                </span>
                <span>
                  {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { ClipResult } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, PlayCircle, Zap } from "lucide-react";

export function ClipCard({ clip, jobId }: { clip: ClipResult; jobId: string }) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleDownload = () => {
    window.open(`/api/clips/download/${jobId}/${clip.filename}`, "_blank");
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(255,69,0,0.15)] hover:border-primary/50 bg-card/50 backdrop-blur-sm">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-orange-400/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            Clip {clip.clipIndex}
            <Badge variant="secondary" className="font-mono font-normal">
              {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
            </Badge>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {clip.duration} seconds
          </CardDescription>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-4xl font-mono font-bold text-primary flex items-center gap-1 drop-shadow-[0_0_10px_rgba(255,69,0,0.5)]">
            {clip.viralScore}
          </div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Viral Score</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm leading-relaxed text-foreground/90 bg-black/20 p-4 rounded-md border border-border/50">
          {clip.viralAnalysis}
        </p>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Key Factors
          </h4>
          <div className="flex flex-wrap gap-2">
            {clip.viralFactors.map((factor, i) => (
              <Badge key={i} variant="outline" className="bg-primary/5 border-primary/20 text-primary-foreground/90">
                {factor}
              </Badge>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <Button 
            className="w-full gap-2 font-semibold tracking-wide shadow-[0_0_20px_-5px_rgba(255,69,0,0.4)]" 
            size="lg" 
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" /> Download Clip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

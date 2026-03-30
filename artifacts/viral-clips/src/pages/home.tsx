import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAnalyzeVideo, getListJobsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { JobProgress } from "@/components/job-progress";
import { HistorySidebar } from "@/components/history-sidebar";
import { useToast } from "@/hooks/use-toast";
import { Flame, Youtube, Scissors, Loader2, Sparkles } from "lucide-react";

const formSchema = z.object({
  videoUrl: z.string().url({ message: "Please enter a valid URL." }),
  clipDuration: z.enum(["30", "40", "60"]),
  clipCount: z.number().min(1).max(10),
});

export default function Home() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const analyzeMutation = useAnalyzeVideo();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      videoUrl: "",
      clipDuration: "60",
      clipCount: 5,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    analyzeMutation.mutate(
      {
        data: {
          videoUrl: values.videoUrl,
          clipDuration: parseInt(values.clipDuration) as 30 | 40 | 60,
          clipCount: values.clipCount,
        },
      },
      {
        onSuccess: (response) => {
          setActiveJobId(response.jobId);
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          toast({
            title: "Extraction Started",
            description: "Your video is being processed. This may take a few minutes.",
          });
          form.reset({ videoUrl: "", clipDuration: values.clipDuration, clipCount: values.clipCount });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Failed to start extraction",
            description: error.error || "An unexpected error occurred.",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/30">
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-12 relative z-10">
        <header className="flex items-center gap-3 mb-16 pb-6 border-b border-border/40">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(255,69,0,0.3)]">
            <Flame className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              VIRAL CLIP MAKER
            </h1>
            <p className="text-sm text-primary font-medium tracking-widest uppercase">Creator Studio</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            {/* Input Section */}
            <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-2xl">
              <CardHeader className="pb-6">
                <CardTitle className="text-3xl font-bold tracking-tight">Extract Viral Gold</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Drop a YouTube link, set your parameters, and let our AI find the moments with the highest viral potential.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                      control={form.control}
                      name="videoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Video URL</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Youtube className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                              </div>
                              <Input 
                                placeholder="https://www.youtube.com/watch?v=..." 
                                className="pl-12 h-14 text-lg bg-black/40 border-border/50 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormField
                        control={form.control}
                        name="clipDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Target Duration</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 bg-black/20 border-border/50 rounded-lg">
                                  <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="30">30 Seconds (TikTok / Reels)</SelectItem>
                                <SelectItem value="40">40 Seconds (Shorts Sweetspot)</SelectItem>
                                <SelectItem value="60">60 Seconds (Full Shorts)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="clipCount"
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Number of Clips</FormLabel>
                              <span className="font-mono text-primary font-bold">{field.value}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={1}
                                max={10}
                                step={1}
                                value={[field.value]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                                className="[&_[role=slider]]:border-primary [&_[role=slider]]:bg-primary [&_[role=slider]]:shadow-[0_0_10px_rgba(255,69,0,0.5)]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={analyzeMutation.isPending} 
                      className="w-full h-14 text-lg font-bold tracking-wide rounded-xl shadow-[0_0_30px_-5px_rgba(255,69,0,0.4)] hover:shadow-[0_0_40px_-5px_rgba(255,69,0,0.6)] transition-all group"
                    >
                      {analyzeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing Video...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5 group-hover:animate-pulse" /> EXTRACT VIRAL CLIPS
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Results Section */}
            {activeJobId && (
              <div className="pt-6 border-t border-border/30">
                <JobProgress jobId={activeJobId} />
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-8">
              <HistorySidebar onSelectJob={setActiveJobId} activeJobId={activeJobId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

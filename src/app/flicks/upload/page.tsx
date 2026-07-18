'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
  Film,
  Clock,
  Maximize2,
  HardDrive,
  RefreshCw,
  Hash,
  AtSign,
  ChevronDown,
  Search,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { cn, parseJsonResponse } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const uploadVideoSchema = z.object({
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  movieTitle: z.string()
    .min(1, 'Movie title is required'),
  movieYear: z.string()
    .regex(/^\d{4}$/, 'Please enter a valid year'),
  tmdbId: z.string().optional(),
  movieMediaType: z.enum(['movie', 'tv']).optional(),
  moviePosterUrl: z.string().optional(),
  movieBackdropUrl: z.string().optional(),
});

type UploadVideoForm = z.infer<typeof uploadVideoSchema>;

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

type TmdbResult = {
  tmdbId: number;
  title: string;
  year: string;
  posterUrl: string;
  backdropUrl: string;
  mediaType: string;
};

const SUGGESTED_TAGS = [
  'action',
  'romance',
  'thriller',
  'comedy',
  'drama',
  'nollywood',
  'horror',
  'animation',
  'sci-fi',
  'documentary',
];

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold leading-none">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function MetaPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] text-muted-foreground">
      <Icon className="size-3" />
      {label}
    </span>
  );
}

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds)) return '0:00';
  const seconds = Math.round(totalSeconds);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FlicksUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoResolution, setVideoResolution] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const form = useForm<UploadVideoForm>({
    resolver: zodResolver(uploadVideoSchema),
    defaultValues: {
      description: '',
      movieTitle: '',
      movieYear: new Date().getFullYear().toString(),
      tmdbId: undefined,
      movieMediaType: undefined,
      moviePosterUrl: undefined,
      movieBackdropUrl: undefined,
    },
  });

  const [tmdbSearch, setTmdbSearch] = useState('');
  const [tmdbResults, setTmdbResults] = useState<TmdbResult[]>([]);
  const [showTmdbDropdown, setShowTmdbDropdown] = useState(false);
  const [selectedMediaType, setSelectedMediaType] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [isTagSuggestionsLoading, setIsTagSuggestionsLoading] = useState(false);

  useEffect(() => {
    if (!tmdbSearch.trim()) {
      setTmdbResults([]);
      setShowTmdbDropdown(false);
      return;
    }

    const handler = window.setTimeout(async () => {
      try {
        const query = encodeURIComponent(tmdbSearch.trim());
        const response = await fetch(`/api/tmdb/search?q=${query}`);
        if (!response.ok) {
          setTmdbResults([]);
          return;
        }

        try {
          const data = await parseJsonResponse(response as unknown as Response);
          setTmdbResults(data?.results ?? []);
        } catch {
          setTmdbResults([]);
        }
        setShowTmdbDropdown(true);
      } catch {
        setTmdbResults([]);
      }
    }, 400);

    return () => window.clearTimeout(handler);
  }, [tmdbSearch]);

  useEffect(() => {
    let isActive = true;
    const query = tagInput.trim().toLowerCase();
    const timer = window.setTimeout(async () => {
      if (!isActive) return;
      setIsTagSuggestionsLoading(true);

      try {
        const response = await fetch(`/api/flicks/tags?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
          setTagSuggestions([]);
          return;
        }

        const data = await parseJsonResponse(response as unknown as Response);
        if (!isActive) return;
        setTagSuggestions(Array.isArray(data?.tags) ? data.tags : []);
      } catch {
        if (isActive) setTagSuggestions([]);
      } finally {
        if (isActive) setIsTagSuggestionsLoading(false);
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [tagInput]);

  const addTag = (value: string) => {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!normalized || tags.includes(normalized) || tags.length >= 5) return;
    if (normalized.length > 20) return;
    setTags(prev => [...prev, normalized]);
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(item => item !== tag));

  const handleTagInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
  };

  const selectTmdbResult = (result: TmdbResult) => {
    setTmdbSearch('');
    setTmdbResults([]);
    setShowTmdbDropdown(false);
    setSelectedMediaType(result.mediaType || '');
    form.setValue('movieTitle', result.title);
    form.setValue('movieYear', result.year);
    form.setValue('tmdbId', result.tmdbId.toString());
    form.setValue('moviePosterUrl', result.posterUrl);
    form.setValue('movieBackdropUrl', result.backdropUrl);
  };

  const clearSelectedMovie = () => {
    form.setValue('tmdbId', undefined);
    form.setValue('moviePosterUrl', undefined);
    form.setValue('movieBackdropUrl', undefined);
    setSelectedMediaType('');
    setTmdbSearch('');
    setTmdbResults([]);
    setShowTmdbDropdown(false);
  };

  const selectedMovie = form.watch('tmdbId') ? {
    title: form.watch('movieTitle'),
    year: form.watch('movieYear'),
    posterUrl: form.watch('moviePosterUrl'),
    backdropUrl: form.watch('movieBackdropUrl'),
  } : null;

  const handleFileSelect = (file: File) => {
    // Validate file type and size
    if (!file.type.startsWith('video/')) {
      toast.error('Invalid file type', {
        description: 'Please select a video file',
      });
      return;
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB limit
      toast.error('File too large', {
        description: 'Maximum file size is 500MB',
      });
      return;
    }

    setSelectedFile(file);
    setVideoDuration(null);
    setVideoResolution('');

    // Create preview
    const preview = URL.createObjectURL(file);
    setVideoPreview(preview);
  };

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el) return;
    setVideoDuration(el.duration);
    setVideoResolution(`${el.videoWidth}\u00d7${el.videoHeight}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setVideoPreview('');
    setVideoDuration(null);
    setVideoResolution('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: UploadVideoForm) => {
    if (!selectedFile) {
      toast.error('No video selected', {
        description: 'Please select a video file to upload',
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('description', data.description || '');
      formData.append('movieTitle', data.movieTitle);
      formData.append('movieYear', data.movieYear);
      formData.append('tmdbId', data.tmdbId || '');
      formData.append('movieMediaType', selectedMediaType || '');
      formData.append('moviePosterUrl', data.moviePosterUrl || '');
      formData.append('movieBackdropUrl', data.movieBackdropUrl || '');
      formData.append('tags', JSON.stringify(tags));

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (!prev) return { loaded: 10, total: 100, percentage: 10 };
          const nextPercentage = Math.min(prev.percentage + Math.random() * 20, 90);
          return {
            loaded: nextPercentage,
            total: 100,
            percentage: Math.floor(nextPercentage),
          };
        });
      }, 300);

      const response = await fetch('/api/flicks/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        try {
          const error = await parseJsonResponse(response as unknown as Response);
          throw new Error(error?.error || 'Failed to upload video');
        } catch (err) {
          throw new Error(err instanceof Error ? err.message : 'Failed to upload video');
        }
      }

      setUploadProgress({
        loaded: 100,
        total: 100,
        percentage: 100,
      });

      setUploadSuccess(true);
      toast.success('Video uploaded successfully', {
        description: 'Your flick has been added to the feed',
      });

      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  if (uploadSuccess) {
    return (
      <main className="relative flex h-svh items-center justify-center overflow-hidden bg-background font-sans">
        <div className="animate-success-pop flex flex-col items-center gap-4 px-6 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Flick uploaded</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Your scene is now live on the feed</p>
          </div>
        </div>
        <style jsx global>{`
          @keyframes successPop {
            0% { opacity: 0; transform: scale(0.85); }
            60% { opacity: 1; transform: scale(1.04); }
            100% { transform: scale(1); }
          }
          .animate-success-pop { animation: successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        `}</style>
      </main>
    );
  }

  const descriptionValue = form.watch('description') || '';
  const hashtags = Array.from(descriptionValue.matchAll(/#[a-zA-Z0-9_]+/g)).map(m => m[0]);
  const mentions = Array.from(descriptionValue.matchAll(/@[a-zA-Z0-9_]+/g)).map(m => m[0]);
  const remainingTags = 5 - tags.length;

  return (
    <main className="relative flex h-svh flex-col overflow-hidden bg-background font-sans">
      {/* Header */}
      <header className="z-20 shrink-0 border-b border-white/5 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[720px] items-center gap-3 px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0 rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">New Flick</h1>
            <p className="text-xs text-muted-foreground">Share a scene with the fanbiQ community</p>
          </div>
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto max-w-[720px] space-y-5 px-4 py-6 pb-10 sm:px-6">
              {/* Video Upload / Preview */}
              <section aria-label="Video upload">
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    className={cn(
                      'group relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-16 text-center transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      isDragging
                        ? 'scale-[1.01] border-primary bg-primary/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-16 items-center justify-center rounded-full bg-primary/10 transition-transform duration-300',
                        isDragging ? 'scale-110' : 'group-hover:scale-105'
                      )}
                    >
                      <Upload className="size-7 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold">Drop your video here</p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse &middot; MP4, WebM, or other formats up to 500MB
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">
                      <Film className="size-3.5" /> 15–60s recommended
                    </span>
                  </div>
                ) : (
                  <div className="animate-fade-scale-in overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
                    <div className="relative aspect-[9/16] max-h-[420px] bg-black">
                      <video
                        ref={videoRef}
                        src={videoPreview}
                        controls
                        onLoadedMetadata={handleLoadedMetadata}
                        className="h-full w-full object-contain"
                      />
                      {isUploading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
                          <div className="relative size-14">
                            <svg className="size-14 -rotate-90" viewBox="0 0 56 56">
                              <circle cx="28" cy="28" r="24" strokeWidth="4" className="fill-none stroke-white/10" />
                              <circle
                                cx="28"
                                cy="28"
                                r="24"
                                strokeWidth="4"
                                strokeLinecap="round"
                                className="fill-none stroke-primary transition-all duration-300"
                                style={{
                                  strokeDasharray: 2 * Math.PI * 24,
                                  strokeDashoffset:
                                    2 * Math.PI * 24 * (1 - (uploadProgress?.percentage || 0) / 100),
                                }}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                              {uploadProgress?.percentage || 0}%
                            </span>
                          </div>
                          <p className="text-xs text-white/70">Uploading your flick…</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {videoDuration != null && <MetaPill icon={Clock} label={formatDuration(videoDuration)} />}
                          {videoResolution && <MetaPill icon={Maximize2} label={videoResolution} />}
                          <MetaPill icon={HardDrive} label={`${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`} />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex-1 gap-1.5 rounded-xl active:scale-95"
                        >
                          <RefreshCw className="size-3.5" /> Replace
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearFile}
                          disabled={isUploading}
                          className="flex-1 gap-1.5 rounded-xl text-destructive hover:text-destructive active:scale-95"
                        >
                          <X className="size-3.5" /> Remove
                        </Button>
                      </div>

                      {isUploading && uploadProgress && (
                        <div className="space-y-1.5">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="relative h-full overflow-hidden rounded-full bg-primary transition-all duration-300"
                              style={{ width: `${uploadProgress.percentage}%` }}
                            >
                              <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                            </div>
                          </div>
                          <p className="text-right text-xs text-muted-foreground">
                            {uploadProgress.percentage}% uploaded
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </section>

              {/* Caption */}
              <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                <SectionHeader icon={Sparkles} title="Caption" subtitle="Give viewers the story" />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                          Description
                        </FormLabel>
                        <span
                          className={cn(
                            'text-xs',
                            (field.value?.length || 0) > 500 ? 'text-destructive' : 'text-muted-foreground'
                          )}
                        >
                          {field.value?.length || 0}/500
                        </span>
                      </div>
                      <FormControl>
                        <textarea
                          placeholder="Add a caption... use #hashtags and @mentions"
                          disabled={isUploading}
                          rows={4}
                          className="w-full resize-none rounded-xl border border-input bg-background/40 px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {(hashtags.length > 0 || mentions.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {hashtags.map((h, i) => (
                            <span
                              key={`h-${i}`}
                              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                            >
                              <Hash className="size-2.5" />
                              {h.slice(1)}
                            </span>
                          ))}
                          {mentions.map((m, i) => (
                            <span
                              key={`m-${i}`}
                              className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400"
                            >
                              <AtSign className="size-2.5" />
                              {m.slice(1)}
                            </span>
                          ))}
                        </div>
                      )}
                      {hashtags.length === 0 && mentions.length === 0 && (
                        <div className="flex items-center gap-3 pt-0.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Hash className="size-3" /> hashtags
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <AtSign className="size-3" /> mentions
                          </span>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </section>

              {/* Movie / TV Association */}
              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                <SectionHeader icon={Film} title="Movie / TV association" subtitle="Link this flick to a title" />

                {!selectedMovie ? (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={tmdbSearch}
                      onChange={(event) => {
                        setTmdbSearch(event.target.value);
                        setShowTmdbDropdown(true);
                      }}
                      placeholder="Search movies or shows on TMDB"
                      disabled={isUploading}
                      className="h-11 rounded-xl pl-9"
                    />
                    {showTmdbDropdown && tmdbResults.length > 0 && (
                      <div className="animate-fade-scale-in absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur-xl">
                        {tmdbResults.map((result) => (
                          <button
                            key={result.tmdbId}
                            type="button"
                            onClick={() => selectTmdbResult(result)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5 active:bg-white/10"
                          >
                            <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
                              {result.posterUrl ? (
                                <img src={result.posterUrl} alt={result.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] text-muted-foreground">
                                  No image
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{result.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {result.year || 'Unknown year'}
                                {result.mediaType ? ` · ${result.mediaType}` : ''}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="animate-fade-scale-in flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    {selectedMovie.posterUrl ? (
                      <img
                        src={selectedMovie.posterUrl}
                        alt={selectedMovie.title}
                        className="h-16 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[9px] text-muted-foreground">
                        No image
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{selectedMovie.title}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{selectedMovie.year}</span>
                        {selectedMediaType && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                            {selectedMediaType}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={clearSelectedMovie}
                      className="shrink-0 rounded-full"
                      disabled={isUploading}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
                  <FormField
                    control={form.control}
                    name="movieTitle"
                    render={({ field }) => (
                      <FormItem className="col-span-2 sm:col-span-1">
                        <FormLabel className="text-xs text-muted-foreground">Movie title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Dune: Part Two"
                            disabled={isUploading}
                            className="h-10 rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="movieYear"
                    render={({ field }) => (
                      <FormItem className="col-span-2 sm:col-span-1">
                        <FormLabel className="text-xs text-muted-foreground">Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2024"
                            disabled={isUploading}
                            min="1900"
                            max={new Date().getFullYear() + 1}
                            className="h-10 rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Tags */}
              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <SectionHeader icon={Hash} title="Tags" subtitle="Help people discover this flick" />
                  <span className="shrink-0 text-xs text-muted-foreground">{tags.length}/5</span>
                </div>

                <Input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder={remainingTags > 0 ? 'Type a tag and press Enter' : 'Tag limit reached'}
                  disabled={isUploading || tags.length >= 5}
                  className="h-11 rounded-xl"
                />

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => removeTag(tag)}
                        disabled={isUploading}
                        className="group inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/25 active:scale-95"
                      >
                        {tag}
                        <X className="size-3 opacity-60 transition-opacity group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">Popular tags</p>
                    {isTagSuggestionsLoading && (
                      <span className="text-xs italic text-muted-foreground">Loading…</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(tagSuggestions.length ? tagSuggestions : SUGGESTED_TAGS)
                      .filter((tag) => !tags.includes(tag))
                      .slice(0, 12)
                      .map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          disabled={tags.length >= 5 || isUploading}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/50 hover:text-primary active:scale-95 disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-muted-foreground"
                        >
                          + {tag}
                        </button>
                      ))}
                  </div>
                </div>
              </section>

              {/* Upload Guidelines */}
              <details className="group rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium focus-visible:outline-none">
                  <AlertCircle className="size-4 shrink-0 text-blue-400" />
                  Upload guidelines
                  <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <ul className="mt-3 space-y-1.5 pl-6 text-xs text-muted-foreground">
                  <li>Keep videos between 15–60 seconds</li>
                  <li>Ensure you have rights to the content</li>
                  <li>No watermarks or external branding</li>
                </ul>
              </details>
            </div>
          </div>

          {/* Sticky bottom action bar */}
          <div className="z-20 shrink-0 border-t border-white/5 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-[720px] items-center gap-3 px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isUploading}
                className="flex-1 rounded-2xl active:scale-95"
                size="lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="relative flex-[2] overflow-hidden rounded-2xl active:scale-95"
                size="lg"
              >
                {isUploading ? `Uploading… ${uploadProgress?.percentage || 0}%` : 'Upload Flick'}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 1.5s infinite; }

        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.97) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-scale-in { animation: fadeScaleIn 0.18s ease-out; }

        @media (prefers-reduced-motion: reduce) {
          .animate-shimmer, .animate-fade-scale-in, .animate-success-pop {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
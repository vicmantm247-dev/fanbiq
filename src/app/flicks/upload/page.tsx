'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, X } from 'lucide-react';
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
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  movieTitle: z.string()
    .min(1, 'Movie title is required'),
  movieYear: z.string()
    .regex(/^\d{4}$/, 'Please enter a valid year'),
  tmdbId: z.string().optional(),
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

export default function FlicksUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const form = useForm<UploadVideoForm>({
    resolver: zodResolver(uploadVideoSchema),
    defaultValues: {
      title: '',
      description: '',
      movieTitle: '',
      movieYear: new Date().getFullYear().toString(),
      tmdbId: undefined,
      moviePosterUrl: undefined,
      movieBackdropUrl: undefined,
    },
  });

  const [tmdbSearch, setTmdbSearch] = useState('');
  const [tmdbResults, setTmdbResults] = useState<TmdbResult[]>([]);
  const [showTmdbDropdown, setShowTmdbDropdown] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

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

    // Create preview
    const preview = URL.createObjectURL(file);
    setVideoPreview(preview);
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
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('movieTitle', data.movieTitle);
      formData.append('movieYear', data.movieYear);
      formData.append('tmdbId', data.tmdbId || '');
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
      <main className="relative overflow-hidden h-svh pt-[env(safe-area-inset-top)] font-sans bg-background">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="size-16 text-green-500 animate-bounce" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Upload Successful!</h2>
              <p className="text-muted-foreground mt-2">Your flick has been added to the feed</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative overflow-hidden h-svh pt-[env(safe-area-inset-top)] font-sans bg-background">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 pt-[calc(env(safe-area-inset-top)+12px)] border-b">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold">Upload Flick</h1>
        </div>
      </div>

      {/* Main content */}
      <div className="absolute inset-0 top-20 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6 pb-12">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Video Upload Area */}
              <Card className="border-2 border-dashed">
                {selectedFile ? (
                  <div className="p-6 space-y-4">
                    {/* Video Preview */}
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        src={videoPreview}
                        controls
                        className="w-full max-h-48 object-cover"
                      />
                    </div>


                    {/* File Info */}
                    <div className="space-y-2 p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={clearFile}
                          disabled={isUploading}
                          className="rounded-full flex-shrink-0"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>

                      {/* Upload Progress */}
                      {isUploading && uploadProgress && (
                        <div className="space-y-2">
                          <div className="w-full bg-muted-foreground/20 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all duration-300"
                              style={{ width: `${uploadProgress.percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            {uploadProgress.percentage}% uploaded
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      'p-8 cursor-pointer transition-colors text-center space-y-3',
                      isDragging ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="flex justify-center">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Upload className="size-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">MP4, WebM, or other video formats up to 500MB</p>
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
              </Card>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scene Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Epic fight scene"
                          disabled={isUploading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <textarea
                          placeholder="Add a caption or description"
                          disabled={isUploading}
                          rows={3}
                          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* TMDB Search */}
                <div className="space-y-3">
                  <FormLabel>Search TMDB</FormLabel>
                  <div className="relative">
                    <Input
                      value={tmdbSearch}
                      onChange={(event) => {
                        setTmdbSearch(event.target.value);
                        setShowTmdbDropdown(true);
                      }}
                      placeholder="Search by movie or show title"
                      disabled={isUploading}
                    />
                    {showTmdbDropdown && tmdbResults.length > 0 && (
                      <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                        {tmdbResults.map((result) => (
                          <button
                            key={result.tmdbId}
                            type="button"
                            onClick={() => selectTmdbResult(result)}
                            className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted"
                          >
                            <div className="h-12 w-8 overflow-hidden rounded-lg bg-slate-950">
                              {result.posterUrl ? (
                                <img src={result.posterUrl} alt={result.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                                  No image
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{result.title}</p>
                              <p className="text-xs text-muted-foreground">{result.year || 'Unknown year'}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedMovie && (
                    <div className="flex items-center gap-3 rounded-xl border border-input bg-muted p-3">
                      {selectedMovie.posterUrl ? (
                        <img src={selectedMovie.posterUrl} alt={selectedMovie.title} className="h-16 w-12 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-16 w-12 items-center justify-center rounded-md bg-slate-950 text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{selectedMovie.title}</p>
                        <p className="text-xs text-muted-foreground">{selectedMovie.year}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearSelectedMovie}
                        className="ml-auto rounded-full"
                        disabled={isUploading}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <FormLabel>Tags</FormLabel>
                  <Input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Add tags with Enter or comma"
                    disabled={isUploading || tags.length >= 5}
                  />
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                      >
                        {tag}
                        <X className="ml-2 size-3" />
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="rounded-full border border-input px-3 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
                        disabled={tags.includes(tag) || tags.length >= 5}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Movie Title */}
                <FormField
                  control={form.control}
                  name="movieTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Movie Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Dune: Part Two"
                          disabled={isUploading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Movie Year */}
                <FormField
                  control={form.control}
                  name="movieYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Movie Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2024"
                          disabled={isUploading}
                          min="1900"
                          max={new Date().getFullYear() + 1}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Info Alert */}
              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
                <div className="flex gap-2">
                  <AlertCircle className="size-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Upload Guidelines</p>
                    <ul className="text-xs space-y-1">
                      <li>• Keep videos between 15-60 seconds</li>
                      <li>• Ensure you have rights to the content</li>
                      <li>• No watermarks or external branding</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="w-full"
                size="lg"
              >
                {isUploading
                  ? `Uploading... ${uploadProgress?.percentage || 0}%`
                  : 'Upload Flick'
                }
              </Button>

              {/* Cancel Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isUploading}
                className="w-full"
                size="lg"
              >
                Cancel
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </main>
  );
}

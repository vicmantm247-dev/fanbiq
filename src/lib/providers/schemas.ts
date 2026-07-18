import { z } from 'zod';

/**
 * TMDB API Schemas
 * Docs: https://developer.themoviedb.org/reference/intro/getting-started
 */
export const TmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().optional(),
  overview: z.string().optional(),
  release_date: z.string().optional(),
  vote_average: z.number().optional(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  genre_ids: z.array(z.number()).optional(),
  runtime: z.number().optional(),
  tagline: z.string().optional(),
});

export const TmdbSearchResponseSchema = z.object({
  page: z.number(),
  results: z.array(TmdbMovieSchema),
  total_pages: z.number(),
  total_results: z.number(),
});

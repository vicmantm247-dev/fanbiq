import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
    }

    const token = process.env.TMDB_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'TMDB access token is not configured' }, { status: 500 });
    }

    const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'TMDB search failed' }, { status: 502 });
    }

    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];

    const buildImageUrl = (path: string) =>
      path ? `https://image.tmdb.org/t/p/w500${path.startsWith('/') ? path : `/${path}`}` : '';

    const mapped = results
      .filter((item: any) => item.media_type === 'movie')
      .slice(0, 6)
      .map((item: any) => {
        const posterPath = item.poster_path || '';
        const backdropPath = item.backdrop_path || '';
        return {
          tmdbId: item.id,
          title: item.title || item.name || '',
          year: (item.release_date || item.first_air_date || '').slice(0, 4),
          posterPath,
          backdropPath,
          posterUrl: buildImageUrl(posterPath),
          backdropUrl: buildImageUrl(backdropPath),
        };
      });

    return NextResponse.json({ results: mapped });
  } catch (error) {
    return NextResponse.json({ error: 'TMDB search failed' }, { status: 502 });
  }
}

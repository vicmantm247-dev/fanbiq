import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || url.searchParams.get('name') || '';
    const type = url.searchParams.get('type') || 'movie';
    const imdbId = url.searchParams.get('imdbId') || url.searchParams.get('imdb_id');
    const tmdbId = url.searchParams.get('tmdbId') || url.searchParams.get('tmdb_id');

    const apiKey = process.env.WATCHMODE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'WatchMode API key not configured' }, { status: 500 });

    // If imdbId provided, search by imdb_id (most accurate)
    if (imdbId) {
      const endpoint = `https://api.watchmode.com/v1/search/?search_field=imdb_id&search_value=${encodeURIComponent(imdbId)}&apiKey=${apiKey}`;
      const res = await fetch(endpoint);
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    }

    // If tmdbId provided, try to resolve to imdb via TMDB (requires TMDB_API_KEY)
    if (tmdbId) {
      const tmdbKey = process.env.TMDB_API_KEY;
      if (!tmdbKey) {
        return NextResponse.json({ error: 'TMDB API key required to resolve tmdbId to imdb' }, { status: 400 });
      }
      const tmdbType = (type === 'tv') ? 'tv' : 'movie';
      const tmdbEndpoint = `https://api.themoviedb.org/3/${tmdbType}/${encodeURIComponent(tmdbId)}/external_ids?api_key=${tmdbKey}`;
      const tmdbRes = await fetch(tmdbEndpoint);
      if (tmdbRes.ok) {
        const tmdbJson = await tmdbRes.json();
        const imdb = tmdbJson.imdb_id;
        if (imdb) {
          const endpoint = `https://api.watchmode.com/v1/search/?search_field=imdb_id&search_value=${encodeURIComponent(imdb)}&apiKey=${apiKey}`;
          const res = await fetch(endpoint);
          const json = await res.json();
          return NextResponse.json(json, { status: res.status });
        }
      }
      // fall through to name search if no imdb
    }

    // Default: search by name
    const wmType = type === 'tv' ? 'tv_series' : 'movie';
    const endpoint = `https://api.watchmode.com/v1/search/?search_field=name&search_value=${encodeURIComponent(q)}&types=${wmType}&apiKey=${apiKey}`;
    const res = await fetch(endpoint);
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

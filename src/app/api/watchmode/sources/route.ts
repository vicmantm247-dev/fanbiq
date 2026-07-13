import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const regions = url.searchParams.get('regions') || 'US';
    const imdbId = url.searchParams.get('imdbId') || url.searchParams.get('imdb_id');
    const tmdbId = url.searchParams.get('tmdbId') || url.searchParams.get('tmdb_id');
    const apiKey = process.env.WATCHMODE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'WatchMode API key not configured' }, { status: 500 });
    let wmId = id;

    // If imdbId provided, resolve WatchMode title id via search
    if (!wmId && imdbId) {
      const sres = await fetch(`https://api.watchmode.com/v1/search/?search_field=imdb_id&search_value=${encodeURIComponent(imdbId)}&apiKey=${apiKey}`);
      if (sres.ok) {
        const sjson = await sres.json();
        wmId = (sjson.title_results||[])[0]?.id;
      }
    }

    // If still not found and tmdbId provided, try to resolve via TMDB -> imdb
    if (!wmId && tmdbId) {
      const tmdbKey = process.env.TMDB_API_KEY;
      if (tmdbKey) {
        const tmdbType = 'movie';
        const tmdbEndpoint = `https://api.themoviedb.org/3/${tmdbType}/${encodeURIComponent(tmdbId)}/external_ids?api_key=${tmdbKey}`;
        const tmdbRes = await fetch(tmdbEndpoint);
        if (tmdbRes.ok) {
          const tmdbJson = await tmdbRes.json();
          const imdb = tmdbJson.imdb_id;
          if (imdb) {
            const sres = await fetch(`https://api.watchmode.com/v1/search/?search_field=imdb_id&search_value=${encodeURIComponent(imdb)}&apiKey=${apiKey}`);
            if (sres.ok) {
              const sjson = await sres.json();
              wmId = (sjson.title_results||[])[0]?.id;
            }
          }
        }
      }
    }

    if (!wmId) return NextResponse.json({ error: 'Missing id and unable to resolve from imdbId/tmdbId' }, { status: 400 });

    const endpoint = `https://api.watchmode.com/v1/title/${encodeURIComponent(wmId)}/sources/?regions=${encodeURIComponent(regions)}&apiKey=${apiKey}`;
    const res = await fetch(endpoint);
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

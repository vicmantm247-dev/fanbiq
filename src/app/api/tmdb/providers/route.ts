import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const region = searchParams.get('region') || 'US';
    const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
    const token = process.env.TMDB_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json({ error: 'TMDB access token is not configured' }, { status: 500 });
    }

    const url = `https://api.themoviedb.org/3/watch/providers/${type}?watch_region=${encodeURIComponent(region)}&language=en-US`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      return NextResponse.json({ error: 'TMDB providers fetch failed', details }, { status: res.status });
    }

    const data = await res.json();
    const providers = Array.isArray(data.results)
      ? data.results.map((provider: any) => ({
          Id: provider.provider_id?.toString() || '',
          Name: provider.provider_name || '',
          LogoPath: provider.logo_path ? (provider.logo_path.startsWith('/') ? provider.logo_path : `/${provider.logo_path}`) : '',
        }))
      : [];

    return NextResponse.json({ providers });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

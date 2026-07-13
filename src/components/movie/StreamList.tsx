"use client"

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface Props {
  movieName: string;
  mediaType: 'movie' | 'tv';
}

const AVAILABLE_REGIONS = ["US","GB","CA","AU","NG","FR","DE"];

const normalizeProviderName = (value: string) =>
  value?.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

export default function StreamList({ movieName, mediaType }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<any[] | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(["US"]);
  const [tmdbProviderLogos, setTmdbProviderLogos] = useState<Record<string, string>>({});
  const [tmdbProvidersError, setTmdbProvidersError] = useState<string | null>(null);

  function toggleRegion(code: string) {
    setSelectedRegions(prev => prev.includes(code) ? prev.filter(c=>c!==code) : [...prev, code]);
  }

  const tmdbProviderLogoMap = useMemo(() => {
    return Object.entries(tmdbProviderLogos).reduce<Record<string, string>>((acc, [id, logo]) => {
      if (id && logo) acc[id] = logo;
      return acc;
    }, {});
  }, [tmdbProviderLogos]);

  useEffect(() => {
    async function fetchTmdbProviders() {
      try {
        const region = selectedRegions[0] || 'US';
        const type = mediaType === 'tv' ? 'tv' : 'movie';
        const res = await fetch(`/api/tmdb/providers?region=${encodeURIComponent(region)}&type=${type}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || 'Failed to load TMDB providers');
        }

        const json = await res.json();
        const map: Record<string, string> = {};
        (json.providers || []).forEach((provider: any) => {
          if (provider.Id && provider.LogoPath) {
            map[provider.Id] = provider.LogoPath;
          }
          if (provider.Name) {
            map[normalizeProviderName(provider.Name)] = provider.LogoPath || '';
          }
        });
        setTmdbProviderLogos(map);
        setTmdbProvidersError(null);
      } catch (err: any) {
        setTmdbProvidersError(err?.message || String(err));
      }
    }

    fetchTmdbProviders();
  }, [mediaType, selectedRegions]);

  async function fetchSources() {
    setLoading(true); setError(null); setSources(null);
    try {
      // First search to get WatchMode title id
      const params: string[] = [];
      params.push(`q=${encodeURIComponent(movieName)}`);
      params.push(`type=${encodeURIComponent(mediaType)}`);

      const searchUrl = `/api/watchmode/search?${params.join('&')}`;
      const sres = await fetch(searchUrl);
      if (!sres.ok) {
        const ej = await sres.json().catch(()=>({}));
        throw new Error(ej?.error || 'Search failed');
      }
      const sjson = await sres.json();
      const hit = (sjson.title_results||[])[0];
      if (!hit) {
        setSources([]);
        setLoading(false);
        return;
      }
      const wmId = hit.id;
      const regionsParam = selectedRegions.join(',');
      const srcRes = await fetch(`/api/watchmode/sources?id=${encodeURIComponent(wmId)}&regions=${encodeURIComponent(regionsParam)}`);
      if (!srcRes.ok) {
        const ej = await srcRes.json().catch(()=>({}));
        throw new Error(ej?.error || 'Sources failed');
      }
      const srcJson = await srcRes.json();
      setSources(srcJson || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally { setLoading(false); }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Regions</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_REGIONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRegion(r)}
                className={`px-3 py-1 rounded-lg border ${selectedRegions.includes(r) ? 'bg-primary/20 border-primary' : 'bg-background/50 border-border'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <Button onClick={fetchSources} disabled={loading}>{loading ? 'Loading…' : `Fetch sources (${selectedRegions.join(',')})`}</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        {loading && <Skeleton className="h-36 w-full" />}
        {tmdbProvidersError && !loading && (
          <div className="text-sm text-muted-foreground mb-3">Unable to load provider logos: {tmdbProvidersError}</div>
        )}
        {error && <div className="text-red-400">{error}</div>}
        {sources && sources.length === 0 && <div className="text-muted-foreground">No streaming sources found.</div>}
        {sources && sources.length > 0 && (
          <div className="space-y-3">
            {sources.map((s, idx) => {
              const tmdbLogoUrl = s.source_id && tmdbProviderLogoMap[s.source_id.toString()];
              const normalizedName = normalizeProviderName(s.name || '');
              const tmdbNamedLogo = normalizedName ? tmdbProviderLogoMap[normalizedName] : undefined;
              const logoUrl = tmdbLogoUrl
                ? `https://image.tmdb.org/t/p/w92${tmdbLogoUrl}`
                : tmdbNamedLogo
                  ? `https://image.tmdb.org/t/p/w92${tmdbNamedLogo}`
                  : s.logo_100px;

              return (
                <div key={idx} className="flex items-center gap-3 p-2 border rounded-lg">
                  {logoUrl ? (
                    <OptimizedImage src={logoUrl} alt={s.name} width={60} height={40} className="w-16 h-10 object-contain" />
                  ) : (
                    <div className="w-16 h-10 bg-muted/20 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">{s.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{s.type}{s.price ? ` • ${s.price}` : ''}</div>
                  </div>
                  {s.web_url ? (
                    <a href={s.web_url} target="_blank" rel="noreferrer" className="ml-2">
                      <Button size="sm">Open</Button>
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

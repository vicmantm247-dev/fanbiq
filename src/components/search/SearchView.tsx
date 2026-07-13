'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  SearchFlickCard,
  SearchUserCard,
  type SearchFlickResult,
  type SearchUserResult,
} from './SearchResultCards';
import { MovieListItem } from '@/components/movie/MovieListItem';
import { SharedTabs } from '@/components/ui/shared-tabs';
import { useSearchUsers } from '@/hooks/api/use-search-users';
import { useSearchFlicks } from '@/hooks/api/use-search-flicks';
import { useSearchTmdb } from '@/hooks/api/use-search-tmdb';
import { useMovieDetail } from '@/components/movie/MovieDetailProvider';
import { TMDB_MOVIE_BASE_URL, TMDB_TV_BASE_URL } from '@/lib/constants';
import type { MergedLike } from '@/types';

// Inject the flickFadeUp keyframe once. Mirrors discovery-feed-1.html's @keyframes fadeUp.
const FLICK_KEYFRAMES = `
@keyframes flickFadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

// Each flick now carries a videoUrl (mp4). The video element's intrinsic
// aspect ratio determines the card height — no forced height is set —
// so different source videos produce naturally varying column heights,
// matching the masonry feel of discovery-feed-1.html.
function mapRemoteUser(user: {
  id: string;
  username: string;
  displayName: string;
  videoCount: number;
  profileImage?: string | null;
}): SearchUserResult {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    bio: `Creator in the catalog.`,
    followers: 0,
    videos: user.videoCount,
    avatarInitials: user.username.slice(0, 2).toUpperCase(),
    badges: ['Creator'],
    profilePicUrl: user.profileImage || undefined,
  };
}

/**
 * FlickMasonryGrid
 *
 * CSS `column-count: 2` masonry — identical strategy to .masonry in the HTML.
 * Cards have no forced height; the video element's intrinsic aspect ratio
 * determines each card's height, producing naturally uneven column packing.
 * break-inside: avoid prevents a single card from splitting across columns.
 */
function FlickMasonryGrid({ flicks }: { flicks: SearchFlickResult[] }) {
  return (
    <>
      <style>{FLICK_KEYFRAMES}</style>
      <div style={{ columnCount: 2, columnGap: '8px' }}>
        {flicks.map((flick, i) => (
          <div
            key={flick.id}
            style={{ breakInside: 'avoid', marginBottom: '8px' }}
          >
            <SearchFlickCard flick={flick} animationDelay={50 + i * 70} />
          </div>
        ))}
      </div>
    </>
  );
}

const RECENT_SEARCHES_KEY = 'fanbiq.recent-searches';
const RECENT_SEARCHES_LIMIT = 5;

type RecentSearchEntry = {
  label: string;
  category: 'flicks' | 'movies' | 'users';
};

function readRecentSearches(): RecentSearchEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is RecentSearchEntry => {
        return Boolean(value) && typeof value === 'object' && typeof (value as RecentSearchEntry).label === 'string' && ['flicks', 'movies', 'users'].includes((value as RecentSearchEntry).category);
      })
      .slice(0, RECENT_SEARCHES_LIMIT);
  } catch {
    return [];
  }
}

export function SearchView() {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);
  const {
    data: remoteFlicks = [],
    isLoading: isFlicksLoading,
    isError: isFlicksError,
  } = useSearchFlicks(query.trim());
  const {
    data: remoteMovies = [],
    isLoading: isMoviesLoading,
    isError: isMoviesError,
  } = useSearchTmdb(query.trim());
  const {
    data: remoteUsers = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
  } = useSearchUsers(query.trim());
  const { openMovie } = useMovieDetail();
  const [activeTab, setActiveTab] = useState<'all' | 'flicks' | 'movies' | 'users'>('all');

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  const addRecentSearch = useCallback((value: string, category: RecentSearchEntry['category']) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    setRecentSearches((current) => {
      const next = [
        { label: normalized, category },
        ...current.filter((entry) => entry.label.toLowerCase() !== normalized.toLowerCase() || entry.category !== category),
      ].slice(0, RECENT_SEARCHES_LIMIT);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      }

      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    }
  }, []);

  const removeRecentSearch = useCallback((target: RecentSearchEntry) => {
    setRecentSearches((current) => {
      const next = current.filter((entry) => entry.label !== target.label || entry.category !== target.category);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      }

      return next;
    });
  }, []);

  const handleSearchSubmit = useCallback((value?: string) => {
    const nextQuery = (value ?? query).trim();
    if (!nextQuery) {
      return;
    }

    setQuery(nextQuery);
    setActiveTab('all');
    addRecentSearch(nextQuery, 'users');
  }, [addRecentSearch, query]);

  const handleRecentSearchClick = useCallback((entry: RecentSearchEntry) => {
    setQuery(entry.label);
    setActiveTab('all');
    addRecentSearch(entry.label, entry.category);
  }, [addRecentSearch]);

  const filteredMovies = remoteMovies;
  const filteredFlicks = remoteFlicks;

  const filteredUsers = useMemo(() => remoteUsers.map(mapRemoteUser), [remoteUsers]);

  const getTmdbUrl = (movie: MergedLike) => {
    if (movie.mediaType === 'tv') {
      return `${TMDB_TV_BASE_URL}/${movie.Id}`;
    }
    return `${TMDB_MOVIE_BASE_URL}/${movie.Id}`;
  };

  const handleOpenMovie = (movie: MergedLike) => {
    openMovie(movie.Id, { mediaType: movie.mediaType });
  };

  const showPlaceholder = query.trim().length === 0;
  const noResults =
    !showPlaceholder &&
    filteredMovies.length + filteredFlicks.length + filteredUsers.length === 0;

  return (
    <main className="relative w-full h-screen flex flex-col bg-background text-foreground">
      {/* ── Search header ── */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-[calc((env(safe-area-inset-top)+20px)*1.5)] pb-4 flex-shrink-0">
        <div className="space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit(query);
            }}
            className="relative"
          >
            <Input
              placeholder="Search titles, movies, or users"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full rounded-full pr-18"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1/2 h-8 -translate-y-1/2 rounded-full px-3"
            >
              <Search className="size-4" />
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <SharedTabs
        tabs={[
          { label: 'All', value: 'all' },
          { label: 'Flicks', value: 'flicks' },
          { label: 'Movies/TV', value: 'movies' },
          { label: 'Users', value: 'users' },
        ]}
        activeValue={activeTab}
        onChange={(value) => setActiveTab(value as 'all' | 'flicks' | 'movies' | 'users')}
      />

      {/* ── Results ── */}
      <ScrollArea className="flex-1 h-[calc(100svh-200px)] w-full">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-20">
          <section className="space-y-4">
            {/* ALL */}
            {activeTab === 'all' && (
                <div className="space-y-6">
                  {showPlaceholder ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-lg font-semibold">Recent searches</p>
                        </div>
                        {recentSearches.length > 0 && (
                          <button
                            type="button"
                            onClick={clearRecentSearches}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {recentSearches.length > 0 ? (
                        <div className="space-y-2">
                          {recentSearches.map((item) => (
                            <div
                              key={`${item.category}:${item.label}`}
                              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-muted/60"
                            >
                              <button
                                type="button"
                                onClick={() => handleRecentSearchClick(item)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              >
                                <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                                  {item.label.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-semibold text-foreground">
                                    {item.label}
                                  </div>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRecentSearch(item)}
                                className="ml-auto flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                                aria-label={`Remove ${item.label}`}
                              >
                                <X className="size-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                          Your recent user searches will appear here.
                        </div>
                      )}
                    </div>
                  ) : noResults ? (
                    <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
                      No results matched your search. Try a different keyword.
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {isFlicksLoading && (
                        <Card className="border border-border bg-card p-8 text-center text-muted-foreground">
                          Searching flick previews for "{query}" …
                        </Card>
                      )}
                      {isFlicksError && (
                        <Card className="border border-border bg-card p-8 text-center text-destructive/80">
                          Unable to load flick previews right now.
                        </Card>
                      )}
                      {isMoviesLoading && (
                        <Card className="border border-border bg-card p-8 text-center text-muted-foreground">
                          Searching TMDB for movies and TV matching "{query}" …
                        </Card>
                      )}
                      {isMoviesError && (
                        <Card className="border border-border bg-card p-8 text-center text-destructive/80">
                          Unable to load movie results right now.
                        </Card>
                      )}
                      {isUsersLoading && (
                        <Card className="border border-border bg-card p-8 text-center text-muted-foreground">
                          Looking for users matching "{query}" …
                        </Card>
                      )}
                      {isUsersError && (
                        <Card className="border border-border bg-card p-8 text-center text-destructive/80">
                          Unable to load user results right now.
                        </Card>
                      )}

                      {filteredFlicks.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <h2 className="text-xl font-semibold">Flick previews</h2>
                              <p className="text-sm text-muted-foreground">
                                Short video highlights matching your query.
                              </p>
                            </div>
                            <Badge variant="secondary">{filteredFlicks.length} items</Badge>
                          </div>
                          <FlickMasonryGrid flicks={filteredFlicks} />
                        </div>
                      )}

                      {filteredMovies.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <h2 className="text-xl font-semibold">Movies & TV</h2>
                              <p className="text-sm text-muted-foreground">
                                Detailed title matches and recommendations.
                              </p>
                            </div>
                            <Badge variant="secondary">{filteredMovies.length} items</Badge>
                          </div>
                          <div className="space-y-2">
                            {filteredMovies.map((movie) => (
                              <MovieListItem
                                key={movie.Id}
                                movie={movie}
                                onClick={() => handleOpenMovie(movie)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {filteredUsers.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <h2 className="text-xl font-semibold">Users</h2>
                              <p className="text-sm text-muted-foreground">
                                Creators and curators related to your search.
                              </p>
                            </div>
                            <Badge variant="secondary">{filteredUsers.length} profiles</Badge>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-2">
                            {filteredUsers.map((user) => (
                              <SearchUserCard key={user.id} user={user} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
            )}

            {/* FLICKS */}
            {activeTab === 'flicks' && (
              showPlaceholder ? (
                  <Card className="border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                    Search for a scene, creator, or movie to discover flick previews.
                  </Card>
                ) : filteredFlicks.length === 0 ? (
                  <Card className="border border-border bg-card p-10 text-center text-muted-foreground">
                    No flicks found matching your search.
                  </Card>
                ) : (
                  <FlickMasonryGrid flicks={filteredFlicks} />
                )
            )}

            {/* MOVIES */}
            {activeTab === 'movies' && (
              showPlaceholder ? (
                  <Card className="border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                    Search movies and TV shows by title, genre, or synopsis.
                  </Card>
                ) : isMoviesLoading ? (
                  <Card className="border border-border bg-card p-10 text-center text-muted-foreground">
                    Searching TMDB results for "{query}" …
                  </Card>
                ) : isMoviesError ? (
                  <Card className="border border-border bg-card p-10 text-center text-destructive/80">
                    Unable to load movie results right now.
                  </Card>
                ) : filteredMovies.length === 0 ? (
                  <Card className="border border-border bg-card p-10 text-center text-muted-foreground">
                    No movie or TV results matched your query.
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredMovies.map((movie) => (
                      <MovieListItem
                        key={movie.Id}
                        movie={movie}
                        onClick={() => handleOpenMovie(movie)}
                      />
                    ))}
                  </div>
                )
            )}

            {/* USERS */}
            {activeTab === 'users' && (
              showPlaceholder ? (
                  <Card className="border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                    Search creator handles and profiles to connect with users.
                  </Card>
                ) : isUsersLoading ? (
                  <Card className="border border-border bg-card p-10 text-center text-muted-foreground">
                    Loading user profiles…
                  </Card>
                ) : isUsersError ? (
                  <Card className="border border-border bg-card p-10 text-center text-destructive/80">
                    Unable to load users. Please try again.
                  </Card>
                ) : filteredUsers.length === 0 ? (
                  <Card className="border border-border bg-card p-10 text-center text-muted-foreground">
                    No users found. Try a broader search term.
                  </Card>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {filteredUsers.map((user) => (
                      <SearchUserCard key={user.id} user={user} />
                    ))}
                  </div>
                )
            )}
          </section>
        </div>
      </ScrollArea>
    </main>
  );
}

export default SearchView;
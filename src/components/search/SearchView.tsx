'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useSearchUsers } from '@/hooks/api/use-search-users';
import { useSearchFlicks } from '@/hooks/api/use-search-flicks';
import { useSearchTmdb } from '@/hooks/api/use-search-tmdb';
import { useMovieDetail } from '@/components/movie/MovieDetailProvider';
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
}): SearchUserResult {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    bio: `Creator with ${user.videoCount} clip${user.videoCount === 1 ? '' : 's'} in the catalog.`,
    followers: 0,
    videos: user.videoCount,
    avatarInitials: user.username.slice(0, 2).toUpperCase(),
    badges: ['Creator'],
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

export function SearchView() {
  const [query, setQuery] = useState('');
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

  const filteredMovies = remoteMovies;
  const filteredFlicks = remoteFlicks;

  const filteredUsers = useMemo(() => remoteUsers.map(mapRemoteUser), [remoteUsers]);

  const showPlaceholder = query.trim().length === 0;
  const noResults =
    !showPlaceholder &&
    filteredMovies.length + filteredFlicks.length + filteredUsers.length === 0;

  return (
    <main className="relative w-full h-screen flex flex-col bg-background text-foreground">
      {/* ── Search header ── */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-[calc((env(safe-area-inset-top)+20px)*2.5)] pb-4 flex-shrink-0">
        <div className="space-y-2">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex gap-2 items-center"
          >
            <Input
              placeholder="Search titles, movies, or users"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 flex-1"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-10 px-3">
              <Search className="size-4" />
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* ── Results ── */}
      <ScrollArea className="flex-1 h-[calc(100svh-200px)] w-full">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-20">
          <section className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-4 gap-2">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="flicks">Flicks</TabsTrigger>
                <TabsTrigger value="movies">Movies/TV</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
              </TabsList>

              {/* ALL */}
              <TabsContent value="all">
                <div className="space-y-6">
                  {showPlaceholder ? (
                    <Card className="border border-dashed border-border bg-muted p-6">
                      <CardHeader>
                        <p className="text-lg font-semibold">Start your search</p>
                        <p className="text-sm text-muted-foreground">
                          Type a keyword above to reveal videos, movies, and community creators.
                        </p>
                      </CardHeader>
                      <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-3xl bg-background/80 p-4">
                          <h3 className="font-semibold">Try these examples</h3>
                          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            <li>• neon thrillers</li>
                            <li>• user handles</li>
                            <li>• sci-fi scenes</li>
                          </ul>
                        </div>
                        <div className="rounded-3xl bg-background/80 p-4">
                          <h3 className="font-semibold">Result categories</h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Flick previews, movie results, and creator profiles are grouped into each tab.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
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
                                onClick={() => openMovie(movie.Id)}
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
              </TabsContent>

              {/* FLICKS */}
              <TabsContent value="flicks">
                {showPlaceholder ? (
                  <Card className="border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                    Search for a scene, creator, or movie to discover flick previews.
                  </Card>
                ) : filteredFlicks.length === 0 ? (
                  <Card className="border border-border bg-card p-10 text-center text-muted-foreground">
                    No flicks found matching your search.
                  </Card>
                ) : (
                  <FlickMasonryGrid flicks={filteredFlicks} />
                )}
              </TabsContent>

              {/* MOVIES */}
              <TabsContent value="movies">
                {showPlaceholder ? (
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
                        onClick={() => openMovie(movie.Id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* USERS */}
              <TabsContent value="users">
                {showPlaceholder ? (
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
                )}
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </ScrollArea>
    </main>
  );
}
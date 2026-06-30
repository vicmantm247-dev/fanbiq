"use client";

import React, { createContext, useContext, useState } from "react";
import { MovieDetailView } from "./MovieDetailView";

interface MovieDetailContextType {
  openMovie: (id: string, options?: { showLikedBy?: boolean; sessionCode?: string | null; mediaType?: 'movie' | 'tv' }) => void;
  closeMovie: () => void;
}

const MovieDetailContext = createContext<MovieDetailContextType | undefined>(undefined);

export function MovieDetailProvider({ children }: { children: React.ReactNode }) {
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [showLikedBy, setShowLikedBy] = useState<boolean | undefined>();
  const [sessionCode, setSessionCode] = useState<string | null | undefined>();
  const [selectedMovieMediaType, setSelectedMovieMediaType] = useState<'movie' | 'tv' | undefined>(undefined);

  const openMovie = (id: string, options?: { showLikedBy?: boolean; sessionCode?: string | null; mediaType?: 'movie' | 'tv' }) => {
    setSelectedMovieId(id);
    setShowLikedBy(options?.showLikedBy);
    setSessionCode(options?.sessionCode);
    setSelectedMovieMediaType(options?.mediaType);
  }
  const closeMovie = () => { 
    setSelectedMovieId(null); 
    setShowLikedBy(undefined);
    setSessionCode(undefined);
    setSelectedMovieMediaType(undefined);
  }

  return (
    <MovieDetailContext.Provider value={{ openMovie, closeMovie }}>
      {children}
      <MovieDetailView 
        movieId={selectedMovieId} 
        mediaType={selectedMovieMediaType}
        onClose={closeMovie} 
        showLikedBy={showLikedBy} 
        sessionCode={sessionCode}
      />
    </MovieDetailContext.Provider>
  );
}

export function useMovieDetail() {
  const context = useContext(MovieDetailContext);
  if (context === undefined) {
    throw new Error("useMovieDetail must be used within a MovieDetailProvider");
  }
  return context;
}

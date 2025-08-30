'use client';

import { useState, useEffect } from 'react';
import { tmdbApi } from '@/lib/api/tmdb';
import MediaGrid from '@/components/media/MediaGrid';

export default function GenresPage() {
  const [allGenres, setAllGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [mixedContent, setMixedContent] = useState([]);
  const [sortBy, setSortBy] = useState('popular');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [showGenreGrid, setShowGenreGrid] = useState(true);

  useEffect(() => {
    loadGenres();
  }, []);

  useEffect(() => {
    if (selectedGenre) {
      resetContentAndFetch();
    }
  }, [selectedGenre, sortBy]);

  const loadGenres = async () => {
    setIsLoading(true);
    try {
      const [movieGenres, tvGenres] = await Promise.all([
        tmdbApi.getMovieGenres(),
        tmdbApi.getTVGenres()
      ]);

      const combined = [...(movieGenres || []), ...(tvGenres || [])];
      const uniqueGenres = combined.filter((genre, index, arr) => 
        arr.findIndex(g => g.id === genre.id) === index
      ).sort((a, b) => a.name.localeCompare(b.name));

      setAllGenres(uniqueGenres);
    } catch (error) {
      console.error('Failed to load genres:', error);
      setAllGenres([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectGenre = (genre) => {
    setSelectedGenre(genre);
    setShowGenreGrid(false);
  };

  const resetContentAndFetch = async () => {
    setCurrentPage(1);
    setIsLoading(true);
    try {
      const data = await fetchMixedContent(1);
      setMixedContent(data || []);
      setCanLoadMore(data && data.length === 20);
    } catch (error) {
      console.error('Failed to fetch content:', error);
      setMixedContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMixedContent = async (page) => {
    if (!selectedGenre) return [];

    try {
      const [movieData, tvData] = await Promise.all([
        tmdbApi.getMoviesByGenre(selectedGenre.id, page),
        tmdbApi.getTVShowsByGenre(selectedGenre.id, page)
      ]);

      const movies = (movieData?.results || []).map(item => ({
        ...item,
        media_type: 'movie'
      }));

      const tvShows = (tvData?.results || []).map(item => ({
        ...item,
        media_type: 'tv'
      }));

      const mixed = [...movies, ...tvShows];

      if (sortBy === 'latest') {
        mixed.sort((a, b) => {
          const dateA = new Date(a.release_date || a.first_air_date || 0);
          const dateB = new Date(b.release_date || b.first_air_date || 0);
          return dateB - dateA;
        });
      } else {
        mixed.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      }

      return mixed.slice(0, 20);
    } catch (error) {
      console.error('Error fetching mixed content:', error);
      return [];
    }
  };

  const loadMoreContent = async () => {
    if (isLoading || !canLoadMore) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;

    try {
      const data = await fetchMixedContent(nextPage);
      if (data && data.length > 0) {
        setMixedContent(prev => [...prev, ...data]);
        setCurrentPage(nextPage);
        setCanLoadMore(data.length === 20);
      } else {
        setCanLoadMore(false);
      }
    } catch (error) {
      console.error('Failed to load more content:', error);
      setCanLoadMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToGenres = () => {
    setSelectedGenre(null);
    setShowGenreGrid(true);
    setMixedContent([]);
    setCurrentPage(1);
    setCanLoadMore(true);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Page Header - Smaller Typography */}
        <header className="mb-8">
          {selectedGenre ? (
            <div>
              <button
                onClick={goBackToGenres}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Genres
              </button>
              <h1 className="text-3xl font-bold mb-2 tracking-tight">
                {selectedGenre.name}
              </h1>
              <p className="text-gray-400 text-base">
                Movies and TV shows in this genre
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight">
                Genres
              </h1>
              <p className="text-gray-400 text-base">
                Browse content by your favorite genres
              </p>
            </div>
          )}
        </header>

        {showGenreGrid && (
          <>
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {allGenres.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => selectGenre(genre)}
                    className="group bg-gray-900 hover:bg-gray-800 rounded-xl p-6 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-3">🎭</div>
                      <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {genre.name}
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {selectedGenre && !showGenreGrid && (
          <>
            <div className="mb-8">
              <div className="space-y-1">
                <label className="block text-sm text-gray-300">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white min-w-[150px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="popular">Most Popular</option>
                  <option value="latest">Latest Releases</option>
                </select>
              </div>
            </div>

            {mixedContent.length > 0 && !isLoading && (
              <div className="mb-6">
                <p className="text-gray-400 text-sm">
                  {mixedContent.length} items found in {selectedGenre.name}
                </p>
              </div>
            )}

            <MediaGrid 
              items={mixedContent} 
              mediaType="mixed" 
              loading={isLoading && currentPage === 1} 
            />

            {mixedContent.length > 0 && canLoadMore && (
              <div className="mt-12 text-center">
                <button
                  onClick={loadMoreContent}
                  disabled={isLoading}
                  className="group relative bg-white text-black font-semibold py-4 px-10 rounded-full transition-all duration-200 hover:bg-gray-100 hover:scale-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      <span>Loading more...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Show More</span>
                      <div className="w-5 h-5 transition-transform group-hover:translate-y-1">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              </div>
            )}

            {!canLoadMore && mixedContent.length > 0 && (
              <div className="mt-12 text-center">
                <p className="text-gray-500 text-sm">
                  ✨ You've seen everything in {selectedGenre.name}
                </p>
              </div>
            )}

            {!isLoading && mixedContent.length === 0 && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="text-xl font-semibold mb-2">No content found</h3>
                <p className="text-gray-400">No movies or shows available in this genre right now</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { tmdbApi } from '@/lib/api/tmdb';
import MediaGrid from '@/components/media/MediaGrid';

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortOrder, setSortOrder] = useState('popular');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (genres.length > 0) {
      resetAndFetch();
    }
  }, [selectedGenre, sortOrder]);

  const initializePage = async () => {
    setIsLoading(true);
    try {
      const genresData = await tmdbApi.getMovieGenres();
      setGenres(genresData || []);
      
      const moviesData = await tmdbApi.getPopularMovies(1);
      setMovies(moviesData?.results || []);
      setCanLoadMore(moviesData?.total_pages > 1);
    } catch (error) {
      console.error('Failed to initialize page:', error);
      setMovies([]);
      setGenres([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndFetch = async () => {
    setCurrentPage(1);
    setIsLoading(true);
    try {
      const data = await fetchMovieData(1);
      setMovies(data?.results || []);
      setCanLoadMore(data?.total_pages > 1);
    } catch (error) {
      console.error('Failed to fetch movies:', error);
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovieData = async (page) => {
    if (selectedGenre) {
      return await tmdbApi.getMoviesByGenre(parseInt(selectedGenre), page);
    }
    
    switch (sortOrder) {
      case 'latest':
        return await tmdbApi.getUpcomingMovies(page);
      case 'top_rated':
        return await tmdbApi.getTopRatedMovies(page);
      case 'revenue':
        return await tmdbApi.getMoviesByRevenue(page);
      default:
        return await tmdbApi.getPopularMovies(page);
    }
  };

  const loadMoreMovies = async () => {
    if (isLoading || !canLoadMore) return;
    
    setIsLoading(true);
    const nextPage = currentPage + 1;
    
    try {
      const data = await fetchMovieData(nextPage);
      if (data?.results?.length) {
        setMovies(prev => [...prev, ...data.results]);
        setCurrentPage(nextPage);
        setCanLoadMore(nextPage < data.total_pages);
      } else {
        setCanLoadMore(false);
      }
    } catch (error) {
      console.error('Failed to load more movies:', error);
      setCanLoadMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Page Header - Smaller Typography */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">
            Movies
          </h1>
          <p className="text-gray-400 text-base">
            Discover blockbusters, indie films and cinema classics
          </p>
        </header>

        {/* Control Panel */}
        <div className="mb-8 flex flex-wrap gap-4">
          <div className="space-y-1">
            <label className="block text-sm text-gray-300">Filter by Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white min-w-[180px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Genres</option>
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-gray-300">Sort By</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white min-w-[150px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="popular">Popular</option>
              <option value="latest">Latest</option>
              <option value="top_rated">Top Rated</option>
              <option value="revenue">Highest Grossing</option>
            </select>
          </div>
        </div>

        {/* Results Counter */}
        {movies.length > 0 && !isLoading && (
          <div className="mb-6">
            <p className="text-gray-400 text-sm">
              {movies.length} movies found
            </p>
          </div>
        )}

        <MediaGrid 
          items={movies} 
          mediaType="movie" 
          loading={isLoading && currentPage === 1} 
        />

        {movies.length > 0 && canLoadMore && (
          <div className="mt-12 text-center">
            <button
              onClick={loadMoreMovies}
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

        {!canLoadMore && movies.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              ✨ You've seen all available movies
            </p>
          </div>
        )}

        {!isLoading && movies.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold mb-2">No movies found</h3>
            <p className="text-gray-400">Try adjusting your filters or check back later</p>
          </div>
        )}

      </div>
    </div>
  );
}

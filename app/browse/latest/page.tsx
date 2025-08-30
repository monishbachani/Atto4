'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Filter, Grid, List, Loader2, Star, Eye, Calendar } from 'lucide-react';
import { tmdbApi } from '@/lib/api/tmdb';

export default function LatestReleasesPage() {
  const router = useRouter();
  
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [genreId, setGenreId] = useState<number | undefined>(undefined);
  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const observer = useRef<IntersectionObserver | null>(null);

  // Helper function to build TMDB image URLs
  const buildTmdbImage = (path: string | null, size: string = 'w500'): string => {
    if (!path) return '/placeholder-movie.jpg';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  // Remove duplicates
  const removeDuplicates = (itemsArray: any[]) => {
    const seen = new Set();
    return itemsArray.filter(item => {
      const key = `${mediaType}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Fetch genres when media type changes
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const genreData = mediaType === 'movie' 
          ? await tmdbApi.getMovieGenres()
          : await tmdbApi.getTVGenres();
        setGenres(genreData);
      } catch (error) {
        console.error('Error fetching genres:', error);
        setGenres([]);
      }
    };
    fetchGenres();
  }, [mediaType]);

  // Fetch data function
  const fetchData = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const data = await tmdbApi.getLatestReleases(mediaType, pageNum, genreId);
      
      if (data?.results) {
        let results = data.results.filter(item => 
          item.poster_path && item.popularity > 0
        );

        if (reset) {
          setItems(results);
        } else {
          setItems(prev => {
            const combined = [...prev, ...results];
            return removeDuplicates(combined);
          });
        }
        
        setHasMore(pageNum < (data.total_pages || 1) && results.length > 0);
      }
    } catch (error) {
      console.error('Error fetching latest releases:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [mediaType, genreId, loading]);

  // Reset data when filters change
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchData(1, true);
  }, [mediaType, genreId]);

  // Load more data when page changes
  useEffect(() => {
    if (page > 1) {
      fetchData(page);
    }
  }, [page, fetchData]);

  // Infinite scroll observer
  const lastItemRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-500" />
                Latest Releases
              </h1>
              <p className="text-gray-400 mt-1">
                Recently released {mediaType === 'movie' ? 'movies' : 'TV shows'}
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600' : 'bg-gray-800'} hover:bg-blue-600 transition-colors`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600' : 'bg-gray-800'} hover:bg-blue-600 transition-colors`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters - No Sort By (Already Latest) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 bg-gray-900/50 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Media Type:</span>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as 'movie' | 'tv')}
                className="bg-gray-800 text-white rounded px-3 py-1 text-sm border border-gray-600 focus:border-blue-500 outline-none"
              >
                <option value="movie">Movies</option>
                <option value="tv">TV Shows</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Genre:</span>
              <select
                value={genreId || ''}
                onChange={(e) => setGenreId(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-gray-800 text-white rounded px-3 py-1 text-sm border border-gray-600 focus:border-blue-500 outline-none"
              >
                <option value="">All Genres</option>
                {genres.map(genre => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{items.length} results</span>
            </div>
            <div className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-xs">
              Latest First
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {items.map((item, index) => {
              const isMovie = mediaType === 'movie';
              const title = isMovie ? item.title : item.name;
              const releaseDate = isMovie ? item.release_date : item.first_air_date;
              const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
              const posterUrl = buildTmdbImage(item.poster_path, 'w500');

              return (
                <div
                  key={`${mediaType}-${item.id}`}
                  ref={index === items.length - 1 ? lastItemRef : null}
                >
                  <Link
                    href={`/${mediaType}/${item.id}`}
                    className="group block transition-transform duration-300 hover:scale-105"
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shadow-lg group-hover:shadow-2xl transition-shadow duration-300">
                      <Image
                        src={posterUrl}
                        alt={title || 'Poster'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMzc0MTUxIi8+PC9zdmc+"
                      />
                      
                      {/* Rating Badge */}
                      {item.vote_average > 0 && (
                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <span>{item.vote_average.toFixed(1)}</span>
                        </div>
                      )}

                      {/* No Release Date Badge - Removed */}
                    </div>

                    <div className="mt-3">
                      <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1">
                        {title}
                      </h3>
                      <p className="text-gray-400 text-xs">
                        {year || 'Unknown'}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {items.map((item, index) => {
              const isMovie = mediaType === 'movie';
              const title = isMovie ? item.title : item.name;
              const releaseDate = isMovie ? item.release_date : item.first_air_date;
              const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
              const posterUrl = buildTmdbImage(item.poster_path, 'w200');

              return (
                <div
                  key={`${item.id}-list-${index}`}
                  ref={index === items.length - 1 ? lastItemRef : null}
                >
                  <Link
                    href={`/${mediaType}/${item.id}`}
                    className="flex items-center gap-4 p-4 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 transition-colors group"
                  >
                    <div className="relative w-16 h-24 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                      <Image
                        src={posterUrl}
                        alt={title || 'Poster'}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-2">{year}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          {item.vote_average?.toFixed(1) || 'N/A'}
                        </span>
                        <span>{Math.round(item.popularity || 0)} popularity</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-400">Loading latest releases...</span>
          </div>
        )}

        {/* No More Results */}
        {!hasMore && items.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">You've reached the end! 🎬</p>
            <p className="text-gray-500 text-sm mt-1">
              Found {items.length} latest releases
            </p>
          </div>
        )}

        {/* No Results */}
        {!loading && items.length === 0 && (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No latest releases found</h2>
            <p className="text-gray-400">
              Try adjusting your filters or check back later.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

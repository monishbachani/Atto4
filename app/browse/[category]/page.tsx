'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Filter, Grid, List, Loader2, Star, Eye } from 'lucide-react';
import { tmdbApi } from '@/lib/api/tmdb';

export default function BrowsePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const category = params.category as string;
  // Get media type from URL or determine from category
  const urlMediaType = searchParams.get('type');
  const defaultMediaType = urlMediaType || (
    ['on-the-air', 'airing-today'].includes(category) ? 'tv' : 'movie'
  );
  
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>(defaultMediaType as 'movie' | 'tv');
  const [genreId, setGenreId] = useState<number | undefined>(undefined);
  const [genres, setGenres] = useState([]);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('popularity');
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
      const key = `${item.media_type || mediaType}-${item.id}`;
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
        setGenres([]);
      }
    };
    fetchGenres();
  }, [mediaType]);

  // Enhanced TV show fetching logic
  const fetchTVData = async (category: string, pageNum: number, genreId?: number) => {
    let data;
    
    switch (category) {
      case 'trending':
        const trendingResults = await tmdbApi.getTVTrending('week');
        data = { results: trendingResults, total_pages: 1 };
        break;
      case 'popular':
        data = await tmdbApi.getTVByCategory('popular', pageNum);
        break;
      case 'top-rated':
        data = await tmdbApi.getTVByCategory('top-rated', pageNum);
        break;
      case 'on-the-air':
        data = await tmdbApi.getTVByCategory('on-the-air', pageNum);
        break;
      case 'airing-today':
        data = await tmdbApi.getTVByCategory('airing-today', pageNum);
        break;
      case 'latest':
        data = await tmdbApi.getLatestReleases('tv', pageNum, genreId);
        break;
      default:
        data = await tmdbApi.discoverTVShows({ page: pageNum, genreId });
    }
    
    return data;
  };

  // Get category display name
  const getCategoryTitle = (cat: string, type: string) => {
    const titles = {
      'trending': type === 'movie' ? 'Trending Movies' : 'Trending TV Shows',
      'popular': type === 'movie' ? 'Popular Movies' : 'Popular TV Shows',
      'top-rated': type === 'movie' ? 'Top Rated Movies' : 'Top Rated TV Shows',
      'upcoming': 'Upcoming Movies',
      'now-playing': 'Now Playing Movies',
      'on-the-air': 'On The Air TV Shows',
      'airing-today': 'Airing Today TV Shows',
      'latest': type === 'movie' ? 'Latest Movie Releases' : 'Latest TV Show Releases'
    };
    return titles[cat] || cat.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Fetch data function with enhanced TV show support
  const fetchData = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      let data;
      
      if (mediaType === 'tv') {
        data = await fetchTVData(category, pageNum, genreId);
      } else {
        // Movie fetching logic
        switch (category) {
          case 'trending':
            const trendingResults = await tmdbApi.getTrending('week');
            data = { results: trendingResults, total_pages: 1 };
            break;
          case 'popular':
            data = await tmdbApi.getPopularMovies(pageNum);
            break;
          case 'top-rated':
            data = await tmdbApi.getTopRatedMovies(pageNum);
            break;
          case 'upcoming':
            data = await tmdbApi.getUpcomingMovies(pageNum);
            break;
          case 'now-playing':
            data = await tmdbApi.getNowPlayingMovies(pageNum);
            break;
          case 'latest':
            data = await tmdbApi.getLatestReleases('movie', pageNum, genreId);
            break;
          default:
            data = await tmdbApi.getPopularMovies(pageNum);
        }
      }

      if (data?.results) {
        let results = data.results.filter(item => 
          item.poster_path && item.popularity > 0
        );

        // Apply sorting
        switch (sortBy) {
          case 'popularity':
            results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            break;
          case 'rating':
            results.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            break;
          case 'release_date':
            results.sort((a, b) => {
              const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
              const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
              return dateB.getTime() - dateA.getTime();
            });
            break;
        }

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
      console.error('Error fetching data:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [category, mediaType, sortBy, genreId, loading]);

  // Reset data when filters change
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchData(1, true);
  }, [category, mediaType, sortBy, genreId]);

  // Load more data when page changes
  useEffect(() => {
    if (page > 1) {
      fetchData(page);
    }
  }, [page, fetchData]);

  // Update URL when media type changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('type', mediaType);
    window.history.replaceState({}, '', url.toString());
  }, [mediaType]);

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
              <h1 className="text-3xl lg:text-4xl font-bold">
                {getCategoryTitle(category, mediaType)}
              </h1>
              <p className="text-gray-400 mt-1">
                Discover the best {mediaType === 'movie' ? 'movies' : 'TV shows'}
                {genreId && ` in ${genres.find(g => g.id === genreId)?.name}`}
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

        {/* Enhanced Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 bg-gray-900/50 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-4 flex-wrap">
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

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800 text-white rounded px-3 py-1 text-sm border border-gray-600 focus:border-blue-500 outline-none"
              >
                <option value="popularity">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="release_date">Latest Release</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{items.length} results</span>
            </div>
          </div>
        </div>

        {/* Content Grid - Removed unnecessary media type badges */}
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
                    </div>

                    <div className="mt-3">
                      <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1">
                        {title}
                      </h3>
                      <p className="text-gray-400 text-xs">
                        {year || 'TBA'}
                      </p>
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
            <span className="ml-3 text-gray-400">Loading more...</span>
          </div>
        )}

        {/* No More Results */}
        {!hasMore && items.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">You've reached the end! 🎬</p>
            <p className="text-gray-500 text-sm mt-1">
              Found {items.length} results
            </p>
          </div>
        )}

        {/* No Results */}
        {!loading && items.length === 0 && (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-white mb-2">No results found</h2>
            <p className="text-gray-400">
              Try adjusting your filters or check back later.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}


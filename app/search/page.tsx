'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { tmdbApi } from '@/lib/api/tmdb';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper function to build TMDB image URLs
  const buildTmdbImage = (path, size = 'w500') => {
    if (!path) return '/placeholder-movie.jpg';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError('');
      
      try {
        const data = await tmdbApi.searchMulti(query);
        
        if (data?.results) {
          // Filter and sort results
          const filtered = data.results
            .filter(item => 
              (item.media_type === 'movie' || item.media_type === 'tv') &&
              item.poster_path && // Only show items with posters
              item.popularity > 0
            )
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
          
          setResults(filtered);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to load results. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search with 300ms delay
    const timeoutId = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Simple Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Search Results</h1>
          {query && (
            <p className="text-gray-400">
              Results for "{query}" {!loading && results.length > 0 && `(${results.length})`}
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-400">Searching...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-400 mb-2">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && results.length === 0 && query && (
          <div className="flex flex-col items-center justify-center py-12">
            <Search className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">No results found</h2>
            <p className="text-gray-400 text-center max-w-md">
              We couldn&apos;t find any movies or TV shows matching &quot;{query}&quot;. 
              Try different search terms.
            </p>
          </div>
        )}

        {/* Results Grid */}
        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {results.map((item) => {
              const isMovie = item.media_type === 'movie';
              const title = isMovie ? item.title : item.name;
              const releaseDate = isMovie ? item.release_date : item.first_air_date;
              const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
              const posterUrl = buildTmdbImage(item.poster_path, 'w500');

              return (
                <Link
                  key={`${item.media_type}-${item.id}`}
                  href={`/${item.media_type}/${item.id}`}
                  className="group"
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 transition-transform duration-200 group-hover:scale-105">
                    <Image
                      src={posterUrl}
                      alt={title || 'Movie/TV Show Poster'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
                      placeholder="blur"
                      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xNTAgMTgwQzE2MS4wNDYgMTgwIDE3MCAyMDMuOTA5IDE3MCAyMzNDMTcwIDI2Mi4wOTEgMTYxLjA0NiAyODYgMTUwIDI4NkMxMzguOTU0IDI4NiAxMzAgMjYyLjA5MSAxMzAgMjMzQzEzMCAyMDMuOTA5IDEzOC45NTQgMTgwIDE1MCAxODBaIiBmaWxsPSIjNkI3Mjg4Ii8+CjxwYXRoIGQ9Ik0xOTAgMjMwSDE5NUMxOTUgMjI0LjQ3NyAxOTAuNTIzIDIyMCAxODUgMjIwSDE4NUMxNzkuNDc3IDIyMCAxNzUgMjI0LjQ3NyAxNzUgMjMwSDE4MEMxODAgMjM1LjUyMyAxODQuNDc3IDI0MCAxOTAgMjQwWiIgZmlsbD0iIzZCNzI4OCIvPgo8L3N2Zz4K"
                    />
                    
                    {/* Simple Rating Badge */}
                    {item.vote_average > 0 && (
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium">
                        ⭐ {item.vote_average.toFixed(1)}
                      </div>
                    )}

                    {/* Media Type Badge */}
                    <div className="absolute top-2 left-2 bg-gray-900/80 backdrop-blur-sm text-gray-300 px-2 py-1 rounded text-xs font-medium">
                      {isMovie ? 'Movie' : 'TV'}
                    </div>
                  </div>

                  {/* Title and Year */}
                  <div className="mt-3">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1">
                      {title}
                    </h3>
                    <p className="text-gray-400 text-xs">
                      {year || 'Unknown'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && !query && (
          <div className="flex flex-col items-center justify-center py-20">
            <Search className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">Start searching</h2>
            <p className="text-gray-400 text-center max-w-md">
              Use the search bar to find movies and TV shows.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
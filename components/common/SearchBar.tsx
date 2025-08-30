'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { tmdbApi } from '@/lib/api/tmdb';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  onClose?: () => void;
}

export default function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length > 2) {
        setIsLoading(true);
        try {
          const searchResults = await tmdbApi.searchMulti(query);
          setResults(searchResults.results?.slice(0, 8) || []);
          setShowResults(true);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      onClose?.();
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search movies, TV shows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-900/80 border border-gray-700 rounded-full pl-12 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((item) => {
                // Safe image URL building that matches next.config.ts
                const posterUrl = item.poster_path 
                  ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
                  : '/placeholder-movie.jpg';

                return (
                  <Link
                    key={item.id}
                    href={`/${item.media_type}/${item.id}`}
                    className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                    onClick={onClose}
                  >
                    <div className="w-12 h-16 relative flex-shrink-0 bg-gray-800 rounded overflow-hidden">
                      <Image
                        src={posterUrl}
                        alt={item.title || item.name || 'Movie poster'}
                        fill
                        className="object-cover"
                        sizes="48px"
                        onError={(e) => {
                          // Fallback to placeholder on error
                          e.currentTarget.src = '/placeholder-movie.jpg';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">
                        {item.title || item.name}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {item.media_type === 'movie' ? 'Movie' : 'TV Show'} • {' '}
                        {item.release_date || item.first_air_date ? 
                          new Date(item.release_date || item.first_air_date).getFullYear() : 
                          'N/A'
                        }
                      </p>
                    </div>
                    <div className="text-yellow-400 text-sm flex items-center">
                      <span className="text-yellow-400 mr-1">★</span>
                      {item.vote_average?.toFixed(1) || 'N/A'}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

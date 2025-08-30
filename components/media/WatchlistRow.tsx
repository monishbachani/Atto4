'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, X, Calendar, Star } from 'lucide-react';
import { watchlistStorage, WatchlistItem } from '@/lib/storage/watchlist';

export default function WatchlistRow() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to build TMDB image URLs
  const buildTmdbImage = (path: string | null, size: string = 'w500'): string => {
    if (!path) return '/placeholder-movie.jpg';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  // Load watchlist on component mount
  useEffect(() => {
    const loadWatchlist = () => {
      const items = watchlistStorage.getWatchlist();
      setWatchlist(items);
      setLoading(false);
    };

    loadWatchlist();

    // Listen for storage changes (when items are added/removed)
    const handleStorageChange = () => {
      loadWatchlist();
    };

    window.addEventListener('watchlist-updated', handleStorageChange);
    return () => window.removeEventListener('watchlist-updated', handleStorageChange);
  }, []);

  // Remove from watchlist
  const handleRemove = (id: number, mediaType: 'movie' | 'tv', event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    watchlistStorage.removeFromWatchlist(id, mediaType);
    setWatchlist(prev => prev.filter(item => !(item.id === id && item.media_type === mediaType)));
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('watchlist-updated'));
  };

  if (loading) {
    return (
      <div className="mb-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">My Watchlist</h2>
          </div>
          <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-48 animate-pulse">
                <div className="aspect-[2/3] bg-gray-800 rounded-lg mb-3"></div>
                <div className="h-4 bg-gray-800 rounded mb-2"></div>
                <div className="h-3 bg-gray-800 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="mb-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">My Watchlist</h2>
          </div>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Your watchlist is empty</h3>
            <p className="text-gray-400">Add movies and TV shows to your watchlist to see them here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group mb-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">My Watchlist</h2>
          <span className="text-sm text-gray-400">{watchlist.length} item{watchlist.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4">
          {watchlist.map((item) => {
            const title = item.media_type === 'movie' ? item.title : item.name;
            const releaseDate = item.media_type === 'movie' ? item.release_date : item.first_air_date;
            const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

            return (
              <div key={`${item.media_type}-${item.id}`} className="flex-shrink-0 w-48 group/item">
                <Link href={`/${item.media_type}/${item.id}`} className="block">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shadow-lg group-hover/item:shadow-2xl transition-all duration-300 group-hover/item:scale-105">
                    <Image
                      src={buildTmdbImage(item.poster_path, 'w500')}
                      alt={title || 'Poster'}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />

                    {/* Remove Button */}
                    <button
                      onClick={(e) => handleRemove(item.id, item.media_type, e)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Rating Badge */}
                    {item.vote_average > 0 && (
                      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span>{item.vote_average.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Media Type Badge */}
                    <div className="absolute bottom-2 left-2 bg-blue-600/80 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium">
                      {item.media_type === 'movie' ? 'Movie' : 'TV'}
                    </div>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1 text-white">
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
      </div>
    </div>
  );
}

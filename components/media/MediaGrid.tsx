'use client';

import Image from 'next/image';
import Link from 'next/link';

type MediaItem = {
  id: number;
  title?: string;          // movies
  name?: string;           // tv shows
  poster_path: string | null;
  release_date?: string;   // movies
  first_air_date?: string; // tv shows
  vote_average?: number;
  media_type?: 'movie' | 'tv'; // for mixed content
  overview?: string;
};

interface Props {
  items: MediaItem[];
  mediaType: 'movie' | 'tv' | 'mixed';
  loading?: boolean;
}

export default function MediaGrid({ items, mediaType, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="w-full aspect-[2/3] animate-pulse rounded-xl bg-gradient-to-br from-gray-800 to-gray-900" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-800 rounded animate-pulse" />
              <div className="h-3 bg-gray-800 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎬</div>
        <p className="text-gray-400 text-lg">No content available</p>
        <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  // Helper for poster URL with fallback
  const getPosterUrl = (path: string | null, size = 'w500') => {
    if (!path) return '/placeholder-poster.jpg';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  // Helper to get the correct route
  const getItemHref = (item: MediaItem) => {
    if (mediaType === 'mixed') {
      // For mixed content, check media_type first, then fallback to title/name detection
      const type = item.media_type || (item.title ? 'movie' : 'tv');
      return `/${type}/${item.id}`;
    }
    return `/${mediaType}/${item.id}`;
  };

  // Helper to get display title
  const getItemTitle = (item: MediaItem) => {
    return item.title || item.name || 'Untitled';
  };

  // Helper to get release year
  const getItemYear = (item: MediaItem) => {
    const date = item.release_date || item.first_air_date;
    return date ? new Date(date).getFullYear() : null;
  };

  // Helper to format rating
  const formatRating = (rating?: number) => {
    if (!rating || rating === 0) return null;
    return rating.toFixed(1);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {items.map((item) => {
        const title = getItemTitle(item);
        const year = getItemYear(item);
        const rating = formatRating(item.vote_average);
        const href = getItemHref(item);

        return (
          <Link key={`${item.id}-${item.media_type || mediaType}`} href={href} className="group">
            <div className="space-y-3">
              {/* Poster Image */}
              <div className="relative w-full aspect-[2/3] overflow-hidden rounded-xl bg-gray-900 shadow-lg">
                <Image
                  src={getPosterUrl(item.poster_path)}
                  alt={title}
                  fill
                  className="object-cover transition-all duration-300 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                
                {/* Rating badge */}
                {rating && (
                  <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full">
                    ★ {rating}
                  </div>
                )}

                {/* Removed Media Type Tags - No longer showing movie/tv badges */}
              </div>

              {/* Content Info */}
              <div className="space-y-1 px-1">
                <h3 className="text-white font-medium text-sm leading-tight line-clamp-2 group-hover:text-blue-400 transition-colors duration-200">
                  {title}
                </h3>
                {year && (
                  <p className="text-gray-400 text-xs">
                    {year}
                  </p>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Plus, Heart, Info, Star } from 'lucide-react';
import { Movie, Genre } from '@/lib/api/types';
import { watchlistStorage, likedStorage } from '@/lib/storage/watchlist';

interface MediaCardProps {
  media: Movie;
  genres: Genre[];
  priority?: boolean;
  mediaType: 'movie' | 'tv';
  isHovered?: boolean; // New prop to control hover state from parent
}

export default function MediaCard({
  media,
  genres,
  priority = false,
  mediaType,
  isHovered = false,
}: MediaCardProps) {
  const [inWatch, setInWatch] = useState(false);
  const [liked, setLiked] = useState(false);

  const img = (p: string | null, size = 'w500') =>
    p ? `https://image.tmdb.org/t/p/${size}${p}` : '/placeholder-movie.jpg';

  // Sync buttons
  useEffect(() => {
    setInWatch(watchlistStorage.isInWatchlist(media.id, mediaType));
    setLiked(likedStorage.isLiked(media.id, mediaType));
  }, [media.id, mediaType]);

  const toggleWatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const item = {
      id: media.id,
      title: mediaType === 'movie' ? media.title : media.name,
      name: mediaType === 'tv' ? media.name : undefined,
      poster_path: media.poster_path,
      media_type: mediaType,
      vote_average: media.vote_average ?? 0,
      release_date: mediaType === 'movie' ? media.release_date : undefined,
      first_air_date: mediaType === 'tv' ? media.first_air_date : undefined,
    };

    if (inWatch) {
      watchlistStorage.removeFromWatchlist(media.id, mediaType);
    } else {
      watchlistStorage.addToWatchlist(item);
    }
    setInWatch(!inWatch);
    window.dispatchEvent(new CustomEvent('watchlist-updated'));
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const item = {
      id: media.id,
      title: mediaType === 'movie' ? media.title : media.name,
      name: mediaType === 'tv' ? media.name : undefined,
      poster_path: media.poster_path,
      media_type: mediaType,
      vote_average: media.vote_average ?? 0,
      release_date: mediaType === 'movie' ? media.release_date : undefined,
      first_air_date: mediaType === 'tv' ? media.first_air_date : undefined,
    };

    if (liked) {
      likedStorage.removeFromLiked(media.id, mediaType);
    } else {
      likedStorage.addToLiked(item);
    }
    setLiked(!liked);
    window.dispatchEvent(new CustomEvent('liked-updated'));
  };

  const title = mediaType === 'movie' ? media.title : media.name;
  const date = mediaType === 'movie' ? media.release_date : media.first_air_date;
  const year = date ? new Date(date).getFullYear() : '-';

  return (
    <div className="relative w-48 cursor-pointer">
      <Link href={`/${mediaType}/${media.id}`}>
        {/* Poster */}
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shadow-lg transition-all duration-300">
          <Image
            src={img(media.poster_path)}
            alt={title || 'Poster'}
            fill
            sizes="200px"
            priority={priority}
            className="object-cover"
          />

          {/* Rating */}
          {media.vote_average > 0 && (
            <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
              <Star className="w-3 h-3 fill-yellow-400" />
              {media.vote_average.toFixed(1)}
            </div>
          )}

          {/* Hover toolbar - Only shows when this specific card is hovered */}
          {isHovered && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col justify-end p-4 transition-all duration-300">
              <div className="flex gap-2">
                {/* Play Button */}
                <Link
                  href={`/watch/${mediaType}/${media.id}`}
                  className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  title="Play"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Play className="w-4 h-4 fill-current" />
                </Link>

                {/* Watchlist Button */}
                <button
                  onClick={toggleWatch}
                  title={inWatch ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors ${
                    inWatch ? 'bg-green-600' : 'bg-gray-800/80 hover:bg-gray-700'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Like Button */}
                <button
                  onClick={toggleLike}
                  title={liked ? 'Unlike' : 'Like'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors ${
                    liked ? 'bg-red-600' : 'bg-gray-800/80 hover:bg-gray-700'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                </button>

                {/* Info Button */}
                <Link
                  href={`/${mediaType}/${media.id}`}
                  title="More Info"
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-800/80 text-white hover:bg-gray-700"
                >
                  <Info className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-3 text-sm font-medium leading-tight line-clamp-2 text-white hover:text-blue-400 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-gray-400">{year}</p>
      </Link>
    </div>
  );
}

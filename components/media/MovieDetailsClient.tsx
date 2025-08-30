'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Play, 
  Plus, 
  Heart, 
  Star, 
  Calendar, 
  Clock, 
  Globe,
  ArrowLeft,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { MediaDetails, Genre } from '@/lib/api/types';
import { watchlistStorage, likedStorage } from '@/lib/storage/watchlist';

interface MovieDetailsClientProps {
  movie: MediaDetails;
  genres: Genre[];
}

export default function MovieDetailsClient({ movie, genres }: MovieDetailsClientProps) {
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerMuted, setTrailerMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // Helper function to build TMDB image URLs
  const buildTmdbImage = (path: string | null, size: string = 'w500'): string => {
    if (!path) return '/placeholder-movie.jpg';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  // Check if item is in watchlist/liked on mount
  useEffect(() => {
    setIsInWatchlist(watchlistStorage.isInWatchlist(movie.id, 'movie'));
    setIsLiked(likedStorage.isLiked(movie.id, 'movie'));
  }, [movie.id]);

  // Handle watchlist toggle
  const toggleWatchlist = () => {
    const item = {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      media_type: 'movie' as const,
      vote_average: movie.vote_average || 0,
      release_date: movie.release_date
    };

    if (isInWatchlist) {
      watchlistStorage.removeFromWatchlist(movie.id, 'movie');
      setIsInWatchlist(false);
    } else {
      watchlistStorage.addToWatchlist(item);
      setIsInWatchlist(true);
    }
    
    // Dispatch custom event to update UI
    window.dispatchEvent(new CustomEvent('watchlist-updated'));
  };

  // Handle like toggle
  const toggleLike = () => {
    const item = {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      media_type: 'movie' as const,
      vote_average: movie.vote_average || 0,
      release_date: movie.release_date
    };

    if (isLiked) {
      likedStorage.removeFromLiked(movie.id, 'movie');
      setIsLiked(false);
    } else {
      likedStorage.addToLiked(item);
      setIsLiked(true);
    }
    
    // Dispatch custom event to update UI
    window.dispatchEvent(new CustomEvent('liked-updated'));
  };

  // Get movie genres
  const movieGenres = genres?.filter(genre => 
    movie.genre_ids?.includes(genre.id) || movie.genres?.some(g => g.id === genre.id)
  ) || movie.genres || [];

  // Get trailer video
  const trailer = movie.videos?.results?.find(
    video => video.type === 'Trailer' && video.site === 'YouTube'
  ) || movie.videos?.results?.[0];

  // Get cast members
  const cast = movie.credits?.cast?.slice(0, 12) || [];
  
  // Get crew (director, producer, etc.)
  const director = movie.credits?.crew?.find(person => person.job === 'Director');
  const producer = movie.credits?.crew?.find(person => person.job === 'Producer');

  // Format runtime
  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="relative min-h-screen text-white">
      {/* Background with Backdrop */}
      <div className="absolute inset-0">
        <Image
          src={buildTmdbImage(movie.backdrop_path, 'w1280')}
          alt={movie.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
      </div>

      {/* Back Button */}
      <div className="relative z-10 p-4">
        <Link href="/" className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-black/70 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            
            {/* Poster */}
            <div className="lg:col-span-1">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl max-w-md mx-auto lg:mx-0">
                <Image
                  src={buildTmdbImage(movie.poster_path, 'w780')}
                  alt={movie.title}
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Movie Info */}
            <div className="lg:col-span-2">
              {/* Title and Basic Info */}
              <div className="mb-6">
                <h1 className="text-4xl lg:text-6xl font-black mb-4 leading-tight">
                  {movie.title}
                </h1>
                
                {movie.tagline && (
                  <p className="text-xl text-gray-300 italic mb-4">{movie.tagline}</p>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center gap-1 bg-yellow-500 text-black px-3 py-1 rounded-full font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{movie.vote_average?.toFixed(1)}</span>
                  </div>
                  
                  {movie.release_date && (
                    <div className="flex items-center gap-1 bg-gray-700/70 px-3 py-1 rounded-full">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(movie.release_date).getFullYear()}</span>
                    </div>
                  )}
                  
                  {movie.runtime && (
                    <div className="flex items-center gap-1 bg-gray-700/70 px-3 py-1 rounded-full">
                      <Clock className="w-4 h-4" />
                      <span>{formatRuntime(movie.runtime)}</span>
                    </div>
                  )}

                  {movie.spoken_languages?.[0] && (
                    <div className="flex items-center gap-1 bg-gray-700/70 px-3 py-1 rounded-full">
                      <Globe className="w-4 h-4" />
                      <span>{movie.spoken_languages[0].english_name}</span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                {movieGenres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {movieGenres.slice(0, 4).map(genre => (
                      <span 
                        key={genre.id}
                        className="bg-blue-600/80 text-blue-100 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons - Updated with Watch Now Link */}
              <div className="flex flex-wrap gap-4 mb-8">
                {/* Watch Now Button - Links to watch page */}
                <Link
                  href={`/watch/movie/${movie.id}`}
                  className="flex items-center gap-3 bg-red-600 hover:bg-red-700 px-8 py-4 rounded-full font-bold text-lg transition-colors shadow-lg"
                >
                  <Play className="w-6 h-6 fill-current" />
                  Watch Now
                </Link>
                
                {trailer && (
                  <button 
                    onClick={() => setShowTrailer(true)}
                    className="flex items-center gap-3 bg-gray-700/80 hover:bg-gray-700 px-6 py-4 rounded-full font-semibold transition-colors"
                  >
                    <Play className="w-5 h-5" />
                    Play Trailer
                  </button>
                )}
                
                <button 
                  onClick={toggleWatchlist}
                  className={`flex items-center gap-3 px-6 py-4 rounded-full font-semibold transition-colors ${
                    isInWatchlist 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-700/80 hover:bg-gray-700'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                  {isInWatchlist ? 'In Watchlist' : 'Watchlist'}
                </button>
                
                <button 
                  onClick={toggleLike}
                  className={`p-4 rounded-full transition-colors ${
                    isLiked 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gray-700/80 hover:bg-gray-700'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Overview */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Overview</h2>
                <p className="text-lg text-gray-300 leading-relaxed">
                  {movie.overview}
                </p>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {director && (
                  <div>
                    <h3 className="font-semibold text-gray-400 mb-2">Director</h3>
                    <p className="text-white">{director.name}</p>
                  </div>
                )}
                
                {producer && (
                  <div>
                    <h3 className="font-semibold text-gray-400 mb-2">Producer</h3>
                    <p className="text-white">{producer.name}</p>
                  </div>
                )}
                
                {movie.budget > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-400 mb-2">Budget</h3>
                    <p className="text-white">{formatCurrency(movie.budget)}</p>
                  </div>
                )}
                
                {movie.revenue > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-400 mb-2">Revenue</h3>
                    <p className="text-white">{formatCurrency(movie.revenue)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cast Section */}
          {cast.length > 0 && (
            <div className="mt-12">
              <h2 className="text-3xl font-bold mb-8">Cast</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {cast.map((person) => (
                  <div key={person.id} className="text-center">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3 bg-gray-800">
                      <Image
                        src={buildTmdbImage(person.profile_path, 'w500')}
                        alt={person.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{person.name}</h3>
                    <p className="text-gray-400 text-xs line-clamp-1">{person.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar Movies */}
          {movie.similar?.results?.length > 0 && (
            <div className="mt-12">
              <h2 className="text-3xl font-bold mb-8">Similar Movies</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {movie.similar.results.slice(0, 12).map((similarMovie) => (
                  <Link 
                    key={similarMovie.id} 
                    href={`/movie/${similarMovie.id}`}
                    className="group"
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-3 bg-gray-800 group-hover:scale-105 transition-transform duration-200">
                      <Image
                        src={buildTmdbImage(similarMovie.poster_path, 'w500')}
                        alt={similarMovie.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2">{similarMovie.title}</h3>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trailer Modal */}
      {showTrailer && trailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-6xl aspect-video">
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute -top-12 right-0 z-10 bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <button
                onClick={() => setTrailerMuted(!trailerMuted)}
                className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                {trailerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=${trailerMuted ? 1 : 0}&rel=0`}
              title={`${movie.title} Trailer`}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}

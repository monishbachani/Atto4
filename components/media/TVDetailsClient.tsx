"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Plus,
  Heart,
  Star,
  Calendar,
  Tv,
  ArrowLeft,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { MediaDetails, Genre } from "@/lib/api/types";
import { watchlistStorage, likedStorage } from "@/lib/storage/watchlist";

interface TVDetailsClientProps {
  tv: MediaDetails;
  genres: Genre[];
}

export default function TvShowDetailsClient({ tv, genres }: TVDetailsClientProps) {
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerMuted, setTrailerMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // Helper to build TMDB image URLs safely
  const buildTmdbImage = (path: string | null | undefined, size: string = "w500"): string => {
    if (!path) return "/placeholder-movie.jpg";
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  // Sync liked & watchlist state
  useEffect(() => {
    setIsInWatchlist(watchlistStorage.isInWatchlist(tv.id, "tv"));
    setIsLiked(likedStorage.isLiked(tv.id, "tv"));
  }, [tv.id]);

  // Handle watchlist toggle
  const toggleWatchlist = () => {
    const item = {
      id: tv.id,
      name: tv.name,
      poster_path: tv.poster_path,
      media_type: "tv" as const,
      vote_average: tv.vote_average || 0,
      first_air_date: tv.first_air_date,
    };

    if (isInWatchlist) {
      watchlistStorage.removeFromWatchlist(tv.id, "tv");
      setIsInWatchlist(false);
    } else {
      watchlistStorage.addToWatchlist(item);
      setIsInWatchlist(true);
    }

    window.dispatchEvent(new CustomEvent("watchlist-updated"));
  };

  // Handle like toggle
  const toggleLike = () => {
    const item = {
      id: tv.id,
      name: tv.name,
      poster_path: tv.poster_path,
      media_type: "tv" as const,
      vote_average: tv.vote_average || 0,
      first_air_date: tv.first_air_date,
    };

    if (isLiked) {
      likedStorage.removeFromLiked(tv.id, "tv");
      setIsLiked(false);
    } else {
      likedStorage.addToLiked(item);
      setIsLiked(true);
    }

    window.dispatchEvent(new CustomEvent("liked-updated"));
  };

  // Genres
  const tvGenres =
    genres?.filter(
      (genre) =>
        tv.genre_ids?.includes(genre.id) ||
        tv.genres?.some((g) => g.id === genre.id)
    ) || tv.genres || [];

  // Trailer
  const trailer =
    tv.videos?.results?.find(
      (video) => video.type === "Trailer" && video.site === "YouTube"
    ) || tv.videos?.results?.[0];

  // Cast
  const cast = tv.credits?.cast?.slice(0, 12) || [];

  // Creator
  const creator =
    tv.created_by?.[0] || tv.credits?.crew?.find((p) => p.job === "Creator");

  return (
    <div className="relative min-h-screen text-white">
      {/* Backdrop */}
      <div className="absolute inset-0">
        <Image
          src={buildTmdbImage(tv.backdrop_path, "w1280")}
          alt={tv.name}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
      </div>

      {/* Back Button */}
      <div className="relative z-10 p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-black/70 transition-colors"
        >
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
                  src={buildTmdbImage(tv.poster_path, "w780")}
                  alt={tv.name}
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Info */}
            <div className="lg:col-span-2">
              {/* Title */}
              <div className="mb-6">
                <h1 className="text-4xl lg:text-6xl font-black mb-4 leading-tight">
                  {tv.name}
                </h1>

                {tv.tagline && (
                  <p className="text-xl text-gray-300 italic mb-4">
                    {tv.tagline}
                  </p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  {tv.vote_average !== undefined && (
                    <div className="flex items-center gap-1 bg-yellow-500 text-black px-3 py-1 rounded-full font-bold">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{tv.vote_average.toFixed(1)}</span>
                    </div>
                  )}

                  {tv.first_air_date && (
                    <div className="flex items-center gap-1 bg-gray-700/70 px-3 py-1 rounded-full">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(tv.first_air_date).getFullYear()}</span>
                    </div>
                  )}

                  {tv.number_of_seasons && (
                    <div className="flex items-center gap-1 bg-gray-700/70 px-3 py-1 rounded-full">
                      <Tv className="w-4 h-4" />
                      <span>
                        {tv.number_of_seasons} Season
                        {tv.number_of_seasons !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {tv.status && (
                    <div className="flex items-center gap-1 bg-gray-700/70 px-3 py-1 rounded-full">
                      <span>{tv.status}</span>
                    </div>
                  )}

                  {tv.spoken_languages?.[0]?.english_name && (
                    <div className="flex items-center gap-1 bg-gray-700/70 px-3 py-1 rounded-full">
                      <span>{tv.spoken_languages[0].english_name}</span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                {tvGenres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {tvGenres.slice(0, 4).map((genre) => (
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
                {/* Watch Now Button - Links to TV watch page with season 1, episode 1 */}
                <Link
                  href={`/watch/tv/${tv.id}?season=1&episode=1`}
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
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-700/80 hover:bg-gray-700"
                  }`}
                >
                  <Plus className="w-5 h-5" />
                  {isInWatchlist ? "In Watchlist" : "Watchlist"}
                </button>

                <button
                  onClick={toggleLike}
                  className={`p-4 rounded-full transition-colors ${
                    isLiked
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-gray-700/80 hover:bg-gray-700"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
                </button>
              </div>

              {/* Overview */}
              {tv.overview && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">Overview</h2>
                  <p className="text-lg text-gray-300 leading-relaxed">
                    {tv.overview}
                  </p>
                </div>
              )}

              {/* Extra Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {creator && (
                  <div>
                    <h3 className="font-semibold text-gray-400 mb-2">Creator</h3>
                    <p className="text-white">{creator.name}</p>
                  </div>
                )}

                {tv.networks?.[0] && (
                  <div>
                    <h3 className="font-semibold text-gray-400 mb-2">Network</h3>
                    <p className="text-white">{tv.networks[0].name}</p>
                  </div>
                )}

                {tv.number_of_episodes && (
                  <div>
                    <h3 className="font-semibold text-gray-400 mb-2">Episodes</h3>
                    <p className="text-white">{tv.number_of_episodes}</p>
                  </div>
                )}

                {tv.episode_run_time?.[0] && (
                  <div>
                    <h3 className="font-semibold text-gray-400 mb-2">
                      Episode Runtime
                    </h3>
                    <p className="text-white">{tv.episode_run_time[0]} min</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cast */}
          {cast.length > 0 && (
            <div className="mt-12">
              <h2 className="text-3xl font-bold mb-8">Cast</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {cast.map((person) => (
                  <div key={person.id} className="text-center">
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3 bg-gray-800">
                      <Image
                        src={buildTmdbImage(person.profile_path, "w500")}
                        alt={person.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {person.name}
                    </h3>
                    <p className="text-gray-400 text-xs line-clamp-1">
                      {person.character}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar */}
          {tv.similar?.results?.length > 0 && (
            <div className="mt-12">
              <h2 className="text-3xl font-bold mb-8">Similar TV Shows</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {tv.similar.results.slice(0, 12).map((similarShow) => (
                  <Link key={similarShow.id} href={`/tv/${similarShow.id}`} className="group">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-3 bg-gray-800 group-hover:scale-105 transition-transform duration-200">
                      <Image
                        src={buildTmdbImage(similarShow.poster_path, "w500")}
                        alt={similarShow.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2">
                      {similarShow.name}
                    </h3>
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
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=${
                trailerMuted ? 1 : 0
              }&rel=0`}
              title={`${tv.name} Trailer`}
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

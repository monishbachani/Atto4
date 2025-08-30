'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play, Info } from 'lucide-react';
import { Movie } from '@/lib/api/types';

interface HeroSectionProps {
  media: Movie[];
}

export default function HeroSection({ media }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const buildTmdbImage = (path: string | null, size: string = 'original'): string => {
    if (!path) return '/placeholder-movie.jpg';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  // Auto-slide
  useEffect(() => {
    if (!isAutoPlaying || media.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % media.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, media.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
    setIsAutoPlaying(false);
  };
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    setIsAutoPlaying(false);
  };
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  if (!media || media.length === 0) return null;
  const currentMovie = media[currentIndex];

  return (
    <div className="relative w-full h-[85vh] min-h-[700px] max-h-[900px] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {media.map((movie, index) => (
          <div
            key={movie.id}
            className={`absolute inset-0 transition-opacity duration-1500 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={buildTmdbImage(movie.backdrop_path, 'original')}
              alt={movie.title || 'Movie backdrop'}
              fill
              className="object-cover"
              priority={index === 0}
              sizes="100vw"
              quality={100}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/90 to-transparent" />
      </div>

      {/* Arrows */}
      {media.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Content bottom-left */}
      <div className="relative z-10 h-full flex items-end">
        <div className="max-w-3xl px-10 pb-32">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 drop-shadow-lg">
            {currentMovie.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-3 text-sm mb-5">
            {currentMovie.release_date && (
              <span className="bg-gray-800/70 px-3 py-1 rounded-full text-xs">
                {new Date(currentMovie.release_date).getFullYear()}
              </span>
            )}
            {currentMovie.vote_average && (
              <div className="flex items-center gap-1 bg-yellow-500/90 text-black px-3 py-1 rounded-full text-xs font-bold">
                <span>⭐</span>
                <span>{currentMovie.vote_average.toFixed(1)}</span>
              </div>
            )}
            <span className="bg-green-600/80 px-3 py-1 rounded-full text-xs">
              HD
            </span>
          </div>

          {/* Overview */}
          {currentMovie.overview && (
            <p className="text-gray-200 text-base leading-relaxed line-clamp-3 max-w-xl mb-7 drop-shadow-md">
              {currentMovie.overview}
            </p>
          )}

          {/* Buttons (2 only, centered & aligned) */}
          <div className="flex gap-4">
            <Link
              href={`/watch/movie/${currentMovie.id}`}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-200 text-black font-semibold px-8 py-3 rounded-md transition-all text-base shadow-md"
            >
              <Play className="w-5 h-5 fill-current" />
              Watch Now
            </Link>
            <Link
              href={`/movie/${currentMovie.id}`}
              className="inline-flex items-center gap-2 bg-black/50 hover:bg-black/70 text-white font-medium px-8 py-3 rounded-md transition-all text-base"
            >
              <Info className="w-5 h-5" />
              More Info
            </Link>
          </div>
        </div>
      </div>

      {/* Dots */}
      {media.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-2">
            {media.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition ${
                  index === currentIndex
                    ? 'bg-white scale-125'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

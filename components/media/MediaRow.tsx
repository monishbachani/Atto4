'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie, Genre } from '@/lib/api/types';
import MediaCard from './MediaCard';

interface MediaRowProps {
  title: string;
  items: Movie[];
  genres: Genre[];
  priority?: boolean;
  category?: string;
  mediaType: 'movie' | 'tv';
}

export default function MediaRow({
  title,
  items,
  genres,
  priority = false,
  category = 'popular',
  mediaType,
}: MediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amt = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: dir === 'right' ? amt : -amt,
      behavior: 'smooth',
    });
  };

  const onScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanLeft(scrollLeft > 0);
    setCanRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  if (!items?.length) return null;

  return (
    <div className="relative group mb-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <Link
          href={`/browse/${category}?type=${mediaType}`}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors hover:underline"
        >
          View More
        </Link>
      </div>

      {/* Navigation Buttons */}
      {canLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-40 opacity-0 group-hover:opacity-100 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-opacity"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {canRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-40 opacity-0 group-hover:opacity-100 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-opacity"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Cards Container */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex space-x-6 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 pt-4 pb-8"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((m, i) => (
          <div
            key={`${mediaType}-${m.id}-${i}`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`flex-shrink-0 transition-all duration-300 transform ${
              hoveredIndex === i ? 'scale-110 z-10' : 'scale-100 z-0'
            }`}
            style={{
              transformOrigin: 'center center',
            }}
          >
            <MediaCard
              media={m}
              genres={genres}
              priority={priority && i < 6}
              mediaType={mediaType}
              isHovered={hoveredIndex === i}
            />
          </div>
        ))}
      </div>
    </div>
  );
}


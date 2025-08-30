import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { tmdbApi } from '@/lib/api/tmdb';
import MovieDetailsClient from '@/components/media/MovieDetailsClient';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface MoviePageProps {
  params: { id: string };
}

async function getMovieData(id: string) {
  try {
    const movieId = parseInt(id);
    if (isNaN(movieId)) {
      return null;
    }

    const [movieDetails, genres] = await Promise.all([
      tmdbApi.getMovieDetails(movieId),
      tmdbApi.getMovieGenres(),
    ]);

    return {
      movie: movieDetails,
      genres,
    };
  } catch (error) {
    console.error('Failed to fetch movie data:', error);
    return null;
  }
}

export default async function MoviePage({ params }: MoviePageProps) {
  const data = await getMovieData(params.id);

  if (!data || !data.movie) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <Suspense fallback={<LoadingSpinner />}>
        <MovieDetailsClient movie={data.movie} genres={data.genres} />
      </Suspense>
    </main>
  );
}

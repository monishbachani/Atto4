import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import { tmdbApi } from '@/lib/api/tmdb';
import TvShowDetailsClient from '@/components/media/TVDetailsClient';
import LoadingSpinner from '@/components/common/LoadingSpinner';

/* ---------- data loader (server) ---------- */
async function fetchTv(id: string) {
  const num = Number(id);
  if (!Number.isFinite(num) || num <= 0) return null;
  
  const [d, g] = await Promise.allSettled([
    tmdbApi.getTVShowDetails(num),
    tmdbApi.getTVGenres(),
  ]);
  
  const tv = d.status === 'fulfilled' ? d.value : null;
  const genres = g.status === 'fulfilled' ? g.value : [];
  
  if (!tv || !tv.id) return null;

  // Fetch detailed season information with episodes
  const seasonsWithEpisodes = await Promise.allSettled(
    tv.seasons?.map(async (season: any) => {
      if (season.season_number === 0) return null; // Skip specials for now
      try {
        const seasonDetails = await tmdbApi.getTVSeasonDetails(tv.id, season.season_number);
        return seasonDetails;
      } catch (error) {
        console.error(`Failed to fetch season ${season.season_number}:`, error);
        return season; // Return basic season info if detailed fetch fails
      }
    }) || []
  );

  const seasons = seasonsWithEpisodes
    .map(result => result.status === 'fulfilled' ? result.value : null)
    .filter(Boolean);

  return { tv, genres, seasons };
}

/* ---------- page ---------- */
export default async function TvPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchTv(id);
  
  if (!data) notFound();

  return (
    <ErrorBoundary fallback={<ErrorBlock />}>
      <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <Suspense fallback={<FullLoader />}>
          <TvShowDetailsClient 
            tv={data.tv} 
            genres={data.genres} 
            seasons={data.seasons}
          />
        </Suspense>
      </main>
    </ErrorBoundary>
  );
}

/* ---------- metadata ---------- */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchTv(id);
  
  if (!data) {
    return { title: 'TV Show Not Found - Bradflix', description: 'TV show not found.' };
  }
  
  return {
    title: `${data.tv.name} - Bradflix`,
    description: data.tv.overview || `Watch ${data.tv.name} on Bradflix.`,
  };
}

/* ---------- helpers ---------- */
function FullLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <LoadingSpinner />
    </div>
  );
}

function ErrorBlock() {
  return (
    <div className="flex h-screen items-center justify-center bg-black text-white">
      <p>Sorry - something went wrong while loading this TV show.</p>
    </div>
  );
}

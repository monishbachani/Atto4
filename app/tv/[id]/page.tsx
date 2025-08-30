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
  const gen = g.status === 'fulfilled' ? g.value : [];
  return tv && tv.id ? { tv, genres: gen } : null;
}

/* ---------- page ---------- */
export default async function TvPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Await params here
  const data = await fetchTv(id);
  
  if (!data) notFound();

  return (
    <ErrorBoundary fallback={<ErrorBlock />}>
      <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <Suspense fallback={<FullLoader />}>
          <TvShowDetailsClient tv={data.tv} genres={data.genres} />
        </Suspense>
      </main>
    </ErrorBoundary>
  );
}

/* ---------- metadata ---------- */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Await params here too
  const data = await fetchTv(id);
  
  if (!data) {
    return { title: 'TV Show Not Found - Bradflix', description: 'TV show not found.' };
  }
  
  return {
    title: `${data.tv.name} - Bradflix`,
    description: data.tv.overview || `Watch ${data.tv.name} on Bradflix.`,
  };
}

/* ---------- tiny helpers ---------- */
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

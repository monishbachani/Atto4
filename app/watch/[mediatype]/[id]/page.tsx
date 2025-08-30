// app/watch/[mediatype]/[id]/page.tsx
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import VideoPlayer from '@/components/player/VideoPlayer';
import { tmdbApi } from '@/lib/api/tmdb';

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mediaData, setMediaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const mediaType = params?.mediatype as 'movie' | 'tv';
  const id = parseInt(params?.id as string);
  
  // Get season and episode from query params for TV shows
  const season = parseInt(searchParams.get('season') || '1');
  const episode = parseInt(searchParams.get('episode') || '1');

  useEffect(() => {
    // Hide body scroll for fullscreen experience
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    async function loadMediaData() {
      try {
        let data;
        if (mediaType === 'movie') {
          data = await tmdbApi.getMovieDetails(id);
        } else {
          data = await tmdbApi.getTVShowDetails(id);
        }
        setMediaData(data);
      } catch (error) {
        console.error('Failed to load media:', error);
      } finally {
        setLoading(false);
      }
    }

    if (id && mediaType) {
      loadMediaData();
    }
  }, [id, mediaType]);

  const handleClose = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!mediaData) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Media not found</h1>
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const title = mediaData.title || mediaData.name;

  return (
    <VideoPlayer
      mediaId={id}
      mediaType={mediaType}
      title={title}
      season={mediaType === 'tv' ? season : undefined}
      episode={mediaType === 'tv' ? episode : undefined}
      onClose={handleClose}
    />
  );
}

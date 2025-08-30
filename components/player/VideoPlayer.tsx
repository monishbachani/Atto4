'use client';

import { useState, useEffect, useRef } from 'react';
import { videoApi } from '@/lib/api/video-api';
import type { VideoSource } from '@/lib/api/video-api';
import { useRouter } from 'next/navigation';

interface VideoPlayerProps {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  onClose?: () => void;
}

export default function VideoPlayer({
  mediaId,
  mediaType,
  season,
  episode,
  onClose
}: VideoPlayerProps) {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const testTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Test a source with timeout
  const testSource = (url: string, timeout: number = 8000): Promise<boolean> => {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.src = url;

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          iframe.remove();
          resolve(false);
        }
      }, timeout);

      iframe.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          iframe.remove();
          resolve(true);
        }
      };

      iframe.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          iframe.remove();
          resolve(false);
        }
      };

      document.body.appendChild(iframe);
    });
  };

  // Find first working source
  const findWorkingSource = async (videoSources: VideoSource[]): Promise<number | null> => {
    setIsTesting(true);
    
    for (let i = 0; i < videoSources.length; i++) {
      console.log(`Testing source ${i + 1}/${videoSources.length}: ${videoSources[i].servers}`);
      
      const isWorking = await testSource(videoSources[i].url);
      
      if (isWorking) {
        console.log(`✓ Source ${i + 1} working: ${videoSources[i].servers}`);
        setIsTesting(false);
        return i;
      } else {
        console.log(`✗ Source ${i + 1} failed: ${videoSources[i].servers}`);
      }
    }
    
    setIsTesting(false);
    return null;
  };

  // Load and test sources
  useEffect(() => {
    let cancelled = false;

    const loadSources = async () => {
      setLoading(true);
      setError(null);
      setEmbedUrl('');

      try {
        // Load sources from API
        const videoSources = mediaType === 'movie'
          ? await videoApi.getMovieSources(mediaId)
          : await videoApi.getTVSources(mediaId, season || 1, episode || 1);

        if (cancelled) return;

        if (videoSources.length === 0) {
          setError('No video sources available');
          setLoading(false);
          return;
        }

        setSources(videoSources);

        // Try server-side check first (if available)
        try {
          const response = await fetch('/api/check-embed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mediaType,
              tmdbId: mediaId,
              season: season || 1,
              episode: episode || 1
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.workingUrl) {
              const workingIndex = videoSources.findIndex(s => s.url === data.workingUrl);
              if (workingIndex !== -1) {
                setCurrentSourceIndex(workingIndex);
                setEmbedUrl(data.workingUrl);
                setLoading(false);
                return;
              }
            }
          }
        } catch (err) {
          console.log('Server-side check failed, using client-side fallback');
        }

        // Client-side fallback
        const workingIndex = await findWorkingSource(videoSources);
        
        if (cancelled) return;

        if (workingIndex !== null) {
          setCurrentSourceIndex(workingIndex);
          setEmbedUrl(videoSources[workingIndex].url);
        } else {
          setError('All video sources failed to load');
        }

      } catch (err) {
        console.error('Failed to load video sources:', err);
        if (!cancelled) {
          setError('Failed to load video sources');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSources();

    return () => {
      cancelled = true;
      if (testTimeoutRef.current) {
        clearTimeout(testTimeoutRef.current);
      }
    };
  }, [mediaId, mediaType, season, episode]);

  // Handle iframe error - try next source
  const handleIframeError = async () => {
    console.warn(`Iframe error on source: ${sources[currentSourceIndex]?.servers}`);
    
    const remainingSources = sources.slice(currentSourceIndex + 1);
    
    if (remainingSources.length === 0) {
      setError('All video sources failed to load');
      return;
    }

    // Test remaining sources
    for (let i = 0; i < remainingSources.length; i++) {
      const absoluteIndex = currentSourceIndex + 1 + i;
      const isWorking = await testSource(remainingSources[i].url, 5000);
      
      if (isWorking) {
        console.log(`Switching to source ${absoluteIndex + 1}: ${sources[absoluteIndex].servers}`);
        setCurrentSourceIndex(absoluteIndex);
        setEmbedUrl(sources[absoluteIndex].url);
        setError(null);
        return;
      }
    }

    setError('All video sources failed to load');
  };

  // Handle successful load
  const handleIframeLoad = () => {
    console.log(`✓ Successfully loaded: ${sources[currentSourceIndex]?.servers}`);
    setError(null);
  };

  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Loading State */}
      {(loading || isTesting) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-6 mx-auto"></div>
            <p className="text-xl mb-2">
              {isTesting ? 'Testing video sources...' : 'Loading video sources...'}
            </p>
            <p className="text-sm text-gray-400">
              Finding the best server for you
            </p>
            {sources.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {sources.length} sources available
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && !isTesting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center max-w-md px-6">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold mb-4">Unable to Play Video</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            {sources.length > 0 && (
              <p className="text-sm text-gray-400 mb-6">
                Tested {sources.length} different servers
              </p>
            )}
            
            <button
              onClick={handleClose}
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Video Player */}
      {embedUrl && !loading && !error && !isTesting && (
        <>
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            onError={handleIframeError}
            onLoad={handleIframeLoad}
            style={{ border: 'none' }}
          />

          {/* Controls Overlay */}
          <div className="absolute top-4 right-4 text-white/70 text-sm pointer-events-none">
            Auto-switch enabled — Press ESC to exit
          </div>

          {/* Development Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm">
              <div className="font-mono">
                Server: {sources[currentSourceIndex]?.servers}
              </div>
              <div className="text-xs text-gray-300 mt-1">
                Source {currentSourceIndex + 1} of {sources.length}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

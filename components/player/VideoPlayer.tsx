'use client';

import { useState, useEffect, useRef } from 'react';
import { videoApi } from '@/lib/api/video-api';
import type { VideoSource } from '@/lib/api/video-api';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface VideoPlayerProps {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title?: string;
  onClose?: () => void;
}

interface EmbedCheckResult {
  success: boolean;
  workingUrl?: {
    provider: string;
    url: string; // proxied URL
    originalUrl: string;
    type: string;
  };
  totalTested: number;
  workingCount: number;
  allUrls: Array<{
    provider: string;
    url: string; // proxied URL
    originalUrl: string;
    type: string;
    working: boolean;
    responseTime?: number;
    error?: string;
  }>;
  metadata: {
    mediaType: string;
    tmdbId: number;
    season?: number;
    episode?: number;
    tested: boolean;
    timestamp: string;
  };
}

export default function VideoPlayer({
  mediaId,
  mediaType,
  season,
  episode,
  title,
  onClose
}: VideoPlayerProps) {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [workingSources, setWorkingSources] = useState<any[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [checkResults, setCheckResults] = useState<EmbedCheckResult | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const testTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Client-side fallback test (simplified)
  const testSource = (url: string, timeout: number = 6000): Promise<boolean> => {
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

  // Enhanced source loading with new API
  useEffect(() => {
    let cancelled = false;

    const loadSources = async () => {
      setLoading(true);
      setError(null);
      setEmbedUrl('');
      setCheckResults(null);

      try {
        // Get traditional video sources for fallback
        const videoSources = mediaType === 'movie'
          ? await videoApi.getMovieSources(mediaId)
          : await videoApi.getTVSources(mediaId, season || 1, episode || 1);

        if (cancelled) return;
        setSources(videoSources);

        // Use enhanced embed checker API
        console.log(`🔍 Checking embed URLs for ${mediaType} ${mediaId}${mediaType === 'tv' ? ` S${season}E${episode}` : ''}...`);
        
        try {
          const response = await fetch('/api/check-embed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mediaType,
              tmdbId: mediaId,
              season: season || 1,
              episode: episode || 1,
              testUrls: true
            })
          });

          if (response.ok) {
            const data: EmbedCheckResult = await response.json();
            setCheckResults(data);

            if (cancelled) return;

            if (data.success && data.workingUrl) {
              console.log(`🎯 Server found working URL: ${data.workingUrl.provider} (${data.workingCount}/${data.totalTested} working)`);
              setEmbedUrl(data.workingUrl.url); // Use proxied URL
              setWorkingSources(data.allUrls.filter(u => u.working));
              setCurrentSourceIndex(0);
              setLoading(false);
              return;
            } else if (data.allUrls && data.allUrls.length > 0) {
              // Try first available URL even if not tested as working
              const firstUrl = data.allUrls[0];
              console.log(`⚠️ No confirmed working URLs, trying first available: ${firstUrl.provider}`);
              setEmbedUrl(firstUrl.url);
              setWorkingSources(data.allUrls);
              setCurrentSourceIndex(0);
              setLoading(false);
              return;
            }
          } else {
            console.log('Enhanced check failed, falling back to traditional method');
          }
        } catch (err) {
          console.log('Enhanced API unavailable, using traditional fallback');
        }

        // Traditional fallback method
        if (videoSources.length === 0) {
          setError('No video sources available');
          setLoading(false);
          return;
        }

        console.log(`🔄 Falling back to client-side testing of ${videoSources.length} sources...`);
        setIsTesting(true);

        // Test sources sequentially
        for (let i = 0; i < videoSources.length; i++) {
          if (cancelled) return;
          
          console.log(`Testing source ${i + 1}/${videoSources.length}: ${videoSources[i].servers}`);
          const isWorking = await testSource(videoSources[i].url);
          
          if (isWorking) {
            console.log(`✓ Source ${i + 1} working: ${videoSources[i].servers}`);
            setCurrentSourceIndex(i);
            setEmbedUrl(videoSources[i].url);
            setIsTesting(false);
            setLoading(false);
            return;
          } else {
            console.log(`✗ Source ${i + 1} failed: ${videoSources[i].servers}`);
          }
        }

        // No working sources found
        setError('All video sources failed to load');
        setIsTesting(false);

      } catch (err) {
        console.error('Failed to load video sources:', err);
        if (!cancelled) {
          setError('Failed to load video sources');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsTesting(false);
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

  // Enhanced iframe error handling
  const handleIframeError = async () => {
    console.warn(`Iframe error on current source`);
    
    // Try next working source from enhanced check results
    if (workingSources.length > 0) {
      const nextWorkingIndex = workingSources.findIndex((s, idx) => 
        idx > currentSourceIndex && s.working
      );
      
      if (nextWorkingIndex !== -1) {
        const nextSource = workingSources[nextWorkingIndex];
        console.log(`🔄 Switching to next working source: ${nextSource.provider}`);
        setCurrentSourceIndex(nextWorkingIndex);
        setEmbedUrl(nextSource.url);
        setError(null);
        return;
      }
    }

    // Fallback to traditional source switching
    const remainingSources = sources.slice(currentSourceIndex + 1);
    if (remainingSources.length === 0) {
      setError('All video sources failed to load');
      return;
    }

    for (let i = 0; i < remainingSources.length; i++) {
      const absoluteIndex = currentSourceIndex + 1 + i;
      const isWorking = await testSource(remainingSources[i].url, 4000);
      if (isWorking) {
        console.log(`🔄 Emergency fallback to source ${absoluteIndex + 1}: ${sources[absoluteIndex].servers}`);
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
    const currentSource = workingSources.length > 0 ? workingSources[currentSourceIndex] : sources[currentSourceIndex];
    const sourceName = currentSource?.provider || currentSource?.servers || 'Unknown';
    console.log(`✓ Successfully loaded: ${sourceName}`);
    setError(null);
  };

  // Handle close
  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
  };

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Enhanced Loading State */}
      {(loading || isTesting) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-6 mx-auto"></div>
            <p className="text-xl mb-2">
              {isTesting ? 'Testing video sources...' : 'Loading video sources...'}
            </p>
            <p className="text-sm text-gray-400">Finding the best server for you</p>
            {checkResults && (
              <p className="text-xs text-gray-500 mt-2">
                {checkResults.workingCount}/{checkResults.totalTested} servers available
              </p>
            )}
            {sources.length > 0 && !checkResults && (
              <p className="text-xs text-gray-500 mt-2">{sources.length} fallback sources available</p>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Error State */}
      {error && !loading && !isTesting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center max-w-md px-6">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold mb-4">Unable to Play Video</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            {checkResults && (
              <div className="text-sm text-gray-400 mb-6">
                <p>Tested {checkResults.totalTested} different servers</p>
                {checkResults.workingCount > 0 && (
                  <p>{checkResults.workingCount} servers were available but failed to load</p>
                )}
              </div>
            )}
            {!checkResults && sources.length > 0 && (
              <p className="text-sm text-gray-400 mb-6">Tested {sources.length} fallback servers</p>
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

          {/* Top-left Back + Title */}
          <div className="absolute top-4 left-4 z-30 flex items-center gap-3">
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            {title && (
              <h1 className="text-white font-extrabold text-lg sm:text-xl truncate max-w-xs sm:max-w-md">
                {title}
              </h1>
            )}
          </div>

          {/* Enhanced Controls Overlay */}
          <div className="absolute top-4 right-4 text-white/70 text-sm pointer-events-none">
            <div>Auto-switch enabled — Press ESC to exit</div>
            {checkResults && workingSources.length > 1 && (
              <div className="text-xs mt-1">
                {workingSources.length} backup servers available
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

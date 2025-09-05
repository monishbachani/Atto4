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

/**
 * NOTE: this type models the merged route's response shape.
 * allUrls[] entries contain:
 * - provider
 * - proxied (the URL the frontend should try; may be original direct URL or a proxied URL)
 * - originalUrl
 * - usedProxy (boolean)
 * - direct: { ok, status, responseTime, bodySnippet } | null
 * - proxy: { ok, status, responseTime, bodySnippet } | null
 */
type ServerAllUrl = {
  provider: string;
  type?: string;
  originalUrl: string;
  proxied: string | null;
  usedProxy: boolean;
  tested: boolean;
  direct?: { ok?: boolean; status?: number; responseTime?: number; bodySnippet?: string; error?: string } | null;
  proxy?: { ok?: boolean; status?: number; responseTime?: number; bodySnippet?: string; error?: string } | null;
};

type ServerResponse = {
  success: boolean;
  workingUrl?: { provider: string; url: string; originalUrl: string; type?: string; usedProxy?: boolean } | null;
  totalTested?: number;
  workingCount?: number;
  allUrls?: ServerAllUrl[];
  metadata?: any;
};

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
  const [workingSources, setWorkingSources] = useState<ServerAllUrl[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [checkResults, setCheckResults] = useState<ServerResponse | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const testTimeoutRef = useRef<number | null>(null);
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
      const timer = window.setTimeout(() => {
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

  // Load and coordinate sources with merged route
  useEffect(() => {
    let cancelled = false;

    const loadSources = async () => {
      setLoading(true);
      setError(null);
      setEmbedUrl('');
      setCheckResults(null);
      setWorkingSources([]);
      setCurrentSourceIndex(0);

      try {
        // 1) Traditional video sources (fallback)
        const videoSources = mediaType === 'movie'
          ? await videoApi.getMovieSources(mediaId)
          : await videoApi.getTVSources(mediaId, season || 1, episode || 1);

        if (cancelled) return;
        setSources(videoSources || []);

        // 2) Query the merged check-embed API
        console.log(`🔍 Checking embed URLs for ${mediaType} ${mediaId}${mediaType === 'tv' ? ` S${season}E${episode}` : ''}...`);
        try {
          const resp = await fetch('/api/check-embed', {
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

          if (resp.ok) {
            const data: ServerResponse = await resp.json();
            setCheckResults(data);

            if (cancelled) return;

            // If server returned a workingUrl, prefer it
            if (data.success && data.workingUrl && data.workingUrl.url) {
              console.log(`🎯 Server selected: ${data.workingUrl.provider} -> ${data.workingUrl.url}`);
              setEmbedUrl(data.workingUrl.url);
              // Build workingSources list from allUrls where direct.ok or proxy.ok
              const all = data.allUrls || [];
              const working = all.filter(u => (u.direct && u.direct.ok) || (u.proxy && u.proxy.ok));
              // If server selected worked but was not included in working filter, ensure it's present
              if (!working.find(w => w.proxied === data.workingUrl!.url)) {
                // try to find matching entry by originalUrl or provider and add
                const found = all.find(u => u.proxied === data.workingUrl!.url || u.originalUrl === data.workingUrl!.originalUrl || u.provider === data.workingUrl!.provider);
                if (found) working.unshift(found);
              }
              setWorkingSources(working);
              setCurrentSourceIndex(0);
              setLoading(false);
              return;
            }

            // Else, if there are server-provided URLs, try the first proxied URL (direct preferred)
            if (data.allUrls && data.allUrls.length > 0) {
              const first = data.allUrls[0];
              const tryUrl = first.proxied || first.originalUrl || '';
              console.log(`⚠️ No confirmed working server; trying server-provided first: ${first.provider} -> ${tryUrl}`);
              setEmbedUrl(tryUrl);
              // build list of all server candidates for switching
              setWorkingSources(data.allUrls);
              setCurrentSourceIndex(0);
              setLoading(false);
              return;
            }
          } else {
            console.warn('check-embed returned non-OK; falling back to client-side testing');
          }
        } catch (err) {
          console.warn('check-embed unavailable or failed; falling back to client-side testing', err);
        }

        // 3) Traditional client-side testing fallback
        if (!videoSources || videoSources.length === 0) {
          setError('No video sources available');
          setLoading(false);
          return;
        }

        console.log(`🔄 Falling back to client-side testing of ${videoSources.length} sources...`);
        setIsTesting(true);

        for (let i = 0; i < videoSources.length; i++) {
          if (cancelled) return;
          console.log(`Testing source ${i + 1}/${videoSources.length}: ${videoSources[i].servers || videoSources[i].url}`);
          const ok = await testSource(videoSources[i].url);
          if (ok) {
            console.log(`✓ Source ${i + 1} working`);
            setCurrentSourceIndex(i);
            setEmbedUrl(videoSources[i].url);
            setIsTesting(false);
            setLoading(false);
            return;
          } else {
            console.log(`✗ Source ${i + 1} failed`);
          }
        }

        setError('All video sources failed to load');
        setIsTesting(false);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load video sources:', err);
        if (!cancelled) setError('Failed to load video sources');
        setLoading(false);
        setIsTesting(false);
      }
    };

    loadSources();

    return () => {
      cancelled = true;
      if (testTimeoutRef.current) {
        window.clearTimeout(testTimeoutRef.current);
      }
    };
  }, [mediaId, mediaType, season, episode]);

  // Enhanced iframe error handling: try next workingSources entry first, then fallback to traditional sources
  const handleIframeError = async () => {
    console.warn('Iframe reported an error; attempting auto-switch...');

    // 1) If we have server-supplied workingSources, try the next one
    if (workingSources && workingSources.length > 0) {
      const nextIndex = workingSources.findIndex((_, idx) => idx > currentSourceIndex && workingSources[idx]);
      if (nextIndex !== -1 && workingSources[nextIndex]) {
        const next = workingSources[nextIndex];
        console.log(`🔄 Switching to next server-provided source: ${next.provider} -> ${next.proxied || next.originalUrl}`);
        setCurrentSourceIndex(nextIndex);
        setEmbedUrl(next.proxied || next.originalUrl);
        setError(null);
        return;
      }

      // If no "later" working entry found, but there are entries earlier in the list, try them too (wrap-around)
      for (let i = 0; i < workingSources.length; i++) {
        if (i === currentSourceIndex) continue;
        const cand = workingSources[i];
        // If server indicated it's ok via direct/proxy flag prefer it
        if ((cand.direct && cand.direct.ok) || (cand.proxy && cand.proxy.ok)) {
          console.log(`🔁 Trying another server-provided candidate: ${cand.provider} -> ${cand.proxied || cand.originalUrl}`);
          setCurrentSourceIndex(i);
          setEmbedUrl(cand.proxied || cand.originalUrl);
          setError(null);
          return;
        }
      }
    }

    // 2) Fallback to traditional sources list (client-side test them sequentially)
    const startIndex = Math.max(0, currentSourceIndex + 1);
    const remaining = sources.slice(startIndex);
    for (let i = 0; i < remaining.length; i++) {
      const absoluteIndex = startIndex + i;
      console.log(`Emergency testing fallback source ${absoluteIndex}: ${remaining[i].url}`);
      const ok = await testSource(remaining[i].url, 4000);
      if (ok) {
        console.log(`🔄 Fallback succeeded: ${remaining[i].servers || remaining[i].url}`);
        setCurrentSourceIndex(absoluteIndex);
        setEmbedUrl(remaining[i].url);
        setError(null);
        return;
      }
    }

    // 3) If still nothing, final error
    setError('All video sources failed to load');
  };

  // Handle successful load
  const handleIframeLoad = () => {
    const current = (workingSources && workingSources.length > 0)
      ? workingSources[currentSourceIndex]
      : sources[currentSourceIndex];
    const name = current?.provider || (current as any)?.servers || 'Unknown';
    console.log(`✓ Successfully loaded: ${name}`);
    setError(null);
  };

  // Handle close
  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
  };

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Loading */}
      {(loading || isTesting) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-6 mx-auto" />
            <p className="text-xl mb-2">{isTesting ? 'Testing video sources...' : 'Loading video sources...'}</p>
            <p className="text-sm text-gray-400">Finding the best server for you</p>
            {checkResults && (
              <p className="text-xs text-gray-500 mt-2">
                {checkResults.workingCount ?? 0}/{checkResults.totalTested ?? 0} servers available
              </p>
            )}
            {sources.length > 0 && !checkResults && (
              <p className="text-xs text-gray-500 mt-2">{sources.length} fallback sources available</p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && !isTesting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center max-w-md px-6">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold mb-4">Unable to Play Video</h2>
            <p className="text-gray-300 mb-4">{error}</p>

            {checkResults && (
              <div className="text-sm text-gray-400 mb-6">
                <p>Tested {checkResults.totalTested ?? 0} different servers</p>
                {checkResults.workingCount ? <p>{checkResults.workingCount} servers were available but failed to load</p> : null}
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

      {/* Player */}
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
            title={title || `player-${mediaType}-${mediaId}`}
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

          {/* Controls overlay */}
          <div className="absolute top-4 right-4 text-white/70 text-sm pointer-events-none">
            <div>Auto-switch enabled — Press ESC to exit</div>
            {workingSources && workingSources.length > 1 && (
              <div className="text-xs mt-1">{workingSources.length} backup servers available</div>
            )}
          </div>
        </>
      )}

      {/* Nothing available */}
      {!embedUrl && !loading && !error && !isTesting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-4xl mb-4">📺</div>
            <h2 className="text-xl font-bold mb-2">No Video Sources Available</h2>
            <p className="text-gray-400 mb-6">Unable to find any playable video sources for this content</p>
            <button
              onClick={handleClose}
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


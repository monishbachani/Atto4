// app/api/check-embed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { videoApi } from '@/lib/api/video-api';

interface CheckEmbedRequest {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
}

interface UrlCheckResult {
  url: string;
  proxiedUrl: string;
  index: number;
  working: boolean;
  tested: boolean;
  responseTime?: number;
  error?: string;
}

const ALLOWED_HOSTS = [
  "111movies.com",
  "vidsrc.to", 
  "vidsrc.stream",
  "player.111movies.com",
  "embed.111movies.com",
  "vidlink.pro",
  "2embed.cc",
  "embedsb.com",
  "doodstream.com",
  "streamtape.com",
];

function shouldProxy(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return ALLOWED_HOSTS.some(host => hostname.includes(host));
  } catch {
    return false;
  }
}

function getProxiedUrl(url: string): string {
  if (shouldProxy(url)) {
    return `/api/proxy?target=${encodeURIComponent(url)}`;
  }
  return url;
}

async function checkUrl(url: string, timeoutMs: number = 8000): Promise<{ working: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const checkUrl = shouldProxy(url) ? getProxiedUrl(url) : url;
    
    const response = await fetch(checkUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Atto4EmbedChecker/1.0)',
        'Accept': '*/*',
        'Cache-Control': 'no-cache',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      working: response.ok,
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      working: false,
      responseTime,
      error: errorMessage.includes('aborted') ? 'Request timeout' : errorMessage
    };
  }
}

async function checkMultipleUrls(urls: string[], maxConcurrent: number = 3): Promise<UrlCheckResult[]> {
  const results: UrlCheckResult[] = [];
  
  // Process URLs in batches to avoid overwhelming the server
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(async (url, batchIndex) => {
      const globalIndex = i + batchIndex;
      const { working, responseTime, error } = await checkUrl(url);
      
      return {
        url,
        proxiedUrl: getProxiedUrl(url),
        index: globalIndex,
        working,
        tested: true,
        responseTime,
        error
      };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Log progress
    console.log(`Batch ${Math.floor(i / maxConcurrent) + 1} completed: ${batchResults.length} URLs tested`);
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckEmbedRequest = await request.json();
    const { mediaType, tmdbId, season, episode } = body;

    if (!mediaType || !tmdbId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameters: mediaType and tmdbId are required' 
        },
        { status: 400 }
      );
    }

    if (mediaType === 'tv' && (!season || !episode)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameters: season and episode are required for TV shows' 
        },
        { status: 400 }
      );
    }

    // Get video sources from your API
    let sources;
    try {
      sources = mediaType === 'movie'
        ? await videoApi.getMovieSources(tmdbId)
        : await videoApi.getTVSources(tmdbId, season!, episode!);
    } catch (apiError) {
      console.error('Video API error:', apiError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch video sources',
          details: apiError instanceof Error ? apiError.message : 'Unknown API error'
        },
        { status: 500 }
      );
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No video sources found',
          mediaType,
          tmdbId,
          season,
          episode
        },
        { status: 404 }
      );
    }

    // Extract URLs from sources
    const urls = sources.map(source => source.url);
    console.log(`Testing ${urls.length} embed URLs for ${mediaType} ${tmdbId}${mediaType === 'tv' ? ` S${season}E${episode}` : ''}`);

    // Test URLs concurrently
    const startTime = Date.now();
    const results = await checkMultipleUrls(urls, 3);
    const totalTime = Date.now() - startTime;

    // Find first working URL
    const workingResult = results.find(result => result.working);
    const workingCount = results.filter(result => result.working).length;

    // Enhanced logging
    results.forEach((result, index) => {
      const status = result.working ? '✓' : '✗';
      const time = result.responseTime ? `${result.responseTime}ms` : 'N/A';
      const error = result.error ? ` (${result.error})` : '';
      console.log(`Check ${index + 1}/${results.length}: ${status} ${time} ${result.url}${error}`);
    });

    return NextResponse.json({
      success: true,
      workingUrl: workingResult?.proxiedUrl || null,
      originalWorkingUrl: workingResult?.url || null,
      totalTested: results.length,
      workingCount,
      testDuration: totalTime,
      results: results.map(result => ({
        url: result.url,
        proxiedUrl: result.proxiedUrl,
        working: result.working,
        responseTime: result.responseTime,
        error: result.error
      })),
      metadata: {
        mediaType,
        tmdbId,
        season,
        episode,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Embed check API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Enhanced GET endpoint for debugging and testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  const tmdbId = searchParams.get('tmdbId');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!mediaType || !tmdbId) {
    return NextResponse.json(
      { 
        error: 'Missing required parameters',
        required: ['mediaType', 'tmdbId'],
        optional: ['season', 'episode'] 
      },
      { status: 400 }
    );
  }

  try {
    // Get sources without testing them
    const sources = mediaType === 'movie'
      ? await videoApi.getMovieSources(parseInt(tmdbId))
      : await videoApi.getTVSources(
          parseInt(tmdbId), 
          season ? parseInt(season) : 1, 
          episode ? parseInt(episode) : 1
        );

    const urls = sources.map(source => ({
      original: source.url,
      proxied: getProxiedUrl(source.url),
      server: source.servers,
      shouldProxy: shouldProxy(source.url)
    }));

    return NextResponse.json({
      success: true,
      metadata: {
        mediaType,
        tmdbId: parseInt(tmdbId),
        season: season ? parseInt(season) : undefined,
        episode: episode ? parseInt(episode) : undefined,
      },
      sources: {
        count: sources.length,
        urls,
      },
      config: {
        proxyEnabled: true,
        allowedHosts: ALLOWED_HOSTS,
        hasVideoApi: !!videoApi,
      },
      endpoints: {
        test: 'POST /api/check-embed',
        proxy: 'GET /api/proxy?target=<url>',
      }
    });

  } catch (error) {
    console.error('GET check-embed error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch video sources',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

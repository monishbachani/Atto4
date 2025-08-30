// app/api/check-embed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { videoApi } from '@/lib/api/video-api';

interface CheckEmbedRequest {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
}

async function checkUrl(url: string, timeoutMs: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EmbedChecker/1.0)',
      },
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckEmbedRequest = await request.json();
    const { mediaType, tmdbId, season, episode } = body;

    if (!mediaType || !tmdbId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get all embed URL candidates
    const urls = videoApi.getEmbedUrlCandidates(
      mediaType,
      tmdbId,
      season,
      episode
    );

    if (urls.length === 0) {
      return NextResponse.json(
        { error: 'No embed URLs configured' },
        { status: 404 }
      );
    }

    // Test each URL in order
    const results = [];
    let workingUrl = null;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const isWorking = await checkUrl(url, 5000);
      
      results.push({
        url,
        index: i,
        working: isWorking,
        tested: true
      });

      if (isWorking && !workingUrl) {
        workingUrl = url;
      }

      // Log for debugging
      console.log(`Check ${i + 1}/${urls.length}: ${isWorking ? '✓' : '✗'} ${url}`);
    }

    return NextResponse.json({
      success: true,
      workingUrl,
      totalTested: urls.length,
      results,
      mediaType,
      tmdbId,
      season,
      episode
    });

  } catch (error) {
    console.error('Embed check API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional GET endpoint for debugging
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
  const tmdbId = searchParams.get('tmdbId');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!mediaType || !tmdbId) {
    return NextResponse.json(
      { error: 'Missing mediaType or tmdbId parameters' },
      { status: 400 }
    );
  }

  const urls = videoApi.getEmbedUrlCandidates(
    mediaType,
    parseInt(tmdbId),
    season ? parseInt(season) : undefined,
    episode ? parseInt(episode) : undefined
  );

  return NextResponse.json({
    mediaType,
    tmdbId: parseInt(tmdbId),
    season: season ? parseInt(season) : undefined,
    episode: episode ? parseInt(episode) : undefined,
    urls,
    configured: videoApi.hasConfiguredApis(),
    status: videoApi.getConfigStatus()
  });
}

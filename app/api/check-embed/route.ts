// app/api/check-embed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { videoApi } from '@/lib/api/video-api';

interface CheckEmbedRequest {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
  testUrls?: boolean; // optional flag to skip testing
}

/** Basic HEAD-check with timeout */
async function checkUrl(url: string, timeoutMs: number = 5000): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EmbedChecker/1.0)',
        Accept: '*/*'
      }
    });

    clearTimeout(id);
    return { ok: resp.ok, status: resp.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Heuristic: decide whether an embed URL is for movie or tv (or unknown) */
function inferUrlMediaType(url: string): 'movie' | 'tv' | 'unknown' {
  try {
    const u = new URL(url);
    const p = u.pathname.toLowerCase();
    const q = u.searchParams;

    // Path-based checks
    if (p.includes('/tv/') || p.includes('/embed/tv') || p.includes('/season') || p.includes('/episode')) {
      return 'tv';
    }
    if (p.includes('/movie/') || p.includes('/embed/movie') || p.includes('/embed/film')) {
      return 'movie';
    }

    // Query param checks
    if (q.get('s') || q.get('season') || q.get('episode') || q.get('e')) {
      return 'tv';
    }
    if (q.get('tmdb') && !q.get('season')) {
      // ambiguous — tmdb can be for movie or tv; fallback unknown
      return 'unknown';
    }

    // host-based heuristics (some providers embed tv vs movie)
    if (u.hostname.includes('embed/tv') || u.hostname.includes('vidsrc.to') && p.includes('/embed/tv')) {
      return 'tv';
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Safe parse
    const text = await request.text();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    let body: CheckEmbedRequest;
    try {
      body = JSON.parse(text);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { mediaType, tmdbId, season, episode, testUrls = true } = body;

    if (!mediaType || (mediaType !== 'movie' && mediaType !== 'tv')) {
      return NextResponse.json({ error: 'mediaType must be "movie" or "tv"' }, { status: 400 });
    }
    if (!tmdbId || typeof tmdbId !== 'number' || !Number.isFinite(tmdbId)) {
      return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 });
    }
    if (mediaType === 'tv' && (!season || !episode)) {
      return NextResponse.json({ error: 'TV requires season and episode' }, { status: 400 });
    }

    // Ask videoApi for candidates
    const urls = videoApi.getEmbedUrlCandidates(mediaType, tmdbId, season, episode);

    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: 'No embed URLs configured' }, { status: 404 });
    }

    const results: Array<{
      url: string;
      index: number;
      inferredType: 'movie' | 'tv' | 'unknown';
      compatible: boolean;
      tested: boolean;
      working?: boolean;
      status?: number;
      error?: string;
    }> = [];

    let chosenWorkingUrl: string | null = null;

    if (!testUrls) {
      // Return list without testing (client-side will test)
      urls.forEach((u, i) => {
        const inferred = inferUrlMediaType(u);
        results.push({
          url: u,
          index: i,
          inferredType: inferred,
          compatible: inferred === mediaType || inferred === 'unknown',
          tested: false
        });
      });

      return NextResponse.json({
        success: true,
        workingUrl: urls[0] || null,
        totalTested: 0,
        results,
        mediaType,
        tmdbId,
        season,
        episode
      });
    }

    // Sequentially test candidates (stop selecting when first compatible working found,
    // but continue collecting results for diagnostics)
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const inferredType = inferUrlMediaType(url);
      const compatible = inferredType === mediaType || inferredType === 'unknown';

      // test HEAD
      const check = await checkUrl(url, 5000);

      const entry = {
        url,
        index: i,
        inferredType,
        compatible,
        tested: true,
        working: !!check.ok,
        status: check.status,
        error: check.error
      };

      results.push(entry);

      // Only accept as chosenWorkingUrl if both working and compatible
      if (entry.working && compatible && !chosenWorkingUrl) {
        chosenWorkingUrl = url;
      }

      // log
      console.log(`Check ${i + 1}/${urls.length}: ${entry.working ? '✓' : '✗'} ${url} (inferred: ${inferredType}, compatible: ${compatible})`);
    }

    return NextResponse.json({
      success: true,
      workingUrl: chosenWorkingUrl,
      totalTested: results.length,
      results,
      mediaType,
      tmdbId,
      season,
      episode
    });
  } catch (error) {
    console.error('Embed check API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaType = searchParams.get('mediaType') as 'movie' | 'tv';
    const tmdbId = searchParams.get('tmdbId');
    const season = searchParams.get('season');
    const episode = searchParams.get('episode');

    if (!mediaType || !tmdbId) {
      return NextResponse.json({ error: 'Missing mediaType or tmdbId parameters' }, { status: 400 });
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
  } catch (err) {
    console.error('Embed check GET error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}


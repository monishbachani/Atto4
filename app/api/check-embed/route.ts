// app/api/check-embed/route.ts
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "vidlink.pro",
  "vidsrc.to",
  "vidsrc.stream",
  "2embed.cc",
  "embedsb.com",
  "doodstream.com",
  "streamtape.com",
];

function getHostname(u: string | null): string | null {
  if (!u) return null;
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function shouldProxy(url: string): boolean {
  const host = getHostname(url);
  if (!host) return false;
  return ALLOWED_HOSTS.some(h => host === h || host.endsWith(`.${h}`) || host.includes(h));
}

function getProxiedUrl(url: string): string {
  if (shouldProxy(url)) {
    return `/api/proxy?target=${encodeURIComponent(url)}`;
  }
  return url;
}

// Generate ALL possible embed combinations (movie + TV URLs for flexibility)
function buildAllEmbedCandidates(mediaType: "movie" | "tv", tmdbId: number, season?: number, episode?: number) {
  const candidates: Array<{ provider: string; url: string; proxied: string; type: string }> = [];

  // PRIMARY URLs (based on actual mediaType)
  if (mediaType === "movie") {
    // Movie-specific URLs
    candidates.push({
      provider: "VidLink", 
      url: `https://vidlink.pro/movie/${tmdbId}?primaryColor=3a86ff&autoplay=true&nextbutton=true`,
      proxied: getProxiedUrl(`https://vidlink.pro/movie/${tmdbId}?primaryColor=3a86ff&autoplay=true&nextbutton=true`),
      type: "movie"
    });
    candidates.push({
      provider: "VidSrc", 
      url: `https://vidsrc.to/embed/movie/${tmdbId}`,
      proxied: getProxiedUrl(`https://vidsrc.to/embed/movie/${tmdbId}`),
      type: "movie"
    });
    candidates.push({
      provider: "2Embed", 
      url: `https://2embed.cc/embed/movie?tmdb=${tmdbId}`,
      proxied: getProxiedUrl(`https://2embed.cc/embed/movie?tmdb=${tmdbId}`),
      type: "movie"
    });
  } else {
    // TV-specific URLs
    candidates.push({
      provider: "VidLink", 
      url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=3a86ff&autoplay=true&nextbutton=true`,
      proxied: getProxiedUrl(`https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=3a86ff&autoplay=true&nextbutton=true`),
      type: "tv"
    });
    candidates.push({
      provider: "VidSrc", 
      url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
      proxied: getProxiedUrl(`https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`),
      type: "tv"
    });
    candidates.push({
      provider: "2Embed", 
      url: `https://2embed.cc/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
      proxied: getProxiedUrl(`https://2embed.cc/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`),
      type: "tv"
    });
  }

  // FALLBACK URLs (opposite type - for cross-compatibility)
  if (mediaType === "movie" && season && episode) {
    // Add TV URLs as fallback for movies (in case movie is misclassified)
    candidates.push({
      provider: "VidLink-Fallback", 
      url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=3a86ff&autoplay=true&nextbutton=true`,
      proxied: getProxiedUrl(`https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=3a86ff&autoplay=true&nextbutton=true`),
      type: "tv-fallback"
    });
  } else if (mediaType === "tv") {
    // Add movie URLs as fallback for TV (in case TV is misclassified)
    candidates.push({
      provider: "VidSrc-Fallback", 
      url: `https://vidsrc.to/embed/movie/${tmdbId}`,
      proxied: getProxiedUrl(`https://vidsrc.to/embed/movie/${tmdbId}`),
      type: "movie-fallback"
    });
  }

  return candidates;
}

// Test URL to see if it's working
async function testUrl(url: string, timeoutMs: number = 5000): Promise<{ working: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Atto4EmbedChecker/1.0)',
        'Accept': '*/*',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    return {
      working: response.ok,
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      working: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: "Empty request body" }, { status: 400 });
    }

    let body: any;
    try {
      body = JSON.parse(text);
    } catch (err) {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const { mediaType, tmdbId: rawTmdbId, season: rawSeason, episode: rawEpisode, testUrls = true } = body;

    if (mediaType !== "movie" && mediaType !== "tv") {
      return NextResponse.json({ success: false, error: "mediaType must be 'movie' or 'tv'" }, { status: 400 });
    }

    const tmdbId = Number(rawTmdbId);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      return NextResponse.json({ success: false, error: "Invalid tmdbId" }, { status: 400 });
    }

    let season: number | undefined;
    let episode: number | undefined;

    if (mediaType === "tv") {
      season = rawSeason !== undefined ? Number(rawSeason) : undefined;
      episode = rawEpisode !== undefined ? Number(rawEpisode) : undefined;

      if (!Number.isFinite(season) || season <= 0 || !Number.isFinite(episode) || episode <= 0) {
        return NextResponse.json({ success: false, error: "TV requires valid season and episode" }, { status: 400 });
      }
    }

    // Generate all possible URLs
    const candidates = buildAllEmbedCandidates(mediaType, tmdbId, season, episode);
    let workingUrl = null;
    let allResults = [];

    if (testUrls) {
      // Test URLs sequentially to find working one
      console.log(`🔍 Testing ${candidates.length} embed URLs for ${mediaType} ${tmdbId}${mediaType === 'tv' ? ` S${season}E${episode}` : ''}...`);

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const testResult = await testUrl(candidate.proxied, 5000);
        
        const result = {
          ...candidate,
          working: testResult.working,
          responseTime: testResult.responseTime,
          error: testResult.error,
          tested: true
        };

        allResults.push(result);

        // Log result
        const status = testResult.working ? '✅' : '❌';
        const time = `${testResult.responseTime}ms`;
        const errorText = testResult.error ? ` (${testResult.error})` : '';
        console.log(`  ${status} ${candidate.provider} [${candidate.type}]: ${time}${errorText}`);

        // Use first working URL
        if (testResult.working && !workingUrl) {
          workingUrl = candidate;
          console.log(`🎯 Found working URL: ${candidate.provider} - ${candidate.url}`);
          // Continue testing other URLs for complete results but use this as primary
        }
      }
    } else {
      // Return URLs without testing
      allResults = candidates.map(candidate => ({
        ...candidate,
        working: null,
        tested: false
      }));
      workingUrl = candidates[0];
    }

    return NextResponse.json({
      success: true,
      workingUrl: workingUrl ? {
        provider: workingUrl.provider,
        url: workingUrl.proxied,
        originalUrl: workingUrl.url,
        type: workingUrl.type
      } : null,
      totalTested: candidates.length,
      workingCount: allResults.filter(r => r.working === true).length,
      allUrls: allResults.map(r => ({
        provider: r.provider,
        url: r.proxied,
        originalUrl: r.url,
        type: r.type,
        working: r.working,
        responseTime: r.responseTime,
        error: r.error
      })),
      metadata: {
        mediaType,
        tmdbId,
        season: mediaType === "tv" ? season : undefined,
        episode: mediaType === "tv" ? episode : undefined,
        tested: testUrls,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error("check-embed POST error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const urlObj = new URL(req.url);
    const mediaType = urlObj.searchParams.get("mediaType");
    const tmdbIdRaw = urlObj.searchParams.get("tmdbId");
    const seasonRaw = urlObj.searchParams.get("season");
    const episodeRaw = urlObj.searchParams.get("episode");
    const testUrls = urlObj.searchParams.get("test") !== "false";

    if (!mediaType || !tmdbIdRaw) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing mediaType or tmdbId",
        examples: {
          movie: "/api/check-embed?mediaType=movie&tmdbId=550",
          tv: "/api/check-embed?mediaType=tv&tmdbId=1399&season=1&episode=1",
          noTest: "/api/check-embed?mediaType=movie&tmdbId=550&test=false"
        }
      }, { status: 400 });
    }

    if (mediaType !== "movie" && mediaType !== "tv") {
      return NextResponse.json({ success: false, error: "mediaType must be 'movie' or 'tv'" }, { status: 400 });
    }

    const tmdbId = Number(tmdbIdRaw);
    let season = seasonRaw ? Number(seasonRaw) : 1;
    let episode = episodeRaw ? Number(episodeRaw) : 1;

    // Generate candidates
    const candidates = buildAllEmbedCandidates(mediaType as "movie" | "tv", tmdbId, season, episode);
    
    let workingUrl = null;
    let allResults = [];

    if (testUrls) {
      // Test the first few URLs quickly
      for (let i = 0; i < Math.min(3, candidates.length); i++) {
        const candidate = candidates[i];
        const testResult = await testUrl(candidate.proxied, 3000);
        
        allResults.push({
          ...candidate,
          working: testResult.working,
          responseTime: testResult.responseTime,
          error: testResult.error,
          tested: true
        });

        if (testResult.working && !workingUrl) {
          workingUrl = candidate;
        }
      }
    } else {
      allResults = candidates.map(c => ({ ...c, working: null, tested: false }));
      workingUrl = candidates[0];
    }

    return NextResponse.json({
      success: true,
      workingUrl: workingUrl ? {
        provider: workingUrl.provider,
        url: workingUrl.proxied,
        originalUrl: workingUrl.url,
        type: workingUrl.type
      } : null,
      allUrls: allResults.slice(0, 5), // Limit for GET requests
      metadata: { mediaType, tmdbId, season, episode, tested: testUrls }
    });

  } catch (err) {
    console.error("check-embed GET error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}


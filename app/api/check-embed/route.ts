// app/api/check-embed/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * check-embed route (improved):
 * - prefers direct embed URLs for iframe src
 * - falls back to proxy only when direct fetch fails and host is allowed
 * - returns detailed diagnostics for both direct and proxy attempts
 */

const ALLOWED_HOSTS = [
  "vidlink.pro",
  "vidsrc.to",
  "vidsrc.stream",
  "2embed.cc",
  "embedsb.com",
  "doodstream.com",
  "streamtape.com",
  "111movies.com",
];

function getHostname(u: string | null) {
  try {
    if (!u) return null;
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function hostAllowed(u: string | null) {
  const host = getHostname(u);
  if (!host) return false;
  return ALLOWED_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
}

// Build candidate list (original + proxyCandidate)
function buildAllEmbedCandidates(mediaType: "movie" | "tv", tmdbId: number, season?: number, episode?: number) {
  const make = (provider: string, url: string, type: string) => ({
    provider,
    originalUrl: url,
    proxyCandidate: `/api/proxy?target=${encodeURIComponent(url)}`,
    type
  });

  const candidates: Array<{ provider: string; originalUrl: string; proxyCandidate: string; type: string }> = [];

  if (mediaType === "movie") {
    candidates.push(make("VidLink", `https://vidlink.pro/movie/${tmdbId}?primaryColor=3a86ff&autoplay=true&nextbutton=true`, "movie"));
    candidates.push(make("VidSrc", `https://vidsrc.to/embed/movie/${tmdbId}`, "movie"));
    candidates.push(make("2Embed", `https://2embed.cc/embed/movie?tmdb=${tmdbId}`, "movie"));
  } else {
    candidates.push(make("VidLink", `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=3a86ff&autoplay=true&nextbutton=true`, "tv"));
    candidates.push(make("VidSrc", `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`, "tv"));
    candidates.push(make("2Embed", `https://2embed.cc/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, "tv"));
  }

  // fallbacks
  if (mediaType === "movie" && season && episode) {
    candidates.push(make("VidLink-Fallback", `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=3a86ff&autoplay=true&nextbutton=true`, "tv-fallback"));
  } else if (mediaType === "tv") {
    candidates.push(make("VidSrc-Fallback", `https://vidsrc.to/embed/movie/${tmdbId}`, "movie-fallback"));
  }

  return candidates;
}

/** Helper sleep for backoff */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Lightweight fetch test: GET with timeout, single attempt (caller may retry).
 * Returns structured result with status/snippet for diagnostics.
 */
async function fetchTest(url: string, timeoutMs = 5000): Promise<{
  ok: boolean;
  status?: number;
  statusText?: string;
  responseTime: number;
  bodySnippet?: string;
  error?: string;
}> {
  const start = Date.now();
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  // defensive headers
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; Atto4EmbedChecker/1.0)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    Referer: new URL(url).origin
  };

  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal, headers, credentials: "omit" });
    clearTimeout(id);
    const responseTime = Date.now() - start;

    // If not ok, try to read a snippet for diagnostics
    if (!res.ok) {
      let snippet = "";
      try {
        const text = await res.text();
        snippet = typeof text === "string" ? text.slice(0, 2000) : "";
      } catch (e) {
        snippet = "(failed to read body)";
      }
      return { ok: false, status: res.status, statusText: res.statusText, responseTime, bodySnippet: snippet, error: `HTTP ${res.status}` };
    }

    // ok
    return { ok: true, status: res.status, statusText: res.statusText, responseTime };
  } catch (err: any) {
    clearTimeout(id);
    const responseTime = Date.now() - start;
    return { ok: false, responseTime, error: err?.message || String(err) };
  }
}

/**
 * Primary route: POST and GET handlers
 * - POST: accepts JSON body
 * - GET: query params (kept for compatibility)
 */

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: "Empty request body" }, { status: 400 });
    }
    let body: any;
    try { body = JSON.parse(text); } catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

    const { mediaType, tmdbId: rawTmdbId, season: rawSeason, episode: rawEpisode, testUrls = true } = body;
    if (mediaType !== "movie" && mediaType !== "tv") return NextResponse.json({ success: false, error: "mediaType must be 'movie' or 'tv'" }, { status: 400 });

    const tmdbId = Number(rawTmdbId);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return NextResponse.json({ success: false, error: "Invalid tmdbId" }, { status: 400 });

    let season: number | undefined;
    let episode: number | undefined;
    if (mediaType === "tv") {
      season = rawSeason !== undefined ? Number(rawSeason) : undefined;
      episode = rawEpisode !== undefined ? Number(rawEpisode) : undefined;
      if (!Number.isFinite(season) || season <= 0 || !Number.isFinite(episode) || episode <= 0) {
        return NextResponse.json({ success: false, error: "TV requires valid season and episode" }, { status: 400 });
      }
    }

    const candidates = buildAllEmbedCandidates(mediaType, tmdbId, season, episode);
    let primary: any = null;
    const allResults: any[] = [];

    if (testUrls) {
      console.log(`🔍 Testing ${candidates.length} embed URLs for ${mediaType} ${tmdbId}${mediaType === "tv" ? ` S${season}E${episode}` : ''}...`);

      for (const candidate of candidates) {
        // Attempt 1: direct original URL
        const directResult = await fetchTest(candidate.originalUrl, 5000);

        let proxyResult = undefined;
        let chosenProxiedAbsolute = null;
        let chosenUsedProxy = false;

        // If direct worked, prefer it
        if (directResult.ok) {
          chosenProxiedAbsolute = candidate.originalUrl;
          chosenUsedProxy = false;
          console.log(`  ✅ ${candidate.provider} (direct) ${directResult.responseTime}ms`);
        } else {
          // If direct failed and host allowed for proxy, try proxy
          if (hostAllowed(candidate.originalUrl)) {
            // resolve proxy path to absolute URL based on incoming request origin
            const proxyPath = candidate.proxyCandidate; // e.g. /api/proxy?target=...
            const proxyAbsolute = proxyPath.startsWith("http") ? proxyPath : new URL(proxyPath, req.url).href;
            proxyResult = await fetchTest(proxyAbsolute, 7000);

            if (proxyResult.ok) {
              chosenProxiedAbsolute = proxyAbsolute;
              chosenUsedProxy = true;
              console.log(`  ✅ ${candidate.provider} (proxy) ${proxyResult.responseTime}ms`);
            } else {
              chosenProxiedAbsolute = proxyAbsolute; // still helpful to show what we tried
              console.log(`  ❌ ${candidate.provider} proxy failed: ${proxyResult.error || proxyResult.status || 'unknown'}`);
            }
          } else {
            console.log(`  ❌ ${candidate.provider} direct failed and host not allowed for proxy: ${directResult.error || directResult.status || 'unknown'}`);
          }
        }

        const result = {
          provider: candidate.provider,
          type: candidate.type,
          originalUrl: candidate.originalUrl,
          proxyCandidate: candidate.proxyCandidate,
          directResult,
          proxyResult,
          // The URL the frontend should use for iframe src (prefer direct, fallback to proxy if it worked)
          proxied: chosenProxiedAbsolute,
          usedProxy: chosenUsedProxy,
          tested: true,
        };

        allResults.push(result);

        if (!primary && (directResult.ok || (proxyResult && proxyResult.ok))) {
          primary = {
            provider: candidate.provider,
            url: result.proxied,
            originalUrl: candidate.originalUrl,
            type: candidate.type,
            usedProxy: result.usedProxy,
          };
          console.log(`🎯 Selected primary source: ${candidate.provider} -> ${result.proxied}`);
          // continue testing for diagnostics, do not break
        }
      }
    } else {
      // no test requested: prefer direct URLs for iframe
      for (const c of candidates) {
        allResults.push({
          provider: c.provider,
          type: c.type,
          originalUrl: c.originalUrl,
          proxyCandidate: c.proxyCandidate,
          directResult: null,
          proxyResult: null,
          proxied: c.originalUrl,
          usedProxy: false,
          tested: false
        });
      }
      primary = candidates[0] ? { provider: candidates[0].provider, url: candidates[0].originalUrl, originalUrl: candidates[0].originalUrl, type: candidates[0].type, usedProxy: false } : null;
    }

    return NextResponse.json({
      success: true,
      workingUrl: primary,
      totalTested: candidates.length,
      workingCount: allResults.filter(r => (r.directResult && r.directResult.ok) || (r.proxyResult && r.proxyResult.ok)).length,
      allUrls: allResults.map(r => ({
        provider: r.provider,
        type: r.type,
        originalUrl: r.originalUrl,
        proxied: r.proxied,
        usedProxy: r.usedProxy,
        tested: r.tested,
        direct: r.directResult,
        proxy: r.proxyResult
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
    return NextResponse.json({ success: false, error: "Internal server error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
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
      return NextResponse.json({ success: false, error: "Missing mediaType or tmdbId" }, { status: 400 });
    }
    if (mediaType !== "movie" && mediaType !== "tv") return NextResponse.json({ success: false, error: "mediaType must be 'movie' or 'tv'" }, { status: 400 });

    const tmdbId = Number(tmdbIdRaw);
    let season = seasonRaw ? Number(seasonRaw) : 1;
    let episode = episodeRaw ? Number(episodeRaw) : 1;

    const candidates = buildAllEmbedCandidates(mediaType as "movie" | "tv", tmdbId, season, episode);

    const results: any[] = [];
    let primary: any = null;

    if (testUrls) {
      // test only first few for GET speed (like before)
      for (let i = 0; i < Math.min(3, candidates.length); i++) {
        const c = candidates[i];
        const directResult = await fetchTest(c.originalUrl, 3000);
        let proxyResult;
        let chosen = c.originalUrl;
        let usedProxy = false;

        if (directResult.ok) {
          chosen = c.originalUrl;
          usedProxy = false;
        } else if (hostAllowed(c.originalUrl)) {
          const proxyAbs = c.proxyCandidate.startsWith("http") ? c.proxyCandidate : new URL(c.proxyCandidate, req.url).href;
          proxyResult = await fetchTest(proxyAbs, 4000);
          if (proxyResult.ok) {
            chosen = proxyAbs;
            usedProxy = true;
          }
        }

        const r = {
          provider: c.provider,
          type: c.type,
          originalUrl: c.originalUrl,
          proxied: chosen,
          usedProxy,
          direct: directResult,
          proxy: proxyResult || null,
          tested: true
        };

        results.push(r);
        if (!primary && (directResult.ok || (proxyResult && proxyResult.ok))) {
          primary = { provider: c.provider, url: chosen, originalUrl: c.originalUrl, type: c.type, usedProxy };
        }
      }
    } else {
      for (const c of candidates) {
        results.push({ provider: c.provider, type: c.type, originalUrl: c.originalUrl, proxied: c.originalUrl, usedProxy: false, tested: false, direct: null, proxy: null });
      }
      primary = candidates[0] ? { provider: candidates[0].provider, url: candidates[0].originalUrl, originalUrl: candidates[0].originalUrl, type: candidates[0].type, usedProxy: false } : null;
    }

    return NextResponse.json({
      success: true,
      workingUrl: primary,
      allUrls: results.slice(0, 5),
      metadata: { mediaType, tmdbId, season, episode, tested: testUrls }
    });

  } catch (err) {
    console.error("check-embed GET error:", err);
    return NextResponse.json({ success: false, error: "Internal server error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}


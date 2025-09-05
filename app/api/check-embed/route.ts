// merged route handler - place in app/api/proxy/route.ts and/or app/api/check-embed/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Merged proxy + check-embed route
 *
 * - Handles /api/proxy?target=... (GET) as a conservative proxy with timeout/retry and HTML rewriting.
 * - Handles /api/check-embed (GET & POST) as the embed candidate generator and tester.
 *
 * To use: replace the contents of your proxy and check-embed route files with this same file.
 */

/* ---------- Config ---------- */
const ALLOWED_HOSTS = [
  "vidlink.pro",
  "vidsrc.to",
  "vidsrc.stream",
  "2embed.cc",
  "embedsb.com",
  "doodstream.com",
  "streamtape.com",
  "111movies.com",
  "player.111movies.com",
  "embed.111movies.com",
];

function getHostname(u: string | null) {
  try {
    if (!u) return null;
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function hostAllowedHost(host: string | null) {
  if (!host) return false;
  return ALLOWED_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
}

function hostAllowedUrl(u: string | null) {
  const host = getHostname(u);
  return hostAllowedHost(host);
}

/* ---------- Utilities ---------- */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeoutAndRetry(url: string, timeoutMs = 10000, retries = 2) {
  const parsed = new URL(url);
  const origin = parsed.origin;

  const baseHeaders: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; Atto4Proxy/1.0)",
    Accept: "*/*",
    Referer: origin,
    Origin: origin,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: baseHeaders,
        credentials: "omit",
      });
      clearTimeout(id);
      return resp;
    } catch (err: any) {
      clearTimeout(id);
      const msg = err?.message || String(err);
      const transient = /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|network|timeout|aborted|Failed to fetch/i.test(msg) || err?.code === "ECONNRESET" || err?.code === "ETIMEDOUT";
      if (attempt === retries || !transient) {
        const e = new Error(`fetch failed (attempt ${attempt + 1}): ${msg}`);
        (e as any).cause = err;
        throw e;
      }
      const backoff = 300 * (2 ** attempt);
      console.warn(`Transient fetch error for ${url} (attempt ${attempt + 1}/${retries}). Retrying ${backoff}ms.`, msg);
      await sleep(backoff);
    }
  }

  throw new Error("unreachable fetchWithTimeoutAndRetry");
}

function rewriteAbsoluteUrlsToProxy(htmlText: string) {
  const replaced = htmlText.replace(/(src|href)=("https?:\/\/[^"]+"|'https?:\/\/[^']+')/gi, (m, attr, quotedUrl) => {
    const url = quotedUrl.slice(1, -1);
    const host = getHostname(url);
    if (!host) return `${attr}=${quotedUrl}`;
    if (hostAllowedHost(host)) {
      return `${attr}="/api/proxy?target=${encodeURIComponent(url)}"`;
    }
    return `${attr}=${quotedUrl}`;
  });

  const finalText = replaced.replace(/(['"`])(https?:\/\/[^'"` ]+)['"`]/gi, (m, quote, candidate) => {
    try {
      const host = getHostname(candidate);
      if (host && hostAllowedHost(host)) {
        return `${quote}/api/proxy?target=${encodeURIComponent(candidate)}${quote}`;
      }
    } catch { /* ignore */ }
    return m;
  });

  return finalText;
}

/* ---------- Proxy handler (used by /api/proxy) ---------- */
async function handleProxyGET(request: NextRequest) {
  try {
    const target = request.nextUrl.searchParams.get("target");
    if (!target) {
      return NextResponse.json({ success: false, error: "Missing target query param" }, { status: 400 });
    }

    const hostname = getHostname(target);
    if (!hostname) {
      return NextResponse.json({ success: false, error: "Invalid target URL" }, { status: 400 });
    }

    if (!hostAllowedHost(hostname)) {
      return NextResponse.json({ success: false, error: "Host not allowed", host: hostname }, { status: 403 });
    }

    let resp;
    try {
      resp = await fetchWithTimeoutAndRetry(target, 10000, 2);
    } catch (err: any) {
      console.error("Proxy fetch failed:", err?.message || err);
      return NextResponse.json({ success: false, error: "Failed to fetch target", details: err?.message || String(err) }, { status: 502 });
    }

    if (!resp) {
      return NextResponse.json({ success: false, error: "No response from target" }, { status: 502 });
    }

    const contentType = resp.headers.get("content-type") || "";

    if (!resp.ok) {
      let snippet = "";
      try { const txt = await resp.text(); snippet = typeof txt === "string" ? txt.slice(0, 2000) : ""; } catch (e) { snippet = "(failed to read body)"; }
      return NextResponse.json({
        success: false,
        status: resp.status,
        statusText: resp.statusText,
        message: `Upstream returned ${resp.status} ${resp.statusText}`,
        bodySnippet: snippet
      }, { status: 502 });
    }

    if (contentType.includes("text/html")) {
      const text = await resp.text();
      const rewritten = rewriteAbsoluteUrlsToProxy(text);
      return new NextResponse(rewritten, {
        status: resp.status,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-proxy-by": "Atto4-Proxy",
        },
      });
    }

    const arrayBuffer = await resp.arrayBuffer();
    const forwardedHeaders: Record<string, string> = {};
    resp.headers.forEach((v, k) => {
      const low = k.toLowerCase();
      if (["content-security-policy", "x-frame-options", "set-cookie", "transfer-encoding", "connection"].includes(low)) return;
      forwardedHeaders[k] = v;
    });

    if (!forwardedHeaders["content-type"]) forwardedHeaders["content-type"] = contentType || "application/octet-stream";
    forwardedHeaders["x-proxy-by"] = "Atto4-Proxy";

    return new NextResponse(Buffer.from(arrayBuffer), {
      status: resp.status,
      headers: forwardedHeaders,
    });

  } catch (err) {
    console.error("Proxy error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: "Internal proxy error", details: message }, { status: 500 });
  }
}

/* ---------- Check-embed utilities & handler (used by /api/check-embed) ---------- */
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

  if (mediaType === "movie" && season && episode) {
    candidates.push(make("VidLink-Fallback", `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=3a86ff&autoplay=true&nextbutton=true`, "tv-fallback"));
  } else if (mediaType === "tv") {
    candidates.push(make("VidSrc-Fallback", `https://vidsrc.to/embed/movie/${tmdbId}`, "movie-fallback"));
  }

  return candidates;
}

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

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; Atto4EmbedChecker/1.0)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal, headers, credentials: "omit" });
    clearTimeout(id);
    const responseTime = Date.now() - start;
    if (!res.ok) {
      let snippet = "";
      try { const t = await res.text(); snippet = typeof t === "string" ? t.slice(0, 2000) : ""; } catch (e) { snippet = "(failed to read body)"; }
      return { ok: false, status: res.status, statusText: res.statusText, responseTime, bodySnippet: snippet, error: `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, statusText: res.statusText, responseTime };
  } catch (err: any) {
    clearTimeout(id);
    const responseTime = Date.now() - start;
    return { ok: false, responseTime, error: err?.message || String(err) };
  }
}

async function handleCheckEmbedPOST(req: NextRequest) {
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
        const directResult = await fetchTest(candidate.originalUrl, 5000);

        let proxyResult = undefined;
        let chosenProxiedAbsolute = null;
        let chosenUsedProxy = false;

        if (directResult.ok) {
          chosenProxiedAbsolute = candidate.originalUrl;
          chosenUsedProxy = false;
          console.log(`  ✅ ${candidate.provider} (direct) ${directResult.responseTime}ms`);
        } else {
          if (hostAllowedUrl(candidate.originalUrl)) {
            const proxyPath = candidate.proxyCandidate;
            const proxyAbsolute = proxyPath.startsWith("http") ? proxyPath : new URL(proxyPath, req.url).href;
            // try proxy by calling our own proxy endpoint (which this same file implements)
            proxyResult = await fetchTest(proxyAbsolute, 7000);

            if (proxyResult.ok) {
              chosenProxiedAbsolute = proxyAbsolute;
              chosenUsedProxy = true;
              console.log(`  ✅ ${candidate.provider} (proxy) ${proxyResult.responseTime}ms`);
            } else {
              chosenProxiedAbsolute = proxyAbsolute;
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
        }
      }
    } else {
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

async function handleCheckEmbedGET(req: NextRequest) {
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
      for (let i = 0; i < Math.min(3, candidates.length); i++) {
        const c = candidates[i];
        const directResult = await fetchTest(c.originalUrl, 3000);
        let proxyResult;
        let chosen = c.originalUrl;
        let usedProxy = false;

        if (directResult.ok) {
          chosen = c.originalUrl;
          usedProxy = false;
        } else if (hostAllowedUrl(c.originalUrl)) {
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

/* ---------- Route dispatchers: export GET/POST that inspect pathname ---------- */

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname || "";
  // path may be /api/proxy or /api/check-embed depending on where file lives
  if (pathname.endsWith("/api/proxy") || pathname.endsWith("/proxy")) {
    return handleProxyGET(request);
  }
  if (pathname.endsWith("/api/check-embed") || pathname.endsWith("/check-embed")) {
    return handleCheckEmbedGET(request);
  }

  // fallback: if client invoked /api/proxy?target=..., proxy
  if (request.nextUrl.searchParams.get("target")) {
    return handleProxyGET(request);
  }

  // default: check-embed GET
  return handleCheckEmbedGET(request);
}

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname || "";
  if (pathname.endsWith("/api/proxy") || pathname.endsWith("/proxy")) {
    // proxy via POST (accept JSON { target })
    try {
      const body = await request.json().catch(() => null);
      const target = body?.target || request.nextUrl.searchParams.get("target");
      if (!target) return NextResponse.json({ success: false, error: "Missing target" }, { status: 400 });
      // delegate to fetchWithTimeoutAndRetry and response streaming logic used in GET
      const fakeReq = request;
      const proxyUrl = new URL(request.url);
      proxyUrl.searchParams.set("target", target);
      return handleProxyGET(new NextRequest(proxyUrl)); // Note: NextRequest constructor usage above is conceptual; in runtime this may differ.
    } catch (err) {
      return NextResponse.json({ success: false, error: "Proxy POST failed", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  }

  if (pathname.endsWith("/api/check-embed") || pathname.endsWith("/check-embed")) {
    return handleCheckEmbedPOST(request);
  }

  // default: treat POST as check-embed
  return handleCheckEmbedPOST(request);
}



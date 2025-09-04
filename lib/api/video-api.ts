// lib/api/video-api.ts
import axios from "axios";

export interface VideoSource {
  url: string;
  quality: string;
  type: "iframe";
  servers: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
}

/** Read and normalize environment variables */
const ENV = {
  BASE: (process.env.NEXT_PUBLIC_VIDEO_API_BASE || "").trim(),
  E1: (process.env.NEXT_PUBLIC_VIDEO_EMBED_1 || "https://vidlink.pro/tv/${id}/${season}/${episode}?startAt=60&primaryColor=3a86ff&autoplay=true&nextbutton=true&sub_file=https://example.com/subtitles.vtt&sub_label=English").trim(),
  E2: (process.env.NEXT_PUBLIC_VIDEO_EMBED_2 || "https://vidlink.pro/movie/${id}?startAt=60&primaryColor=3a86ff&autoplay=true&nextbutton=true&sub_file=https://example.com/subtitles.vtt&sub_label=English").trim(),
  E3: (process.env.NEXT_PUBLIC_VIDEO_EMBED_3 || "").trim(),
  E4: (process.env.NEXT_PUBLIC_VIDEO_EMBED_4 || "").trim(),
};

/** Global extra params appended to every embed URL */
const EXTRA_PARAMS = (process.env.NEXT_PUBLIC_VIDEO_URL_PARAMS || "").trim();

/** Providers list with friendly names (fallback order) */
const VIDEO_PROVIDERS = [
  { name: "Primary", value: ENV.E1, priority: 1 },
  { name: "Secondary", value: ENV.E2, priority: 2 },
  { name: "Tertiary", value: ENV.E3, priority: 3 },
  { name: "Backup", value: ENV.E4, priority: 4 },
  { name: "Base", value: ENV.BASE, priority: 5 },
].filter(p => !!p.value);

/** Extract hostname for friendly server label */
function getServerLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown Server';
  }
}

/** Build the default embed path for base URLs */
function buildEmbedPath(
  mediaType: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number
): string {
  if (mediaType === "movie") return `/movie/${tmdbId}`;
  if (season && episode) return `/tv/${tmdbId}/${season}/${episode}`;
  return `/tv/${tmdbId}`;
}

/** Check if provider uses template placeholders */
function isTemplate(url: string): boolean {
  return /\$\{(id|type|season|episode)\}/.test(url);
}

/** Normalize base URL (remove trailing slash) */
function normalizeBase(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/** Append query parameters safely */
function appendParams(url: string, params: string): string {
  if (!params) return url;
  return url + (url.includes("?") ? "&" : "?") + params;
}

/** Build raw URL from template or base provider */
function buildRawUrl(
  providerValue: string,
  mediaType: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number
): string {
  if (isTemplate(providerValue)) {
    // Template mode: replace placeholders
    return providerValue
      .replace(/\$\{id\}/g, String(tmdbId))
      .replace(/\$\{type\}/g, mediaType)
      .replace(/\$\{season\}/g, season ? String(season) : "1")
      .replace(/\$\{episode\}/g, episode ? String(episode) : "1");
  }
  
  // Base mode: append canonical path
  const base = normalizeBase(providerValue);
  return `${base}${buildEmbedPath(mediaType, tmdbId, season, episode)}`;
}

/** Build final playable URL with extra params */
export function buildEmbedUrl(
  providerValue: string,
  mediaType: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number
): string {
  const raw = buildRawUrl(providerValue, mediaType, tmdbId, season, episode);
  return appendParams(raw, EXTRA_PARAMS);
}

/** Get all embed URL candidates in priority order */
export function getEmbedUrlCandidates(
  mediaType: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number
): string[] {
  const urls = VIDEO_PROVIDERS.map(provider =>
    buildEmbedUrl(provider.value, mediaType, tmdbId, season, episode)
  );
  
  // Remove duplicates while preserving order
  return [...new Set(urls)];
}

/** Create VideoSource from provider */
function createVideoSource(
  provider: typeof VIDEO_PROVIDERS[0],
  mediaType: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number
): VideoSource {
  const url = buildEmbedUrl(provider.value, mediaType, tmdbId, season, episode);
  
  return {
    url,
    quality: "HD",
    type: "iframe",
    servers: `${provider.name} (${getServerLabel(url)})`,
    tmdbId,
    mediaType,
  };
}

/** Resolve TMDB ID from various input formats */
export async function resolveTmdbId(
  input: string | number,
  type: "movie" | "tv"
): Promise<number | null> {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  
  const str = String(input).trim();
  const asNum = Number(str);
  if (Number.isFinite(asNum)) return asNum;

  // Handle IMDb IDs
  if (/^tt\d+$/i.test(str)) {
    const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY?.trim();
    if (!API_KEY) return null;
    
    try {
      const { data } = await axios.get(
        `https://api.themoviedb.org/3/find/${str}`,
        { 
          params: { api_key: API_KEY, external_source: "imdb_id" },
          timeout: 5000
        }
      );
      
      const results = type === "movie" ? data.movie_results : data.tv_results;
      return results?.[0]?.id ?? null;
    } catch (error) {
      console.error('Failed to resolve IMDb ID:', error);
      return null;
    }
  }

  return null;
}

export const videoApi = {
  /** Check if any video APIs are configured */
  hasConfiguredApis(): boolean {
    return VIDEO_PROVIDERS.length > 0;
  },

  /** Get configuration status for debugging */
  getConfigStatus() {
    return {
      configured: VIDEO_PROVIDERS.length,
      providers: VIDEO_PROVIDERS.map(p => ({
        name: p.name,
        configured: !!p.value,
        isTemplate: isTemplate(p.value),
        priority: p.priority
      })),
      extraParams: EXTRA_PARAMS || 'none'
    };
  },

  /** Get all embed URL candidates for media */
  getEmbedUrlCandidates,

  /** Get movie video sources */
  async getMovieSources(tmdbId: number): Promise<VideoSource[]> {
    return VIDEO_PROVIDERS.map(provider =>
      createVideoSource(provider, "movie", tmdbId)
    );
  },

  /** Get TV show video sources */
  async getTVSources(
    tmdbId: number, 
    season?: number, 
    episode?: number
  ): Promise<VideoSource[]> {
    return VIDEO_PROVIDERS.map(provider =>
      createVideoSource(provider, "tv", tmdbId, season, episode)
    );
  },

  /** Get movie with embed data */
  async getMovieWithEmbed(tmdbId: number) {
    const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY?.trim();
    
    try {
      const [movieResponse, sources] = await Promise.all([
        API_KEY
          ? axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
              params: { api_key: API_KEY },
              timeout: 10000
            })
          : Promise.resolve({ data: null }),
        this.getMovieSources(tmdbId)
      ]);

      return {
        movie: movieResponse.data,
        embedUrl: sources[0]?.url || "",
        sources
      };
    } catch (error) {
      console.error('Error fetching movie with embed:', error);
      return { movie: null, embedUrl: "", sources: [] };
    }
  },

  /** Get TV show with embed data */
  async getTVShowWithEmbed(
    tmdbId: number, 
    season?: number, 
    episode?: number
  ) {
    const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY?.trim();
    
    try {
      const [tvResponse, sources] = await Promise.all([
        API_KEY
          ? axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
              params: { api_key: API_KEY },
              timeout: 10000
            })
          : Promise.resolve({ data: null }),
        this.getTVSources(tmdbId, season, episode)
      ]);

      return {
        tvShow: tvResponse.data,
        embedUrl: sources[0]?.url || "",
        sources
      };
    } catch (error) {
      console.error('Error fetching TV show with embed:', error);
      return { tvShow: null, embedUrl: "", sources: [] };
    }
  },

  /** Debug helper to log all configured providers */
  logConfiguration() {
    console.log('Video API Configuration:', this.getConfigStatus());
  }
};

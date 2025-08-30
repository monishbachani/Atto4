import axios from 'axios';
import type { Movie, TVShow, Genre, MediaDetails } from './types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = (process.env.NEXT_PUBLIC_TMDB_API_KEY || '').trim();

// Warn at startup (non-fatal) so missing env doesn't crash the app on import
if (!API_KEY) {
  console.warn('[tmdb] WARNING: NEXT_PUBLIC_TMDB_API_KEY is not set. TMDB requests will fail until provided.');
}

const tmdbClient = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'User-Agent': 'Bradfilx/1.0',
  },
});

/**
 * Low-level request helper with retries and clear error classification.
 */
async function request<T = any>(
  url: string,
  params?: Record<string, any>,
  maxRetries = 3
): Promise<T> {
  if (!API_KEY) {
    throw new Error('Missing NEXT_PUBLIC_TMDB_API_KEY at runtime');
  }

  const requestParams = { api_key: API_KEY, ...(params || {}) };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await tmdbClient.get<T>(url, { params: requestParams });
      return res.data;
    } catch (err: any) {
      const isLastAttempt = attempt === maxRetries;
      const status = err?.response?.status;
      const statusText = err?.response?.statusText;
      const serverMsg = err?.response?.data ? JSON.stringify(err.response.data).slice(0, 400) : '';

      if (status === 404) {
        throw new Error(`TMDB 404: resource not found (${url})`);
      }
      if (status === 401) {
        throw new Error('TMDB 401: Invalid or unauthorized API key.');
      }

      const isNetworkError = !!err?.code && ['ENOTFOUND', 'ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT'].includes(err.code);

      if (isLastAttempt) {
        let msg = `TMDB request failed (${url})`;
        if (status) msg += ` status=${status}${statusText ? ` ${statusText}` : ''}`;
        if (err.message) msg += ` message=${err.message}`;
        if (serverMsg) msg += ` server=${serverMsg}`;
        throw new Error(msg);
      }

      const delayMs = Math.pow(2, attempt - 1) * 500;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Unexpected error in TMDB request retry loop');
}

export const tmdbApi = {
  async getTrending(timeWindow: 'day' | 'week' = 'week'): Promise<Movie[]> {
    try {
      const data = await request<{ results: Movie[] }>(`/trending/movie/${timeWindow}`);
      return data.results || [];
    } catch (error) {
      console.warn('[tmdbApi] getTrending failed:', (error as Error).message);
      return [];
    }
  },

  async getTVTrending(timeWindow: 'day' | 'week' = 'week'): Promise<TVShow[]> {
    try {
      const data = await request<{ results: TVShow[] }>(`/trending/tv/${timeWindow}`);
      return data.results || [];
    } catch (error) {
      console.warn('[tmdbApi] getTVTrending failed:', (error as Error).message);
      return [];
    }
  },

  async getPopularMovies(page: number = 1): Promise<{ results: Movie[]; total_pages: number }> {
    try {
      const data = await request<{ results: Movie[]; total_pages: number }>('/movie/popular', { page });
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] getPopularMovies failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async getTopRatedMovies(page: number = 1): Promise<{ results: Movie[]; total_pages: number }> {
    try {
      const data = await request<{ results: Movie[]; total_pages: number }>('/movie/top_rated', { page });
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] getTopRatedMovies failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async getUpcomingMovies(page: number = 1): Promise<{ results: Movie[]; total_pages: number }> {
    try {
      const data = await request<{ results: Movie[]; total_pages: number }>('/movie/upcoming', { page });
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] getUpcomingMovies failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async getNowPlayingMovies(page: number = 1): Promise<{ results: Movie[]; total_pages: number }> {
    try {
      const data = await request<{ results: Movie[]; total_pages: number }>('/movie/now_playing', { page });
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] getNowPlayingMovies failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async getPopularTVShows(page: number = 1): Promise<{ results: TVShow[]; total_pages: number }> {
    try {
      const data = await request<{ results: TVShow[]; total_pages: number }>('/tv/popular', { page });
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] getPopularTVShows failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async getTopRatedTVShows(page: number = 1): Promise<{ results: TVShow[]; total_pages: number }> {
    try {
      const data = await request<{ results: TVShow[]; total_pages: number }>('/tv/top_rated', { page });
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] getTopRatedTVShows failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async getOnTheAirTVShows(page: number = 1): Promise<{ results: TVShow[]; total_pages: number }> {
    try {
      const data = await request<{ results: TVShow[]; total_pages: number }>('/tv/on_the_air', { page });
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] getOnTheAirTVShows failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async getAiringTodayTVShows(page: number = 1): Promise<{ results: TVShow[]; total_pages: number }> {
    try {
      const data = await request<{ results: TVShow[]; total_pages: number }>('/tv/airing_today', { page });
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] getAiringTodayTVShows failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async getTVByCategory(category: string, page: number = 1): Promise<{ results: TVShow[]; total_pages: number }> {
    try {
      let endpoint = '/tv/popular';
      switch (category) {
        case 'popular':
          endpoint = '/tv/popular';
          break;
        case 'top-rated':
          endpoint = '/tv/top_rated';
          break;
        case 'on-the-air':
          endpoint = '/tv/on_the_air';
          break;
        case 'airing-today':
          endpoint = '/tv/airing_today';
          break;
        default:
          endpoint = '/tv/popular';
      }
      const data = await request<{ results: TVShow[]; total_pages: number }>(endpoint, { page });
      const filteredResults = (data.results || []).filter((item) => !!item.name && !!item.first_air_date);
      return { results: filteredResults, total_pages: data.total_pages || 0 };
    } catch (error) {
      console.warn('[tmdbApi] getTVByCategory failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async discoverTVShows(params: {
    page?: number;
    genreId?: number;
    sortBy?: string;
    year?: number;
    minRating?: number;
  } = {}): Promise<{ results: TVShow[]; total_pages: number }> {
    try {
      const requestParams: any = {
        page: params.page || 1,
        sort_by: params.sortBy || 'popularity.desc',
        'vote_count.gte': 10,
      };
      if (params.genreId) requestParams.with_genres = params.genreId;
      if (params.year) requestParams.first_air_date_year = params.year;
      if (params.minRating) requestParams['vote_average.gte'] = params.minRating;

      const data = await request<{ results: TVShow[]; total_pages: number }>('/discover/tv', requestParams);
      const filteredResults = (data.results || []).filter((show) => !!show.name && !!show.first_air_date);
      return { results: filteredResults, total_pages: data.total_pages || 0 };
    } catch (error) {
      console.warn('[tmdbApi] discoverTVShows failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async getLatestReleases(mediaType: 'movie' | 'tv' = 'movie', page: number = 1, genreId?: number): Promise<{ results: any[]; total_pages: number }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const params: any = {
        sort_by: mediaType === 'tv' ? 'first_air_date.desc' : 'release_date.desc',
        page,
        'vote_count.gte': 10,
      };
      if (mediaType === 'movie') params['release_date.lte'] = today;
      if (mediaType === 'tv') params['first_air_date.lte'] = today;
      if (genreId) params.with_genres = genreId;

      const data = await request(`/discover/${mediaType}`, params);
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] getLatestReleases failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async searchMulti(query: string, params?: { page?: number }): Promise<{ results: any[]; total_pages: number }> {
    try {
      const data = await request('/search/multi', { query, ...(params || {}) });
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] searchMulti failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async searchMovies(query: string, page: number = 1): Promise<{ results: Movie[]; total_pages: number }> {
    try {
      const data = await request<{ results: Movie[]; total_pages: number }>('/search/movie', { query, page });
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] searchMovies failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async searchTVShows(query: string, page: number = 1): Promise<{ results: TVShow[]; total_pages: number }> {
    try {
      const data = await request<{ results: TVShow[]; total_pages: number }>('/search/tv', { query, page });
      const filteredResults = (data.results || []).filter((show) => !!show.name && !!show.first_air_date);
      return { results: filteredResults, total_pages: data.total_pages || 0 };
    } catch (error) {
      console.warn('[tmdbApi] searchTVShows failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async getMovieDetails(id: number): Promise<MediaDetails | null> {
    try {
      const data = await request<MediaDetails>(`/movie/${id}`, {
        append_to_response: 'credits,videos,similar,recommendations',
      });
      return data || null;
    } catch (error) {
      console.warn('[tmdbApi] getMovieDetails failed:', (error as Error).message);
      return null;
    }
  },

  async getTVShowDetails(id: number): Promise<MediaDetails | null> {
    try {
      const data = await request<MediaDetails>(`/tv/${id}`, {
        append_to_response: 'credits,videos,similar,recommendations',
      });
      return data || null;
    } catch (error) {
      console.warn('[tmdbApi] getTVShowDetails failed:', (error as Error).message);
      return null;
    }
  },

  async getMovieGenres(): Promise<Genre[]> {
    try {
      const data = await request<{ genres: Genre[] }>('/genre/movie/list');
      return data.genres || [];
    } catch (error) {
      console.warn('[tmdbApi] getMovieGenres failed:', (error as Error).message);
      return [];
    }
  },

  async getTVGenres(): Promise<Genre[]> {
    try {
      const data = await request<{ genres: Genre[] }>('/genre/tv/list');
      return data.genres || [];
    } catch (error) {
      console.warn('[tmdbApi] getTVGenres failed:', (error as Error).message);
      return [];
    }
  },

  async getAllGenres(): Promise<{ movieGenres: Genre[]; tvGenres: Genre[] }> {
    try {
      const [movieGenres, tvGenres] = await Promise.all([this.getMovieGenres(), this.getTVGenres()]);
      return { movieGenres, tvGenres };
    } catch (error) {
      console.warn('[tmdbApi] getAllGenres failed:', (error as Error).message);
      return { movieGenres: [], tvGenres: [] };
    }
  },

  async getMoviesByGenre(genreId: number, page: number = 1): Promise<{ results: Movie[]; total_pages: number }> {
    try {
      const data = await request<{ results: Movie[]; total_pages: number }>('/discover/movie', { with_genres: genreId, page });
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] getMoviesByGenre failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async getTVShowsByGenre(genreId: number, page: number = 1): Promise<{ results: TVShow[]; total_pages: number }> {
    try {
      return await this.discoverTVShows({ page, genreId, sortBy: 'popularity.desc' });
    } catch (error) {
      console.warn('[tmdbApi] getTVShowsByGenre failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async discover(mediaType: 'movie' | 'tv', sortBy = 'popularity.desc', page = 1, genreId?: number): Promise<{ results: any[]; total_pages: number }> {
    try {
      const params: any = { sort_by: sortBy, page };
      if (genreId) params.with_genres = genreId;
      const data = await request(`/discover/${mediaType}`, params);
      return data || { results: [], total_pages: 0 };
    } catch (error) {
      console.warn('[tmdbApi] discover failed:', (error as Error).message);
      return { results: [], total_pages: 0 };
    }
  },

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const data = await request('/configuration');
      if (data && data.images) {
        return { success: true, message: 'Connected successfully to TMDB API' };
      }
      return { success: false, message: 'Unexpected response from TMDB configuration' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Unknown connection error' };
    }
  },

  /* -----------------------------------------------------------
   *  Unified helper so components never guess the media type.
   *  Usage: await tmdbApi.getDetails(id, 'movie' | 'tv')
   * ----------------------------------------------------------*/
  async getDetails(id: number, type: 'movie' | 'tv') {
    return type === 'movie'
      ? this.getMovieDetails(id)
      : this.getTVShowDetails(id);
  },
};

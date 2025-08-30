export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  original_title: string;
  popularity: number;
  video: boolean;
}

export interface TVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  original_name: string;
  popularity: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface VideoSource {
  url: string;
  quality: string;
  type: string;
}

export interface MediaDetails extends Movie {
  genres: Genre[];
  runtime: number;
  budget: number;
  revenue: number;
  production_companies: Array<{
    id: number;
    name: string;
    logo_path: string;
  }>;
  cast: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string;
  }>;
  videos: Array<{
    id: string;
    key: string;
    name: string;
    site: string;
    type: string;
  }>;
}

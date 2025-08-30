export const SITE_CONFIG = {
  name: 'Bradfilx',
  description: 'Stream your favorite movies and TV shows',
  url: 'https://bradfilx.com',
  ogImage: '/og-image.jpg',
  creator: '@bradfilx',
};

export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/m';

export const IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    xlarge: 'w780',
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
  profile: {
    small: 'w45',
    medium: 'w185',
    large: 'h632',
  },
};

export const MEDIA_TYPES = {
  MOVIE: 'movie',
  TV: 'tv',
  PERSON: 'person',
} as const;

export const GENRES = {
  ACTION: 28,
  ADVENTURE: 12,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  FAMILY: 10751,
  FANTASY: 14,
  HISTORY: 36,
  HORROR: 27,
  MUSIC: 10402,
  MYSTERY: 9648,
  ROMANCE: 10749,
  SCIENCE_FICTION: 878,
  TV_MOVIE: 10770,
  THRILLER: 53,
  WAR: 10752,
  WESTERN: 37,
};

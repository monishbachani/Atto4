export function buildTmdbImage(path: string | null, size: string = 'w500'): string {
  if (!path) return '/placeholder-movie.jpg';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// TMDB image sizes reference - MAKE SURE THIS IS EXPORTED
export const TMDB_SIZES = {
  poster: {
    small: 'w154',    // 154x231 - for thumbnails
    medium: 'w342',   // 342x513 - for cards  
    large: 'w500',    // 500x750 - for larger cards
    xlarge: 'w780',   // 780x1170 - for hero/details
  },
  backdrop: {
    small: 'w300',    // 300x169 - for small previews
    medium: 'w780',   // 780x439 - for cards/sections
    large: 'w1280',   // 1280x720 - for hero sections
    original: 'original' // Full resolution
  }
};

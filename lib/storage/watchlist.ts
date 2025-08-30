'use client';

// Types for watchlist and liked items
export interface WatchlistItem {
  id: number;
  title: string;
  name?: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  dateAdded: string;
}

// Watchlist functions
export const watchlistStorage = {
  getWatchlist: (): WatchlistItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const watchlist = localStorage.getItem('bradfilx_watchlist');
      return watchlist ? JSON.parse(watchlist) : [];
    } catch (error) {
      console.error('Error getting watchlist:', error);
      return [];
    }
  },

  addToWatchlist: (item: Omit<WatchlistItem, 'dateAdded'>): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const watchlist = watchlistStorage.getWatchlist();
      const exists = watchlist.some(w => w.id === item.id && w.media_type === item.media_type);
      
      if (!exists) {
        const newItem: WatchlistItem = {
          ...item,
          dateAdded: new Date().toISOString()
        };
        watchlist.unshift(newItem); // Add to beginning
        localStorage.setItem('bradfilx_watchlist', JSON.stringify(watchlist));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return false;
    }
  },

  removeFromWatchlist: (id: number, mediaType: 'movie' | 'tv'): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const watchlist = watchlistStorage.getWatchlist();
      const filtered = watchlist.filter(item => !(item.id === id && item.media_type === mediaType));
      localStorage.setItem('bradfilx_watchlist', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return false;
    }
  },

  isInWatchlist: (id: number, mediaType: 'movie' | 'tv'): boolean => {
    if (typeof window === 'undefined') return false;
    const watchlist = watchlistStorage.getWatchlist();
    return watchlist.some(item => item.id === id && item.media_type === mediaType);
  },

  clearWatchlist: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('bradfilx_watchlist');
  }
};

// Liked content functions
export const likedStorage = {
  getLiked: (): WatchlistItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const liked = localStorage.getItem('bradfilx_liked');
      return liked ? JSON.parse(liked) : [];
    } catch (error) {
      console.error('Error getting liked items:', error);
      return [];
    }
  },

  addToLiked: (item: Omit<WatchlistItem, 'dateAdded'>): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const liked = likedStorage.getLiked();
      const exists = liked.some(l => l.id === item.id && l.media_type === item.media_type);
      
      if (!exists) {
        const newItem: WatchlistItem = {
          ...item,
          dateAdded: new Date().toISOString()
        };
        liked.unshift(newItem); // Add to beginning
        localStorage.setItem('bradfilx_liked', JSON.stringify(liked));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding to liked:', error);
      return false;
    }
  },

  removeFromLiked: (id: number, mediaType: 'movie' | 'tv'): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const liked = likedStorage.getLiked();
      const filtered = liked.filter(item => !(item.id === id && item.media_type === mediaType));
      localStorage.setItem('bradfilx_liked', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error removing from liked:', error);
      return false;
    }
  },

  isLiked: (id: number, mediaType: 'movie' | 'tv'): boolean => {
    if (typeof window === 'undefined') return false;
    const liked = likedStorage.getLiked();
    return liked.some(item => item.id === id && item.media_type === mediaType);
  },

  clearLiked: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('bradfilx_liked');
  }
};

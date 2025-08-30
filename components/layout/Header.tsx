'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Add this import
import { Search, Menu, User, Home, Film, Tv, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/common/SearchBar';

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter(); // Add this hook

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-semibold text-white hidden sm:block">
              Bradflix
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-white hover:text-blue-400 transition-colors font-medium"
            >
              Home
            </Link>
            <Link 
              href="/movies" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Movies
            </Link>
            <Link 
              href="/tvshows" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              TV Shows
            </Link>
            <Link 
              href="/genres" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Genres
            </Link>
          </nav>

          {/* Search & User Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="text-white hover:bg-white/10"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* User Menu - FIXED: Added onClick handler */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/login')} // Added this line
              className="text-white hover:bg-white/10"
            >
              <User className="h-5 w-5" />
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-white/10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="py-4 border-t border-white/10">
            <SearchBar onClose={() => setIsSearchOpen(false)} />
          </div>
        )}

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <nav className="flex flex-col space-y-4">
              <Link 
                href="/" 
                className="flex items-center space-x-3 text-white hover:text-blue-400 transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </Link>
              <Link 
                href="/movies" 
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Film className="h-5 w-5" />
                <span>Movies</span>
              </Link>
              <Link 
                href="/tvshows" 
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Tv className="h-5 w-5" />
                <span>TV Shows</span>
              </Link>
              <Link 
                href="/genres" 
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Grid3X3 className="h-5 w-5" />
                <span>Genres</span>
              </Link>

              {/* Mobile Login Button */}
              <button
                onClick={() => {
                  router.push('/login');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors font-medium"
              >
                <User className="h-5 w-5" />
                <span>Login</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

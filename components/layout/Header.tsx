'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { Search, Menu, User, Home, Film, Tv, Grid3X3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/common/SearchBar';

const navigationItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/movies', label: 'Movies', icon: Film },
  { href: '/tvshows', label: 'TV Shows', icon: Tv },
  { href: '/genres', label: 'Genres', icon: Grid3X3 },
];

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Main Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 header-glass ${scrolled ? 'scrolled' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Section - CHILLAX FONT */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="glass-card relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden p-1 transform transition-all duration-300 hover:scale-110 hover:rotate-2">
                <div className="w-full h-full rounded-lg overflow-hidden">
                  <Image src="/logo.png" alt="Atto4 Logo" fill className="object-cover" priority />
                </div>
              </div>
              {/* FIXED: Removed uppercase - displays as "Atto4" not "ATTO4" */}
              <span className="font-chillax text-xl sm:text-2xl font-bold text-white transition-all duration-300 transform hover:scale-105 drop-shadow-lg">
                Atto4
              </span>
            </Link>

            {/* Desktop Navigation - CHILLAX FONT */}
            <nav className="hidden md:flex items-center space-x-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <div key={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
                    <Link href={item.href}>
                      <div className={`glass-card flex items-center space-x-2 px-4 py-2 rounded-xl font-medium ${
                        isActive 
                          ? 'glass-glow text-blue-400 bg-blue-500/20' 
                          : 'text-white hover:text-blue-300'
                      }`}>
                        <Icon className="w-4 h-4" />
                        {/* Navigation items keep uppercase */}
                        <span className="font-chillax uppercase text-sm font-semibold">{item.label}</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`glass-button rounded-xl ${
                  isSearchOpen ? 'glass-glow text-blue-400 bg-blue-500/20' : 'text-white hover:text-blue-300'
                }`}
              >
                <Search className="h-5 w-5" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push('/login')}
                className="glass-button rounded-xl text-white hover:text-blue-300"
              >
                <User className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={`glass-button md:hidden rounded-xl transition-all duration-300 ${
                  isMobileMenuOpen ? 'rotate-90 text-blue-400' : 'text-white hover:text-blue-300'
                }`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      <div className={`fixed top-16 left-0 right-0 z-40 transition-all duration-300 ${
        isSearchOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <div className="glass-strong">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <SearchBar onClose={() => setIsSearchOpen(false)} />
          </div>
        </div>
      </div>

      {/* MINIMALISTIC TOP DROPDOWN MENU */}
      {isMobileMenuOpen && (
        <>
          {/* Subtle Backdrop */}
          <div
            className="mobile-backdrop-minimal md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Compact Top Menu */}
          <div className="mobile-top-menu fixed top-16 left-4 right-4 z-40 glass-strong rounded-2xl shadow-2xl md:hidden">
            <div className="p-4">
              
              {/* Minimal Close Button */}
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="close-btn-minimal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Compact Navigation - CHILLAX FONT */}
              <div className="space-y-2">
                {navigationItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`mobile-menu-item glass-card flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'text-blue-400 bg-blue-500/20 border border-blue-400/30' 
                          : 'text-white hover:text-blue-300 hover:bg-white/5'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      {/* Mobile nav items keep uppercase */}
                      <span className="font-chillax uppercase text-xs font-semibold tracking-wide">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}

                {/* Compact Login - CHILLAX FONT */}
                <button
                  onClick={() => {
                    router.push('/login');
                    setIsMobileMenuOpen(false);
                  }}
                  className="mobile-menu-item glass-card flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-white hover:text-blue-300 hover:bg-white/5 transition-all duration-200 w-full"
                >
                  <User className="w-4 h-4" />
                  {/* Mobile login keeps uppercase */}
                  <span className="font-chillax uppercase text-xs font-semibold tracking-wide">
                    Login
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}


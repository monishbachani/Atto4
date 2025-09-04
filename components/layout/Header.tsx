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

  // Handle scroll effect for glass UI
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Main Header with CSS classes from globals.css */}
      <header className={`fixed top-0 left-0 right-0 z-50 header-glass ${scrolled ? 'scrolled' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Section with Enhanced Glass Effect */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="glass-card relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden p-1 transform transition-all duration-300 hover:scale-110 hover:rotate-2">
                <div className="w-full h-full rounded-lg overflow-hidden">
                  <Image
                    src="/logo.png"
                    alt="Atto4 Logo"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
              <span className="font-chillax text-xl sm:text-2xl font-bold text-white transition-all duration-300 transform hover:scale-105 drop-shadow-lg">
                Atto4
              </span>
            </Link>

            {/* Desktop Navigation with Glass Cards */}
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
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </nav>

            {/* Action Buttons with Glass Effect */}
            <div className="flex items-center space-x-2">
              {/* Search Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`glass-button rounded-xl ${
                  isSearchOpen 
                    ? 'glass-glow text-blue-400 bg-blue-500/20' 
                    : 'text-white hover:text-blue-300'
                }`}
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* User Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push('/login')}
                className="glass-button rounded-xl text-white hover:text-blue-300"
              >
                <User className="h-5 w-5" />
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className={`glass-button md:hidden rounded-xl transition-all duration-300 ${
                  isMobileMenuOpen 
                    ? 'rotate-90 text-blue-400' 
                    : 'text-white hover:text-blue-300'
                }`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Overlay with Glass Strong Effect */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 transition-all duration-300 ${
          isSearchOpen 
            ? 'opacity-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        style={{ animation: isSearchOpen ? 'fadeIn 0.3s ease-out' : '' }}
      >
        <div className="glass-strong">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <SearchBar onClose={() => setIsSearchOpen(false)} />
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay with Glass Effects */}
      {isMobileMenuOpen && (
        <>
          {/* Glass Backdrop */}
          <div
            className="fixed inset-0 z-30 glass md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ animation: 'fadeIn 0.3s ease-out forwards' }}
          />
          
          {/* Glass Mobile Menu */}
          <div
            className="fixed top-16 right-0 bottom-0 z-40 w-80 max-w-[85vw] glass-strong border-l border-white/10 md:hidden"
            style={{ animation: 'slideInRight 0.3s ease-out forwards' }}
          >
            <div className="p-6 space-y-6">
              <nav className="space-y-1">
                {navigationItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`glass-card flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                        isActive 
                          ? 'glass-glow text-blue-400 bg-blue-500/20' 
                          : 'text-white hover:text-blue-300'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        animation: 'slideInRight 0.3s ease-out forwards'
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Login Button with Glass Effect */}
              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    router.push('/login');
                    setIsMobileMenuOpen(false);
                  }}
                  className="glass-card flex items-center space-x-3 w-full px-4 py-3 rounded-xl font-medium text-white hover:text-blue-300 transition-all duration-200"
                  style={{
                    animationDelay: '0.4s',
                    animation: 'slideInRight 0.3s ease-out forwards'
                  }}
                >
                  <User className="w-5 h-5" />
                  <span>Login</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

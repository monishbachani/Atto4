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
      {/* Main Header */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
          scrolled 
            ? 'backdrop-blur-xl bg-black/80 shadow-2xl border-b border-white/10' 
            : 'backdrop-blur-sm bg-black/20 border-b border-white/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Section with Glass Effect */}
            <link href="https://api.fontshare.com/v2/css?f[]=chillax@1&display=swap" rel="stylesheet">
            <Link href="/" className="flex items-center space-x-3 group">
              <div 
                className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden transition-all duration-300 ${
                  scrolled 
                    ? 'bg-white/10 backdrop-blur-sm shadow-lg border border-white/20' 
                    : 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm'
                } p-1 transform hover:scale-110 hover:rotate-2`}
              >
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
              <span 
                className={`text-xl sm:text-2xl font-bold transition-all duration-300 transform hover:scale-105 ${
                  scrolled ? 'text-white drop-shadow-lg' : 'text-white/90'
                }`}
              >
                Atto4
              </span>
            </Link>

            {/* Desktop Navigation with Glass Cards */}
            <nav className="hidden md:flex items-center space-x-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <div key={item.href} className="relative">
                    <Link href={item.href}>
                      <div
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg ${
                          isActive 
                            ? 'text-blue-400 bg-blue-500/20 backdrop-blur-md shadow-lg border border-blue-400/30' 
                            : scrolled
                            ? 'text-white hover:text-blue-300 hover:bg-white/10 backdrop-blur-sm border border-transparent hover:border-white/20'
                            : 'text-white/80 hover:text-blue-300 hover:bg-white/5 backdrop-blur-sm'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                    
                    {/* Active indicator with glass effect */}
                    {isActive && (
                      <div className="absolute -bottom-1 left-4 right-4 h-0.5 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" />
                    )}
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
                className={`rounded-xl transition-all duration-300 transform hover:scale-110 ${
                  isSearchOpen 
                    ? 'bg-blue-500/20 text-blue-400 backdrop-blur-md shadow-lg border border-blue-400/30' 
                    : scrolled
                    ? 'text-white hover:bg-white/10 backdrop-blur-sm border border-transparent hover:border-white/20'
                    : 'text-white/80 hover:bg-white/5 backdrop-blur-sm hover:text-white'
                }`}
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* User Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push('/login')}
                className={`rounded-xl transition-all duration-300 transform hover:scale-110 ${
                  scrolled
                    ? 'text-white hover:bg-white/10 backdrop-blur-sm border border-transparent hover:border-white/20'
                    : 'text-white/80 hover:bg-white/5 backdrop-blur-sm hover:text-white'
                }`}
              >
                <User className="h-5 w-5" />
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className={`md:hidden rounded-xl transition-all duration-300 transform hover:scale-110 ${
                  isMobileMenuOpen 
                    ? 'bg-white/10 backdrop-blur-md rotate-90 shadow-lg border border-white/20' 
                    : scrolled
                    ? 'text-white hover:bg-white/10 backdrop-blur-sm border border-transparent hover:border-white/20'
                    : 'text-white/80 hover:bg-white/5 backdrop-blur-sm hover:text-white'
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

      {/* Search Overlay with Enhanced Glass Effect */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 transition-all duration-300 ${
          isSearchOpen 
            ? 'opacity-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="backdrop-blur-2xl bg-black/90 border-b border-white/10 shadow-2xl">
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
            className="fixed inset-0 z-30 backdrop-blur-sm bg-black/50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ animation: 'fadeIn 0.3s ease-out forwards' }}
          />
          
          {/* Glass Mobile Menu */}
          <div
            className="fixed top-16 right-0 bottom-0 z-40 w-80 max-w-[85vw] backdrop-blur-2xl bg-black/90 border-l border-white/10 shadow-2xl md:hidden"
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
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                        isActive 
                          ? 'text-blue-400 bg-blue-500/20 backdrop-blur-md shadow-lg border border-blue-400/30' 
                          : 'text-white hover:text-blue-300 hover:bg-white/10 backdrop-blur-sm border border-transparent hover:border-white/20'
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
                  className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl font-medium text-white hover:text-blue-300 hover:bg-white/10 backdrop-blur-sm border border-transparent hover:border-white/20 transition-all duration-200"
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

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInRight {
          from { 
            opacity: 0;
            transform: translateX(100%); 
          }
          to { 
            opacity: 1;
            transform: translateX(0); 
          }
        }
      `}</style>
    </>
  );
}

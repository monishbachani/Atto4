import Link from 'next/link';
import { ArrowLeft, Tv } from 'lucide-react';

export default function TVNotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-8">
          <Tv className="w-24 h-24 text-gray-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">TV Show Not Found</h1>
          <p className="text-gray-400 text-lg mb-8">
            The TV show you're looking for doesn't exist or has been removed.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          
          <div className="text-sm text-gray-500">
            <p>Try browsing our popular TV shows instead</p>
          </div>
        </div>
      </div>
    </main>
  );
}

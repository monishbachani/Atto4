'use client';

import { useState } from 'react';
import { tmdbApi } from '@/lib/api/tmdb';

export default function ApiTest() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setResult('Testing API connection...');
    
    try {
      const connectionTest = await tmdbApi.testConnection();
      
      if (connectionTest.success) {
        const popularMovies = await tmdbApi.getPopularMovies(1);
        setResult(`✅ SUCCESS!\n\nConnection: ${connectionTest.message}\n\nSample Data:\n${JSON.stringify(popularMovies.results?.[0] || {}, null, 2)}`);
      } else {
        setResult(`❌ FAILED!\n\nError: ${connectionTest.message}\n\nCheck:\n1. Your API key in .env.local\n2. Internet connection\n3. Console for detailed errors`);
      }
    } catch (error: any) {
      setResult(`❌ CRITICAL ERROR!\n\n${error.message}\n\nCheck console for full error details.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white m-4 rounded-lg border border-gray-700">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        🔧 TMDB API Test
      </h3>
      <button 
        onClick={testApi}
        disabled={loading}
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-600 font-medium"
      >
        {loading ? 'Testing...' : 'Test API Connection'}
      </button>
      <pre className="mt-4 bg-black p-4 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">
        {result || 'Click "Test API Connection" to check your TMDB setup'}
      </pre>
      <div className="mt-2 text-xs text-gray-400">
        💡 This will test your API key and show detailed error information
      </div>
    </div>
  );
}

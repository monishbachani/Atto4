'use client';

import { useState } from 'react';
import { tmdbApi } from '@/lib/api/tmdb';

export default function TVIdTest() {
  const [tvId, setTvId] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testTVId = async () => {
    if (!tvId) return;
    
    setLoading(true);
    setResult('Testing TV ID...');
    
    try {
      const id = parseInt(tvId);
      const data = await tmdbApi.getTVShowDetails(id);
      
      if (data) {
        setResult(`✅ SUCCESS!\n\nTV Show: ${data.name || data.title}\nID: ${data.id}\nStatus: ${data.status || 'Unknown'}\nFirst Air Date: ${data.first_air_date || 'Unknown'}`);
      } else {
        setResult(`❌ FAILED!\n\nTV ID ${tvId} not found or invalid.\nThis ID might not exist in TMDB database.`);
      }
    } catch (error: any) {
      setResult(`❌ ERROR!\n\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white m-4 rounded-lg border border-gray-700">
      <h3 className="text-lg font-bold mb-4">🔧 TV ID Tester</h3>
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          value={tvId}
          onChange={(e) => setTvId(e.target.value)}
          placeholder="Enter TV ID to test"
          className="bg-gray-800 text-white rounded px-3 py-2 flex-1"
        />
        <button 
          onClick={testTVId}
          disabled={loading || !tvId}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-600 font-medium"
        >
          {loading ? 'Testing...' : 'Test ID'}
        </button>
      </div>
      <pre className="bg-black p-4 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">
        {result || 'Enter a TV ID and click "Test ID" to check if it exists in TMDB database'}
      </pre>
      <div className="mt-2 text-xs text-gray-400">
        💡 Try these known working TV IDs: 1399 (Game of Thrones), 1418 (The Big Bang Theory), 60735 (The Flash)
      </div>
    </div>
  );
}

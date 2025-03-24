'use client';

import { useEffect, useState } from 'react';

export const ThreadCount = () => {
  const [count, setCount] = useState<number | null>(null);
  const [analyzedPosts, setAnalyzedPosts] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch thread count
        const threadResponse = await fetch('/api/thread-count');
        const threadData = await threadResponse.json();
        
        if (threadData.error) {
          setError(threadData.error);
          return;
        }
        
        setCount(threadData.count);

        // Fetch latest summary for analyzed posts count
        const summaryResponse = await fetch('/api/analysis/latest-summary');
        const summaryData = await summaryResponse.json();
        
        // Access the correct path in the data structure
        const totalPosts = summaryData?.articles?.batchStats?.totalAnalyzedPosts;
        if (totalPosts) {
          setAnalyzedPosts(totalPosts);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data');
      }
    };

    fetchData();
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchData, 600000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      {count === null ? (
        <p>Loading...</p>
      ) : (
        <p>{count} Threads in Database, {analyzedPosts || '...'} Comments Analyzed</p>
      )}
    </div>
  );
}; 
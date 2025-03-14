'use client';

import { useEffect, useState } from 'react';

export const ThreadCount = () => {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/thread-count');
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }
        
        setCount(data.count);
      } catch (err) {
        setError('Failed to fetch thread count');
      }
    };

    fetchCount();
    
    // Refresh count every minute
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <h3>Current Thread Count</h3>
      {count === null ? (
        <p>Loading...</p>
      ) : (
        <p>{count} threads in database</p>
      )}
    </div>
  );
}; 
'use client';

import { useEffect, useState } from 'react';
import styles from './LastScrapeTime.module.css';

export const LastScrapeTime = () => {
  const [lastScrape, setLastScrape] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLastScrape = async () => {
      try {
        const response = await fetch('/api/thread-count');
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }

        // Get the most recent file's modified time
        const latestFile = await fetch('/api/latest-thread');
        const latestData = await latestFile.json();
        
        if (latestData.lastModified) {
          setLastScrape(new Date(latestData.lastModified));
        }
      } catch {
        setError('Failed to fetch last scrape time');
      }
    };

    fetchLastScrape();
    
    // Refresh every minute
    const interval = setInterval(fetchLastScrape, 60000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  if (!lastScrape) {
    return <p className={styles.loading}>Loading...</p>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Last Updated</h2>
      <div className={styles.timeContainer}>
        <div className={styles.time}>
          {lastScrape.toLocaleTimeString()}
        </div>
        <div className={styles.date}>
          {lastScrape.toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}; 
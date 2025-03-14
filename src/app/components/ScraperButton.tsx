'use client';

import { useState } from 'react';
import styles from './ScraperButton.module.css';

export const ScraperButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const triggerScraper = async () => {
    try {
      setIsLoading(true);
      setStatus('Starting scraper...');
      
      const response = await fetch('/api/scrape', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        setStatus('Scraper started successfully');
      } else {
        setStatus(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch {
      setStatus('Failed to start scraper');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h3>Manual Scraper Control</h3>
      <button 
        onClick={triggerScraper}
        disabled={isLoading}
        className={styles.button}
      >
        {isLoading ? 'Starting...' : 'Start Scraper'}
      </button>
      {status && <p className={styles.status}>{status}</p>}
    </div>
  );
}; 
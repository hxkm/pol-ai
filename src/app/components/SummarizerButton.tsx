'use client';

import { useState } from 'react';
import styles from './ScraperButton.module.css'; // Reusing same styles

export const SummarizerButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const triggerSummarizer = async () => {
    try {
      setIsLoading(true);
      setStatus('Starting summarizer...');
      
      const response = await fetch('/api/summarize', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        setStatus('Summarizer started successfully');
      } else {
        setStatus(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch {
      setStatus('Failed to start summarizer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button 
        onClick={triggerSummarizer}
        disabled={isLoading}
        className={styles.button}
      >
        {isLoading ? 'Starting...' : 'Start Summarizer'}
      </button>
      {status && <p className={styles.status}>{status}</p>}
    </div>
  );
}; 
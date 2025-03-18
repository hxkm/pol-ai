'use client';

import { useEffect, useState } from 'react';
import styles from '../page.module.css';

interface AntisemitismStats {
  mean: number;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  trend: {
    direction: 'up' | 'down' | 'stable';
    change: number;
  };
  themes: Array<{
    name: string;
    frequency: number;
  }>;
}

export const AntisemitismStats = () => {
  const [stats, setStats] = useState<AntisemitismStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/antisemitism-stats');
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }
        
        setStats(data);
      } catch {
        setError('Failed to fetch antisemitism statistics');
      }
    };

    fetchStats();
    
    // Refresh stats every 10 minutes
    const interval = setInterval(fetchStats, 600000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!stats) {
    return <p>Loading...</p>;
  }

  const trendArrow = stats.trend.direction === 'up' ? '↑' : 
                     stats.trend.direction === 'down' ? '↓' : '→';
  const trendText = stats.trend.direction === 'stable' ? 
                    'No change' : 
                    `${trendArrow} ${stats.trend.direction === 'up' ? 'Up' : 'Down'} ${stats.trend.change}% from last analysis`;

  return (
    <>
      <h2>Antisemitism Per Post</h2>
      <p>
        <span>{stats.mean}%</span>
        <span className={styles.level}>{stats.level}</span>
      </p>
      <span className={styles.trend}>{trendText}</span>
    </>
  );
}; 
'use client';

import React, { useEffect, useState } from 'react';
import styles from './Card6.module.css';

interface TermStats {
  term: string;
  count: number;
  previousCount: number;
  percentChange: number;
  lastSeen: number;
}

interface SlurAnalyzerResult {
  termStats: TermStats[];
  metadata: {
    totalPostsAnalyzed: number;
    postsWithTerms: number;
    totalTermsFound: number;
    lastAnalysis: number;
  };
}

export default function Card6() {
  const [data, setData] = useState<SlurAnalyzerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/analysis/slur');
        if (!response.ok) throw new Error('Failed to fetch data');
        const jsonData = await response.json();
        const latestResult = Array.isArray(jsonData.results) ? jsonData.results[0] : null;
        if (!latestResult) throw new Error('No data available');
        setData(latestResult);
      } catch (error) {
        console.error('Error fetching slur data:', error);
        setError('Error loading data');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 600000);
    return () => clearInterval(interval);
  }, []);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!data) return <div className={styles.loading}>Loading...</div>;

  const termStats = Array.isArray(data.termStats) ? data.termStats : [];
  const topTerms = termStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const maxCount = topTerms.length > 0 ? Math.max(...topTerms.map(term => term.count)) : 0;

  // Color calculation helper
  const getBackgroundColor = (count: number) => {
    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
    
    // Map percentage to hue:
    // 100% (highest count) = 0 (red)
    // 0% (lowest count) = 270 (violet)
    const hue = Math.round(270 - (percentage * 2.7));
    const saturation = 85;
    const lightness = 70;
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <div className={styles.container}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Slur Tally</h2>
      <div className={styles.badges}>
        {topTerms.map((term) => (
          <div
            key={term.term}
            className={styles.badge}
            style={{
              backgroundColor: getBackgroundColor(term.count)
            }}
          >
            <span className={styles.term}>{term.term}</span>
            <span className={styles.count}>{term.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 
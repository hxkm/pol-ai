'use client';

import React, { useEffect, useState } from 'react';
import styles from './ThemesBadges.module.css';

interface Theme {
  name: string;
  frequency: number;
  keywords: string[];
}

interface Sentiment {
  name: string;
  intensity: number;
  keywords: string[];
}

interface BigPictureData {
  themes: Theme[];
  sentiments: Sentiment[];
}

function getColorClass(value: number): string {
  if (value >= 90) return styles.veryHigh;
  if (value >= 70) return styles.high;
  if (value >= 50) return styles.medium;
  if (value >= 30) return styles.low;
  return styles.veryLow;
}

export default function ThemesBadges() {
  const [data, setData] = useState<BigPictureData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/analysis/big-picture');
        if (!response.ok) throw new Error('Failed to fetch data');
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error('Error fetching big picture data:', error);
      }
    };

    fetchData();
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.badges}>
        {data.themes.map((theme, index) => (
          <div 
            key={`theme-${index}`} 
            className={`${styles.badge} ${getColorClass(theme.frequency)}`}
          >
            <span className={styles.name}>{theme.name}</span>
            <span className={styles.value}>{theme.frequency}%</span>
          </div>
        ))}
        {data.sentiments.map((sentiment, index) => (
          <div 
            key={`sentiment-${index}`} 
            className={`${styles.badge} ${getColorClass(sentiment.intensity)}`}
          >
            <span className={styles.name}>{sentiment.name}</span>
            <span className={styles.value}>{sentiment.intensity}%</span>
          </div>
        ))}
      </div>
    </div>
  );
} 
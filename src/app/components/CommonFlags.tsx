'use client';

import React, { useEffect, useState } from 'react';
import styles from './RareFlags.module.css'; // Reusing the same styles

interface GeoResult {
  country: string;
  count: number;
  name: string;
}

// Map of special cases for Wikipedia URLs
const WIKI_COUNTRY_OVERRIDES: Record<string, string> = {
  'United States': 'United_States',
  'United Kingdom': 'United_Kingdom',
  'South Korea': 'South_Korea',
  'North Korea': 'North_Korea',
  'New Zealand': 'New_Zealand',
  'Saudi Arabia': 'Saudi_Arabia',
  'Sri Lanka': 'Sri_Lanka',
  'Costa Rica': 'Costa_Rica',
  'Czech Republic': 'Czech_Republic',
  'South Africa': 'South_Africa',
  // Add more special cases as needed
};

function getWikipediaUrl(countryName: string): string {
  // Check if we have a special override for this country
  const wikiName = WIKI_COUNTRY_OVERRIDES[countryName] || countryName;
  
  // Replace spaces with underscores and handle special characters
  const formattedName = wikiName.replace(/ /g, '_');
  
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedName)}`;
}

export default function CommonFlags() {
  const [flags, setFlags] = useState<GeoResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const response = await fetch('/api/analysis/geo/common');
        if (!response.ok) {
          throw new Error('Failed to fetch flag data');
        }
        const data = await response.json();
        
        // Debug logging
        console.log('Received common flags data:', data);
        
        // Ensure we have the correct data structure
        if (!Array.isArray(data)) {
          console.error('Invalid data structure:', data);
          throw new Error('Invalid data format received');
        }

        setFlags(data);
      } catch (error) {
        console.error('Error fetching flag data:', error);
        setError('Failed to load flags');
      }
    };

    fetchFlags();
  }, []);

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (flags.length === 0) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.grid}>
      {flags.map((flag) => (
        <div key={flag.country} className={styles.flagContainer}>
          <a 
            href={getWikipediaUrl(flag.name)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={`https://flagcdn.com/w160/${flag.country.toLowerCase()}.png`}
              alt={`Flag of ${flag.name}`}
              className={styles.flag}
              loading="lazy"
              onError={(e) => {
                console.warn(`Failed to load flag for ${flag.name}`);
                e.currentTarget.style.display = 'none';
              }}
            />
          </a>
        </div>
      ))}
    </div>
  );
} 
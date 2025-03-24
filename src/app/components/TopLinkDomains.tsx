'use client';

import React, { useEffect, useState } from 'react';
import styles from './TopLinkDomains.module.css';

interface LinkDomain {
  domain: string;
  count: number;
}

export default function TopLinkDomains() {
  const [domains, setDomains] = useState<LinkDomain[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await fetch('/api/analysis/link');
        if (!response.ok) {
          throw new Error('Failed to fetch link domains data');
        }
        const data = await response.json();
        
        // Check if data and domains exist
        if (!data || !Array.isArray(data)) {
          throw new Error('Invalid data format received');
        }

        // Ensure we have the correct data structure
        const validDomains = data.filter((item: LinkDomain) => 
          item && 
          typeof item.domain === 'string' && 
          typeof item.count === 'number'
        );

        // Sort by count and take top 10
        const topDomains = validDomains
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setDomains(topDomains);
      } catch (error) {
        console.error('Error fetching link domains:', error);
        setError('Failed to load link domains');
      }
    };

    fetchDomains();
  }, []);

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (domains.length === 0) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      {domains.map((domain) => (
        <div key={domain.domain} className={styles.domainRow}>
          <a 
            href={`https://${domain.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.domain}
          >
            {domain.domain}
          </a>
          <span className={styles.count}>{domain.count}</span>
        </div>
      ))}
    </div>
  );
} 
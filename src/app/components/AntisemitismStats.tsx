'use client';

import React, { useEffect, useState } from 'react';

interface Stats {
  mean: number;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  trend: {
    direction: 'up' | 'down' | 'stable';
    change: number;
  };
}

export const AntisemitismStats = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/antisemitism-stats');
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', textAlign: 'left' }}>Antisemitism Per Post</h2>
        <p style={{ fontSize: '1rem', opacity: 0.8 }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', textAlign: 'left' }}>Antisemitism Per Post</h2>
        <p style={{ fontSize: '1rem', color: '#ff4444' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', textAlign: 'left' }}>Antisemitism Per Post</h2>
      <p style={{ 
        fontSize: '3rem', 
        fontWeight: 'bold', 
        margin: 0, 
        textAlign: 'left',
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.5rem'
      }}>
        <span>{stats?.mean.toFixed(1)}%</span>
        <span style={{ 
          fontSize: '1rem', 
          fontWeight: 'normal', 
          opacity: 0.8 
        }}>
          {stats?.level}
        </span>
      </p>
      <span style={{
        fontSize: '0.875rem',
        opacity: 0.8,
        marginTop: '0.5rem',
        display: 'block'
      }}>
        {stats?.trend.direction === 'stable' ? 'No change' : 
         `${stats?.trend.direction === 'up' ? 'Up' : 'Down'} ${stats?.trend.change}%`}
      </span>
    </div>
  );
}; 
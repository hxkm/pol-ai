'use client';

import React from 'react';
import styles from './Card4.module.css';
import ThemesBadges from './ThemesBadges';

export default function Card4() {
  return (
    <div className={styles.container}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Dominant Themes</h2>
      <ThemesBadges />
    </div>
  );
} 
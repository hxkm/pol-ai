'use client';

import React from 'react';
import { GifCarousel } from './GifCarousel';
import styles from '../page.module.css';

export const Card3 = () => {
  return (
    <div className={styles.card}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Media Feed</h2>
      <GifCarousel />
    </div>
  );
}; 
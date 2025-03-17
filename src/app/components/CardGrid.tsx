'use client';

import React from 'react';
import Masonry from 'react-masonry-css';
import styles from './CardGrid.module.css';

interface CardGridProps {
  children: React.ReactNode;
  className?: string;
}

const breakpointColumns = {
  default: 3,  // Desktop: 3 columns
  1024: 2,     // Tablet: 2 columns
  640: 1       // Mobile: 1 column
};

export const CardGrid: React.FC<CardGridProps> = ({ children, className = '' }) => {
  return (
    <Masonry
      breakpointCols={breakpointColumns}
      className={`${styles.grid} ${className}`}
      columnClassName={styles.gridColumn}
    >
      {children}
    </Masonry>
  );
}; 
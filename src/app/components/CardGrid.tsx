import React from 'react';
import styles from './CardGrid.module.css';

interface CardGridProps {
  children: React.ReactNode;
  className?: string;
}

export const CardGrid: React.FC<CardGridProps> = ({ children, className = '' }) => {
  return (
    <div className={`${styles.grid} ${className}`}>
      {children}
    </div>
  );
}; 
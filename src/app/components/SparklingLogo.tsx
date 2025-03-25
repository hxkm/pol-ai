'use client';

import React, { useEffect, useState } from 'react';
import styles from './SparklingLogo.module.css';

interface Sparkle {
  id: number;
  top: string;
  left: string;
  delay: string;
  duration: string;
}

export default function SparklingLogo() {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    // Create 25 sparkles with random positions
    const newSparkles = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 2}s`
    }));
    setSparkles(newSparkles);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.sparkleWrapper}>
        {sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className={styles.sparkle}
            style={{
              top: sparkle.top,
              left: sparkle.left,
              animationDelay: sparkle.delay,
              animationDuration: sparkle.duration
            }}
          />
        ))}
      </div>
      <img 
        src="/loading.png" 
        alt="Alternative Logo" 
        className={styles.logo}
      />
    </div>
  );
} 
'use client';

import { useEffect, useState } from 'react';
import styles from './StagePost.module.css';

interface Get {
  postNumber: string;
  comment: string;
  checkCount: number;
}

interface StagePostProps {
  position: 'top' | 'bottom';
}

export default function StagePost({ position }: StagePostProps) {
  const [data, setData] = useState<Get | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/significant-gets');
        if (!response.ok) {
          throw new Error('Failed to fetch GET data');
        }
        const result = await response.json();
        setData(position === 'top' ? result.getOne : result.getTwo);
        setError(null);
      } catch (err) {
        setError('Error fetching GET data');
        console.error('Error:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 600000); // Refresh every 10 minutes

    return () => clearInterval(interval);
  }, [position]);

  if (error) {
    return <div className={styles.stagePost}>Error loading GET data</div>;
  }

  if (!data) {
    return <div className={styles.stagePost}>Loading...</div>;
  }

  return (
    <div className={styles.stagePost}>
      <div className={styles.header}>
        <span className={styles.name}>Anonymous</span>
        <span className={styles.postNumber}>No.{data.postNumber}</span>
      </div>
      <div className={styles.comment}>{data.comment}</div>
      <div className={styles.checkCount}>Checked {data.checkCount} times</div>
    </div>
  );
} 
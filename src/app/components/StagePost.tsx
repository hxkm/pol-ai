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

function parseComment(html: string): string {
  // Convert HTML to text
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Convert quote links (>>123456) to text
  const quoteLinks = div.getElementsByClassName('quotelink');
  Array.from(quoteLinks).forEach(link => {
    link.textContent = link.textContent || link.getAttribute('href')?.replace('#p', '>>') || '';
  });

  // Convert <br> to newlines
  const text = div.innerHTML
    .replace(/<br\s*\/?>/g, '\n')
    // Convert quotes to greentext
    .replace(/<span class="quote">&gt;/g, '>')
    // Remove any remaining HTML tags
    .replace(/<[^>]+>/g, '');

  // Decode HTML entities
  return text
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

/**
 * Format check count into natural language
 */
function formatCheckCount(count: number): string {
  if (count === 0) return 'Not checked yet';
  if (count === 1) return 'Checked once';
  if (count === 2) return 'Checked twice';
  if (count === 3) return 'Checked thrice';
  return `Checked ${count} times`;
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

  const archiveUrl = `https://archive.4plebs.org/pol/post/${data.postNumber}/`;
  const parsedComment = data.comment ? parseComment(data.comment) : '';

  return (
    <div className={styles.stagePost}>
      <div className={styles.header}>
        <span className={styles.name}>Anonymous</span>
        <a 
          href={archiveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.postNumber}
        >
          No.{data.postNumber}
        </a>
      </div>
      <div className={styles.comment}>
        {parsedComment || <span className={styles.placeholderComment}>&gt;pic related</span>}
      </div>
      <div className={styles.checkCount}>{formatCheckCount(data.checkCount)}</div>
    </div>
  );
} 
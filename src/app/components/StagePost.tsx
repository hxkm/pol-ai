'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import styles from './StagePost.module.css';

interface Get {
  postNumber: string;
  comment: string;
  checkCount: number;
  getType: string;
  hasImage?: boolean;
  filename?: string;
  ext?: string;
  tim?: number;
  sub?: string;
  resto?: number;
  threadId?: number;
}

interface StagePostProps {
  position: 'top' | 'middle' | 'bottom';
  cardType?: 'gets' | 'insights';
}

function parseComment(html: string): React.ReactNode {
  // Convert HTML to text first
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Convert quote links (>>123456) to text
  const quoteLinks = div.getElementsByClassName('quotelink');
  Array.from(quoteLinks).forEach(link => {
    link.textContent = link.textContent || link.getAttribute('href')?.replace('#p', '>>') || '';
  });

  // Convert <br> to newlines
  let text = div.innerHTML
    .replace(/<br\s*\/?>/g, '\n')
    // Convert quotes to greentext
    .replace(/<span class="quote">&gt;/g, '>')
    // Remove any remaining HTML tags
    .replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");

  // Split into lines first to handle greentext
  const lines = text.split('\n');
  
  // Process each line
  const processedLines = lines.map((line, lineIndex) => {
    // If line starts with > but not >> (greentext)
    if (line.startsWith('>') && !line.startsWith('>>')) {
      return <span key={`line-${lineIndex}`} className={styles.greentext}>{line}</span>;
    }
    
    // For non-greentext lines, process post references
    const segments = line.split(/(&gt;&gt;|>>)(\d+)/g);
    
    return (
      <span key={`line-${lineIndex}`}>
        {segments.map((segment, index) => {
          // Every third element is a post number (after the '>>' match)
          if (index % 3 === 2) {
            return (
              <a
                key={`${lineIndex}-${index}`}
                href={`https://archive.4plebs.org/pol/post/${segment}/`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.postNumber}
              >
                &gt;&gt;{segment}
              </a>
            );
          }
          // Skip the '>>' matches
          if (index % 3 === 1) {
            return null;
          }
          // Regular text
          return segment;
        })}
      </span>
    );
  });

  // Join the lines with line breaks
  return (
    <span>
      {processedLines.map((line, index) => (
        <React.Fragment key={`fragment-${index}`}>
          {line}
          {index < processedLines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </span>
  );
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

export default function StagePost({ position, cardType = 'gets' }: StagePostProps) {
  const [data, setData] = useState<Get | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        if (cardType === 'insights') {
          const response = await fetch('/api/reply');
          if (!response.ok) {
            throw new Error('Failed to fetch reply data');
          }
          const results = await response.json();
          
          if (!Array.isArray(results) || results.length === 0) {
            throw new Error('Invalid reply data structure');
          }

          // Log the position and selected post for debugging
          const postIndex = position === 'top' ? 0 : position === 'middle' ? 1 : 2;
          const selectedPost = results[postIndex];
          console.log(`Position: ${position}, Selected post:`, selectedPost?.no);

          if (!selectedPost || !selectedPost.no) {
            throw new Error(`No post data for position ${position}`);
          }

          if (isMounted) {
            setData({
              postNumber: selectedPost.no.toString(),
              comment: selectedPost.com || '',
              checkCount: selectedPost.replies || 0,
              getType: 'Most Replied',
              hasImage: selectedPost.tim !== undefined || selectedPost.filename !== undefined,
              filename: selectedPost.filename,
              ext: selectedPost.ext,
              tim: selectedPost.tim,
              sub: selectedPost.sub,
              resto: selectedPost.resto,
              threadId: selectedPost.threadId
            });
            setError(null);
          }
          return;
        }

        // For GETs card, fetch GET data
        const response = await fetch('/api/significant-gets');
        if (!response.ok) {
          throw new Error('Failed to fetch GET data');
        }
        const result = await response.json();
        if (isMounted) {
          setData(position === 'top' ? result.getOne : result.getTwo);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError('Error fetching data');
          console.error('Error:', err);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 600000); // Refresh every 10 minutes

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [position, cardType]);

  if (error) {
    return <div className={styles.stagePost}>Error loading data</div>;
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
        {data.hasImage && (
          <div className={styles.greentext}>&gt;pic related</div>
        )}
        {parsedComment}
      </div>
      <div className={styles.footer}>
        {cardType === 'insights' ? (
          <span className={styles.checkCount}>
            {data.checkCount} {data.checkCount === 1 ? 'Reply' : 'Replies'}
          </span>
        ) : (
          <>
            <span className={styles.getType}>
              {data.getType.charAt(0).toUpperCase() + data.getType.slice(1).toLowerCase()} •
            </span>
            <span className={styles.checkCount}>{formatCheckCount(data.checkCount)}</span>
          </>
        )}
      </div>
    </div>
  );
} 
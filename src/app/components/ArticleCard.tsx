'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './ArticleCard.module.css';

interface Article {
  threadId: number;
  headline: string;
  article: string;
  antisemiticStats: {
    percentage: number;
  };
  metadata: {
    totalPosts: number;
  };
}

interface ArticleResponse {
  articles: Article[];
}

interface ArticleCardProps {
  index?: number;
}

function toTitleCase(str: string) {
  // Words that shouldn't be capitalized (articles, conjunctions, prepositions)
  const minorWords = new Set([
    'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 
    'to', 'by', 'in', 'of', 'up', 'as', 'yet', 'so'
  ]);

  // Common acronyms that should always be uppercase
  const acronyms = new Set([
    'us', 'usa', 'uk', 'un', 'eu', 'uae', 'idf', 'cia', 'fbi', 'nsa',
    'nato', 'isis', 'usd', 'ccp', 'cdc', 'who', 'doj', 'esg', 'lgbt',
    'lgbtq', 'bbc', 'cnn', 'nbc', 'abc', 'nyt', 'wsj'
  ]);

  return str.toLowerCase().split(' ').map((word, index) => {
    // Check for acronyms first
    if (acronyms.has(word.toLowerCase())) {
      return word.toUpperCase();
    }

    // Always capitalize the first and last word
    if (index === 0 || index === str.split(' ').length - 1) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    
    // Don't capitalize minor words
    if (minorWords.has(word.toLowerCase())) {
      return word.toLowerCase();
    }
    
    // Capitalize other words
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function formatArticleText(text: string) {
  // Split by quotes but keep the quotes in the result
  const parts = text.split(/(".*?")/g);
  return parts.map((part, index) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      // If it's a quote, wrap it in bold and italic styling
      return <strong key={index}><em>{part}</em></strong>;
    }
    return part;
  });
}

function FitText({ text, threadId }: { text: string; threadId: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const textElement = textRef.current;
    if (!container || !textElement) return;

    const fitText = () => {
      const containerWidth = container.offsetWidth;
      let fontSize = 20; // Starting font size in pixels
      
      textElement.style.fontSize = `${fontSize}px`;
      
      while (textElement.scrollWidth > containerWidth && fontSize > 8) {
        fontSize -= 0.5;
        textElement.style.fontSize = `${fontSize}px`;
      }
    };

    fitText();
    window.addEventListener('resize', fitText);
    
    return () => window.removeEventListener('resize', fitText);
  }, [text]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <a 
        ref={textRef} 
        className={styles.headline}
        href={`https://archive.4plebs.org/pol/thread/${threadId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {toTitleCase(text)}
      </a>
    </div>
  );
}

export default function ArticleCard({ index = 0 }: ArticleCardProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch('/api/articles');
        if (!response.ok) {
          throw new Error('Failed to fetch article data');
        }
        const data: ArticleResponse = await response.json();
        if (!data.articles || data.articles.length === 0) {
          throw new Error('No articles available');
        }
        if (index >= data.articles.length) {
          throw new Error('Article index out of bounds');
        }
        setArticle(data.articles[index]);
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article');
      }
    };

    fetchArticle();
  }, [index]);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!article) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.container}>
      <FitText text={article.headline} threadId={article.threadId} />
      <p className={styles.article}>{formatArticleText(article.article)}</p>
      <div className={styles.stats}>
        <a
          href={`https://archive.4plebs.org/pol/thread/${article.threadId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.statsLink}
        >
          Replies: {article.metadata.totalPosts}
        </a>
        {article.antisemiticStats.percentage > 10 && (
          <span>Antisemitism: {article.antisemiticStats.percentage.toFixed(1)}%</span>
        )}
      </div>
    </div>
  );
} 
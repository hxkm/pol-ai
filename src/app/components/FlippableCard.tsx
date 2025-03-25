'use client';

import React, { useState } from 'react';
import styles from './Card.module.css';

interface FlippableCardProps {
  children: React.ReactNode;
  className?: string;
  backContent?: string;
}

export const FlippableCard: React.FC<FlippableCardProps> = ({ 
  children, 
  className = '',
  backContent
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [lastScrape, setLastScrape] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the last scrape time when needed
  React.useEffect(() => {
    if (!backContent && !lastScrape) {
      const fetchLastScrape = async () => {
        try {
          const latestFile = await fetch('/api/latest-thread');
          const latestData = await latestFile.json();
          
          if (latestData.lastModified) {
            setLastScrape(new Date(latestData.lastModified));
          }
        } catch (error) {
          console.error('Failed to fetch last scrape time:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchLastScrape();
    } else if (backContent && isLoading) {
      setIsLoading(false);
    }
  }, [backContent, lastScrape, isLoading]);

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  // Format the date for display
  const formattedDate = lastScrape 
    ? lastScrape.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown date';

  // Format the time for display
  const formattedTime = lastScrape
    ? lastScrape.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown time';

  return (
    <div className={styles.flipCard}>
      <div className={`${styles.flipCardInner} ${isFlipped ? styles.flipped : ''}`}>
        {/* Front of the card */}
        <div className={`${styles.flipCardFront} ${styles.card} ${className}`}>
          {children}
          <button 
            className={styles.flipButton}
            onClick={handleFlip}
            aria-label="Flip card to back"
          >
            ↻
          </button>
        </div>
        
        {/* Back of the card */}
        <div className={`${styles.flipCardBack} ${styles.card}`}>
          {backContent ? (
            <>
              <h3 style={{ 
                fontSize: '1.25rem', 
                marginBottom: '1rem',
                textAlign: 'left'
              }}>
                {backContent}
              </h3>
              
              <div style={{ 
                marginTop: '1rem', 
                textAlign: 'justify',
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <p style={{ 
                  fontSize: '1rem', 
                  opacity: 0.8,
                  padding: '0 1rem'
                }}>
                  This dashboard collects data from 4chan and uses artificial intelligence to analyze, process, and summarize it for research purposes. 
                  The statistics in this console represent roughly 15% of /pol/&apos;s daily activity, with an emphasis on curating data from the catalog&apos;s most active threads. 
                  Certain elements of this page, including the Antisemitism per Post, Dominiant Themes, and Article Summaries, are generated once daily at 00:00 UTC, all other elements update every two hours and retain data for up to two days.
                </p>
                <p style={{ 
                  fontSize: '1rem', 
                  opacity: 0.8,
                  padding: '0 1rem'
                }}>
                  This project is open source and can be downloaded at <a href="https://github.com/hxkm/pol-ai" style={{color: 'blue'}}>github.com/hxkm/pol-ai</a>.
                </p>
                <p style={{ 
                  fontSize: '1rem', 
                  opacity: 0.8,
                  padding: '0 1rem'
                }}>
                  To support and expand this project and others like it, <a href="https://www.patreon.com/Lamp" style={{color: 'red'}}>please subscribe on Patreon</a>.
                </p>
                <p style={{ 
                  fontSize: '1rem', 
                  opacity: 0.8,
                  padding: '0 1rem'
                }}>
                  Please feel free to contact me at <a href="mailto:admin@LampByLit.com">admin@LampByLit.com</a>.
                </p>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ 
                fontSize: '1.25rem', 
                marginBottom: '1rem',
                textAlign: 'left'
              }}>
                Last Updated
              </h3>
              
              <div style={{ 
                marginTop: '1rem', 
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                {isLoading ? (
                  <p style={{ fontSize: '1rem', opacity: 0.8, textAlign: 'left', paddingLeft: '1rem' }}>Loading...</p>
                ) : (
                  <div style={{ paddingLeft: '1rem', textAlign: 'left' }}>
                    <p style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 'bold',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {formattedTime}
                      <span style={{ 
                        fontSize: '0.875rem', 
                        opacity: 0.7, 
                        fontWeight: 'normal' 
                      }}>
                        UTC
                      </span>
                    </p>
                    <p style={{ 
                      fontSize: '1rem', 
                      opacity: 0.8,
                      marginTop: '0.5rem' 
                    }}>
                      {formattedDate}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
          
          <button 
            className={styles.flipButton}
            onClick={handleFlip}
            aria-label="Flip card to front"
          >
            ↻
          </button>
        </div>
      </div>
    </div>
  );
}; 
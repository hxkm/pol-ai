'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './Card.module.css';

interface FlippableCardProps {
  children: React.ReactNode;
  className?: string;
}

export const FlippableCard: React.FC<FlippableCardProps> = ({ children, className = '' }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);
  const [lastScrape, setLastScrape] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const frontRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update card dimensions when the component mounts or content changes
  useEffect(() => {
    if (frontRef.current) {
      const { offsetWidth, offsetHeight } = frontRef.current;
      setCardSize({ width: offsetWidth, height: offsetHeight });
    }
  }, [children]);

  // Fetch the last scrape time
  useEffect(() => {
    const fetchLastScrape = async () => {
      try {
        // Get the most recent file's modified time
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
  }, []);

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

  // Create a combined class for the front card
  const frontCardClass = `${styles.card} ${className}`;
  
  // For the back card, preserve only the card class
  const backCardClass = `${styles.card}`;

  // Define fixed size styles
  const fixedSizeStyle = cardSize 
    ? { 
        width: `${cardSize.width}px`, 
        height: `${cardSize.height}px`,
        minHeight: `${cardSize.height}px`,
      } 
    : {};

  return (
    <div 
      ref={containerRef}
      className={styles.cardContainer} 
      style={fixedSizeStyle}
    >
      <div className={`${styles.cardInner} ${isFlipped ? styles.flipped : ''}`}>
        {/* Front side */}
        <div className={`${styles.cardFace} ${styles.cardFront}`}>
          <div 
            ref={frontRef} 
            className={frontCardClass}
          >
            {children}
            <button 
              className={styles.flipButton}
              onClick={handleFlip}
              aria-label="Flip card to back"
            >
              ↻
            </button>
          </div>
        </div>
        
        {/* Back side - always white */}
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          <div 
            className={backCardClass} 
            style={{
              ...fixedSizeStyle,
              background: 'white',
              color: 'black',
              position: 'relative'
            }}
          >
            {/* Title at top left */}
            <h3 style={{ 
              fontSize: '1.25rem', 
              marginBottom: '1rem',
              textAlign: 'left',
              position: 'absolute',
              top: '24px',
              left: '24px'
            }}>
              Last Updated
            </h3>
            
            {/* Content in the middle */}
            <div className={styles.backContent}>
              {isLoading ? (
                <p style={{ fontSize: '1rem', opacity: 0.8 }}>Loading...</p>
              ) : (
                <>
                  <p style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                </>
              )}
            </div>
            
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
    </div>
  );
}; 
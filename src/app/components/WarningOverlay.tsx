'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const WarningOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'black',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      gap: '3rem',
      padding: '2rem'
    }}>
      <Image
        src="/loading.png"
        alt="Loading"
        width={400}
        height={133}
        style={{ objectFit: 'contain' }}
        priority
      />
      <div style={{
        color: 'white',
        textAlign: 'center',
        fontFamily: 'Helvetica, Arial, sans-serif'
      }}>
        <h1 style={{
          fontSize: '3rem',
          marginBottom: '1.5rem',
          color: 'red',
          fontWeight: 'bold',
          letterSpacing: '0.05em'
        }}>
          WARNING:
        </h1>
        <p style={{
          fontSize: '2rem',
          fontWeight: '500',
          letterSpacing: '0.02em',
          lineHeight: '1.4'
        }}>
          DO NOT ENTER. THIS PAGE IS NOT SAFE FOR WORK.
        </p>
      </div>
    </div>
  );
};

export default WarningOverlay; 
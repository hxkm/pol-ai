'use client';

import React from 'react';

export const AntisemitismStats = () => {
  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', textAlign: 'left' }}>Antisemitism Per Post</h2>
      <p style={{ 
        fontSize: '3rem', 
        fontWeight: 'bold', 
        margin: 0, 
        textAlign: 'left',
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.5rem'
      }}>
        <span>8.9%</span>
        <span style={{ 
          fontSize: '1rem', 
          fontWeight: 'normal', 
          opacity: 0.8 
        }}>
          Medium
        </span>
      </p>
      <span style={{
        fontSize: '0.875rem',
        opacity: 0.8,
        marginTop: '0.5rem',
        display: 'block'
      }}>
        No change
      </span>
    </div>
  );
}; 
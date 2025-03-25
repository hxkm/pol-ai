'use client';

import React from 'react';

const CatalogView = () => {
  return (
    <div style={{ 
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      borderRadius: '12px',
      background: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <iframe
        src="https://archive.4plebs.org/pol/"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          transform: 'scale(1)',  // Fill the entire space
          transformOrigin: 'center'
        }}
        title="4plebs /pol/"
      />
    </div>
  );
};

export default CatalogView; 
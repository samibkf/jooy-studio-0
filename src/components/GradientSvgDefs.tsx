
import React from 'react';

const GradientSvgDefs = () => {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="orange-purple-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF6600" />
          <stop offset="100%" stopColor="#EE00FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default GradientSvgDefs;

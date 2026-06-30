import React from 'react';

export default function PulseLogo({ size = 40, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <rect width="200" height="200" rx="46" fill="#04342C" />
      <circle cx="100" cy="100" r="74" fill="none" stroke="#9FE1CB" strokeWidth="2.5" opacity="0.16" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="#9FE1CB" strokeWidth="3" opacity="0.32" />
      <circle cx="100" cy="100" r="46" fill="none" stroke="#9FE1CB" strokeWidth="3" opacity="0.6" />
      <circle cx="100" cy="100" r="32" fill="#9FE1CB" />
      <path d="M78 100 L88 100 L94 87 L104 115 L110 100 L122 100" stroke="#04342C" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

import React, { useState } from 'react';
import { GLOSSARY } from '../glossary';

const s = {
  wrap: { position: 'relative', display: 'inline-flex', cursor: 'help' },
  label: { borderBottom: '1px dotted #4a5568' },
  tooltip: {
    position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
    marginBottom: '0.4rem', padding: '0.5rem 0.65rem', background: '#1a2035',
    border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0',
    fontSize: '0.75rem', fontWeight: '400', lineHeight: 1.4, whiteSpace: 'normal',
    width: '210px', textAlign: 'left', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    pointerEvents: 'none',
  },
};

// Wraps a short label (e.g. a table header) with a dotted underline and a
// hover/tap-to-toggle definition tooltip. Pass `term` to look up GLOSSARY,
// or `def` to supply the text directly.
export default function Term({ children, term, def }) {
  const [show, setShow] = useState(false);
  const text = def || GLOSSARY[term?.toLowerCase()] || '';
  if (!text) return children;
  return (
    <span
      style={s.wrap}
      tabIndex={0}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={e => { e.stopPropagation(); setShow(v => !v); }}
      onBlur={() => setShow(false)}
    >
      <span style={s.label}>{children}</span>
      {show && <span style={s.tooltip}>{text}</span>}
    </span>
  );
}

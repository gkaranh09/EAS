import React from 'react';

// TCET Centre of Excellence Logo (Research node tree design)
export function TcetLogo({ className, size = 42 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Outer Rounded Blue Frame */}
      <rect width="120" height="120" rx="20" fill="#ffffff" />
      <rect x="3" y="3" width="114" height="114" rx="17" stroke="#002147" strokeWidth="4" />
      
      {/* Mind-Map / Research Tree Nodes */}
      {/* Center trunk */}
      <path d="M60 90 V40" stroke="#002147" strokeWidth="5" strokeLinecap="round" />
      {/* Left branch */}
      <path d="M60 70 C45 65 40 50 40 45" stroke="#1a5fb4" strokeWidth="4" strokeLinecap="round" />
      {/* Right branch */}
      <path d="M60 60 C75 55 80 45 80 40" stroke="#1a5fb4" strokeWidth="4" strokeLinecap="round" />
      {/* Secondary branch left */}
      <path d="M48 53 C45 42 55 35 55 35" stroke="#c58c28" strokeWidth="3" strokeLinecap="round" />
      
      {/* Circles (Nodes) */}
      <circle cx="60" cy="40" r="8" fill="#e67e22" />
      <circle cx="40" cy="45" r="7" fill="#002147" />
      <circle cx="80" cy="40" r="7" fill="#002147" />
      <circle cx="55" cy="35" r="5" fill="#c58c28" />
      <circle cx="32" cy="70" r="4" fill="#1a5fb4" />
      <path d="M40 45 C35 55 32 65 32 70" stroke="#1a5fb4" strokeWidth="2.5" />

      {/* Label "TCET" */}
      <text
        x="60"
        y="108"
        fill="#002147"
        fontSize="16"
        fontWeight="800"
        fontFamily="sans-serif"
        textAnchor="middle"
        letterSpacing="0.05em"
      >
        TCET
      </text>
    </svg>
  );
}

// TCET Golden Crest / Emblem
export function TcetCrest({ className, size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Gold Shield Outline */}
      <path
        d="M50 10 C25 10 15 25 15 55 C15 85 50 110 50 110 C50 110 85 85 85 55 C85 25 75 10 50 10 Z"
        fill="#002147"
        stroke="#c58c28"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      
      {/* Inner Decorative Lines */}
      <path
        d="M50 15 C30 15 22 28 22 55 C22 80 50 102 50 102 C50 102 78 80 78 55 C78 28 70 15 50 15 Z"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />

      {/* Lamp of Knowledge / Flame */}
      <path
        d="M50 35 C53 35 56 42 56 48 C56 56 50 62 50 62 C50 62 44 56 44 48 C44 42 47 35 50 35 Z"
        fill="#e67e22"
      />
      <circle cx="50" cy="48" r="4" fill="#ffffff" />
      
      {/* Book of Learning */}
      <path
        d="M32 72 C40 70 50 74 50 74 C50 74 60 70 68 72 V82 C60 80 50 84 50 84 C50 84 40 80 32 82 Z"
        fill="#ffffff"
        stroke="#c58c28"
        strokeWidth="2"
      />
      <line x1="50" y1="74" x2="50" y2="84" stroke="#c58c28" strokeWidth="2" />

      {/* Crown / Star at Top */}
      <polygon points="50,2 53,8 59,9 55,13 56,19 50,16 44,19 45,13 41,9 47,8" fill="#c58c28" />

      {/* Gold Scroll / Banner at the bottom */}
      <path
        d="M10 95 C30 100 70 100 90 95 C95 98 90 105 80 107 C50 110 30 110 20 107 C10 105 5 98 10 95 Z"
        fill="#c58c28"
        stroke="#ffffff"
        strokeWidth="1"
      />
      <text
        x="50"
        y="104"
        fill="#002147"
        fontSize="7.5"
        fontWeight="800"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        COE - TCET
      </text>
    </svg>
  );
}

// Medal SVG Icon
export function MedalIcon({ className, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

// Globe SVG Icon
export function GlobeIcon({ className, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Document SVG Icon
export function DocIcon({ className, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

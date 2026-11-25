import React from 'react';

/**
 * Colored, game-day specific icons (24x24). Outlines use currentColor so they
 * follow the theme; fills use fixed accent colors so the icons read in color
 * in both dark and light mode.
 */
const C = {
  orange: '#F97316',
  amber: '#FBBF24',
  red: '#EF4444',
  kettle: '#DC2626',
  sky: '#38BDF8',
  blue: '#3B82F6',
  green: '#22C55E',
  emerald: '#10B981',
  purple: '#A78BFA',
};

function Svg({ className = 'h-6 w-6', strokeWidth = 1.8, title, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

/** House with an orange roof and amber door */
export function HomeIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 10.5V20h14v-9.5" fill={C.orange} fillOpacity="0.18" />
      <path d="M2.5 11.5 12 3.5l9.5 8" stroke={C.orange} strokeWidth="2.4" />
      <path d="M10 20v-5.5h4V20" fill={C.amber} />
    </Svg>
  );
}

/** Scoreboard screen with a red live dot */
export function LiveIcon(props) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" fill={C.sky} fillOpacity="0.2" />
      <path d="M8 6 6 3M16 6l2-3" />
      <path d="M6.5 10.5h3M8 10.5v5M14.5 10.5h3v2.5h-3v2.5h3" stroke={C.sky} strokeWidth="1.9" />
      <circle cx="20" cy="5" r="3" fill={C.red} stroke="none" />
    </Svg>
  );
}

/** Red kettle grill with flames */
export function TailgateIcon(props) {
  return (
    <Svg {...props}>
      <path d="M9 2.5c-1.2 1.3-1.2 2.4 0 3.6M12.5 1.8c-1.4 1.6-1.4 3 0 4.4M16 2.5c-1.2 1.3-1.2 2.4 0 3.6" stroke={C.orange} strokeWidth="1.7" />
      <path d="M3.5 9h17a8.5 6.5 0 0 1-17 0Z" fill={C.kettle} stroke={C.kettle} />
      <path d="M2.5 9h19" />
      <path d="M8 15.2 6 21.5M16 15.2l2 6.3M12 15.6V21" />
      <circle cx="12" cy="21.3" r="1.2" fill="currentColor" stroke="none" />
      <path d="M8.5 11.2h7" stroke={C.amber} strokeWidth="1.4" />
    </Svg>
  );
}

/** Team pennant on a pole */
export function TeamsIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4.5 2.5v19" strokeWidth="2.2" />
      <path d="M5 4.5 21 9.5 5 14.5Z" fill={C.blue} stroke={C.blue} />
      <path d="M5 7.6 14 9.5 5 11.4Z" fill={C.amber} stroke="none" />
      <circle cx="4.5" cy="2.5" r="1.3" fill={C.amber} stroke="none" />
    </Svg>
  );
}

/** Two fans, green and orange */
export function FriendsIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="16.5" cy="7.5" r="3" fill={C.emerald} stroke={C.emerald} />
      <path d="M13.5 20a5 5 0 0 1 9 0" fill={C.emerald} fillOpacity="0.35" stroke={C.emerald} />
      <circle cx="8.5" cy="8.5" r="3.4" fill={C.orange} stroke={C.orange} />
      <path d="M2.5 21a6 6 0 0 1 12 0Z" fill={C.orange} fillOpacity="0.85" stroke={C.orange} />
    </Svg>
  );
}

/** Blue car with headlights */
export function CarIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 11.5 7 6.5h10l2 5" fill={C.sky} fillOpacity="0.25" />
      <rect x="2.5" y="11" width="19" height="6.5" rx="2" fill={C.blue} stroke={C.blue} />
      <circle cx="6.5" cy="14.2" r="1.2" fill={C.amber} stroke="none" />
      <circle cx="17.5" cy="14.2" r="1.2" fill={C.amber} stroke="none" />
      <path d="M5.5 17.5v2.5M18.5 17.5v2.5" strokeWidth="2.4" />
    </Svg>
  );
}

/** Folded campus map with a red pin */
export function CampusMapIcon(props) {
  return (
    <Svg {...props}>
      <path d="M2.5 6.5 8.5 4l7 2.5 6-2.5v13.5l-6 2.5-7-2.5-6 2.5Z" fill={C.green} fillOpacity="0.22" />
      <path d="M8.5 4v13.5M15.5 6.5V20" />
      <path d="M15.5 13.5s-3-2.9-3-5a3 3 0 0 1 6 0c0 2.1-3 5-3 5Z" fill={C.red} stroke={C.red} />
      <circle cx="15.5" cy="8.4" r="1" fill="#fff" stroke="none" />
    </Svg>
  );
}

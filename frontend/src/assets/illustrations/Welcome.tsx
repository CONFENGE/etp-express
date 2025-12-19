import { SVGProps } from 'react';

interface WelcomeProps extends SVGProps<SVGSVGElement> {
 className?: string;
}

/**
 * Welcome illustration - displays for first-time users or onboarding
 * Uses CSS variables for theme compatibility (light/dark mode)
 */
export function Welcome({ className, ...props }: WelcomeProps) {
 return (
 <svg
 viewBox="0 0 200 160"
 fill="none"
 xmlns="http://www.w3.org/2000/svg"
 className={className}
 aria-hidden="true"
 {...props}
 >
 {/* Background decorative elements */}
 <circle cx="100" cy="80" r="58" className="fill-primary/5" />

 {/* Clipboard base */}
 <rect
 x="55"
 y="30"
 width="90"
 height="115"
 rx="8"
 className="fill-background stroke-primary/40"
 strokeWidth="2"
 />

 {/* Clipboard clip */}
 <rect
 x="75"
 y="22"
 width="50"
 height="16"
 rx="4"
 className="fill-primary/20 stroke-primary/40"
 strokeWidth="1.5"
 />
 <rect
 x="85"
 y="26"
 width="30"
 height="8"
 rx="2"
 className="fill-background"
 />

 {/* Checklist items */}
 {/* Item 1 - checked */}
 <rect
 x="70"
 y="55"
 width="14"
 height="14"
 rx="3"
 className="fill-primary/20 stroke-primary"
 strokeWidth="1.5"
 />
 <path
 d="M73 62L76 65L81 59"
 className="stroke-primary"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 <rect
 x="92"
 y="59"
 width="40"
 height="5"
 rx="2.5"
 className="fill-primary/30"
 />

 {/* Item 2 - checked */}
 <rect
 x="70"
 y="80"
 width="14"
 height="14"
 rx="3"
 className="fill-primary/20 stroke-primary"
 strokeWidth="1.5"
 />
 <path
 d="M73 87L76 90L81 84"
 className="stroke-primary"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 <rect
 x="92"
 y="84"
 width="35"
 height="5"
 rx="2.5"
 className="fill-primary/30"
 />

 {/* Item 3 - empty (to do) */}
 <rect
 x="70"
 y="105"
 width="14"
 height="14"
 rx="3"
 className="fill-background stroke-muted-foreground/30"
 strokeWidth="1.5"
 strokeDasharray="3 2"
 />
 <rect
 x="92"
 y="109"
 width="30"
 height="5"
 rx="2.5"
 className="fill-muted-foreground/20"
 />

 {/* Sparkle decorations */}
 <path
 d="M155 35L157 40L162 42L157 44L155 49L153 44L148 42L153 40Z"
 className="fill-primary/40"
 />
 <path
 d="M45 70L46.5 73.5L50 75L46.5 76.5L45 80L43.5 76.5L40 75L43.5 73.5Z"
 className="fill-primary/30"
 />
 <circle cx="160" cy="90" r="3" className="fill-primary/20" />
 <circle cx="40" cy="45" r="2.5" className="fill-primary/25" />
 </svg>
 );
}

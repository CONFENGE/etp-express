import { SVGProps } from 'react';

interface NoResultsProps extends SVGProps<SVGSVGElement> {
 className?: string;
}

/**
 * NoResults illustration - displays when search returns no results
 * Uses CSS variables for theme compatibility (light/dark mode)
 */
export function NoResults({ className, ...props }: NoResultsProps) {
 return (
 <svg
 viewBox="0 0 200 160"
 fill="none"
 xmlns="http://www.w3.org/2000/svg"
 className={className}
 aria-hidden="true"
 {...props}
 >
 {/* Background decorative circle */}
 <circle cx="100" cy="80" r="55" className="fill-primary/5" />

 {/* Magnifying glass body */}
 <circle
 cx="85"
 cy="70"
 r="35"
 className="fill-background stroke-primary/40"
 strokeWidth="3"
 />

 {/* Inner circle (lens) */}
 <circle cx="85" cy="70" r="28" className="fill-muted/30" />

 {/* Lens reflection */}
 <path
 d="M68 55C72 50 80 48 88 50"
 className="stroke-background"
 strokeWidth="3"
 strokeLinecap="round"
 opacity="0.6"
 />

 {/* Handle */}
 <rect
 x="110"
 y="95"
 width="35"
 height="12"
 rx="6"
 transform="rotate(-45 110 95)"
 className="fill-primary/30 stroke-primary/40"
 strokeWidth="2"
 />

 {/* X mark inside lens (no results) */}
 <path
 d="M75 60L95 80M95 60L75 80"
 className="stroke-muted-foreground/40"
 strokeWidth="3"
 strokeLinecap="round"
 />

 {/* Small decorative dots */}
 <circle cx="45" cy="50" r="3" className="fill-primary/20" />
 <circle cx="155" cy="45" r="4" className="fill-primary/15" />
 <circle cx="160" cy="110" r="3" className="fill-primary/20" />
 <circle cx="35" cy="100" r="2.5" className="fill-primary/15" />
 </svg>
 );
}

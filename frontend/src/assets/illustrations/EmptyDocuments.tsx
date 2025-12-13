import { SVGProps } from 'react';

interface EmptyDocumentsProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * EmptyDocuments illustration - displays when no ETPs exist
 * Uses CSS variables for theme compatibility (light/dark mode)
 */
export function EmptyDocuments({ className, ...props }: EmptyDocumentsProps) {
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
      <circle cx="100" cy="80" r="60" className="fill-primary/5" />

      {/* Main document stack */}
      {/* Back document */}
      <rect
        x="55"
        y="35"
        width="90"
        height="110"
        rx="6"
        className="fill-muted stroke-border"
        strokeWidth="1.5"
      />

      {/* Middle document */}
      <rect
        x="50"
        y="30"
        width="90"
        height="110"
        rx="6"
        className="fill-background stroke-border"
        strokeWidth="1.5"
      />

      {/* Front document */}
      <rect
        x="45"
        y="25"
        width="90"
        height="110"
        rx="6"
        className="fill-background stroke-primary/40"
        strokeWidth="2"
      />

      {/* Document lines (content placeholder) */}
      <rect
        x="60"
        y="45"
        width="50"
        height="6"
        rx="3"
        className="fill-primary/20"
      />
      <rect
        x="60"
        y="60"
        width="60"
        height="4"
        rx="2"
        className="fill-muted-foreground/20"
      />
      <rect
        x="60"
        y="72"
        width="55"
        height="4"
        rx="2"
        className="fill-muted-foreground/20"
      />
      <rect
        x="60"
        y="84"
        width="45"
        height="4"
        rx="2"
        className="fill-muted-foreground/20"
      />

      {/* Empty state indicator - dashed circle with plus */}
      <circle
        cx="100"
        cy="115"
        r="18"
        className="stroke-primary/50"
        strokeWidth="2"
        strokeDasharray="4 3"
        fill="none"
      />
      <path
        d="M100 107V123M92 115H108"
        className="stroke-primary/60"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

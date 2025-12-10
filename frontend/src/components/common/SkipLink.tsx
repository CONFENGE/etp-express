/**
 * SkipLink Component
 *
 * Provides a skip navigation link for keyboard users to bypass
 * repetitive navigation and jump directly to main content.
 *
 * WCAG 2.1 Compliance:
 * - Success Criterion 2.4.1 (Bypass Blocks)
 * - Success Criterion 2.4.3 (Focus Order)
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html
 */

interface SkipLinkProps {
  /**
   * The target element ID to skip to (without #)
   * @default "main-content"
   */
  targetId?: string;
  /**
   * The accessible label for the skip link
   * @default "Skip to main content"
   */
  label?: string;
}

export function SkipLink({
  targetId = 'main-content',
  label = 'Skip to main content',
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);

    if (target) {
      // Set tabindex to allow focus on non-interactive elements
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus();
      // Scroll into view smoothly
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a href={`#${targetId}`} className="skip-link" onClick={handleClick}>
      {label}
    </a>
  );
}

// The Sleep Company mark — two interlocking square frames (a hollow navy
// square behind a cyan-filled one) beside the two-line wordmark. Built as
// SVG rather than a raster image so it stays crisp at any size and pulls
// its colors from the same tokens (navy-900 / accent-cyan) the rest of the
// app already uses.
export default function Logo({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 216 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="The Sleep Company"
    >
      <rect x="4" y="4" width="40" height="40" stroke="var(--color-navy-900)" strokeWidth="7" />
      <rect
        x="24"
        y="24"
        width="36"
        height="36"
        fill="var(--color-accent-cyan)"
        stroke="var(--color-navy-900)"
        strokeWidth="7"
      />
      <text
        x="78"
        y="29"
        fontFamily="var(--font-family)"
        fontWeight="800"
        fontSize="21"
        letterSpacing="0.3"
        fill="var(--color-navy-900)"
      >
        THE SLEEP
      </text>
      <text
        x="78"
        y="54"
        fontFamily="var(--font-family)"
        fontWeight="800"
        fontSize="21"
        letterSpacing="0.3"
        fill="var(--color-navy-900)"
      >
        COMPANY
      </text>
    </svg>
  );
}

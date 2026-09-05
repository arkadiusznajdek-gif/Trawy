export function GrassMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" className="grass-mark">
      <path d="M15 28 C 13 20, 13 12, 9 3" fill="none" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round" className="blade b1" />
      <path d="M15 28 C 15 19, 15 10, 15 2" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" className="blade b2" />
      <path d="M15 28 C 17 20, 17 12, 21 3" fill="none" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round" className="blade b3" />
    </svg>
  );
}
export function GrassDivider() {
  const blades = Array.from({ length: 18 });
  return (
    <div className="grass-divider" aria-hidden="true">
      {blades.map((_, i) => (
        <span key={i} className={`gd-blade gd-${i % 3}`} style={{ animationDelay: `${(i % 6) * 0.18}s` }} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Bottom navigation                                                      */
/* ---------------------------------------------------------------------- */

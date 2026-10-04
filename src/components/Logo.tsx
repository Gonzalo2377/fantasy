export function Logo({ size = 56 }: { size?: number }) {
  // Escudo genérico (no oficial) con los colores blau i blanc.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M32 3l24 8v18c0 16-10.5 26-24 32C18.5 55 8 45 8 29V11l24-8z" fill="#0b3f91" stroke="#fff" strokeWidth="3" />
      <path d="M24 9.5v46M40 9.5v46" stroke="#fff" strokeWidth="6" opacity=".9" />
      <circle cx="32" cy="31" r="9" fill="#f2b705" stroke="#0b3f91" strokeWidth="2" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={{ opacity: 0.85 }}>
      <circle cx="60" cy="60" r="52" stroke="#C6A35A" strokeWidth="1.5" strokeDasharray="280 30" />
      <path d="M60 28L36 40V58C36 74.5 46.2 90.1 60 94C73.8 90.1 84 74.5 84 58V40L60 28Z" stroke="#C6A35A" strokeWidth="1.2" fill="none" opacity="0.5" />
      <circle cx="60" cy="60" r="4" fill="#C6A35A" opacity="0.8" />
    </svg>
  )
}

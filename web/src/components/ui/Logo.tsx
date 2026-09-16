export function Logo({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/logo.svg"
      alt="Anonimus"
      width={size}
      height={size}
      style={{ display: 'block' }}
    />
  )
}

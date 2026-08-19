// Offline-friendly avatar: initials on a gradient tile.
export default function Avatar({ name = 'Partner', className = '' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <div
      className={`${className} bg-gradient-to-br from-primary to-[#9a6bff] text-on-primary flex items-center justify-center font-bold text-sm overflow-hidden shrink-0`}
    >
      {initials}
    </div>
  )
}

import Icon from './Icon'

// Fullscreen success overlay shown when the driver completes an order.
const particles = [
  { x: 90, y: -60, c: '#6b38d4', s: 8 },
  { x: -80, y: -70, c: '#34d399', s: 7 },
  { x: 110, y: 20, c: '#fbbf24', s: 9 },
  { x: -100, y: 30, c: '#f472b6', s: 6 },
  { x: 60, y: 90, c: '#60a5fa', s: 8 },
  { x: -70, y: 95, c: '#a78bfa', s: 7 },
  { x: 130, y: -30, c: '#34d399', s: 6 },
  { x: -120, y: -20, c: '#fbbf24', s: 8 },
]

export default function CompletionOverlay() {
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center anim-comp-fade" style={{ background: 'rgba(248,249,250,0.96)' }}>
      {/* Expanding rings */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 rounded-full bg-primary/30 anim-comp-ring"></div>
        <div className="absolute w-24 h-24 rounded-full bg-primary/20 anim-comp-ring anim-comp-ring-delay"></div>

        {/* Center circle */}
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-primary to-[#9a6bff] shadow-2xl shadow-primary/40 flex items-center justify-center anim-comp-pop">
          <Icon name="check" fill className="text-white anim-comp-check" style={{ fontSize: '56px' }} />
        </div>

        {/* Particles */}
        {particles.map((p, i) => (
          <span
            key={i}
            className="comp-particle"
            style={{
              width: p.s,
              height: p.s,
              background: p.c,
              '--tx': `${p.x}px`,
              '--ty': `${p.y}px`,
              animationDelay: `${0.15 + i * 0.04}s`,
            }}
          />
        ))}
      </div>

      {/* Text */}
      <div className="absolute bottom-[24%] left-0 right-0 text-center px-6">
        <p className="text-headline-lg text-on-surface font-bold anim-comp-up">Delivery Complete!</p>
        <p className="text-body-md text-on-surface-variant mt-1 anim-comp-up anim-comp-up-delay1">
          Nice work — keep it up 🎉
        </p>
      </div>
    </div>
  )
}

import { useState } from "react";

const makePieces = () =>
  Array.from({ length: 48 }, (_, i) => ({
    left: Math.random() * 100,
    size: 4 + Math.random() * 6,
    delay: -Math.random() * 3,
    duration: 2.2 + Math.random() * 1.8,
    drift: (Math.random() - 0.5) * 60,
    spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360),
    key: i,
  }));

// Celebración: cuadritos que caen girando sobre la tarjeta.
export function Confetti() {
  const [pieces] = useState(makePieces);
  return (
    <div className="companion-confetti" aria-hidden>
      {pieces.map((p) => (
        <i
          key={p.key}
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.7,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--drift": `${p.drift}px`,
              "--spin": `${p.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

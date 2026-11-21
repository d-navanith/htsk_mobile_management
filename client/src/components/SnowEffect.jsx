import React, { useMemo } from 'react';
import SkyTechFluidEffect from './SkyTechFluidEffect';

/**
 * SnowEffect Component
 * Renders lightweight, 60fps snow / ambient / SkyTech WebGL2 fluid animation strictly inside its parent card.
 * Parent card MUST have `position: relative` and `overflow: hidden`.
 */
const SNOW_SYMBOLS = ['❄', '❅', '❆', '•', '✦', '❄', '❅'];
const RAIN_SYMBOLS = ['│', '╵', '╹', '·', '│', '╵'];
const SPARKLE_SYMBOLS = ['✦', '★', '✧', '⋆', '•', '✨', '✦'];

export default function SnowEffect({
  count = 14,
  color = '#38bdf8',
  secondaryColor = '#93c5fd',
  type = 'snow'
}) {
  if (type === 'skytech' || type === 'fluid') {
    return (
      <SkyTechFluidEffect
        fullScreen={false}
        simulationResolution={128}
        dyeResolution={512}
        cursorRadius={0.025}
        cursorForce={36}
        densityAmount={0.95}
        autoPulse={true}
        opacity={0.38}
      />
    );
  }
  // Generate stable particles so they don't jump on parent re-renders
  const flakes = useMemo(() => {
    const symbolPool = type === 'rain' ? RAIN_SYMBOLS : type === 'sparkle' ? SPARKLE_SYMBOLS : SNOW_SYMBOLS;
    return Array.from({ length: count }).map((_, i) => {
      const char = symbolPool[i % symbolPool.length];
      const isTinyDot = char === '•' || char === '·';
      const isSparkle = char === '✦' || char === '✧' || char === '★';
      
      // Distribute evenly across width with small random offset
      const baseLeft = (i / count) * 96 + 2;
      const leftOffset = (Math.sin(i * 99) * 4);
      const left = Math.min(96, Math.max(2, baseLeft + leftOffset));
      
      // Size
      const fontSize = isTinyDot
        ? Math.floor(6 + (i % 4) * 1.5)
        : isSparkle
        ? Math.floor(9 + (i % 4) * 2)
        : type === 'rain'
        ? Math.floor(10 + (i % 3) * 2)
        : Math.floor(12 + (i % 5) * 1.8);
      
      // Fall duration: rain falls faster, snow floats gently
      const fallDuration = type === 'rain'
        ? (2.2 + ((i * 1.1) % 1.6)).toFixed(1)
        : (4.8 + ((i * 1.7) % 3.7)).toFixed(1);
      
      // Horizontal sway duration
      const swayDuration = type === 'rain'
        ? (1.5 + ((i * 0.9) % 1.2)).toFixed(1)
        : (2.4 + ((i * 1.3) % 1.8)).toFixed(1);
      const swayAmount = type === 'rain' ? Math.floor(2 + (i % 3) * 2) : Math.floor(10 + (i % 5) * 3);
      
      // Negative delay so particles are in-flight immediately when mounted
      const delay = -((i * 1.6) % 7.5).toFixed(1);
      
      // Opacity
      const opacity = isTinyDot ? 0.45 : Number((0.4 + (i % 4) * 0.1).toFixed(2));
      
      // Alternating color between primary theme accent and frosty ice blue
      const flakeColor = i % 2 === 0 ? color : secondaryColor;

      return {
        id: i,
        char,
        left: `${left}%`,
        fontSize: `${fontSize}px`,
        fallDuration: `${fallDuration}s`,
        swayDuration: `${swayDuration}s`,
        swayAmount: `${swayAmount}px`,
        delay: `${delay}s`,
        opacity,
        color: flakeColor
      };
    });
  }, [count, color, secondaryColor, type]);

  return (
    <div
      className="card-snow-container"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        borderRadius: 'inherit',
        zIndex: 0
      }}
    >
      {flakes.map((f) => (
        <span
          key={f.id}
          className="snowflake-item"
          style={{
            position: 'absolute',
            top: '-25px',
            left: f.left,
            fontSize: f.fontSize,
            color: f.color,
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
            textShadow: '0 0 3px rgba(255, 255, 255, 0.95), 0 0 6px rgba(186, 230, 253, 0.6)',
            '--snow-opacity': f.opacity,
            '--snow-sway': f.swayAmount,
            animationName: 'cardSnowFall, cardSnowSway',
            animationDuration: `${f.fallDuration}, ${f.swayDuration}`,
            animationTimingFunction: 'linear, ease-in-out',
            animationIterationCount: 'infinite, infinite',
            animationDelay: `${f.delay}, ${f.delay}`
          }}
        >
          {f.char}
        </span>
      ))}
    </div>
  );
}

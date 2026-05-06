import { useMemo, useRef } from 'react';
import { getTargetDef } from '../../lib/archery/targets';
import type { TargetType } from '../../lib/archery/constants';
import type { ScoreToken } from '../../lib/archery/scoring';

interface Props {
  targetType: TargetType;
  arrows: ScoreToken[];
  onPick: (token: ScoreToken) => void;
  disabled?: boolean;
}

const SIZE = 320;

export function VisualTarget({ targetType, arrows, onPick, disabled = false }: Props) {
  const cfg = useMemo(() => getTargetDef(targetType), [targetType]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!cfg) {
    return (
      <div className="text-center text-sm text-slate-500 p-4 border border-dashed border-slate-300 rounded">
        Bu hedef tipi için görsel mod desteklenmiyor.
      </div>
    );
  }

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const maxR = SIZE / 2 - 4;

  const handleTap = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = SIZE / rect.width;
    const scaleY = SIZE / rect.height;
    const px = (e.clientX - rect.left) * scaleX - cx;
    const py = (e.clientY - rect.top) * scaleY - cy;
    const dist = Math.sqrt(px * px + py * py) / maxR;
    const nx = +(px / maxR).toFixed(3);
    const ny = +(py / maxR).toFixed(3);

    const ring = cfg.rings.find((r) => dist <= r.r);
    if (!ring) {
      onPick({
        value: 0,
        isX: false,
        label: 'M',
        color: '#9E9E9E',
        hitX: nx,
        hitY: ny,
      });
      return;
    }
    onPick({
      value: ring.score,
      isX: !!ring.isX,
      label: ring.isX ? 'X' : String(ring.score),
      color: ring.color,
      hitX: nx,
      hitY: ny,
    });
  };

  return (
    <div className="flex justify-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        height="auto"
        onPointerDown={handleTap}
        className="touch-none select-none w-full max-w-[80vmin] aspect-square"
        style={{ touchAction: 'none' }}
        aria-label="Görsel hedef — atış noktasına dokun"
        role="img"
      >
        <rect width={SIZE} height={SIZE} fill="#f8fafc" />
        {[...cfg.rings].reverse().map((r, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={maxR * r.r}
            fill={r.color}
            stroke={r.color === '#FFFFFF' ? '#000' : 'rgba(0,0,0,0.15)'}
            strokeWidth={1}
          />
        ))}
        <circle cx={cx} cy={cy} r={2} fill="#000" />

        {arrows.map((a, i) => {
          if (a.hitX === undefined || a.hitY === undefined) return null;
          const x = cx + a.hitX * maxR;
          const y = cy + a.hitY * maxR;
          const isLast = i === arrows.length - 1;
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={isLast ? 7 : 5}
                fill={isLast ? 'rgba(255,0,0,0.85)' : 'rgba(255,0,0,0.55)'}
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={x}
                y={y - 9}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#fff"
                stroke="#000"
                strokeWidth={0.5}
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

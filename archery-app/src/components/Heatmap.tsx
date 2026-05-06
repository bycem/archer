import { useEffect, useRef } from 'react';
import { getTargetDef } from '../lib/archery/targets';
import type { TargetType } from '../lib/archery/constants';

export interface HeatmapPoint {
  x: number;
  y: number;
}

interface Props {
  targetType: TargetType;
  points: HeatmapPoint[];
  size?: number;
}

export default function Heatmap({ targetType, points, size = 400 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, size, size);
    drawTarget(ctx, targetType, size);
    drawDensity(ctx, points, size);
  }, [points, targetType, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-slate-200 bg-white max-w-full h-auto"
      aria-label="Atış ısı haritası"
      role="img"
    />
  );
}

function drawTarget(
  ctx: CanvasRenderingContext2D,
  targetType: TargetType,
  size: number,
) {
  const cfg = getTargetDef(targetType);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 2;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);

  if (!cfg) return;

  const reversed = [...cfg.rings].reverse();
  for (const ring of reversed) {
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * ring.r, 0, Math.PI * 2);
    ctx.fillStyle = ring.color;
    ctx.fill();
    ctx.strokeStyle =
      ring.color === '#FFFFFF' ? '#000' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
}

function drawDensity(
  ctx: CanvasRenderingContext2D,
  points: HeatmapPoint[],
  size: number,
) {
  if (points.length === 0) return;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 2;
  const radius = Math.max(10, Math.min(20, Math.round(size / 25)));

  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d');
  if (!octx) return;

  for (const p of points) {
    const px = cx + p.x * maxR;
    const py = cy + p.y * maxR;
    const grad = octx.createRadialGradient(px, py, 0, px, py, radius);
    grad.addColorStop(0, 'rgba(255,0,0,0.45)');
    grad.addColorStop(1, 'rgba(255,0,0,0)');
    octx.fillStyle = grad;
    octx.beginPath();
    octx.arc(px, py, radius, 0, Math.PI * 2);
    octx.fill();
  }

  ctx.globalAlpha = 0.7;
  ctx.drawImage(off, 0, 0);
  ctx.globalAlpha = 1;

  for (const p of points) {
    const px = cx + p.x * maxR;
    const py = cy + p.y * maxR;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

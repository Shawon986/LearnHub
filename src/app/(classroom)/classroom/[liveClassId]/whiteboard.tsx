"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StrokeData } from "@/lib/live/bus";
import { whiteboardClear, whiteboardStroke } from "@/lib/actions/live";

const COLORS = ["#111827", "#6d28d9", "#0d9488", "#dc2626", "#d97706", "#2563eb"];
const SIZES = [2, 4, 8];

/**
 * Collaborative whiteboard: strokes render from the SSE replay buffer
 * and are broadcast to every participant via the classroom bus.
 */
export function Whiteboard({
  classId,
  strokes,
  isHost,
}: {
  classId: string;
  strokes: StrokeData[];
  isHost: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const [color, setColor] = useState(COLORS[1]);
  const [width, setWidth] = useState(4);
  const [erase, setErase] = useState(false);
  const [size, setSize] = useState({ w: 800, h: 500 });

  // Track container size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const resize = () => setSize({ w: parent.clientWidth, h: parent.clientHeight });
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Render all strokes (local + replayed).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokes) {
      drawStroke(ctx, stroke, stroke.color === "#ffffff");
    }
  }, [strokes, size]);

  function drawStroke(
    ctx: CanvasRenderingContext2D,
    stroke: StrokeData,
    eraseMode: boolean,
  ) {
    ctx.strokeStyle = eraseMode ? "#ffffff" : stroke.color;
    ctx.lineWidth = eraseMode ? Math.max(12, stroke.width * 3) : stroke.width;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    pointsRef.current = [pos(e)];
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    pointsRef.current.push(pos(e));
    // Optimistic local render of the in-progress stroke.
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      const stroke: StrokeData = {
        id: "local",
        userId: "",
        userName: "",
        color: erase ? "#ffffff" : color,
        width,
        points: pointsRef.current,
      };
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawStroke(ctx, stroke, erase);
    }
  }

  function onUp() {
    if (!drawing.current) return;
    drawing.current = false;
    if (pointsRef.current.length >= 2) {
      const stroke: StrokeData = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        userId: "",
        userName: "",
        color: erase ? "#ffffff" : color,
        width,
        points: pointsRef.current,
      };
      whiteboardStroke(classId, stroke).catch(() => {});
    }
    pointsRef.current = [];
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="glass z-10 mb-2 flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => {
              setColor(c);
              setErase(false);
            }}
            className={cn(
              "h-6 w-6 rounded-full ring-2 transition-transform hover:scale-110",
              !erase && color === c ? "ring-brand" : "ring-transparent",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
        <div className="mx-1 h-5 w-px bg-line" aria-hidden />
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`Stroke width ${s}`}
            onClick={() => setWidth(s)}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              width === s && !erase ? "bg-brand-soft" : "hover:bg-card-2",
            )}
          >
            <span className="block rounded-full bg-foreground" style={{ width: s * 2, height: s * 2 }} />
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-line" aria-hidden />
        <button
          type="button"
          aria-label="Eraser"
          onClick={() => setErase((v) => !v)}
          className={cn("rounded-lg p-2 transition-colors", erase ? "bg-brand-soft text-brand-fg" : "text-muted-fg hover:bg-card-2")}
        >
          <Eraser className="h-4 w-4" />
        </button>
        {isHost && (
          <button
            type="button"
            aria-label="Clear whiteboard"
            onClick={() => whiteboardClear(classId).catch(() => {})}
            className="rounded-lg p-2 text-muted-fg transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <span className="ml-auto text-[11px] font-semibold text-faint-fg">
          Collaborative — everyone sees it live
        </span>
      </div>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          className="h-full w-full touch-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-label="Collaborative whiteboard"
        />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Captions,
  Maximize,
  Minimize,
  NotebookPen,
  Pause,
  PictureInPicture2,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Premium custom video player. Keyboard shortcuts, resume, bookmarks,
// notes, PiP, playback speed and fullscreen — all controls custom-built.

interface BookmarkItem {
  id: string;
  timeSeconds: number;
  label: string | null;
}
interface NoteItem {
  id: string;
  timeSeconds: number;
  content: string;
}

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function VideoPlayer({
  src,
  poster,
  initialPosition = 0,
  bookmarks = [],
  notes = [],
  onProgress,
  onComplete,
  onAddBookmark,
  onDeleteBookmark,
  onAddNote,
  onDeleteNote,
}: {
  src: string;
  poster?: string | null;
  initialPosition?: number;
  bookmarks?: BookmarkItem[];
  notes?: NoteItem[];
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  onComplete?: () => void;
  onAddBookmark?: (timeSeconds: number, label: string) => void;
  onDeleteBookmark?: (id: string) => void;
  onAddNote?: (timeSeconds: number, content: string) => void;
  onDeleteNote?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [bookmarkPrompt, setBookmarkPrompt] = useState(false);
  const [notePrompt, setNotePrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumePrompt, setResumePrompt] = useState(initialPosition > 10 && initialPosition < (duration || Infinity) - 10);
  const lastReported = useRef(-1);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
    }, 2800);
  }, []);

  /* ---- Playback state ---- */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
  }, [muted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (initialPosition > 0) el.currentTime = initialPosition;
  }, [initialPosition]);

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function seekBy(delta: number) {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + delta), el.duration || 0);
  }

  function seekTo(t: number) {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = t;
    setResumePrompt(false);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  async function togglePiP() {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.requestPictureInPicture();
    } catch {
      /* unsupported */
    }
  }

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
          seekBy(-5);
          break;
        case "arrowright":
          seekBy(5);
          break;
        case "f":
          void toggleFullscreen();
          break;
        case "m":
          setMuted((v) => !v);
          break;
        case "b":
          if (onAddBookmark) setBookmarkPrompt(true);
          break;
        case "n":
          if (onAddNote) setNotePrompt(true);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAddBookmark, onAddNote]);

  /* ---- Progress reporting (throttled, only on real movement) ---- */
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !onProgress) return;
    const timer = setInterval(() => {
      if (!el.paused && el.duration > 0 && Math.abs(el.currentTime - lastReported.current) > 3) {
        lastReported.current = el.currentTime;
        onProgress(el.currentTime, el.duration);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [onProgress]);

  /* ---- Fullscreen listener ---- */
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="group relative overflow-hidden rounded-2xl bg-black shadow-lift"
      onMouseMove={showControls}
      onMouseLeave={() => {
        if (!videoRef.current?.paused) setControlsVisible(false);
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        className="aspect-video w-full"
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onTimeUpdate={(e) => {
          setCurrent(e.currentTarget.currentTime);
          if (e.currentTarget.duration > 0) setDuration(e.currentTarget.duration);
        }}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          if (initialPosition > 0 && initialPosition < e.currentTarget.duration - 5) {
            e.currentTarget.currentTime = initialPosition;
          }
        }}
        onEnded={() => {
          setPlaying(false);
          onComplete?.();
          onProgress?.(duration, duration);
        }}
        onError={(e) => {
          // Token expired, file moved, network lost — surface it instead of
          // dying silently; reloading re-mints a fresh signed URL.
          const mediaError = e.currentTarget.error;
          setError(
            mediaError?.code === MediaError.MEDIA_ERR_NETWORK
              ? "Network error while loading the video."
              : "The video could not be played. It may have been removed or your access expired.",
          );
          setPlaying(false);
        }}
      />

      {/* Fatal playback error overlay */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
          <p className="max-w-md text-sm font-bold text-white">{error}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-brand px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Reload player
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                const el = videoRef.current;
                if (el) {
                  el.load();
                  void el.play();
                }
              }}
              className="rounded-xl bg-white/15 px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-white/25"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Resume overlay */}
      {resumePrompt && !playing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
          <p className="text-sm font-bold text-white">Resume from {fmt(initialPosition)}?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                seekTo(initialPosition);
                void videoRef.current?.play();
              }}
              className="rounded-xl bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-hover"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => setResumePrompt(false)}
              className="rounded-xl bg-white/15 px-4 py-2 text-[13px] font-bold text-white hover:bg-white/25"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {/* Bookmarks on timeline */}
      {bookmarks.map((b) => (
        <button
          key={b.id}
          type="button"
          aria-label={`Jump to bookmark ${b.label ?? fmt(b.timeSeconds)}`}
          title={b.label ?? fmt(b.timeSeconds)}
          onClick={() => seekTo(b.timeSeconds)}
          className="absolute bottom-11 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-gold ring-2 ring-black/40"
          style={{ left: `${duration > 0 ? (b.timeSeconds / duration) * 100 : 0}%` }}
        />
      ))}

      {/* Notes + bookmarks panel */}
      {notesOpen && (
        <div className="absolute inset-y-0 right-0 z-20 flex w-72 flex-col border-l border-white/10 bg-black/85 backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-[13px] font-bold text-white">Notes & bookmarks</p>
            <button type="button" onClick={() => setNotesOpen(false)} className="text-[11px] font-bold text-white/60 hover:text-white">
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            <section aria-label="Bookmarks">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">
                Bookmarks ({bookmarks.length})
              </p>
              <ul className="mt-1.5 space-y-1">
                {bookmarks.length === 0 && (
                  <p className="text-[11px] text-white/40">Press B to bookmark a moment.</p>
                )}
                {bookmarks.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5">
                    <button
                      type="button"
                      onClick={() => seekTo(b.timeSeconds)}
                      className="min-w-0 flex-1 text-left text-[11px] font-bold text-gold hover:underline"
                    >
                      {fmt(b.timeSeconds)} {b.label && `· ${b.label}`}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete bookmark"
                      onClick={() => onDeleteBookmark?.(b.id)}
                      className="p-1 text-[10px] font-bold text-white/50 hover:text-danger"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Notes">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">
                Notes ({notes.length})
              </p>
              <ul className="mt-1.5 space-y-1">
                {notes.length === 0 && (
                  <p className="text-[11px] text-white/40">Press N to add a note.</p>
                )}
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-white/10 p-2.5">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => seekTo(n.timeSeconds)}
                        className="text-[11px] font-extrabold tabular-nums text-gold hover:underline"
                      >
                        {fmt(n.timeSeconds)}
                      </button>
                      <button
                        type="button"
                        aria-label="Delete note"
                        onClick={() => onDeleteNote?.(n.id)}
                        className="p-1 text-[10px] font-bold text-white/50 hover:text-danger"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-white/85">{n.content}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}

      {/* Bookmark / note prompts */}
      {bookmarkPrompt && onAddBookmark && (
        <PromptBar
          label="Bookmark label"
          onSubmit={(v) => {
            onAddBookmark(Math.floor(current), v);
            setBookmarkPrompt(false);
          }}
          onClose={() => setBookmarkPrompt(false)}
        />
      )}
      {notePrompt && onAddNote && (
        <PromptBar
          label={`Note at ${fmt(current)}`}
          multiline
          onSubmit={(v) => {
            onAddNote(Math.floor(current), v);
            setNotePrompt(false);
          }}
          onClose={() => setNotePrompt(false)}
        />
      )}

      {/* Controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-10 transition-opacity duration-200",
          controlsVisible || !playing ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {/* Seek bar */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          aria-label="Seek"
          onChange={(e) => {
            const t = Number(e.target.value);
            setCurrent(t);
            if (videoRef.current) videoRef.current.currentTime = t;
          }}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-[var(--brand)]"
        />

        <div className="mt-2 flex items-center gap-1">
          <IconBtn label="Back 5 seconds" onClick={() => seekBy(-5)}>
            <SkipBack className="h-4 w-4" />
          </IconBtn>
          <IconBtn label={playing ? "Pause" : "Play"} onClick={togglePlay} primary>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </IconBtn>
          <IconBtn label="Forward 5 seconds" onClick={() => seekBy(5)}>
            <SkipForward className="h-4 w-4" />
          </IconBtn>

          <div className="ml-2 flex items-center gap-2">
            <IconBtn label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((v) => !v)}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </IconBtn>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              aria-label="Volume"
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setMuted(Number(e.target.value) === 0);
              }}
              className="hidden h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/25 accent-[var(--brand)] sm:block"
            />
          </div>

          <span className="ml-2 hidden text-[11px] font-bold tabular-nums text-white/85 sm:inline">
            {fmt(current)} / {fmt(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {onAddBookmark && (
              <IconBtn label="Add bookmark" onClick={() => setBookmarkPrompt(true)}>
                <Bookmark className="h-4 w-4" />
              </IconBtn>
            )}
            {onAddNote && (
              <IconBtn label="Add note" onClick={() => setNotePrompt(true)}>
                <NotebookPen className="h-4 w-4" />
              </IconBtn>
            )}
            {(onAddNote || notes.length > 0) && (
              <IconBtn label="Toggle notes" active={notesOpen} onClick={() => setNotesOpen((v) => !v)}>
                <Captions className="h-4 w-4" />
              </IconBtn>
            )}
            <IconBtn label="Picture in picture" onClick={() => void togglePiP()} className="hidden sm:inline-flex">
              <PictureInPicture2 className="h-4 w-4" />
            </IconBtn>

            {/* Speed */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedOpen((v) => !v)}
                className="rounded-lg px-2 py-1 text-[11px] font-extrabold tabular-nums text-white/85 hover:bg-white/15"
              >
                {rate}×
              </button>
              {speedOpen && (
                <div className="absolute bottom-9 right-0 rounded-xl border border-white/10 bg-black/90 p-1 shadow-lift">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRate(r);
                        setSpeedOpen(false);
                      }}
                      className={cn(
                        "block w-full rounded-lg px-4 py-1.5 text-left text-[12px] font-bold text-white/80 hover:bg-white/15",
                        rate === r && "text-brand-fg",
                      )}
                    >
                      {r}×
                    </button>
                  ))}
                </div>
              )}
            </div>

            <IconBtn label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => void toggleFullscreen()}>
              {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  primary,
  active,
  className,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "rounded-full p-1.5 text-white/85 transition-colors hover:bg-white/15",
        primary && "bg-brand text-white hover:bg-brand-hover",
        active && "bg-white/15",
        className,
      )}
    >
      {children}
    </button>
  );
}

function PromptBar({
  label,
  multiline,
  onSubmit,
  onClose,
}: {
  label: string;
  multiline?: boolean;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="absolute inset-x-0 bottom-20 z-20 mx-auto flex w-[min(90%,28rem)] flex-col gap-2 rounded-2xl border border-white/10 bg-black/90 p-4 shadow-lift">
      <p className="text-[12px] font-bold text-white">{label}</p>
      {multiline ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          autoFocus
          className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/40 focus:border-brand focus:outline-none"
          placeholder="Write your note…"
        />
      ) : (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && draft.trim() && onSubmit(draft)}
          className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/40 focus:border-brand focus:outline-none"
          placeholder="e.g. Important explanation"
        />
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-white/60 hover:text-white">
          Cancel
        </button>
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={() => onSubmit(draft)}
          className="rounded-lg bg-brand px-4 py-1.5 text-[12px] font-bold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

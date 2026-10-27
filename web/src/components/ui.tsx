import Link from "next/link";
import { reveal } from "@/components/motion";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

/** Per-element transition delay for the reveal system (see `.rv` in globals.css). */
export const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Words (or letters) that rise through a mask when an ancestor `.rv` comes into view. */
export function Split({ text, by = "word", step = 45 }: { text: string; by?: "word" | "char"; step?: number }) {
  const parts = by === "char" ? [...text] : text.split(" ");
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          <span className="w">
            <span style={{ "--i": i, "--step": `${step}ms` } as CSSProperties}>{p}</span>
          </span>
          {by === "word" && i < parts.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[14px] uppercase text-white/85 ${className}`}>[ {children} ]</p>;
}

type ArrowButtonProps = { children: ReactNode; href?: string; className?: string } & ComponentProps<"button">;

/** Outlined split button: label cell + arrow cell, ruled top/bottom with corner ticks. */
export function ArrowButton({ children, href, className = "", ...rest }: ArrowButtonProps) {
  const inner = (
    <>
      <span className="tick flex h-full items-center px-[14px] pr-10 text-[16px] text-white/90 transition-colors group-hover:text-white">
        {children}
      </span>
      <span className="tick relative flex h-full w-12 items-center justify-center">
        <span className="tick-r absolute inset-0" aria-hidden />
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="arrow" aria-hidden>
          <path d="M1 8h13M8.5 2.5 14 8l-5.5 5.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </span>
    </>
  );
  const cls = `btn group inline-flex h-12 items-stretch border-y-[1.5px] border-white text-white disabled:cursor-not-allowed disabled:opacity-40 ${className}`;
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button className={cls} {...rest}>
      {inner}
    </button>
  );
}

const CORNERS = [
  ["-left-[7px] -top-[7px]", 0],
  ["-right-[7px] -top-[7px]", 160],
  ["-bottom-[7px] -left-[7px]", 160],
  ["-bottom-[7px] -right-[7px]", 320],
] as const;

/** Hairline box with "+" crosshairs on each corner. Draws itself in from the top-left on reveal. */
export function Frame({ children, className = "", bare = false, delay = 0 }: { children: ReactNode; className?: string; bare?: boolean; delay?: number }) {
  return (
    <div ref={reveal} className={`rv relative ${className}`} style={d(delay)}>
      {!bare && <span className="frame-lines" aria-hidden />}
      {CORNERS.map(([p, pd]) => (
        <span key={p} className={`frame-plus pointer-events-none absolute z-10 leading-none ${p}`} style={{ "--pd": `${pd}ms` } as CSSProperties}>
          <Plus />
        </span>
      ))}
      {children}
    </div>
  );
}

export function Plus({ className = "" }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" className={`block ${className}`} aria-hidden>
      <path d="M6.5 0v13M0 6.5h13" stroke="white" strokeWidth="1.3" />
    </svg>
  );
}

/** Looping wave footage, darkened so white type reads. Parent needs `relative isolate overflow-hidden`. */
export function VideoBg() {
  return (
    <div className="vid absolute inset-0 -z-10 bg-black bg-[url(/hero-poster.jpg)] bg-cover bg-center" aria-hidden>
      <video className="h-full w-full object-cover motion-reduce:hidden" src="/hero.mp4" poster="/hero-poster.jpg" autoPlay muted loop playsInline />
      <div className="absolute inset-0 bg-black/70" />
    </div>
  );
}

/** Diagonal X + vertical centre rule used behind hero and CTA. */
export function XLines({ className = "" }: { className?: string }) {
  return (
    <svg className={`xl pointer-events-none absolute inset-0 h-full w-full ${className}`} preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
      {[
        "M0 0 L100 100",
        "M100 0 L0 100",
        "M50 0 L50 100",
      ].map((d) => (
        <path key={d} d={d} stroke="white" strokeOpacity="0.22" strokeWidth="1.3" vectorEffect="non-scaling-stroke" fill="none" />
      ))}
    </svg>
  );
}

const COIN = [".XXXX.", "X....X", "X.XX.X", "X.XX.X", "X....X", ".XXXX."];

/** Pixel coin mark. */
export function PixelMark({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 6 6" shapeRendering="crispEdges" aria-hidden>
      {COIN.flatMap((row, y) => [...row].map((c, x) => (c === "X" ? <rect key={`${x}${y}`} x={x} y={y} width="1" height="1" fill="white" /> : null)))}
    </svg>
  );
}

export function OddsBar({ yes, className = "" }: { yes: number; className?: string }) {
  return (
    <div className={`flex h-1.5 w-full bg-no/80 ${className}`} role="img" aria-label={`Yes ${yes}%, No ${100 - yes}%`}>
      <div className="odds-fill h-full bg-yes" style={{ width: `${yes}%` }} />
    </div>
  );
}

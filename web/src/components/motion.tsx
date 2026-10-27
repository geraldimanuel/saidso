"use client";

import Lenis from "lenis";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

let io: IntersectionObserver | undefined;

/**
 * Ref callback for `.rv` elements: sets `data-in` once the element scrolls into view.
 * Runs after the element hydrates, so it never fights React over server-rendered attributes.
 */
export function reveal(el: HTMLElement | null) {
  if (!el) return;
  io ??= new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        (e.target as HTMLElement).dataset.in = "";
        io!.unobserve(e.target);
      }),
    { rootMargin: "0px 0px -10% 0px" },
  );
  io.observe(el);
  return () => io!.unobserve(el);
}

/** Tells the boot script in <head> that the app is alive, and turns on Lenis smooth scroll (off under reduced motion). */
export function Motion() {
  useEffect(() => {
    document.documentElement.dataset.motion = "ready";
    const lenis = new Lenis({ autoRaf: true, anchors: true, stopInertiaOnNavigate: true });
    return () => lenis.destroy();
  }, []);
  return null;
}

/** Counts up to `value` the first time it scrolls into view, keeping its decimal places. */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    const target = parseFloat(value);
    if (!el || reduced() || !Number.isFinite(target)) return setShown(value);
    const decimals = value.split(".")[1]?.length ?? 0;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min((t - start) / 1400, 1);
        setShown((target * easeOut(p)).toFixed(decimals));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    setShown((0).toFixed(decimals));
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums" aria-label={value}>
      {shown}
    </span>
  );
}

/** Heading whose words light up one by one as it scrolls through the viewport. `muted` words settle dimmer. */
export function Scrub({ muted, text, className = "" }: { muted: string; text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const words = [...muted.split(" ").map((w) => [w, true] as const), ...text.split(" ").map((w) => [w, false] as const)];

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = innerHeight;
      // 0 when the heading's top hits 90% of the viewport, 1 when it reaches 40%
      const p = Math.min(Math.max((vh * 0.9 - r.top) / (vh * 0.5), 0), 1);
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <h2 ref={ref} className={`scrub ${className}`} style={{ "--n": words.length } as CSSProperties}>
      {words.map(([w, dim], i) => (
        <span key={i} className={dim ? "text-white/45" : undefined}>
          <span style={{ "--i": i } as CSSProperties}>{w}</span>{" "}
        </span>
      ))}
    </h2>
  );
}

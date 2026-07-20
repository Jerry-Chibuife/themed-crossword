"use client";

import { useEffect, useState } from "react";
import { GAMEPLAY_TIPS } from "@/lib/gameplay-tips";

const TIP_INTERVAL_MS = 7500;
const TIP_FADE_MS = 750;

type GeneratingWaitProps = {
  status: string;
  detail: string;
};

export function GeneratingWait({ status, detail }: GeneratingWaitProps) {
  const [tipIndex, setTipIndex] = useState(
    () => Math.floor(Math.random() * GAMEPLAY_TIPS.length),
  );
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let fadeTimeout: number | undefined;
    const id = window.setInterval(() => {
      if (reduceMotion) {
        setTipIndex((i) => (i + 1) % GAMEPLAY_TIPS.length);
        return;
      }

      setVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setTipIndex((i) => (i + 1) % GAMEPLAY_TIPS.length);
        setVisible(true);
      }, TIP_FADE_MS);
    }, TIP_INTERVAL_MS);

    return () => {
      window.clearInterval(id);
      if (fadeTimeout !== undefined) window.clearTimeout(fadeTimeout);
    };
  }, []);

  const tip = GAMEPLAY_TIPS[tipIndex]!;

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 md:py-20">
      <div className="atmosphere" aria-hidden />
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          {status}
        </p>
        <p className="mt-3 text-[var(--ink-muted)]">{detail}</p>
        <div className="mx-auto mt-8 h-1 w-40 overflow-hidden rounded-full bg-black/10">
          <div className="progress-bar h-full w-1/2 rounded-full bg-[var(--accent)]" />
        </div>

        <div className="mt-14 w-full text-left">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
            How to play
          </p>
          <p
            className={`tip-fade mt-3 min-h-[4.5rem] text-base leading-relaxed text-[var(--ink)] ${
              visible ? "tip-fade-in" : "tip-fade-out"
            }`}
            aria-live="polite"
          >
            {tip}
          </p>
        </div>
      </div>
    </main>
  );
}

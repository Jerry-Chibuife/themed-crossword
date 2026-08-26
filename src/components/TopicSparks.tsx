"use client";

import { useEffect, useState } from "react";
import {
  isSparksCacheFresh,
  loadSparksCache,
  saveSparksCache,
} from "@/lib/topics/cache";
import { pickFallbackSparks } from "@/lib/topics/fallback";
import {
  CATEGORY_LABELS,
  TOPIC_SPARK_COUNT,
  type TopicSpark,
} from "@/lib/topics/types";

type TopicSparksProps = {
  selectedLabel: string | null;
  onSelect: (spark: TopicSpark) => void;
  disabled?: boolean;
};

type TopicsResponse = {
  sparks: TopicSpark[];
  meta?: { usedFixture?: boolean; cached?: boolean };
};

type LoadPhase = "loading" | "ready" | "reloading";

function readFreshCache(): TopicSpark[] | null {
  if (typeof window === "undefined") return null;
  if (!isSparksCacheFresh()) return null;
  return loadSparksCache();
}

async function fetchSparks(): Promise<TopicSpark[]> {
  const response = await fetch("/api/topics", { method: "POST" });
  const data = (await response.json()) as TopicsResponse;
  if (
    !response.ok ||
    !Array.isArray(data.sparks) ||
    data.sparks.length !== TOPIC_SPARK_COUNT ||
    data.meta?.usedFixture
  ) {
    throw new Error("Failed to load topic sparks");
  }
  return data.sparks;
}

export function TopicSparks({
  selectedLabel,
  onSelect,
  disabled = false,
}: TopicSparksProps) {
  const [sparks, setSparks] = useState<TopicSpark[]>(() => readFreshCache() ?? []);
  const [phase, setPhase] = useState<LoadPhase>(() =>
    readFreshCache() ? "ready" : "loading",
  );
  const [visible, setVisible] = useState(true);
  const [showingDefaults, setShowingDefaults] = useState(false);

  useEffect(() => {
    if (readFreshCache()) return;

    let cancelled = false;

    fetchSparks()
      .then((next) => {
        if (cancelled) return;
        saveSparksCache(next);
        setShowingDefaults(false);
        setVisible(false);
        window.setTimeout(() => {
          if (cancelled) return;
          setSparks(next);
          setVisible(true);
          setPhase("ready");
        }, 200);
      })
      .catch(() => {
        if (cancelled) return;
        setShowingDefaults(true);
        setSparks(pickFallbackSparks());
        setVisible(true);
        setPhase("ready");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleReload() {
    if (phase !== "ready" || disabled) return;
    setPhase("reloading");
    try {
      const next = await fetchSparks();
      saveSparksCache(next);
      setShowingDefaults(false);
      setVisible(false);
      window.setTimeout(() => {
        setSparks(next);
        setVisible(true);
        setPhase("ready");
      }, 200);
    } catch {
      setShowingDefaults(true);
      setSparks(pickFallbackSparks());
      setVisible(true);
      setPhase("ready");
    }
  }

  const buttonLabel =
    phase === "loading"
      ? "Loading"
      : phase === "reloading"
        ? "Reloading"
        : "Reload";

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
            Try one of these
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Fresh topic sparks — tap one, then generate.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0 px-3 py-1.5 text-sm"
          onClick={() => void handleReload()}
          disabled={phase !== "ready" || disabled}
        >
          {buttonLabel}
        </button>
      </div>

      {showingDefaults && phase === "ready" ? (
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Showing defaults — tap Reload to try again.
        </p>
      ) : null}

      {sparks.length > 0 ? (
        <ul
          className={`tip-fade mt-4 grid grid-cols-2 gap-2 ${
            visible ? "tip-fade-in" : "tip-fade-out"
          }`}
          aria-busy={phase === "loading" || phase === "reloading"}
        >
          {sparks.map((spark) => {
            const selected = selectedLabel === spark.label;
            return (
              <li key={`${spark.category}:${spark.label}`}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(spark)}
                  className={`h-full w-full rounded-md px-3 py-3 text-left transition-colors ${
                    selected
                      ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                      : "bg-white/50 text-[var(--ink)] hover:bg-black/5"
                  }`}
                >
                  <span className="block font-[family-name:var(--font-display)] text-base leading-snug tracking-tight sm:text-lg">
                    {spark.label}
                  </span>
                  <span className="mt-1 flex flex-col gap-0.5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
                      {CATEGORY_LABELS[spark.category]}
                    </span>
                    {spark.hook ? (
                      <span className="text-sm text-[var(--ink-muted)]">
                        {spark.hook}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div
          className="mt-4 grid grid-cols-2 gap-2"
          aria-busy={phase === "loading"}
          aria-label="Loading topic sparks"
        >
          {Array.from({ length: TOPIC_SPARK_COUNT }, (_, index) => (
            <div
              key={index}
              className="min-h-[5.5rem] rounded-md bg-black/[0.04]"
            />
          ))}
        </div>
      )}
    </div>
  );
}

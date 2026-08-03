"use client";

import { useEffect, useState } from "react";
import {
  isSparksCacheFresh,
  loadSparksCacheStale,
  saveSparksCache,
} from "@/lib/topics/cache";
import {
  defaultFallbackSparks,
  pickFallbackSparks,
} from "@/lib/topics/fallback";
import {
  CATEGORY_LABELS,
  type TopicSpark,
} from "@/lib/topics/types";

type TopicSparksProps = {
  selectedLabel: string | null;
  onSelect: (spark: TopicSpark) => void;
  disabled?: boolean;
};

type TopicsResponse = {
  sparks: TopicSpark[];
  meta?: { usedFixture?: boolean };
};

async function fetchSparks(): Promise<TopicSpark[]> {
  const response = await fetch("/api/topics", { method: "POST" });
  const data = (await response.json()) as TopicsResponse;
  if (!response.ok || !Array.isArray(data.sparks) || data.sparks.length !== 5) {
    throw new Error("Failed to load topic sparks");
  }
  return data.sparks;
}

export function TopicSparks({
  selectedLabel,
  onSelect,
  disabled = false,
}: TopicSparksProps) {
  const [sparks, setSparks] = useState<TopicSpark[]>(() => defaultFallbackSparks());
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cached = loadSparksCacheStale();
    if (cached) setSparks(cached);

    if (isSparksCacheFresh()) return;

    let cancelled = false;
    setBusy(true);
    fetchSparks()
      .then((next) => {
        if (cancelled) return;
        saveSparksCache(next);
        setVisible(false);
        window.setTimeout(() => {
          if (cancelled) return;
          setSparks(next);
          setVisible(true);
        }, 200);
      })
      .catch(() => {
        if (!cancelled && !loadSparksCacheStale()) {
          setSparks(pickFallbackSparks());
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRefresh() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const next = await fetchSparks();
      saveSparksCache(next);
      setVisible(false);
      window.setTimeout(() => {
        setSparks(next);
        setVisible(true);
      }, 200);
    } catch {
      // keep current slate
    } finally {
      setBusy(false);
    }
  }

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
          onClick={() => void handleRefresh()}
          disabled={busy || disabled}
        >
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <ul
        className={`tip-fade mt-4 flex flex-col gap-2 ${
          visible ? "tip-fade-in" : "tip-fade-out"
        }`}
      >
        {sparks.map((spark) => {
          const selected = selectedLabel === spark.label;
          return (
            <li key={`${spark.category}:${spark.label}`}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(spark)}
                className={`w-full rounded-md px-3 py-3 text-left transition-colors ${
                  selected
                    ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                    : "bg-white/50 text-[var(--ink)] hover:bg-black/5"
                }`}
              >
                <span className="block font-[family-name:var(--font-display)] text-lg leading-snug tracking-tight">
                  {spark.label}
                </span>
                <span className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
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
    </div>
  );
}

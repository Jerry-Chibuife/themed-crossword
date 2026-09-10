"use client";

import { useState } from "react";
import { TopicSparks } from "@/components/TopicSparks";
import type { TopicSpark } from "@/lib/topics/types";

type TopicFormProps = {
  onSubmit: (values: { topic: string; notes: string }) => void;
  busy?: boolean;
  error?: string | null;
};

export function TopicForm({
  onSubmit,
  busy = false,
  error = null,
}: TopicFormProps) {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  function handleSparkSelect(spark: TopicSpark) {
    setTopic(spark.label);
    setNotes(spark.hook ?? "");
    setSelectedLabel(spark.label);
    setCustomOpen(false);
  }

  return (
    <form
      className="flex w-full max-w-xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const nextTopic = topic.trim();
        if (!nextTopic) return;
        onSubmit({ topic: nextTopic, notes: notes.trim() });
      }}
    >
      <TopicSparks
        selectedLabel={selectedLabel}
        onSelect={handleSparkSelect}
        disabled={busy}
      />

      {selectedLabel ? (
        <p className="text-sm text-[var(--ink-muted)]">
          Selected:{" "}
          <span className="font-medium text-[var(--ink)]">{selectedLabel}</span>
        </p>
      ) : null}

      <div>
        <button
          type="button"
          className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          onClick={() => setCustomOpen((open) => !open)}
          disabled={busy}
        >
          {customOpen ? "Hide custom topic" : "Or type your own topic"}
        </button>

        {customOpen ? (
          <div className="mt-4 flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[var(--ink)]">Topic</span>
              <input
                name="topic"
                required
                maxLength={120}
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  setSelectedLabel(null);
                }}
                placeholder="Stormlight Archive, jazz history, Korean cuisine…"
                className="field"
                disabled={busy}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[var(--ink)]">
                Notes{" "}
                <span className="font-normal text-[var(--ink-muted)]">
                  (optional)
                </span>
              </span>
              <textarea
                name="notes"
                maxLength={2000}
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Paste a few facts or vocabulary to ground the clues."
                className="field min-h-24 resize-y"
                disabled={busy}
              />
            </label>
          </div>
        ) : (
          // Keep values in the form tree for submit when using a spark only.
          <>
            <input type="hidden" name="topic" value={topic} />
            <input type="hidden" name="notes" value={notes} />
          </>
        )}
      </div>

      {error ? (
        <p className="rounded-md border border-[var(--danger)]/30 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn-primary self-start"
        disabled={busy || !topic.trim()}
      >
        {busy ? "Generating…" : "Generate puzzle"}
      </button>
    </form>
  );
}

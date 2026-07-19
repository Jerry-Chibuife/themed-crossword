"use client";

type TopicFormProps = {
  onSubmit: (values: { topic: string; notes: string }) => void;
  busy?: boolean;
  error?: string | null;
  initialTopic?: string;
};

export function TopicForm({
  onSubmit,
  busy = false,
  error = null,
  initialTopic = "",
}: TopicFormProps) {
  return (
    <form
      className="flex w-full max-w-xl flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const topic = String(form.get("topic") ?? "").trim();
        const notes = String(form.get("notes") ?? "").trim();
        if (!topic) return;
        onSubmit({ topic, notes });
      }}
    >
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--ink)]">Topic</span>
        <input
          name="topic"
          required
          maxLength={120}
          defaultValue={initialTopic}
          placeholder="Stormlight Archive, jazz history, Korean cuisine…"
          className="field"
          disabled={busy}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--ink)]">
          Notes <span className="font-normal text-[var(--ink-muted)]">(optional)</span>
        </span>
        <textarea
          name="notes"
          maxLength={2000}
          rows={4}
          placeholder="Paste a few facts or vocabulary to ground the clues."
          className="field min-h-28 resize-y"
          disabled={busy}
        />
      </label>

      {error ? (
        <p className="rounded-md border border-[var(--danger)]/30 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary self-start" disabled={busy}>
        {busy ? "Generating…" : "Generate puzzle"}
      </button>
    </form>
  );
}

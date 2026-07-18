"use client";

import type { ClueEntry, Direction } from "@/lib/crossword/types";

type ClueListProps = {
  across: ClueEntry[];
  down: ClueEntry[];
  activeDir: Direction;
  activeNum: number | null;
  onSelect: (clue: ClueEntry, dir: Direction) => void;
  mobileTab: Direction;
  onMobileTabChange: (dir: Direction) => void;
};

function ClueButton({
  clue,
  dir,
  active,
  onSelect,
}: {
  clue: ClueEntry;
  dir: Direction;
  active: boolean;
  onSelect: (clue: ClueEntry, dir: Direction) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(clue, dir)}
      className={`w-full rounded-md px-2 py-1.5 text-left text-sm leading-snug transition-colors ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--ink)]"
          : "text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
      }`}
    >
      <span className="mr-2 font-[family-name:var(--font-display)] font-semibold text-[var(--ink)]">
        {clue.num}.
      </span>
      {clue.clue}
    </button>
  );
}

export function ClueList({
  across,
  down,
  activeDir,
  activeNum,
  onSelect,
  mobileTab,
  onMobileTabChange,
}: ClueListProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex gap-2 md:hidden">
        {(["across", "down"] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => onMobileTabChange(dir)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize ${
              mobileTab === dir
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "bg-black/5 text-[var(--ink-muted)]"
            }`}
          >
            {dir}
          </button>
        ))}
      </div>

      <div className="hidden min-h-0 flex-1 gap-6 overflow-hidden md:grid md:grid-cols-2">
        <section className="min-h-0 overflow-y-auto pr-1">
          <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)]">
            Across
          </h3>
          <ul className="space-y-0.5">
            {across.map((clue) => (
              <li key={`a-${clue.num}`}>
                <ClueButton
                  clue={clue}
                  dir="across"
                  active={activeDir === "across" && activeNum === clue.num}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </section>
        <section className="min-h-0 overflow-y-auto pr-1">
          <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)]">
            Down
          </h3>
          <ul className="space-y-0.5">
            {down.map((clue) => (
              <li key={`d-${clue.num}`}>
                <ClueButton
                  clue={clue}
                  dir="down"
                  active={activeDir === "down" && activeNum === clue.num}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto md:hidden">
        <ul className="space-y-0.5">
          {(mobileTab === "across" ? across : down).map((clue) => (
            <li key={`m-${mobileTab}-${clue.num}`}>
              <ClueButton
                clue={clue}
                dir={mobileTab}
                active={activeDir === mobileTab && activeNum === clue.num}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

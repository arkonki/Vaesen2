"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dices, History, Minus, Plus, RotateCcw, X } from "lucide-react";
import VaesenMark from "@/components/vaesen-mark";

type DiceRollerModalProps = {
  initialDiceCount: number;
  title?: string;
  triggerLabel?: string;
  triggerVariant?: "ledger" | "header";
};

const ROLL_ANIMATION_MS = 1200;
const ROLL_TICK_MS = 90;

function randomDie() {
  return Math.ceil(Math.random() * 6);
}

type RollHistoryEntry = {
  id: string;
  results: number[];
  successes: number;
  diceCount: number;
  pushed: boolean;
  timestamp: string;
};

export default function DiceRollerModal({
  initialDiceCount,
  title = "Vaesen Dice Roller",
  triggerLabel = "Open Dice Roller",
  triggerVariant = "ledger",
}: DiceRollerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [diceCount, setDiceCount] = useState(Math.max(0, initialDiceCount));
  const [results, setResults] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [rollCount, setRollCount] = useState(0);
  const [history, setHistory] = useState<RollHistoryEntry[]>([]);
  const [hasPushedCurrentRoll, setHasPushedCurrentRoll] = useState(false);
  const rollingIntervalRef = useRef<number | null>(null);
  const rollingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setDiceCount(Math.max(0, initialDiceCount));
  }, [initialDiceCount]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (rollingIntervalRef.current !== null) {
        window.clearInterval(rollingIntervalRef.current);
      }

      if (rollingTimeoutRef.current !== null) {
        window.clearTimeout(rollingTimeoutRef.current);
      }
    };
  }, []);

  const successes = useMemo(() => results.filter((value) => value === 6).length, [results]);
  const canPush =
    results.length === diceCount &&
    diceCount > 0 &&
    !hasPushedCurrentRoll &&
    !isRolling &&
    results.some((value) => value !== 6);

  function startAnimatedRoll(mode: "fresh" | "push") {
    if (diceCount <= 0 || isRolling) {
      return;
    }

    setIsRolling(true);

    const seed = mode === "push" && results.length === diceCount ? results : Array.from({ length: diceCount }, () => 1);
    const nextFrame = () =>
      seed.map((value) => (mode === "push" && value === 6 ? 6 : randomDie()));

    rollingIntervalRef.current = window.setInterval(() => {
      setResults(nextFrame());
    }, ROLL_TICK_MS);

    rollingTimeoutRef.current = window.setTimeout(() => {
      if (rollingIntervalRef.current !== null) {
        window.clearInterval(rollingIntervalRef.current);
      }

      const finalResults = nextFrame();
      setResults(finalResults);
      setRollCount((value) => value + 1);
      setHasPushedCurrentRoll(mode === "push");
      setHistory((current) => [
        {
          id: crypto.randomUUID(),
          results: finalResults,
          successes: finalResults.filter((value) => value === 6).length,
          diceCount,
          pushed: mode === "push",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        },
        ...current,
      ].slice(0, 12));
      setIsRolling(false);
    }, ROLL_ANIMATION_MS);
  }

  function handleRoll() {
    setHasPushedCurrentRoll(false);
    startAnimatedRoll("fresh");
  }

  function handlePushRoll() {
    if (!canPush) {
      return;
    }

    startAnimatedRoll("push");
  }

  function handleReset() {
    setDiceCount(Math.max(0, initialDiceCount));
    setResults([]);
    setRollCount(0);
    setIsRolling(false);
    setHasPushedCurrentRoll(false);
    setHistory([]);
  }

  return (
    <>
      <button
        type="button"
        className={`ledger-roll-trigger${triggerVariant === "header" ? " is-header" : ""}`}
        onClick={() => setIsOpen(true)}
      >
        <Dices className="h-4 w-4" />
        {triggerLabel}
      </button>

      {isOpen ? (
        <div className="dice-modal-backdrop" onClick={() => setIsOpen(false)} role="presentation">
          <div
            className="dice-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="dice-modal-header">
              <div>
                <p className="dice-modal-kicker">Shared Tool</p>
                <h2>{title}</h2>
              </div>

              <button type="button" className="dice-modal-close" onClick={() => setIsOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="dice-modal-controls">
              <div className="dice-count-stepper">
                <span className="dice-count-label">Dice Pool</span>
                <div className="dice-count-controls">
                  <button type="button" onClick={() => setDiceCount((value) => Math.max(0, value - 1))} disabled={isRolling}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="dice-count-value">{diceCount}</span>
                  <button type="button" onClick={() => setDiceCount((value) => value + 1)} disabled={isRolling}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="dice-modal-actions">
                <button type="button" className="dice-secondary-action" onClick={handleReset} disabled={isRolling}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
                <button type="button" className="dice-secondary-action" onClick={handlePushRoll} disabled={!canPush}>
                  <History className="h-4 w-4" />
                  Push Roll
                </button>
                <button type="button" className="dice-primary-action" onClick={handleRoll} disabled={isRolling || diceCount === 0}>
                  <Dices className="h-4 w-4" />
                  {isRolling ? "Rolling..." : "Roll Dice"}
                </button>
              </div>
            </div>

            <div className="dice-results-grid" aria-live="polite">
              {results.length > 0 ? (
                results.map((result, index) => (
                  <DieFace
                    key={`${rollCount}-${index}-${result}`}
                    value={result}
                    rolling={isRolling}
                  />
                ))
              ) : (
                <div className="dice-empty-state">
                  <Dices className="h-8 w-8" />
                  <p>Roll the current pool to reveal successes. A 6 shows the Vaesen mark.</p>
                </div>
              )}
            </div>

            <div className="dice-summary-strip">
              <div>
                <span className="dice-summary-label">Last Roll</span>
                <p className="dice-summary-value">{results.length > 0 ? `${results.length} dice` : "Not rolled"}</p>
              </div>
              <div>
                <span className="dice-summary-label">Successes</span>
                <p className="dice-summary-value">{successes}</p>
              </div>
              <div>
                <span className="dice-summary-label">Result</span>
                <p className="dice-summary-value">
                  {hasPushedCurrentRoll ? "Pushed" : successes > 0 ? "Hit" : results.length > 0 ? "Miss" : "-"}
                </p>
              </div>
            </div>

            <div className="dice-history">
              <div className="dice-history-header">
                <p className="dice-modal-kicker">Roll History</p>
                <p className="dice-history-note">Latest 12 results. Push rerolls only non-success dice and locks 6s.</p>
              </div>

              {history.length > 0 ? (
                <div className="dice-history-list">
                  {history.map((entry) => (
                    <article key={entry.id} className="dice-history-item">
                      <div>
                        <p className="dice-history-title">
                          {entry.diceCount} dice / {entry.successes} success{entry.successes === 1 ? "" : "es"}
                          {entry.pushed ? " / pushed" : ""}
                        </p>
                        <p className="dice-history-note">{entry.timestamp}</p>
                      </div>

                      <div className="dice-history-results">
                        {entry.results.map((value, index) => (
                          <span key={`${entry.id}-${index}`} className={`dice-history-pill${value === 6 ? " is-success" : ""}`}>
                            {value === 6 ? <VaesenMark className="h-3.5 w-3.5" /> : value}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dice-empty-history">No recorded rolls yet.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DieFace({ value, rolling }: { value: number; rolling: boolean }) {
  const isSuccess = value === 6;

  return (
    <div className={`die-face${rolling ? " is-rolling" : ""}${isSuccess ? " is-success" : ""}`}>
      {isSuccess ? <VaesenMark className="h-10 w-10" /> : <span>{value}</span>}
      <p>{isSuccess ? "Success" : `Rolled ${value}`}</p>
    </div>
  );
}

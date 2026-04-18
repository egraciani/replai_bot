"use client";
import { useEffect, useState } from "react";

const WORDS = ["cocinas", "vendes", "atiendes", "peinas", "creas"];
const TYPE_SPEED = 50;
const DELETE_SPEED = 30;
const PAUSE_MS = 1800;

export default function TypedTagline() {
  const [display, setDisplay] = useState(WORDS[0]);
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(WORDS[0].length);
  const [phase, setPhase] = useState<"pausing" | "deleting" | "typing">("pausing");

  useEffect(() => {
    const word = WORDS[wordIdx];

    if (phase === "pausing") {
      const t = setTimeout(() => setPhase("deleting"), PAUSE_MS);
      return () => clearTimeout(t);
    }

    if (phase === "deleting") {
      if (charIdx === 0) {
        setWordIdx((i) => (i + 1) % WORDS.length);
        setPhase("typing");
        return;
      }
      const t = setTimeout(() => {
        setCharIdx((c) => c - 1);
        setDisplay(word.slice(0, charIdx - 1));
      }, DELETE_SPEED);
      return () => clearTimeout(t);
    }

    if (phase === "typing") {
      const nextWord = WORDS[wordIdx];
      if (charIdx === nextWord.length) {
        setPhase("pausing");
        return;
      }
      const t = setTimeout(() => {
        setCharIdx((c) => c + 1);
        setDisplay(nextWord.slice(0, charIdx + 1));
      }, TYPE_SPEED);
      return () => clearTimeout(t);
    }
  }, [phase, charIdx, wordIdx]);

  return (
    <span className="relative inline-block" style={{ color: "#2D5A27" }}>
      {display}
      <span
        className="ml-0.5 inline-block w-0.5 h-[0.85em] align-middle animate-pulse"
        style={{ backgroundColor: "#2D5A27", verticalAlign: "middle" }}
        aria-hidden
      />
    </span>
  );
}

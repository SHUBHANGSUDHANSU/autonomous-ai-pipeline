import { useCallback, useEffect, useRef, useState } from "react";

export interface TypewriterResult {
  displayText: string;
  isDone: boolean;
  reset: () => void;
}

/**
 * Reveals text character by character at a fixed interval.
 */
export function useTypewriter(text: string, speed = 18): TypewriterResult {
  const [displayText, setDisplayText] = useState("");
  const [isDone, setIsDone] = useState(text.length === 0);
  const [resetVersion, setResetVersion] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const indexRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    indexRef.current = 0;
    setDisplayText("");
    setIsDone(text.length === 0);
    setResetVersion((version) => version + 1);
  }, [clearTimer, text.length]);

  useEffect(() => {
    clearTimer();
    indexRef.current = 0;
    setDisplayText("");
    setIsDone(text.length === 0);

    if (!text) {
      return undefined;
    }

    intervalRef.current = window.setInterval(() => {
      indexRef.current += 1;
      const nextText = text.slice(0, indexRef.current);
      setDisplayText(nextText);

      if (indexRef.current >= text.length) {
        clearTimer();
        setIsDone(true);
      }
    }, Math.max(1, speed));

    return clearTimer;
  }, [clearTimer, resetVersion, speed, text]);

  useEffect(() => clearTimer, [clearTimer]);

  return { displayText, isDone, reset };
}

"use client";

import { useEffect, useState } from "react";

function nextMonday(): number {
  const now = new Date();
  const result = new Date(now);
  const days = (8 - now.getUTCDay()) % 7 || 7;
  result.setUTCDate(now.getUTCDate() + days);
  result.setUTCHours(0, 5, 0, 0);
  return result.getTime();
}

export function Countdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, nextMonday() - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const seconds = Math.floor((remaining || 0) / 1000);
  const values = [
    ["days", Math.floor(seconds / 86400)],
    ["hours", Math.floor(seconds / 3600) % 24],
    ["min", Math.floor(seconds / 60) % 60],
    ["sec", seconds % 60],
  ] as const;
  return (
    <div className="countdown" aria-label="Time until next draw">
      {values.map(([label, value]) => (
        <div key={label}><strong>{remaining === null ? "--" : String(value).padStart(2, "0")}</strong><span>{label}</span></div>
      ))}
    </div>
  );
}

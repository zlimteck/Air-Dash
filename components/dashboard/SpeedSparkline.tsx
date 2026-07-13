"use client";

import { useEffect, useRef, useState } from "react";

interface Sample {
  read: number;
  write: number;
}

const MAX_SAMPLES = 40; // ~20 min at the 30s auto-refresh cadence

const WIDTH = 220;
const HEIGHT = 36;

function toPolyline(samples: Sample[], pick: (s: Sample) => number, max: number): string {
  if (samples.length < 2) return "";
  const step = WIDTH / (MAX_SAMPLES - 1);
  // Right-aligned: the latest sample sits at the right edge.
  const offset = WIDTH - (samples.length - 1) * step;
  return samples
    .map((sample, index) => {
      const x = offset + index * step;
      const y = HEIGHT - 2 - (max > 0 ? (pick(sample) / max) * (HEIGHT - 6) : 0);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Live speed history for one VPN session. Samples arrive as props each time
 * the dashboard auto-refreshes; the buffer lives in client state, which
 * React preserves across router.refresh() re-renders.
 */
export function SpeedSparkline({
  sessionKey,
  speedRead,
  speedWrite,
  fetchedAt,
}: {
  sessionKey: string;
  speedRead: number;
  speedWrite: number;
  /** Server render timestamp — changes every auto-refresh, so a sample is
   * recorded even when the speed values themselves are unchanged. */
  fetchedAt: number;
}) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const lastKey = useRef(sessionKey);

  useEffect(() => {
    // New connection under the same card position: restart the buffer.
    if (lastKey.current !== sessionKey) {
      lastKey.current = sessionKey;
      setSamples([{ read: speedRead, write: speedWrite }]);
      return;
    }
    setSamples((prev) => [...prev, { read: speedRead, write: speedWrite }].slice(-MAX_SAMPLES));
  }, [sessionKey, speedRead, speedWrite, fetchedAt]);

  if (samples.length < 2) return null;

  const max = Math.max(...samples.map((s) => Math.max(s.read, s.write)), 1);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-9 w-full max-w-56"
      role="img"
      aria-hidden="true"
    >
      <polyline
        points={toPolyline(samples, (s) => s.write, max)}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <polyline
        points={toPolyline(samples, (s) => s.read, max)}
        fill="none"
        stroke="var(--color-success)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
}

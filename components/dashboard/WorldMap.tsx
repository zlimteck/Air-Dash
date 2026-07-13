import {
  WORLD_LAND_PATH,
  WORLD_MAP_WIDTH,
  WORLD_MAP_HEIGHT,
  projectPoint,
} from "@/lib/geo/worldPath";
import { coordinatesForLocation } from "@/lib/geo/locations";

export interface MapSession {
  serverName: string;
  location: string | undefined;
  country: string | undefined;
}

export interface MapServerDot {
  location: string;
}

/**
 * Self-hosted SVG world map (Natural Earth 110m, generated at build time by
 * scripts/generateWorldPath.mjs) — no external tiles, tokens or requests,
 * so it works under the strict CSP and in both themes.
 */
export function WorldMap({
  sessions,
  serverLocations,
}: {
  sessions: MapSession[];
  serverLocations: string[];
}) {
  const uniqueLocations = [...new Set(serverLocations)];

  const activePoints = sessions.flatMap((session) => {
    const coords = coordinatesForLocation(session.location);
    if (!coords) return [];
    const [x, y] = projectPoint(coords[0], coords[1]);
    return [{ x, y, label: `${session.serverName} — ${session.location}, ${session.country}` }];
  });

  const activeLocationSet = new Set(sessions.map((s) => s.location).filter(Boolean));

  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <svg
        viewBox={`0 40 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT - 120}`}
        role="img"
        aria-label="VPN sessions map"
        className="block w-full min-w-[600px]"
      >
        <path
          d={WORLD_LAND_PATH}
          fill="var(--color-bg-subtle)"
          stroke="var(--color-border-strong)"
          strokeWidth={0.5}
        />

        {/* All AirVPN locations, muted */}
        {uniqueLocations.flatMap((location) => {
          if (activeLocationSet.has(location)) return [];
          const coords = coordinatesForLocation(location);
          if (!coords) return [];
          const [x, y] = projectPoint(coords[0], coords[1]);
          return [
            <circle
              key={location}
              cx={x}
              cy={y}
              r={3}
              fill="var(--color-text-muted)"
              opacity={0.45}
            >
              <title>{location}</title>
            </circle>,
          ];
        })}

        {/* Active sessions, highlighted with a pulse */}
        {activePoints.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r={10} fill="var(--color-accent)" opacity={0.25}>
              <animate attributeName="r" values="6;14;6" dur="2.5s" repeatCount="indefinite" />
              <animate
                attributeName="opacity"
                values="0.35;0.08;0.35"
                dur="2.5s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={point.x}
              cy={point.y}
              r={4.5}
              fill="var(--color-accent)"
              stroke="var(--color-surface)"
              strokeWidth={1.5}
            >
              <title>{point.label}</title>
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}

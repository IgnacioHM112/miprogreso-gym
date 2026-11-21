import type { ActivityPoint, ActivityType } from '@/db/activityRepo';

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Calcula la distancia en metros entre dos coordenadas usando la fórmula de Haversine */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export type GpsSample = {
  lat: number;
  lng: number;
  ts: number; // epoch ms
  accuracy?: number | null;
};

/**
 * Filtra lecturas GPS ruidosas o saltos imposibles:
 * - Descarta precisión > 25 m
 * - Descarta micro-movimientos < 1.5 m respecto al punto previo
 * - Descarta saltos imposibles > 12 m/s (~43.2 km/h) respecto al punto previo
 */
export function isValidGpsPoint(prev: GpsSample | null, next: GpsSample): boolean {
  if (next.accuracy != null && next.accuracy > 25) {
    return false;
  }
  if (!prev) {
    return true;
  }
  const distM = haversineMeters(prev.lat, prev.lng, next.lat, next.lng);
  if (distM < 1.5) {
    return false;
  }
  const dtSec = Math.max(0.5, (next.ts - prev.ts) / 1000);
  const speedMs = distM / dtSec;
  if (speedMs > 12) {
    return false;
  }
  return true;
}

/** Formatea un ritmo (segundos por km) como m:ss */
export function formatPace(secPerKm: number | null | undefined): string {
  if (secPerKm == null || !Number.isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 3600) {
    return '--:--';
  }
  const rounded = Math.round(secPerKm);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/** Formatea una duración en segundos como mm:ss o h:mm:ss */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/** Formatea metros como kilómetros con 2 decimales y coma decimal */
export function formatKm(meters: number): string {
  const km = Math.max(0, meters) / 1000;
  return km.toFixed(2).replace('.', ',');
}

/** Estima calorías quemadas según tipo, distancia (km) y peso corporal (kg) */
export function estimateKcal(type: ActivityType, distanceKm: number, weightKg: number): number {
  const factor = type === 'run' ? 1.036 : 0.72;
  return Math.max(0, Math.round(factor * weightKg * Math.max(0, distanceKm)));
}

/**
 * Sugiere cambiar el tipo de actividad si el ritmo medio corresponde claramente al otro modo:
 * - Si estaba en 'run' y el ritmo > 9:00/km (540 s/km) -> sugiere 'walk'
 * - Si estaba en 'walk' y el ritmo < 7:00/km (420 s/km) -> sugiere 'run'
 */
export function suggestActivityType(
  avgPaceSecKm: number | null | undefined,
  current: ActivityType
): ActivityType | null {
  if (avgPaceSecKm == null || !Number.isFinite(avgPaceSecKm) || avgPaceSecKm <= 0) {
    return null;
  }
  if (current === 'run' && avgPaceSecKm > 540) {
    return 'walk';
  }
  if (current === 'walk' && avgPaceSecKm < 420) {
    return 'run';
  }
  return null;
}

/** Convierte un ritmo (seg/km) en color de tramo (verde rápido -> amarillo -> naranja lento) */
export function paceToColor(paceSecKm: number | null | undefined, type: ActivityType): string {
  if (paceSecKm == null || !Number.isFinite(paceSecKm) || paceSecKm <= 0) {
    return '#C6F432';
  }
  if (type === 'run') {
    if (paceSecKm <= 330) return '#C6F432'; // <= 5:30 /km
    if (paceSecKm <= 450) return '#F5C542'; // <= 7:30 /km
    return '#FF8A3D';
  }
  // walk
  if (paceSecKm <= 600) return '#C6F432'; // <= 10:00 /km
  if (paceSecKm <= 780) return '#F5C542'; // <= 13:00 /km
  return '#FF8A3D';
}

function groupBySegment<T extends { segment: number }>(items: T[]): T[][] {
  const groups: T[][] = [];
  let currentSeg: number | null = null;
  for (const item of items) {
    if (currentSeg !== item.segment || groups.length === 0) {
      groups.push([item]);
      currentSeg = item.segment;
    } else {
      groups[groups.length - 1].push(item);
    }
  }
  return groups;
}

/** Construye un GeoJSON FeatureCollection de tramos LineString coloreados por ritmo */
export function buildPaceColoredRouteGeoJSON(
  points: ActivityPoint[],
  type: ActivityType
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const groups = groupBySegment(points);

  for (const seg of groups) {
    if (seg.length < 2) continue;

    // Acumular puntos en bloques de ~25m para suavizar fluctuaciones del ritmo instantáneo
    let blockStartIdx = 0;
    let blockDist = 0;

    for (let i = 1; i < seg.length; i++) {
      const prev = seg[i - 1];
      const curr = seg[i];
      blockDist += haversineMeters(prev.lat, prev.lng, curr.lat, curr.lng);

      const isEnd = i === seg.length - 1;
      if (blockDist >= 25 || isEnd) {
        const startPt = seg[blockStartIdx];
        const dtSec = Math.max(0.5, (curr.ts - startPt.ts) / 1000);
        let paceSecKm: number | null = null;
        if (blockDist >= 5) {
          paceSecKm = dtSec / (blockDist / 1000);
        } else if (curr.speed != null && curr.speed > 0.3) {
          paceSecKm = 1000 / curr.speed;
        }
        const color = paceToColor(paceSecKm, type);
        const coords: [number, number][] = [];
        for (let j = blockStartIdx; j <= i; j++) {
          coords.push([seg[j].lng, seg[j].lat]);
        }

        // Fusionar con la feature anterior del mismo segmento si comparte color
        const lastFeature = features[features.length - 1];
        if (
          lastFeature &&
          lastFeature.geometry.type === 'LineString' &&
          lastFeature.properties?.segment === seg[0].segment &&
          lastFeature.properties?.color === color
        ) {
          lastFeature.geometry.coordinates.push(...coords.slice(1));
        } else {
          features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: {
              color,
              paceSecKm: paceSecKm != null ? Math.round(paceSecKm) : null,
              segment: seg[0].segment,
            },
          });
        }

        blockStartIdx = i;
        blockDist = 0;
      }
    }
  }

  return { type: 'FeatureCollection', features };
}

/** Construye un GeoJSON FeatureCollection simple para mostrar la ruta en vivo */
export function buildLiveRouteGeoJSON(
  coords: { lat: number; lng: number; segment: number }[]
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const groups = groupBySegment(coords);

  for (const seg of groups) {
    if (seg.length < 2) continue;
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: seg.map((c) => [c.lng, c.lat]),
      },
      properties: { segment: seg[0].segment },
    });
  }

  return { type: 'FeatureCollection', features };
}

export type KmMarkerProperties = {
  km: number;
  elapsedSec: number;
  paceSecKm: number | null;
  label: string;
};

/** Genera puntos GeoJSON en cada kilómetro completo del recorrido */
export function buildKmMarkersGeoJSON(points: ActivityPoint[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const groups = groupBySegment(points);

  let totalDistM = 0;
  let totalMovingMs = 0;
  let nextKm = 1;
  let prevKmTimeSec = 0;

  for (const seg of groups) {
    for (let i = 1; i < seg.length; i++) {
      const a = seg[i - 1];
      const b = seg[i];
      const stepDist = haversineMeters(a.lat, a.lng, b.lat, b.lng);
      const stepMs = Math.max(0, b.ts - a.ts);

      while (stepDist > 0 && totalDistM + stepDist >= nextKm * 1000) {
        const needed = nextKm * 1000 - totalDistM;
        const ratio = Math.min(1, Math.max(0, needed / stepDist));
        const lat = a.lat + (b.lat - a.lat) * ratio;
        const lng = a.lng + (b.lng - a.lng) * ratio;
        const elapsedSec = Math.round((totalMovingMs + stepMs * ratio) / 1000);
        const paceSecKm = Math.max(1, elapsedSec - prevKmTimeSec);

        features.push({
          type: 'Feature',
          id: `km-${nextKm}`,
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            km: nextKm,
            elapsedSec,
            paceSecKm,
            label: String(nextKm),
          } satisfies KmMarkerProperties,
        });

        prevKmTimeSec = elapsedSec;
        nextKm += 1;
      }

      totalDistM += stepDist;
      totalMovingMs += stepMs;
    }
  }

  return { type: 'FeatureCollection', features };
}

export type RouteBounds = {
  sw: [number, number];
  ne: [number, number];
  center: [number, number];
  lngLatBounds: [number, number, number, number];
};

/** Calcula los límites geográficos del recorrido con un margen mínimo de seguridad */
export function computeRouteBounds(points: { lat: number; lng: number }[]): RouteBounds | null {
  if (points.length === 0) return null;

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const minSpan = 0.002;
  const latPad = Math.max((maxLat - minLat) * 0.12, minSpan / 2);
  const lngPad = Math.max((maxLng - minLng) * 0.12, minSpan / 2);

  const west = minLng - lngPad;
  const south = minLat - latPad;
  const east = maxLng + lngPad;
  const north = maxLat + latPad;

  return {
    sw: [west, south],
    ne: [east, north],
    center: [centerLng, centerLat],
    lngLatBounds: [west, south, east, north],
  };
}

/**
 * Calcula el mejor tiempo (en segundos) para cubrir una distancia objetivo (p. ej. 1000, 5000, 10000 m)
 * usando ventana deslizante sobre el tiempo y distancia activos (excluyendo pausas entre segmentos).
 */
export function bestEffortForDistance(
  points: ActivityPoint[],
  targetMeters: number
): number | null {
  if (points.length < 2 || targetMeters <= 0) return null;

  const groups = groupBySegment(points);
  const cumDist: number[] = [];
  const cumTimeSec: number[] = [];

  let totalDist = 0;
  let totalTimeSec = 0;

  for (const seg of groups) {
    if (seg.length === 0) continue;
    cumDist.push(totalDist);
    cumTimeSec.push(totalTimeSec);

    for (let i = 1; i < seg.length; i++) {
      const a = seg[i - 1];
      const b = seg[i];
      totalDist += haversineMeters(a.lat, a.lng, b.lat, b.lng);
      totalTimeSec += Math.max(0, (b.ts - a.ts) / 1000);
      cumDist.push(totalDist);
      cumTimeSec.push(totalTimeSec);
    }
  }

  if (totalDist < targetMeters || cumDist.length < 2) return null;

  let bestSec = Infinity;
  let left = 0;

  for (let right = 1; right < cumDist.length; right++) {
    while (left < right && cumDist[right] - cumDist[left] >= targetMeters) {
      const spanDist = cumDist[right] - cumDist[left];
      const spanTime = cumTimeSec[right] - cumTimeSec[left];
      if (spanDist > 0 && spanTime > 0) {
        const estimatedForTarget = spanTime * (targetMeters / spanDist);
        if (estimatedForTarget < bestSec) {
          bestSec = estimatedForTarget;
        }
      }
      left++;
    }
  }

  return Number.isFinite(bestSec) && bestSec > 0 ? Math.round(bestSec) : null;
}

export type ElevationProfile = {
  values: number[];
  minM: number;
  maxM: number;
  gainM: number;
  lossM: number;
};

/** Calcula estadísticas de elevación y una serie remuestreada para graficar el perfil altimétrico */
export function computeElevationProfile(
  points: ActivityPoint[],
  samples = 24
): ElevationProfile | null {
  const alts = points.map((p) => p.alt).filter((a): a is number => a != null && Number.isFinite(a));
  if (alts.length < 2) return null;

  let minM = alts[0];
  let maxM = alts[0];
  let gainM = 0;
  let lossM = 0;

  for (let i = 0; i < alts.length; i++) {
    const val = alts[i];
    if (val < minM) minM = val;
    if (val > maxM) maxM = val;

    if (i > 0) {
      const diff = val - alts[i - 1];
      if (diff > 0.5 && diff < 15) gainM += diff;
      else if (diff < -0.5 && diff > -15) lossM += -diff;
    }
  }

  const count = Math.max(2, samples);
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.min(alts.length - 1, Math.round((i * (alts.length - 1)) / (count - 1)));
    values.push(alts[idx]);
  }

  return {
    values,
    minM: Math.round(minM),
    maxM: Math.round(maxM),
    gainM: Math.round(gainM),
    lossM: Math.round(lossM),
  };
}

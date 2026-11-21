import Ionicons from '@expo/vector-icons/Ionicons';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import React, { Component, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import type { ActivityPoint, ActivityType } from '@/db/activityRepo';
import {
  buildKmMarkersGeoJSON,
  buildLiveRouteGeoJSON,
  buildPaceColoredRouteGeoJSON,
  computeRouteBounds,
  formatDuration,
  formatPace,
  KmMarkerProperties,
} from '@/services/geo';
import type { LiveCoord } from '@/stores/runStore';
import { C, F, R } from '@/theme';

const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

let MapLibre: typeof import('@maplibre/maplibre-react-native') | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    MapLibre = require('@maplibre/maplibre-react-native');
  } catch {
    MapLibre = null;
  }
}

class MapErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

type RouteMapProps = {
  mode: 'live' | 'summary';
  type: ActivityType;
  points?: ActivityPoint[];
  liveCoords?: LiveCoord[];
  height?: number;
};

export function RouteMap({
  mode,
  type,
  points = [],
  liveCoords = [],
  height = 260,
}: RouteMapProps) {
  const cameraRef = useRef<CameraRef | null>(null);
  const [selectedKm, setSelectedKm] = useState<KmMarkerProperties | null>(null);

  const liveGeoJSON = useMemo(() => buildLiveRouteGeoJSON(liveCoords), [liveCoords]);
  const summaryRouteGeoJSON = useMemo(
    () => (mode === 'summary' ? buildPaceColoredRouteGeoJSON(points, type) : null),
    [mode, points, type]
  );
  const kmMarkersGeoJSON = useMemo(
    () => (mode === 'summary' ? buildKmMarkersGeoJSON(points) : null),
    [mode, points]
  );

  const endpointsGeoJSON = useMemo((): GeoJSON.FeatureCollection | null => {
    const src = mode === 'live' ? liveCoords : points;
    if (src.length === 0) return null;
    const first = src[0];
    const last = src[src.length - 1];
    const features: GeoJSON.Feature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [first.lng, first.lat] },
        properties: { role: 'start' },
      },
    ];
    if (src.length > 1) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [last.lng, last.lat] },
        properties: { role: 'end' },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [mode, liveCoords, points]);

  const summaryBounds = useMemo(
    () => (mode === 'summary' ? computeRouteBounds(points) : null),
    [mode, points]
  );

  const lastLive = liveCoords.length > 0 ? liveCoords[liveCoords.length - 1] : null;
  const lastLiveLat = lastLive?.lat ?? null;
  const lastLiveLng = lastLive?.lng ?? null;

  useEffect(() => {
    if (mode !== 'live' || lastLiveLat == null || lastLiveLng == null) return;
    cameraRef.current?.easeTo({
      center: [lastLiveLng, lastLiveLat],
      zoom: 16,
      duration: 450,
    });
  }, [mode, lastLiveLat, lastLiveLng]);

  const pointCount = mode === 'live' ? liveCoords.length : points.length;

  const fallbackView = (
    <View style={[s.fallbackBox, { height }]}>
      <Ionicons name="map-outline" size={28} color={C.primary} />
      <T bold size={14}>
        {pointCount > 0 ? `${pointCount} puntos GPS registrados` : 'Esperando señal GPS...'}
      </T>
      <T muted size={12} style={{ textAlign: 'center', paddingHorizontal: 16 }}>
        {Platform.OS === 'web'
          ? 'El mapa interactivo está disponible en la app móvil Android.'
          : 'El mapa nativo requiere el build de desarrollo/APK con MapLibre.'}
      </T>
    </View>
  );

  if (!MapLibre?.Map || !MapLibre?.Camera || !MapLibre?.GeoJSONSource || !MapLibre?.Layer) {
    return fallbackView;
  }

  if (mode === 'live' && liveCoords.length === 0) {
    return (
      <View style={[s.fallbackBox, { height }]}>
        <Ionicons name="navigate-outline" size={26} color={C.primary} />
        <T bold size={14}>Esperando señal GPS...</T>
        <T muted size={12}>El recorrido aparecerá aquí en cuanto se fije tu ubicación.</T>
      </View>
    );
  }

  if (mode === 'summary' && (!summaryBounds || points.length === 0)) {
    return (
      <View style={[s.fallbackBox, { height }]}>
        <Ionicons name="map-outline" size={26} color={C.muted} />
        <T bold size={14}>Sin recorrido GPS guardado</T>
        <T muted size={12}>No se registraron suficientes puntos durante esta salida.</T>
      </View>
    );
  }

  const { Map, Camera, GeoJSONSource, Layer } = MapLibre;

  const handleRecenterSummary = () => {
    if (!summaryBounds) return;
    cameraRef.current?.fitBounds(summaryBounds.lngLatBounds, {
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      duration: 400,
    });
  };

  return (
    <MapErrorBoundary fallback={fallbackView}>
      <View style={[s.wrapper, { height }]}>
        <Map
          mapStyle={MAP_STYLE_DARK}
          style={s.map}
          logo={false}
          compass={false}
          attributionPosition={{ bottom: 6, left: 6 }}
        >
          {mode === 'live' && lastLive ? (
            <Camera
              ref={cameraRef}
              initialViewState={{
                center: [lastLive.lng, lastLive.lat],
                zoom: 16,
              }}
              maxZoom={19}
            />
          ) : summaryBounds ? (
            <Camera
              ref={cameraRef}
              initialViewState={{
                bounds: summaryBounds.lngLatBounds,
                padding: { top: 36, right: 36, bottom: 36, left: 36 },
              }}
              maxZoom={18}
            />
          ) : null}

          {/* Ruta en vivo */}
          {mode === 'live' && (
            <GeoJSONSource id="live-route-source" data={liveGeoJSON}>
              <Layer
                id="live-route-line"
                type="line"
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{
                  'line-color': C.primary,
                  'line-width': 4.5,
                }}
              />
            </GeoJSONSource>
          )}

          {/* Ruta coloreada por ritmo en resumen */}
          {mode === 'summary' && summaryRouteGeoJSON && (
            <GeoJSONSource id="pace-route-source" data={summaryRouteGeoJSON}>
              <Layer
                id="pace-route-line"
                type="line"
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{
                  'line-color': ['get', 'color'],
                  'line-width': 5,
                }}
              />
            </GeoJSONSource>
          )}

          {/* Puntos de inicio y fin */}
          {endpointsGeoJSON && (
            <GeoJSONSource id="endpoints-source" data={endpointsGeoJSON}>
              <Layer
                id="endpoints-circle"
                type="circle"
                paint={{
                  'circle-radius': [
                    'match',
                    ['get', 'role'],
                    'start',
                    mode === 'live' ? 5 : 6,
                    mode === 'live' ? 7 : 6,
                  ],
                  'circle-color': [
                    'match',
                    ['get', 'role'],
                    'start',
                    mode === 'live' ? C.bg : C.primary,
                    mode === 'live' ? C.primary : C.text,
                  ],
                  'circle-stroke-width': 2.5,
                  'circle-stroke-color': mode === 'live' ? C.primary : C.bg,
                }}
              />
            </GeoJSONSource>
          )}

          {/* Marcadores interactivos por km en resumen */}
          {mode === 'summary' && kmMarkersGeoJSON && kmMarkersGeoJSON.features.length > 0 && (
            <GeoJSONSource
              id="km-markers-source"
              data={kmMarkersGeoJSON}
              hitbox={{ top: 18, right: 18, bottom: 18, left: 18 }}
              onPress={(event) => {
                event.stopPropagation();
                const feature = event.nativeEvent.features?.[0];
                const props = feature?.properties as KmMarkerProperties | undefined;
                if (props && typeof props.km === 'number') {
                  setSelectedKm(props);
                }
              }}
            >
              <Layer
                id="km-markers-circle"
                type="circle"
                paint={{
                  'circle-radius': 10,
                  'circle-color': C.text,
                  'circle-stroke-width': 2,
                  'circle-stroke-color': C.bg,
                }}
              />
              <Layer
                id="km-markers-label"
                type="symbol"
                layout={{
                  'text-field': ['get', 'label'],
                  'text-font': ['Noto Sans Regular'],
                  'text-size': 11,
                  'text-allow-overlap': true,
                }}
                paint={{
                  'text-color': C.bg,
                }}
              />
            </GeoJSONSource>
          )}
        </Map>

        {/* Overlays de resumen */}
        {mode === 'summary' && (
          <>
            {/* Botón recentrar */}
            <Pressable onPress={handleRecenterSummary} style={s.recenterBtn} hitSlop={8}>
              <Ionicons name="locate-outline" size={18} color={C.text} />
            </Pressable>

            {/* Tooltip del km tocado */}
            {selectedKm && (
              <Pressable onPress={() => setSelectedKm(null)} style={s.kmTooltip}>
                <View>
                  <T size={12} bold style={{ color: C.primary }}>
                    Km {selectedKm.km}
                  </T>
                  <T size={11} style={{ fontFamily: F.num }}>
                    {formatPace(selectedKm.paceSecKm)}/km · {formatDuration(selectedKm.elapsedSec)}
                  </T>
                </View>
                <Ionicons name="close" size={14} color={C.muted} />
              </Pressable>
            )}

            {/* Leyenda de ritmos */}
            <View style={s.legend}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#C6F432' }]} />
                <T size={10} muted>rápido</T>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#F5C542' }]} />
                <T size={10} muted>medio</T>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#FF8A3D' }]} />
                <T size={10} muted>lento</T>
              </View>
            </View>
          </>
        )}
      </View>
    </MapErrorBoundary>
  );
}

const s = StyleSheet.create({
  wrapper: {
    borderRadius: R.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fallbackBox: {
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 16,
  },
  recenterBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.bg + 'DD',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kmTooltip: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.bg + 'EB',
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legend: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bg + 'DD',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});

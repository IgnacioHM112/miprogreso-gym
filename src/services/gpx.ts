import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Activity, ActivityPoint } from '@/db/activityRepo';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Construye el contenido XML GPX 1.1 de una actividad y sus puntos GPS */
export function buildGpxXml(activity: Activity, points: ActivityPoint[]): string {
  const title = activity.title || (activity.type === 'run' ? 'Carrera' : 'Caminata');
  const gpxType = activity.type === 'run' ? 'running' : 'walking';

  const segments: ActivityPoint[][] = [];
  let currentSeg: number | null = null;
  for (const pt of points) {
    if (currentSeg !== pt.segment || segments.length === 0) {
      segments.push([pt]);
      currentSeg = pt.segment;
    } else {
      segments[segments.length - 1].push(pt);
    }
  }

  const segXml = segments
    .map((seg) => {
      const pts = seg
        .map((p) => {
          const ele = p.alt != null ? `<ele>${p.alt.toFixed(1)}</ele>` : '';
          const time = `<time>${new Date(p.ts).toISOString()}</time>`;
          return `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">${ele}${time}</trkpt>`;
        })
        .join('\n');
      return `    <trkseg>\n${pts}\n    </trkseg>`;
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="MiProgreso Gym" xmlns="http://www.topografix.com/GPX/1/1">',
    '  <metadata>',
    `    <name>${escapeXml(title)}</name>`,
    `    <time>${escapeXml(activity.started_at)}</time>`,
    '  </metadata>',
    '  <trk>',
    `    <name>${escapeXml(title)}</name>`,
    `    <type>${gpxType}</type>`,
    segXml,
    '  </trk>',
    '</gpx>',
  ].join('\n');
}

/** Genera un archivo .gpx temporal y abre el selector nativo para compartirlo/guardarlo */
export async function exportActivityGpx(
  activity: Activity,
  points: ActivityPoint[]
): Promise<{ success: boolean; message: string }> {
  if (Platform.OS === 'web') {
    return { success: false, message: 'La exportación GPX está disponible solo en Android.' };
  }
  if (points.length === 0) {
    return { success: false, message: 'No hay puntos GPS registrados en esta actividad.' };
  }

  try {
    const gpxXml = buildGpxXml(activity, points);
    const d = new Date(activity.started_at);
    const dateTag = Number.isNaN(d.getTime())
      ? String(activity.id)
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    const fileName = `miprogreso_${activity.type}_${dateTag}.gpx`;
    const targetDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

    if (!targetDir) {
      return { success: false, message: 'No se pudo acceder al almacenamiento del dispositivo.' };
    }

    const filePath = `${targetDir}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, gpxXml, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/gpx+xml',
        dialogTitle: 'Exportar recorrido GPX',
      });
    }

    return { success: true, message: 'Archivo GPX generado con éxito.' };
  } catch (error: any) {
    return {
      success: false,
      message: `No se pudo exportar el GPX: ${error?.message || 'Error desconocido'}`,
    };
  }
}

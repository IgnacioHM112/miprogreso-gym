import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, T } from '@/components/ui';
import { getMonthSessions } from '@/db/repo';
import { vibrateImpact } from '@/services/notifications';
import { C, F, R, WEEKDAYS_SHORT } from '@/theme';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Lunes primero: [1, 2, 3, 4, 5, 6, 0]
const CALENDAR_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export type MonthCalendarProps = {
  onSelectDateSession?: (sessionId: number) => void;
};

export function MonthCalendar({ onSelectDateSession }: MonthCalendarProps) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  // Sesiones de este mes
  const monthSessions = useMemo(() => {
    return getMonthSessions(year, month);
  }, [year, month]);

  // Mapear por fecha YYYY-MM-DD
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, { id: number; routine_name: string | null }>();
    monthSessions.forEach((s) => {
      const dayKey = s.date.substring(0, 10);
      map.set(dayKey, { id: s.id, routine_name: s.routine_name });
    });
    return map;
  }, [monthSessions]);

  const changeMonth = (delta: number) => {
    vibrateImpact();
    setCurrentDate(new Date(year, currentDate.getMonth() + delta, 1));
  };

  // Armar cuadrícula de días
  const daysGrid = useMemo(() => {
    const firstDayIndex = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 0 para Lunes
    const daysInMonth = new Date(year, month, 0).getDate();

    const cells: ({ dayNum: number; dateKey: string } | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNum: d, dateKey });
    }
    return cells;
  }, [year, month]);

  const selectedSession = selectedDayKey ? sessionsByDate.get(selectedDayKey) : null;

  return (
    <Card style={{ gap: 14 }}>
      {/* Navegación del mes */}
      <View style={s.navRow}>
        <Pressable onPress={() => changeMonth(-1)} hitSlop={10} style={s.navBtn}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <T size={17} bold style={{ fontFamily: F.bold }}>
          {MONTH_NAMES[month - 1]} {year}
        </T>
        <Pressable onPress={() => changeMonth(1)} hitSlop={10} style={s.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={C.text} />
        </Pressable>
      </View>

      {/* Cabecera de días de la semana */}
      <View style={s.gridRow}>
        {CALENDAR_HEADERS.map((h, i) => (
          <View key={i} style={s.headerCell}>
            <T size={12} muted bold style={{ textAlign: 'center' }}>
              {h}
            </T>
          </View>
        ))}
      </View>

      {/* Cuadrícula del mes */}
      <View style={s.daysGrid}>
        {daysGrid.map((c, idx) => {
          if (!c) {
            return <View key={`empty_${idx}`} style={s.dayCell} />;
          }

          const hasWorkout = sessionsByDate.has(c.dateKey);
          const isSelected = selectedDayKey === c.dateKey;
          const isToday =
            c.dateKey ===
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

          return (
            <Pressable
              key={c.dateKey}
              onPress={() => {
                vibrateImpact();
                setSelectedDayKey(c.dateKey);
              }}
              style={[
                s.dayCell,
                isSelected && s.dayCellSelected,
                hasWorkout && !isSelected && s.dayCellWorkout,
              ]}
            >
              <T
                size={13}
                style={[
                  { fontFamily: F.num },
                  hasWorkout && isSelected && { color: C.onPrimary, fontFamily: F.bold },
                  hasWorkout && !isSelected && { color: C.primary, fontFamily: F.bold },
                  isToday && !hasWorkout && { color: C.primary },
                  !hasWorkout && !isToday && { color: C.text },
                ]}
              >
                {c.dayNum}
              </T>
              {hasWorkout && (
                <View
                  style={[
                    s.dotIndicator,
                    isSelected ? { backgroundColor: C.onPrimary } : { backgroundColor: C.primary },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Información del día seleccionado */}
      {selectedDayKey && (
        <View style={s.dayDetailBox}>
          {selectedSession ? (
            <Pressable
              onPress={() => onSelectDateSession?.(selectedSession.id)}
              style={s.sessionRow}
            >
              <View style={s.sessionIcon}>
                <Ionicons name="barbell" size={18} color={C.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <T size={11} muted style={{ textTransform: 'uppercase' }}>
                  {selectedDayKey} · ENTRENADO
                </T>
                <T size={15} bold>{selectedSession.routine_name}</T>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <T size={12} bold style={{ color: C.primary }}>Ver detalle</T>
                <Ionicons name="chevron-forward" size={16} color={C.primary} />
              </View>
            </Pressable>
          ) : (
            <View style={{ paddingVertical: 4 }}>
              <T size={13} muted style={{ textAlign: 'center' }}>
                Sin entrenamientos registrados el {selectedDayKey}
              </T>
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    padding: 8,
    borderRadius: R.sm,
    backgroundColor: C.cardAlt,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  headerCell: {
    width: '14.2%',
    alignItems: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: R.sm,
    marginVertical: 2,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: C.primary,
  },
  dayCellWorkout: {
    backgroundColor: C.primary + '18',
    borderWidth: 1,
    borderColor: C.primary + '44',
  },
  dotIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  dayDetailBox: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.cardAlt,
    padding: 12,
    borderRadius: R.md,
  },
  sessionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

# CONTEXT.md — MiProgreso Gym

> Archivo de contexto para agentes/desarrolladores. **Actualizar en cada cambio relevante.**
> Idioma del usuario: español (Argentina). Responder siempre en español.

## Producto
App móvil personal (Android + iOS) para registrar rutina de gimnasio. Gratis, sin suscripciones, **offline-first** (solo almacenamiento local + backup JSON exportable). Nombre: **MiProgreso Gym**.
- **Repositorio GitHub:** https://github.com/IgnacioHM112/miprogreso-gym
- **Ubicación local:** `C:\Users\ignam\Desktop\Proyectos\miprogreso-gym`



## Stack
- React Native + Expo SDK 57, TypeScript, Expo Router (rutas en `src/app/`)
- `expo-sqlite` (API síncrona) — DB `gym.db`
- Zustand (estado), `expo-haptics`, `expo-notifications`, `expo-file-system`, `expo-sharing`, `expo-document-picker`
- GPS & Mapas (Android): `expo-location`, `expo-task-manager`, `@maplibre/maplibre-react-native` (estilo oscuro OpenFreeMap sin API key)
- drizzle-orm instalado pero **no usado** (SQL directo)
- Alias `@/` → `src/`

## Decisiones tomadas
| Tema | Decisión |
|---|---|
| Unidades | kg |
| Tipos de ejercicio | `weight` (peso × reps) y `time` (segundos): calentamiento, elongación, plancha, cardio |
| Rutinas | **Totalmente editables y en cantidad libre** (2, 3, 5…). Cada rutina tiene nombre y días sugeridos opcionales. "Hoy" sugiere la rutina del día; el usuario puede elegir otra desde un bottom sheet "Cambiar rutina" |
| Meta semanal | Configurable (`settings.weekly_goal`, default 3) |
| Resumen semanal | Requerido: días que fue, volumen, rutinas hechas |
| Sync nube | No. Arquitectura permite agregarla luego |
| Estilo visual | **Opción 1 "Lima eléctrica"**: bg `#121417`, card `#1C1F24`, texto `#E6E8EB`, muted `#8A9099`, primario `#C6F432` (texto sobre primario `#121417`). Tipografía Inter + Space Grotesk (números). Tarjetas redondeadas (radio 20-24), botones grandes. Mockup: brain/.../mockups_hoy.html |
| Input de peso/reps | **Evitar escribir:** Incorporar selector interactivo táctil (Bottom sheet con rueda/picker y botones de ajuste rápido de discos: `+1.25`, `+2.5`, `+5`, `+10kg`) para cargar peso y reps con un solo toque sin abrir el teclado. |


## Estructura
- `src/theme.ts` — colores `C`, fuentes `F`, radios `R`, nombres de días
- `src/components/ui.tsx` — `Card`, `T` (texto), `Btn` (primary/outline/danger), `Input`
- `src/components/RestTimerBar.tsx` — barra flotante de descanso (cuenta regresiva, +15s/-15s, saltar; texto truncado y safe-area)
- `src/components/RouteMap.tsx` — mapa interactivo MapLibre (modo en vivo y resumen coloreado por ritmo con marcadores por km tocables y fallback defensivo)
- `src/components/MonthCalendar.tsx` — calendario mensual interactivo con marcas de entrenamientos y salidas GPS en color Lima
- `src/components/SessionDetailModal.tsx` — modal con desglose completo serie por serie, kilos, reps y notas
- `src/components/ProgressionChartModal.tsx` — gráfico de barras interactivo de evolución cronológica y cálculo de 1RM
- `src/components/AddWeightModal.tsx` — modal táctil de registro rápido de peso corporal (con chips +-1kg, fecha y visualización)
- `src/components/BodyWeightSection.tsx` — sección completa de evolución de peso: resumen con delta/mín/máx, gráfico interactivo e historial con eliminación
- `src/services/notifications.ts` — haptics para series/descanso, canales Android `rest-alarm-v1` / `rest-vibrate-v1` con sonido `rest_alarm.wav`, vibración intensa, prueba de alarma y recordatorios semanales
- `src/services/geo.ts` — Haversine, filtro GPS, formato de ritmo/duración/km, kcal, sugerencia Correr↔Caminar, colores por ritmo, GeoJSON de ruta/marcadores km, PRs con ventana deslizante y perfil de elevación
- `src/services/backgroundLocation.ts` — tarea `miprogreso-background-location` (`expo-task-manager` + `expo-location`) para foreground service Android
- `src/services/gpx.ts` — generación y compartición de archivos GPX 1.1 (`expo-file-system/legacy` + `expo-sharing`)
- `src/services/backup.ts` — exportación e importación completa de base de datos a archivo JSON (`expo-file-system`, `expo-sharing`, `expo-document-picker`)
- `src/stores/workoutStore.ts` — store Zustand para sesión activa, series, cronómetro y timer
- `src/stores/runStore.ts` — store Zustand para modo runner (GPS en vivo/segundo plano, auto-pausa, auto-splits 1 km, vueltas manuales, recuperación tras cierre)
- `src/db/database.ts` — `db`, `initDb()` (tablas de gym + `activity`, `activity_point`, `activity_lap` + seed), `estimate1RM()`
- `src/db/repo.ts` — queries de gym, meta semanal y días entrenados (incluyendo salidas GPS), ajustes (`rest_alarm_sound`, `auto_pause_enabled`), backup JSON v2 y reset
- `src/db/activityRepo.ts` — CRUD de actividades GPS, puntos, parciales, estadísticas semanales, barras diarias, calendario mensual y PRs (1K/5K/10K/más larga)
- `src/data/tips.ts` — consejos locales + `tipOfTheDay()`
- `assets/sounds/rest_alarm.wav` — tono de alarma personalizado para el fin del descanso
- `src/app/_layout.tsx` — Stack raíz, registro de tarea background GPS, recuperación de actividad sin finalizar, fuentes Inter/SpaceGrotesk, `initDb()`, rutas
- `src/app/(tabs)/_layout.tsx` — Tabs: Hoy · Rutinas · Correr · Progreso · Ajustes (Ionicons)
- `src/app/(tabs)/index.tsx` — **Hoy**: banner entrenamiento en curso, mini semana, meta semanal, días desde último, rutina sugerida/elegida, bottom sheet "Cambiar rutina", consejo del día
- `src/app/(tabs)/rutinas.tsx` — lista + crear rutina
- `src/app/(tabs)/correr.tsx` — **Correr**: selector Correr/Caminar, estado GPS, toggle auto-pausa, resumen semanal con barras L–D, PRs (1K/5K/10K/más larga) e historial de salidas
- `src/app/rutina/[id].tsx` — editar nombre, días sugeridos, ejercicios (series/reps o tiempo/descanso, reordenar ↑↓, borrar), eliminar rutina
- `src/app/biblioteca.tsx` — modal; buscar, filtrar por grupo, crear ejercicio propio, soporte para agregar a rutina o a entrenamiento activo en curso
- `src/app/entrenamiento.tsx` — **Entrenamiento activo**: cronómetro en tiempo real, celdas táctiles con selector de discos y reps sin teclado (ValuePickerSheet), referencia de "la última vez", botón check ✓ con vibración, descanso automático con aviso sonoro/haptic, agregar/quitar series, notas y modal de felicitación con volumen total
- `src/app/carrera.tsx` — **Actividad en vivo**: distancia grande, tiempo activo, ritmo actual/medio, kcal/desnivel, mapa en vivo expandible, indicador de segundo plano/auto-pausa, vuelta manual, pausa/reanudación y sugerencia Correr↔Caminar al finalizar
- `src/app/actividad/[id].tsx` — **Detalle de actividad**: mapa interactivo MapLibre coloreado por ritmo con marcadores por km tocables, métricas, parciales, perfil de elevación, exportación GPX y eliminación
- `src/app/(tabs)/progreso.tsx` — **Progreso**: 3 vistas seleccionables (Calendario & Historial con salidas GPS, Récords & 1RM, y **Peso Corporal** con gráfico e historial)
- `src/app/(tabs)/ajustes.tsx` — **Ajustes**: meta semanal (1-7), descanso predeterminado (45s-180s), respuesta táctil ON/OFF, alarma sonora de descanso ON/OFF + botón Probar alarma, recordatorios locales semanales y horarios, Backup & Restore JSON v2 (exportar/importar), botón "Vaciar todos los registros" y link a GitHub.

## Estado / Roadmap
- [x] Fase 0: setup, dependencias, esquema DB
- [x] Fase 1: tema Lima, Hoy (+bottom sheet, mini semana, meta, días desde último, consejo), Rutinas CRUD, Biblioteca
- [x] Fase 2: entrenamiento activo completo, cronómetro continuo, registro de series y pesos, "la última vez", timer de descanso automático con haptics/notificaciones, agregar ejercicios al vuelo, resumen al finalizar
- [x] Fase 3: historial de sesiones, resumen semanal detallado, **calendario mensual integrado**, gráficos de progreso por ejercicio, PRs y 1RM estimado
- [x] Fase 4: peso corporal (registro, delta, mín/máx, gráfico e historial), ajustes avanzados (descanso por defecto, hápticos), recordatorios locales programables, backup JSON exportar/restaurar
- [x] Fase 5: branding oficial en `app.json` (nombre "MiProgreso Gym", slug, bundle/package `com.ignaciohm.miprogresogym`, adaptive icon, splash `#121417`), configuración `eas.json` para build APK directo.
- [x] Fase 6 (Modo Runner + Alarma de descanso): arreglo de `RestTimerBar` + alarma sonora/vibración con pantalla apagada, pestaña **Correr** con GPS en primer/segundo plano, recuperación tras cierre, auto-pausa, mapa MapLibre coloreado por ritmo, PRs (1K/5K/10K/más larga), perfil de elevación, integración con calendario/meta semanal, backup JSON v2 y exportación GPX.

## Notas conocidas
- `npx tsc --noEmit` limpio (0 errores).
- `npx eslint` sobre los archivos del Modo Runner y Fase 0 limpio (0 errores); `npx expo lint` global reporta errores heredados previos en componentes antiguos sin tocar.
- Las funcionalidades nativas (MapLibre, ubicación en segundo plano y sonido `rest_alarm.wav`) requieren build nativo (`npx expo run:android` para desarrollo o `npx eas-cli@latest build --profile preview --platform android` para APK standalone); en Expo Go y Web operan con fallbacks defensivos sin crashear.

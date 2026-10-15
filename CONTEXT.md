# CONTEXT.md — MiProgreso Gym

> Archivo de contexto para agentes/desarrolladores. **Actualizar en cada cambio relevante.**
> Idioma del usuario: español (Argentina). Responder siempre en español.

## Producto
App móvil personal (Android + iOS) para registrar rutina de gimnasio. Gratis, sin suscripciones, **offline-first** (solo almacenamiento local + backup JSON exportable). Nombre: **MiProgreso Gym**.
- **Repositorio GitHub:** https://github.com/IgnacioHM112/miprogreso-gym


## Stack
- React Native + Expo SDK 57, TypeScript, Expo Router (rutas en `src/app/`)
- `expo-sqlite` (API síncrona) — DB `gym.db`
- Zustand (estado), expo-haptics, expo-notifications, expo-file-system, expo-sharing
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
- `src/components/RestTimerBar.tsx` — barra flotante de descanso (cuenta regresiva, +15s/-15s, saltar)
- `src/services/notifications.ts` — haptics para series/descanso y notificaciones locales en segundo plano
- `src/stores/workoutStore.ts` — store Zustand para sesión activa, series, cronómetro y timer
- `src/db/database.ts` — `db`, `initDb()` (tablas + seed), `estimate1RM()`
- `src/db/repo.ts` — queries (ejercicios, rutinas, plan, settings, stats de semana, getLastExerciseSets, saveSession)
- `src/data/tips.ts` — consejos locales + `tipOfTheDay()`
- `src/app/_layout.tsx` — Stack raíz, carga fuentes Inter/SpaceGrotesk, `initDb()`, rutas
- `src/app/(tabs)/_layout.tsx` — Tabs: Hoy · Rutinas · Progreso · Ajustes (Ionicons)
- `src/app/(tabs)/index.tsx` — **Hoy**: banner entrenamiento en curso, mini semana, meta semanal, días desde último, rutina sugerida/elegida, bottom sheet "Cambiar rutina", consejo del día
- `src/app/(tabs)/rutinas.tsx` — lista + crear rutina
- `src/app/rutina/[id].tsx` — editar nombre, días sugeridos, ejercicios (series/reps o tiempo/descanso, reordenar ↑↓, borrar), eliminar rutina
- `src/app/biblioteca.tsx` — modal; buscar, filtrar por grupo, crear ejercicio propio, soporte para agregar a rutina o a entrenamiento activo en curso
- `src/app/entrenamiento.tsx` — **Entrenamiento activo**: cronómetro en tiempo real, registro de series (kg/reps o tiempo), referencia de "la última vez", botón check ✓ con vibración, descanso automático con aviso sonoro/haptic, agregar/quitar series, notas y modal de felicitación con volumen total
- `src/app/(tabs)/progreso.tsx` — placeholder (Fase 3)
- `src/app/(tabs)/ajustes.tsx` — meta semanal (1-7); resto placeholder

## Estado / Roadmap
- [x] Fase 0: setup, dependencias, esquema DB
- [x] Fase 1: tema Lima, Hoy (+bottom sheet, mini semana, meta, días desde último, consejo), Rutinas CRUD, Biblioteca
- [x] Fase 2: entrenamiento activo completo, cronómetro continuo, registro de series y pesos, "la última vez", timer de descanso automático con haptics/notificaciones, agregar ejercicios al vuelo, resumen al finalizar
- [ ] Fase 3: historial de sesiones, resumen semanal detallado, **calendario mensual integrado**, gráficos de progreso por ejercicio, PRs y 1RM estimado
- [ ] Fase 4: peso corporal, notas ampliadas, ajustes, backup JSON (exportar/importar), **recordatorios locales**
- [ ] Fase 5: íconos, splash screen, build EAS / APK instalable

## Notas conocidas
- `npx tsc --noEmit` limpio (0 errores).
- `npx expo export --platform android` compila OK.
- En Expo Go (Android), `expo-notifications` no incluye módulos remotos nativos (`ExpoTopicSubscriptionModule`), por lo que `src/services/notifications.ts` carga el módulo protegido con try/catch: en Expo Go opera con Haptics y timer en pantalla sin crasheos, y se activará de forma nativa cuando se genere un build de producción (APK/EAS).
- Correr: `npx expo start` y recargar en Expo Go.

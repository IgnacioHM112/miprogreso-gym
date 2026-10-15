# 🏋️‍♂️ MiProgreso Gym

Aplicación móvil personal para registro de rutinas de gimnasio, series, pesos, descansos y progreso. **100% gratuita, sin suscripciones y offline-first.**

Diseñada con una estética moderna en tema **Lima Eléctrica** (`#C6F432`), optimizada para usarse con una sola mano en el gimnasio.

---

## ✨ Características

### 🏠 Pantalla "Hoy"
- **Mini semana:** Visualización Lunes a Domingo con marcas automáticas (`✓`) en los días entrenados.
- **Meta semanal:** Progreso en tiempo real contra tu objetivo semanal configurable (ej: `2/3`).
- **Días desde el último entrenamiento:** Contador motivacional de constancia.
- **Rutina sugerida y selector rápido:** Sugiere la rutina del día según el calendario o te permite elegir cualquiera al vuelo desde un bottom sheet.
- **Consejo del día:** Más de 20 recomendaciones saludables y de descanso integradas (sin conexión).

### ⚡ Entrenamiento Activo
- **Cronómetro continuo:** Duración exacta de la sesión en tiempo real.
- **Historial de la "Última vez":** Referencia automática del peso y repeticiones de la sesión anterior (`70 kg × 8`) para sobrecarga progresiva.
- **Registro rápido de series:** Botón de completado amplio (`✓`) con feedback háptico táctil (`expo-haptics`).
- **Series de calentamiento:** Marcador diferenciado (`C`) para no alterar estadísticas de carga máxima.
- **Temporizador de descanso integrado:** Cuenta regresiva automática al completar cada serie, con ajustes rápidos (`+15s`, `-15s`, saltar) y avisos hápicos y sonoros.
- **Flexibilidad en vivo:** Posibilidad de agregar o quitar series y sumar nuevos ejercicios de la biblioteca sobre la marcha si una máquina está ocupada.
- **Resumen al finalizar:** Cálculo de volumen total de carga levantada en kg y duración total guardada en base de datos local SQLite.

### 📋 Gestión de Rutinas
- Creación y edición ilimitada de rutinas personalizadas (ej. *Pecho y tríceps*, *Piernas*, *Push/Pull/Legs*).
- Asignación flexible de días sugeridos de la semana.
- Configuración por ejercicio: series objetivo, repeticiones o tiempo de ejecución y segundos de descanso.
- Reordenamiento simple (↑ / ↓) y eliminación.

### 📚 Biblioteca de Ejercicios
- Más de 30 ejercicios precargados organizados por grupo muscular (*Pecho, Espalda, Piernas, Hombros, Bíceps, Tríceps, Core, Calentamiento y Elongación*).
- Soporte para ejercicios por peso (`kg × reps`) y por tiempo (`segundos`).
- Creación de ejercicios propios personalizados.

---

## 🛠️ Stack Tecnológico

- **Framework:** [React Native](https://reactnative.dev/) con [Expo](https://expo.dev/) (SDK 57)
- **Lenguaje:** TypeScript
- **Navegación:** Expo Router (File-based routing)
- **Base de Datos Local:** `expo-sqlite` (SQLite embebida, offline)
- **Gestión de Estado:** [Zustand](https://github.com/pmndrs/zustand)
- **Feedback Háptico:** `expo-haptics`
- **Iconografía y Tipografía:** `@expo/vector-icons` (Ionicons), Inter y Space Grotesk (`expo-google-fonts`)

---

## 🚀 Cómo probar el proyecto

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TU_USUARIO/TU_REPO.git
   cd TU_REPO
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar Expo:**
   ```bash
   npx expo start
   ```

4. **Abrir en tu teléfono:**
   - Instalá la app **Expo Go** en tu dispositivo Android o iOS.
   - Escaneá el código QR que aparece en la terminal.

---

## 🗺️ Roadmap de desarrollo

- [x] **Fase 0:** Setup, dependencias, esquema SQLite y seeds iniciales.
- [x] **Fase 1:** Tema Lima Eléctrica, pantalla Hoy, CRUD de rutinas y biblioteca de ejercicios.
- [x] **Fase 2:** Entrenamiento activo, cronómetro, registro de series, pesos anteriores, temporizador de descanso con haptics y guardado de sesiones.
- [ ] **Fase 3:** Calendario mensual integrado, historial detallado de entrenamientos, gráficos de progresión, récords personales (PR) y cálculo de 1RM estimado (fórmula Epley).
- [ ] **Fase 4:** Registro de peso corporal, recordatorios locales y exportación/importación de backup (JSON).
- [ ] **Fase 5:** Pulido estético, íconos finales y generación de APK instalable.

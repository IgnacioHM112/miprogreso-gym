<div align="center">

  <img src="./assets/images/banner.jpg" alt="MiProgreso Gym Showcase" width="100%" style="border-radius: 16px; margin-bottom: 24px;" />

  # ⚡ MiProgreso Gym
  
  **Tu rutina, tus pesos, tu evolución diaria. Sin suscripciones, sin anuncios y 100% offline.**

  [![React Native](https://img.shields.io/badge/React%20Native-0.86-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![SQLite](https://img.shields.io/badge/SQLite-Offline--First-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
  [![License](https://img.shields.io/badge/License-MIT-C6F432?style=for-the-badge&labelColor=121417&color=C6F432)](LICENSE)

  <p align="center">
    <a href="#-características">Características</a> •
    <a href="#-por-qué-miprogreso-gym">Por qué esta app</a> •
    <a href="#-interfaz-y-diseño">Diseño</a> •
    <a href="#-stack-tecnológico">Stack</a> •
    <a href="#-instalación-y-uso">Instalación</a> •
    <a href="#-roadmap">Roadmap</a>
  </p>
</div>

---

## 💡 ¿Por qué MiProgreso Gym?

La mayoría de las apps de entrenamiento en las tiendas actuales sufren de lo mismo: suscripciones mensuales abusivas, muros de pago para ver tus propios datos, publicidad molesta entre series y dependencia de servidores en la nube que fallan cuando no hay buena señal en el gimnasio.

**MiProgreso Gym** nace con una premisa clara:
- 📱 **100% Offline-First:** Tus rutinas y marcas viven en la base de datos local SQLite de tu dispositivo. Jamás te vas a quedar sin poder anotar por mala señal.
- 💸 **Totalmente Gratis:** Sin membresías "Pro", sin microtransacciones y sin anuncios invasivos.
- ⚡ **Ágil e intuitiva:** Diseñada con botones amplios y tipografía de alto contraste en tema *Lima Eléctrica*, pensada para usarse con sudor y una sola mano entre series.
- 🔒 **Tus datos son tuyos:** Exportación e importación de backups en JSON en cualquier momento.

---

## ✨ Características Principales

### 🏠 Pantalla "Hoy"
- **Mini semana activa:** Visualizador de Lunes a Domingo que marca con un check (`✓`) los días que fuiste al gimnasio.
- **Meta semanal configurable:** Seguimiento visual de tu objetivo semanal (ej: `2/3 entrenamientos`).
- **Días desde el último entrenamiento:** Contador motivacional para sostener la constancia.
- **Rutina sugerida y selector rápido:** Propone la rutina del día o te permite cambiarla al instante mediante un menú desplegable inferior (*Bottom Sheet*).
- **Consejo diario de salud y descanso:** Más de 20 recomendaciones basadas en evidencia sobre descanso, nutrición e hidratación.

### ⚡ Entrenamiento Activo
- **Cronómetro continuo:** Duración exacta de la sesión en tiempo real.
- **Sobrecarga progresiva ("La última vez"):** Muestra en gris tenue los kilos y repeticiones de la sesión anterior (`70 kg × 8`) para que siempre sepas qué peso superar.
- **Feedback táctil háptico:** Botón de completado amplio (`✓`) que responde con vibración de confirmación al terminar cada serie.
- **Series de calentamiento:** Marcador diferenciado (`C`) para no distorsionar tus cálculos de fuerza ni 1RM.
- **Temporizador de descanso automático:** Cuenta regresiva que arranca sola al completar cada serie, con controles rápidos (`+15s`, `-15s`, saltar) ajustados al área segura y **alarma sonora + vibración** (`rest_alarm.wav`) que avisa incluso con la pantalla apagada.
- **Flexibilidad en vivo:** Agregá o quitá series, o sumá nuevos ejercicios desde la biblioteca sobre la marcha si una máquina está ocupada.
- **Resumen al terminar:** Cálculo instantáneo de kilos totales levantados (`volumen = peso × reps`) y tiempo total.

### 🏃 Modo Runner (Correr / Caminar con GPS)
- **Seguimiento GPS en tiempo real y segundo plano:** Registra distancia recorrida, tiempo activo, ritmo actual, ritmo medio, calorías y desnivel incluso con la pantalla bloqueada (servicio en primer plano en Android con recuperación automática ante cierre).
- **Auto-pausa inteligente:** Detecta semáforos o frenadas para no distorsionar tu ritmo medio.
- **Parciales y vueltas:** Splits automáticos cada 1 km con vibración + botón de vuelta manual, además de sugerencia automática de **Correr ↔ Caminar** según tu ritmo.
- **Mapa interactivo (MapLibre + OpenFreeMap):** Recorrido en vivo y mapa de resumen con tramos coloreados por ritmo, marcadores por km tocables para inspeccionar tiempos y perfil altimétrico.
- **Récords personales y exportación GPX:** Cálculo automático de mejor **1K**, **5K**, **10K** y salida más larga, barras semanales y exportación a archivo `.gpx` compatible con Strava o Garmin Connect.

### 📋 Gestión de Rutinas
- Creación de rutinas ilimitadas (ej. *Pecho y Bíceps*, *Piernas*, *Push / Pull / Legs*).
- Asignación flexible de días sugeridos de la semana.
- Personalización por ejercicio: series objetivo, repeticiones/tiempo y segundos de descanso.
- Reordenamiento rápido de ejercicios con controles ↑ / ↓.

### 📚 Biblioteca de Ejercicios
- Más de 30 ejercicios precargados divididos por grupo muscular (*Pecho, Espalda, Piernas, Hombros, Bíceps, Tríceps, Core, Calentamiento y Elongación*).
- Soporte para ejercicios de **fuerza** (`kg × reps`) y por **tiempo** (`segundos`).
- Creación y gestión de ejercicios personalizados.

### 📈 Progreso, Calendario y Peso Corporal
- **Calendario mensual integrado:** Marca tanto sesiones de gimnasio como salidas GPS, integrándose también en la meta semanal.
- **Récords y gráficos:** Historial de sesiones, evolución cronológica de pesos, cálculo de 1RM estimado (Epley) y seguimiento de peso corporal con mínimo, máximo y delta.

### ⚙️ Ajustes, Alarma y Respaldo
- Meta semanal configurable, descanso predeterminado (45s–180s), hápticos y prueba directa de la alarma de descanso.
- Recordatorios locales programables por días y horario.
- Exportación e importación de copia de seguridad completa en **JSON** (incluyendo rutinas, sesiones, peso corporal y actividades/rutas GPS), además de reinicio seguro de registros.

---

## 🎨 Interfaz y Diseño

<div align="center">
  <img src="./assets/images/logo.png" alt="App Icon Minimalista" width="96" style="border-radius: 22px; margin-bottom: 12px;" />
  <p><em>Ícono oficial de la aplicación (formato squircle en titanio y lima eléctrica)</em></p>
</div>

Construida con la paleta deportiva de alto contraste **Lima Eléctrica**:
- **Fondo:** Grafito profundo (`#121417`) para descanso visual en interiores.
- **Superficies:** Tarjetas elevadas (`#1C1F24` / `#24282E`) con bordes redondeados ergonómicos.
- **Acento:** Verde Lima neón (`#C6F432`) para destacar estados activos, cronómetros y botones principales.
- **Tipografía:** *Inter* para textos y lectura clara; *Space Grotesk* para dígitos y cronómetros numéricos.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| **Framework** | [React Native](https://reactnative.dev/) / [Expo SDK 57](https://expo.dev/) | Desarrollo nativo multiplataforma (Android & iOS) |
| **Arquitectura** | [Expo Router](https://docs.expo.dev/router/introduction/) | Navegación nativa basada en sistema de archivos |
| **Base de Datos** | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) | Almacenamiento relacional local offline |
| **Estado Global** | [Zustand](https://github.com/pmndrs/zustand) | Manejo de sesión activa, cronómetro, GPS y temporizadores |
| **GPS y Segundo Plano** | [expo-location](https://docs.expo.dev/versions/latest/sdk/location/) + [expo-task-manager](https://docs.expo.dev/versions/latest/sdk/task-manager/) | Registro de rutas con pantalla bloqueada y auto-pausa |
| **Mapas** | [MapLibre React Native](https://maplibre.org/) + OpenFreeMap | Mapas oscuros sin API key con ruta coloreada por ritmo |
| **Háptica y Avisos** | [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) + [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) | Vibraciones, alarma de descanso y recordatorios |
| **Exportación** | [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) + [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/) | Backups completos en JSON y rutas en GPX |
| **Tipografía** | [expo-google-fonts](https://github.com/expo/google-fonts) | Fuentes Inter & Space Grotesk |

---

## 🚀 Instalación y Uso Local

### Requisitos previos
- Node.js (v18 o superior)
- Dispositivo **Android** con depuración USB (o cuenta de Expo para compilar en la nube con EAS Build). *(Las funciones nativas de mapas MapLibre, ubicación en segundo plano y sonido de alarma personalizado requieren build nativo / APK, no Expo Go).*

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/IgnacioHM112/miprogreso-gym.git
   cd miprogreso-gym
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Compilar y ejecutar en Android (desarrollo local con USB):**
   ```bash
   npx expo prebuild --platform android
   npx expo run:android
   ```

4. **Generar APK instalable independiente (para usar en el teléfono sin PC):**
   ```bash
   npx eas-cli@latest build --profile preview --platform android
   ```

---

## 🗺️ Roadmap del Proyecto

- [x] **Fase 0:** Setup del entorno, base de datos SQLite y seed inicial de ejercicios.
- [x] **Fase 1:** Sistema de diseño Lima Eléctrica, pantalla Hoy, CRUD de rutinas ilimitadas y biblioteca con buscador y filtros.
- [x] **Fase 2:** Entrenamiento activo interactivo, cronómetro, "última vez", selector táctil de discos/reps sin teclado, timer de descanso automático con hápticos y guardado de sesiones.
- [x] **Fase 3:** Calendario mensual integrado, historial de sesiones, gráficos de progresión, récords personales (PR) y cálculo de 1RM estimado (fórmula Epley).
- [x] **Fase 4:** Registro de peso corporal con evolución temporal, recordatorios locales configurables y exportación/importación de backup (JSON).
- [x] **Fase 5:** Pulido estético final, launcher icon nativo y configuración de APK instalable independiente mediante EAS Build.
- [x] **Fase 6 (Modo Runner + Alarma de Descanso):** Arreglo de controles de descanso y alarma sonora/vibración con pantalla apagada, pestaña **Correr** con GPS en primer y segundo plano, auto-pausa, mapa interactivo MapLibre coloreado por ritmo, PRs (1K/5K/10K), perfil de elevación, integración con calendario/backup y exportación GPX.

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

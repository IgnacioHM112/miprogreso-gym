// Consejos locales (sin internet). Se muestra uno por día en "Hoy" y se usan en recordatorios.
export const TIPS = [
  'Dormí entre 7 y 9 horas: el músculo crece mientras descansás.',
  'Tomá agua antes, durante y después de entrenar.',
  'Calentá 5-10 minutos antes de levantar pesado.',
  'Si un ejercicio duele (no confundir con esfuerzo), paralo.',
  'Buscá subir peso o repeticiones de a poco: es la sobrecarga progresiva.',
  'Comé proteína en cada comida, aprox. 1,6-2 g por kg de peso corporal.',
  'Dale 48 h de descanso a cada grupo muscular entrenado fuerte.',
  'Elongar al final ayuda a relajarte y mejorar la movilidad.',
  'La técnica primero, el peso después.',
  'Un día de descanso también es parte del entrenamiento.',
  'Caminar en los días libres acelera la recuperación.',
  'Controlá la bajada del peso: 2-3 segundos por repetición.',
  'Respirá: exhalá al hacer fuerza, inhalá al volver.',
  'Anotá tus series: lo que se mide, mejora.',
  'Si dormiste mal, bajá un poco la intensidad hoy.',
  'Una semana liviana cada 6-8 semanas ayuda a recuperarte.',
  'Los carbohidratos antes de entrenar te dan energía.',
  'Constancia > intensidad: mejor 3 días todas las semanas que 6 una sola.',
  'Mantené la espalda neutra en sentadillas y peso muerto.',
  'Si estás muy dolorido, hacé movilidad o cardio suave.',
];

export const tipOfTheDay = (d = new Date()) => {
  const start = new Date(d.getFullYear(), 0, 0).getTime();
  const day = Math.floor((d.getTime() - start) / 86400000);
  return TIPS[day % TIPS.length];
};

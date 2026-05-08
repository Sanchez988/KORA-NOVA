/** Hobbies para onboarding/edición — mismos campos que intereses para UI consistente. */
export type HobbyPickOption = { label: string; icon: string; blurb: string };

export const HOBBY_PICK_OPTIONS: HobbyPickOption[] = [
  { label: 'Guitarra', icon: '🎸', blurb: 'Acústica o eléctrica: ensayos, covers y buen ritmo.' },
  { label: 'Piano', icon: '🎹', blurb: 'Melodías, arpegios y momentos enfocados.' },
  { label: 'Dibujar', icon: '✏️', blurb: 'Sketch, lápiz y papel (o tablet) donde caiga.' },
  { label: 'Escribir', icon: '📝', blurb: 'Relatos, diario creativo y ideas ordenadas.' },
  { label: 'Correr', icon: '🏃', blurb: 'Trote, marca personal y despejar la mente.' },
  { label: 'Ciclismo', icon: '🚴', blurb: 'Ruta, ciudad o gravel con buena música.' },
  { label: 'Fútbol', icon: '⚽', blurb: 'Picaditas, equipo y ese gol que recordás.' },
  { label: 'Nadar', icon: '🏊', blurb: 'Piscina o mar — braza y tranquilidad azul.' },
  { label: 'Senderismo', icon: '🥾', blurb: 'Trekking, vistas y naturaleza a tu paso.' },
  { label: 'Repostería', icon: '🍰', blurb: 'Horneados dulces y compartir la mesa.' },
  { label: 'Videojuegos', icon: '🎮', blurb: 'Partidas, ranking y buena compañía online.' },
  { label: 'Podcasts', icon: '🎙️', blurb: 'Historias mientras caminás o cocinás.' },
  { label: 'Voluntariado', icon: '🤝', blurb: 'Causas que te mueven y tiempo que suma.' },
  { label: 'Mascotas', icon: '🐾', blurb: 'Paseos, mimos y responsabilidad con garra.' },
  { label: 'Ajedrez', icon: '♟️', blurb: 'Estrategia tranquila, jaque y mate.' },
  { label: 'Streaming', icon: '📺', blurb: 'Estrenos seriéfilos sin spoilers tóxicos.' },
  { label: 'Manualidades', icon: '🧶', blurb: 'DIY desde cero hasta el detalle bonito.' },
  { label: 'Jardinería', icon: '🌱', blurb: 'Plantas, macetas y aire fresco en casa.' },
];

/** Iconos guardados / etiquetas viejas sin tilde */
export const HOBBY_ICONS: Record<string, string> = {
  ...Object.fromEntries(HOBBY_PICK_OPTIONS.map((o) => [o.label, o.icon])),
  Futbol: '⚽',
  Reposteria: '🍰',
  Jardineria: '🌱',
  // Perfiles creados con lista anterior (CreateProfile / onboarding viejo)
  'Escuchar música': '🎧',
  Bailar: '🕺',
  Pintar: '🎨',
  Leer: '📖',
  Cocinar: '👨‍🍳',
  Yoga: '🧘',
  Gaming: '🎮',
};

// Lista de "acciones cotidianas" (sección 6 del prompt): las cosas que se
// le preguntan al participante si ha hecho alguna vez. Cada una lleva su
// categoría de conducta asociada, según la tabla "Cuestionario Final".
// El orden es el mismo que en el diseño de la pantalla.

const ACCIONES_COTIDIANAS = [
  { id: 'S01', texto: 'Besarte en público', emoji: '💏', categoria: 'MANTENER CONDUCTAS INMORALES' },
  { id: 'S15', texto: 'Mandar una nude', emoji: '🔞', categoria: 'MANTENER CONDUCTAS INMORALES' },
  { id: 'S02', texto: 'Salir del armario', emoji: '🏳️‍🌈', categoria: 'MANTENER CONDUCTAS INMORALES' },
  { id: 'S10', texto: 'Trabajar', emoji: '💼', categoria: 'ACTUAR SIN AUTORIZACIÓN' },
  { id: 'S11', texto: 'Divorciarte', emoji: '💔', categoria: 'ACTUAR SIN AUTORIZACIÓN' },
  { id: 'S03', texto: 'Escuchar a Bad Bunny', emoji: '🐰', categoria: 'CONSUMIR CONTENIDOS NO AUTORIZADOS' },
  { id: 'S05', texto: 'Hacer huelga', emoji: '✊', categoria: 'PARTICIPAR EN MANIFESTACIONES' },
  { id: 'S04', texto: 'Usar TikTok', emoji: '📱', categoria: 'CONSUMIR CONTENIDOS NO AUTORIZADOS' },
  { id: 'S07', texto: 'Comprar preservativos', emoji: '🛡️', categoria: 'MANTENER CONDUCTAS INMORALES' },
  { id: 'S06', texto: 'Ir a una manifestación', emoji: '🪧', categoria: 'PARTICIPAR EN MANIFESTACIONES' },
  { id: 'S12', texto: 'Vestir como quieras', emoji: '👗', categoria: 'MANTENER CONDUCTAS INMORALES' },
  { id: 'S13', texto: 'Usar bikini', emoji: '👙', categoria: 'MANTENER CONDUCTAS INMORALES' },
  { id: 'S16', texto: 'Usar app de citas', emoji: '💘', categoria: 'MANTENER CONDUCTAS INMORALES' },
  { id: 'S08', texto: 'Viajar', emoji: '✈️', categoria: 'ACTUAR SIN AUTORIZACIÓN' },
  { id: 'S14', texto: 'Bailar reggaeton', emoji: '🔥', categoria: 'CONSUMIR CONTENIDOS NO AUTORIZADOS' },
  { id: 'S09', texto: 'Tener cuenta bancaria', emoji: '🏦', categoria: 'ACTUAR SIN AUTORIZACIÓN' }
];

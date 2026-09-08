// Este archivo solo guarda "listas de nombres" que se usan en varios
// sitios del proyecto, para no escribirlas mal o distinto en cada lugar.

// Nombres de todas las pantallas/estados por los que puede pasar la
// aplicación (sección 15 del prompt).
const ESTADOS = Object.freeze({
  IDLE: 'IDLE',
  START: 'START',
  LANGUAGE: 'LANGUAGE',
  PROFILE: 'PROFILE',
  BIRTH_YEAR: 'BIRTH_YEAR',
  ACTIONS: 'ACTIONS',
  QUESTION_1: 'QUESTION_1',
  QUESTION_2: 'QUESTION_2',
  QUESTION_3: 'QUESTION_3',
  QUESTION_4: 'QUESTION_4',
  QUESTION_5: 'QUESTION_5',
  EVALUATION: 'EVALUATION',
  SURVEILLANCE: 'SURVEILLANCE',
  PHOTO_CAPTURE: 'PHOTO_CAPTURE',
  DETENTION: 'DETENTION',
  PRINTING: 'PRINTING',
  RESET: 'RESET'
});

// Categorías de conducta (sección 7 + la de idioma, ya confirmada).
// No añadir más categorías sin consultarlo antes.
const CATEGORIAS_CONDUCTA = Object.freeze({
  CRITICAR_REGIMEN: 'CRITICAR AL RÉGIMEN',
  PARTICIPAR_MANIFESTACIONES: 'PARTICIPAR EN MANIFESTACIONES',
  CONDUCTAS_INMORALES: 'MANTENER CONDUCTAS INMORALES',
  CONTENIDOS_NO_AUTORIZADOS: 'CONSUMIR CONTENIDOS NO AUTORIZADOS',
  ACTUAR_SIN_AUTORIZACION: 'ACTUAR SIN AUTORIZACIÓN',
  LENGUA_NO_AUTORIZADA: 'UTILIZAR UNA LENGUA NO AUTORIZADA'
});

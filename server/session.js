// Este archivo guarda los datos de la persona que está haciendo el
// recorrido (el "participante"). Solo hay UN participante activo a la vez,
// porque la instalación tiene un único puesto.

// Lista de categorías de conducta (sección 7 del prompt + la categoría de
// idioma, confirmada por el usuario). No añadir categorías nuevas sin
// consultarlo antes.
const CATEGORIAS_CONDUCTA = Object.freeze([
  'CRITICAR AL RÉGIMEN',
  'PARTICIPAR EN MANIFESTACIONES',
  'MANTENER CONDUCTAS INMORALES',
  'CONSUMIR CONTENIDOS NO AUTORIZADOS',
  'ACTUAR SIN AUTORIZACIÓN',
  'UTILIZAR UNA LENGUA NO AUTORIZADA'
]);

// Aquí se guarda, en memoria, los datos del participante actual.
let sesionActual = null;

// Devuelve un participante "en blanco", con todos los campos vacíos.
function participanteVacio() {
  return {
    id: '',
    timestamp: '',
    idioma: '',
    genero: '',
    anioNacimiento: '',
    edad: '',
    acciones: [],
    respuestas: {},
    conductas: [],
    foto: '',
    numeroExpediente: '',
    estado: 'IDLE'
  };
}

// Crea un identificador único para cada participante, combinando la hora
// actual con unos caracteres al azar.
function generarId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

// Crea un número de expediente de 5 cifras, al azar, para el ticket.
function generarNumeroExpediente() {
  return String(Math.floor(10000 + Math.random() * 89999));
}

// Empieza una sesión nueva: se llama cuando alguien pulsa "Empezar".
function crearSesion() {
  sesionActual = participanteVacio();
  sesionActual.id = generarId();
  sesionActual.timestamp = new Date().toISOString();
  sesionActual.numeroExpediente = generarNumeroExpediente();
  sesionActual.estado = 'START';
  return sesionActual;
}

// Devuelve los datos de la sesión actual. Si todavía no existe ninguna,
// crea una vacía para no devolver "nada".
function obtenerSesion() {
  if (!sesionActual) sesionActual = participanteVacio();
  return sesionActual;
}

// Actualiza solo algunos campos de la sesión actual, sin borrar el resto.
// Por ejemplo: actualizarSesion({ genero: 'mujer' }) solo cambia el género.
function actualizarSesion(cambios = {}) {
  if (!sesionActual) sesionActual = participanteVacio();
  sesionActual = { ...sesionActual, ...cambios };
  return sesionActual;
}

// Borra la sesión actual y deja la aplicación lista para el siguiente
// participante.
function reiniciarSesion() {
  sesionActual = participanteVacio();
  return sesionActual;
}

module.exports = {
  CATEGORIAS_CONDUCTA,
  crearSesion,
  obtenerSesion,
  actualizarSesion,
  reiniciarSesion
};

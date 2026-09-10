// Aquí se decide qué conductas (categorías) tiene el expediente de una
// persona, mirando el idioma y el género elegidos, las acciones que ha
// marcado y las respuestas que ha dado. Se sigue el bloque "cuestionario"
// del archivo datos/conductas.json que nos ha pasado el usuario.

// Orden en el que se comprueban/guardan las categorías. Es el mismo orden
// en el que aparecen las normas en el PNG "Registro de Conducta" de la
// pantalla 2.
const ORDEN_CATEGORIAS = [
  'CRITICAR AL RÉGIMEN',
  'PARTICIPAR EN MANIFESTACIONES',
  'MANTENER CONDUCTAS INMORALES',
  'CONSUMIR CONTENIDOS NO AUTORIZADOS',
  'ACTUAR SIN AUTORIZACIÓN',
  'UTILIZAR UNA LENGUA NO AUTORIZADA'
];

// Recibe los datos del participante y devuelve la lista de categorías
// (conductas) que le corresponden.
function evaluarConductas(participante) {
  const categoriasActivas = new Set();

  // 1) Idioma (PF01): elegir CUALQUIER idioma que no sea el castellano
  //    activa "utilizar una lengua no autorizada".
  if (participante.idioma && participante.idioma !== 'castellano') {
    categoriasActivas.add('UTILIZAR UNA LENGUA NO AUTORIZADA');
  }

  // 2) Género (PF02): elegir "Mujer" activa "actuar sin autorización"
  //    (la antigua tutela masculina obligatoria).
  if (participante.genero === 'mujer') {
    categoriasActivas.add('ACTUAR SIN AUTORIZACIÓN');
  }

  // 3) Por cada acción marcada en "¿Qué cosas has hecho?" (S01-S16), se
  //    añade su categoría.
  (participante.acciones || []).forEach((idAccion) => {
    const accion = ACCIONES_COTIDIANAS.find((item) => item.id === idAccion);
    if (accion) categoriasActivas.add(accion.categoria);
  });

  // 4) Algunas respuestas del cuestionario también añaden una categoría.
  const respuestas = participante.respuestas || {};
  if (respuestas.P01 === 'SI') categoriasActivas.add('CRITICAR AL RÉGIMEN');
  if (respuestas.P02 === 'SI') categoriasActivas.add('ACTUAR SIN AUTORIZACIÓN');
  // P03 (privacidad) y P04 (voto) no activan ninguna categoría.

  // Se devuelve la lista siempre en el mismo orden.
  return ORDEN_CATEGORIAS.filter((categoria) => categoriasActivas.has(categoria));
}

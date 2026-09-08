// Aquí se decide qué conductas (categorías) tiene el expediente de una
// persona, mirando las acciones que ha marcado, las respuestas que ha
// dado y el idioma que ha elegido. Se sigue la tabla "Cuestionario Final"
// que nos ha pasado el usuario.

// Orden en el que se comprueban/guardan las categorías.
const ORDEN_CATEGORIAS = [
  'CRITICAR AL RÉGIMEN',
  'PARTICIPAR EN MANIFESTACIONES',
  'MANTENER CONDUCTAS INMORALES',
  'CONSUMIR CONTENIDOS NO AUTORIZADOS',
  'ACTUAR SIN AUTORIZACIÓN',
  'UTILIZAR UNA LENGUA NO AUTORIZADA'
];

// Solo elegir Catalán o Valenciano activa la categoría de "lengua no
// autorizada" (según la tabla "Cuestionario Final"). Elegir otro idioma
// distinto del Castellano muestra el aviso de "idioma no autorizado" en
// pantalla, pero no añade esta conducta al expediente.
const IDIOMAS_QUE_ACTIVAN_LENGUA_NO_AUTORIZADA = ['catalan', 'valenciano'];

// Recibe los datos del participante y devuelve la lista de categorías
// (conductas) que le corresponden.
function evaluarConductas(participante) {
  const categoriasActivas = new Set();

  // 1) Por cada acción marcada en "¿Qué cosas has hecho?", se añade su
  //    categoría.
  (participante.acciones || []).forEach((idAccion) => {
    const accion = ACCIONES_COTIDIANAS.find((item) => item.id === idAccion);
    if (accion) categoriasActivas.add(accion.categoria);
  });

  // 2) Algunas respuestas del cuestionario también añaden una categoría.
  const respuestas = participante.respuestas || {};
  if (respuestas.P01 === 'SI') categoriasActivas.add('CRITICAR AL RÉGIMEN');
  if (respuestas.P02 === 'SI') categoriasActivas.add('ACTUAR SIN AUTORIZACIÓN');
  // P03 (privacidad) y P04 (voto) no activan ninguna categoría.

  // 3) El idioma elegido puede añadir la categoría de "lengua no autorizada".
  if (IDIOMAS_QUE_ACTIVAN_LENGUA_NO_AUTORIZADA.includes(participante.idioma)) {
    categoriasActivas.add('UTILIZAR UNA LENGUA NO AUTORIZADA');
  }

  // Se devuelve la lista siempre en el mismo orden.
  return ORDEN_CATEGORIAS.filter((categoria) => categoriasActivas.has(categoria));
}

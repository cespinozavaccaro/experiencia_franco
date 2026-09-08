// Este es el "cerebro" de la pantalla táctil. Se encarga de:
//   1. Cambiar de una pantalla a otra.
//   2. Guardar las respuestas de la persona en un objeto "participante".
//   3. Avisar al servidor de cada cambio, para que la segunda pantalla
//      (VER, OÍR Y CHIVAR) se entere en tiempo real.

const ANIO_ACTUAL = new Date().getFullYear();
const RANGO_ANIOS = { minimo: 1940, maximo: ANIO_ACTUAL - 14 };
const ALTURA_CASILLA_ANIO = 64; // en píxeles, tiene que coincidir con screens.css

// --- Datos del participante actual ---------------------------------------

let participante = crearParticipanteVacio();
let idTemporizadorVigilancia = null; // para el aviso "cuando alguien mira"
let idIntervaloEvaluacion = null; // para la barra de progreso final
let fotoSorpresaTomada = false; // para que la foto sorpresa se haga solo una vez

// Crea un participante nuevo, con los campos vacíos, según la sección 5
// del prompt.
function crearParticipanteVacio() {
  return {
    id: '',
    timestamp: '',
    idioma: '',
    genero: '',
    anioNacimiento: RANGO_ANIOS.maximo - 26,
    edad: 26,
    acciones: [],
    respuestas: {},
    conductas: [],
    foto: '',
    numeroExpediente: '',
    estado: 'IDLE'
  };
}

// Guarda uno o varios cambios en el participante y se los manda también
// al servidor, para que la segunda pantalla los reciba al momento.
// Ejemplo: guardarCambio({ genero: 'mujer' })
function guardarCambio(cambios) {
  Object.assign(participante, cambios);
  enviarMensaje('session:action', cambios);
}

// Vuelve a calcular qué conductas tiene el participante (según sus
// acciones, respuestas e idioma) y las guarda.
function actualizarConductas() {
  const conductas = evaluarConductas(participante);
  guardarCambio({ conductas });
}

// Oculta todas las pantallas y muestra solo la que se indica.
function mostrarPantalla(idPantalla) {
  document.querySelectorAll('.screen').forEach((pantalla) => pantalla.classList.remove('is-active'));
  document.getElementById(idPantalla).classList.add('is-active');
}

// En una pantalla de "imagen + botones invisibles", muestra la imagen del
// estado seleccionado (la casilla ya en negro, exportada de Figma) que
// corresponda a "valor", y oculta las demás.
function mostrarEstadoSeleccionado(pantalla, valor) {
  pantalla.querySelectorAll('.pantalla-imagen__estado').forEach((imagen) => {
    imagen.hidden = imagen.dataset.estadoDe !== String(valor);
  });
}

// Oculta todas las imágenes de estado de una pantalla (para cuando se
// reinicia la experiencia).
function ocultarEstados(pantalla) {
  pantalla.querySelectorAll('.pantalla-imagen__estado').forEach((imagen) => {
    imagen.hidden = true;
  });
}

// --- PANTALLA 00 — Inicio -------------------------------------------------

document.querySelector('[data-action="start"]').addEventListener('click', () => {
  participante = crearParticipanteVacio();
  enviarMensaje('session:start'); // le dice al servidor "empieza una sesión nueva"
  guardarCambio({ estado: 'LANGUAGE' });
  mostrarPantalla('screen-language');
});

// --- PANTALLA 01 — Idioma --------------------------------------------------
// Esta pantalla es la captura de Figma de fondo, con botones invisibles
// encima. Al elegir un idioma se muestra la imagen de esa opción ya en
// negro (exportada de Figma), en vez de dibujarla nosotros por CSS.

const pantallaIdioma = document.getElementById('screen-language');
const botonesIdioma = pantallaIdioma.querySelectorAll('.pantalla-imagen__boton[data-value]');
const botonSiguienteIdioma = document.getElementById('boton-siguiente-idioma');
const avisoIdiomaNoAutorizado = document.getElementById('modal-idioma-error');

botonesIdioma.forEach((boton) => {
  boton.addEventListener('click', () => {
    const idioma = boton.dataset.value;
    mostrarEstadoSeleccionado(pantallaIdioma, idioma);
    guardarCambio({ idioma });
    actualizarConductas();

    if (idioma !== 'castellano') {
      // Cualquier idioma que no sea el Castellano muestra el aviso de
      // "idioma no autorizado" (aunque solo catalán/valenciano activan la
      // conducta correspondiente, ver evaluation.js).
      avisoIdiomaNoAutorizado.classList.add('is-active');
    } else {
      botonSiguienteIdioma.classList.remove('esta-desactivado');
    }
  });
});

// Pasa a la pantalla de género. Se usa tanto al pulsar "Siguiente" como al
// tocar en cualquier parte de la pantalla mientras está abierto el aviso
// de "idioma no autorizado".
function irAPantallaGenero() {
  guardarCambio({ estado: 'PROFILE' });
  mostrarPantalla('screen-profile');
}

// Tocar en cualquier punto de la pantalla mientras el aviso está abierto
// (el propio aviso ocupa toda la pantalla) lo cierra y avanza directamente,
// sin necesidad de pulsar "Siguiente" aparte.
avisoIdiomaNoAutorizado.addEventListener('click', () => {
  avisoIdiomaNoAutorizado.classList.remove('is-active');
  botonSiguienteIdioma.classList.remove('esta-desactivado');
  irAPantallaGenero();
});

botonSiguienteIdioma.addEventListener('click', irAPantallaGenero);

// --- PANTALLA 02 — Género ---------------------------------------------------
// Mismo sistema que el idioma: imagen de fondo + botones invisibles.

const pantallaGenero = document.getElementById('screen-profile');
const botonesGenero = pantallaGenero.querySelectorAll('.pantalla-imagen__boton[data-value]');
const botonSiguienteGenero = document.getElementById('boton-siguiente-genero');
const avisoPrecaucionMujer = document.getElementById('modal-mujer-precaucion');

botonesGenero.forEach((boton) => {
  boton.addEventListener('click', () => {
    const genero = boton.dataset.value;
    mostrarEstadoSeleccionado(pantallaGenero, genero);
    guardarCambio({ genero });

    if (genero === 'mujer') {
      avisoPrecaucionMujer.classList.add('is-active');
    } else {
      botonSiguienteGenero.classList.remove('esta-desactivado');
    }
  });
});

// Pasa a la pantalla de año de nacimiento. Se usa tanto al pulsar
// "Siguiente" como al tocar en cualquier parte de la pantalla mientras
// está abierto el aviso de "precaución" (al elegir Mujer).
function irAPantallaAnioNacimiento() {
  guardarCambio({ estado: 'BIRTH_YEAR' });
  mostrarPantalla('screen-birth-year');
  // El "scroll" hay que ponerlo DESPUÉS de mostrar la pantalla, porque un
  // elemento oculto (display:none) no guarda bien la posición del scroll.
  moverRuedaAnioA(participante.anioNacimiento);
}

// Tocar en cualquier punto de la pantalla mientras el aviso está abierto
// (el propio aviso ocupa toda la pantalla) lo cierra y avanza directamente,
// sin necesidad de pulsar "Siguiente" aparte.
avisoPrecaucionMujer.addEventListener('click', () => {
  avisoPrecaucionMujer.classList.remove('is-active');
  botonSiguienteGenero.classList.remove('esta-desactivado');
  irAPantallaAnioNacimiento();
});

botonSiguienteGenero.addEventListener('click', irAPantallaAnioNacimiento);

// --- PANTALLA 03 — Año de nacimiento (rueda deslizable) ---------------------

const ruedaAnios = document.getElementById('year-picker');

// Rellena la rueda con todos los años posibles, uno debajo de otro.
function construirRuedaAnios() {
  ruedaAnios.innerHTML = '';
  ruedaAnios.style.overflowY = 'scroll';
  ruedaAnios.style.scrollSnapType = 'y mandatory';
  ruedaAnios.style.height = `${ALTURA_CASILLA_ANIO * 5}px`;

  for (let anio = RANGO_ANIOS.minimo; anio <= RANGO_ANIOS.maximo; anio += 1) {
    const casilla = document.createElement('div');
    casilla.className = 'year-picker__option';
    casilla.textContent = anio;
    casilla.dataset.anio = anio;
    casilla.style.height = `${ALTURA_CASILLA_ANIO}px`;
    casilla.style.display = 'flex';
    casilla.style.alignItems = 'center';
    casilla.style.justifyContent = 'center';
    casilla.style.scrollSnapAlign = 'center';
    ruedaAnios.appendChild(casilla);
  }

  // Espacio extra arriba y abajo, para poder centrar el primer y el
  // último año (si no, se quedarían pegados al borde).
  ruedaAnios.style.paddingTop = `${ALTURA_CASILLA_ANIO * 2}px`;
  ruedaAnios.style.paddingBottom = `${ALTURA_CASILLA_ANIO * 2}px`;

  ruedaAnios.addEventListener('scroll', alMoverRuedaAnios);

  // Además de deslizar, también se puede tocar directamente el año que
  // se quiera elegir: se marca al momento, sin esperar a que termine
  // ningún desplazamiento.
  ruedaAnios.addEventListener('click', (evento) => {
    const casilla = evento.target.closest('.year-picker__option');
    if (!casilla) return;

    const anioElegido = Number(casilla.dataset.anio);
    seleccionarAnio(anioElegido);

    const indice = anioElegido - RANGO_ANIOS.minimo;
    ruedaAnios.scrollTo({ top: indice * ALTURA_CASILLA_ANIO, behavior: 'smooth' });
  });
}

// Marca un año como el elegido: lo destaca en la rueda y lo guarda en los
// datos del participante.
function seleccionarAnio(anio) {
  ruedaAnios.querySelectorAll('.year-picker__option').forEach((casilla) => {
    casilla.classList.toggle('is-current', Number(casilla.dataset.anio) === anio);
  });

  guardarCambio({ anioNacimiento: anio, edad: ANIO_ACTUAL - anio });
}

// Se ejecuta cada vez que la persona desliza la rueda: calcula qué año ha
// quedado en el centro y lo marca como el elegido.
function alMoverRuedaAnios() {
  const centroVisible = ruedaAnios.scrollTop + ALTURA_CASILLA_ANIO * 2 + ALTURA_CASILLA_ANIO / 2;
  const indice = Math.round((centroVisible - ALTURA_CASILLA_ANIO * 2.5) / ALTURA_CASILLA_ANIO);
  const maximoIndice = RANGO_ANIOS.maximo - RANGO_ANIOS.minimo;
  const anio = RANGO_ANIOS.minimo + Math.max(0, Math.min(indice, maximoIndice));

  seleccionarAnio(anio);
}

// Coloca la rueda directamente sobre un año concreto (sin animación).
function moverRuedaAnioA(anio) {
  const indice = anio - RANGO_ANIOS.minimo;
  ruedaAnios.scrollTop = indice * ALTURA_CASILLA_ANIO;
}

document.querySelector('#screen-birth-year [data-next]').addEventListener('click', () => {
  fotoSorpresaTomada = false;
  guardarCambio({ estado: 'ACTIONS' });
  mostrarPantalla('screen-actions');
});

// --- PANTALLA 04 — Acciones cotidianas --------------------------------------

const cuadriculaAcciones = document.getElementById('actions-grid');

// Dibuja los botones de todas las acciones de la lista.
function construirCuadriculaAcciones() {
  cuadriculaAcciones.innerHTML = '';
  ACCIONES_COTIDIANAS.forEach((accion) => {
    const boton = document.createElement('button');
    boton.className = 'action-chip';
    boton.dataset.id = accion.id;
    boton.textContent = `${accion.texto} ${accion.emoji}`;
    cuadriculaAcciones.appendChild(boton);
  });
}

cuadriculaAcciones.addEventListener('click', (evento) => {
  const boton = evento.target.closest('.action-chip');
  if (!boton) return;

  // Al tocar un botón, se marca o desmarca (selección múltiple).
  boton.classList.toggle('is-selected');

  const accionesElegidas = Array.from(cuadriculaAcciones.querySelectorAll('.action-chip.is-selected'))
    .map((elemento) => elemento.dataset.id);

  guardarCambio({ acciones: accionesElegidas });
  actualizarConductas();

  // Foto sorpresa: la primera vez que se toca cualquier opción de esta
  // pantalla, se le pide a la segunda pantalla (la única que tiene la
  // cámara encendida) que capte una foto sin avisar.
  if (!fotoSorpresaTomada) {
    fotoSorpresaTomada = true;
    enviarMensaje('foto:solicitar');
  }
});

document.querySelector('#screen-actions [data-next]').addEventListener('click', () => {
  guardarCambio({ estado: 'QUESTION_1' });
  mostrarPantalla('screen-question-1');
});

// --- PANTALLAS 05, 06, 07 y 08 — Las 4 preguntas (imagen + botones) --------
// Las cuatro funcionan igual: imagen de fondo, una imagen de estado por
// cada opción (ya con la casilla en negro) y un botón invisible por
// opción, más otro para "Siguiente". Por eso comparten una misma función
// en vez de repetir el código cuatro veces.

// Prepara una pantalla de pregunta: guarda la respuesta bajo "idPregunta"
// (por ejemplo "P01") y, al pulsar "Siguiente", ejecuta "irASiguientePantalla".
function configurarPreguntaImagen(idPantalla, idPregunta, irASiguientePantalla) {
  const pantalla = document.getElementById(idPantalla);
  const botonesRespuesta = pantalla.querySelectorAll('.pantalla-imagen__boton[data-value]');
  const botonSiguiente = pantalla.querySelector('[data-siguiente]');

  botonesRespuesta.forEach((boton) => {
    boton.addEventListener('click', () => {
      mostrarEstadoSeleccionado(pantalla, boton.dataset.value);

      const respuestas = { ...participante.respuestas, [idPregunta]: boton.dataset.value };
      guardarCambio({ respuestas });
      actualizarConductas();

      botonSiguiente.classList.remove('esta-desactivado');
    });
  });

  botonSiguiente.addEventListener('click', irASiguientePantalla);
}

// El aviso "cuando alguien mira" se dibuja sobre el recuadro de la
// imagen de la pregunta de privacidad, para que se vea encima de ella.
const imagenPregunta3 = document.querySelector('#screen-question-3 .pantalla-imagen');

configurarPreguntaImagen('screen-question-1', 'P01', () => {
  guardarCambio({ estado: 'QUESTION_2' });
  mostrarPantalla('screen-question-2');
});

configurarPreguntaImagen('screen-question-2', 'P02', () => {
  guardarCambio({ estado: 'QUESTION_3' });
  mostrarPantalla('screen-question-3');

  // Aviso "cuando alguien mira": en la pregunta de privacidad, tras unos
  // segundos aparece un borde rojo, como si "alguien te observara". Es un
  // efecto simulado con un temporizador; si el proyecto necesita detectar
  // de verdad si hay alguien mirando (con visión por computador), habría
  // que añadirlo más adelante.
  clearTimeout(idTemporizadorVigilancia);
  idTemporizadorVigilancia = setTimeout(() => {
    imagenPregunta3.classList.add('is-watched');
  }, 4000);
});

configurarPreguntaImagen('screen-question-3', 'P03', () => {
  clearTimeout(idTemporizadorVigilancia);
  imagenPregunta3.classList.remove('is-watched');
  guardarCambio({ estado: 'QUESTION_4' });
  mostrarPantalla('screen-question-4');
});

configurarPreguntaImagen('screen-question-4', 'P04', () => {
  iniciarEvaluacion();
});

// --- Pantalla de evaluación — "Comunicado Oficial" --------------------------

const barraProgresoEvaluacion = document.getElementById('comunicado-progress-fill');
const fotoEvaluacion = document.getElementById('comunicado-foto');

// Se llama al terminar la última pregunta: manda imprimir el ticket y, a
// la vez, va rellenando una barra de progreso que simula el tiempo que
// tarda la impresora en sacarlo. La foto no se vuelve a pedir aquí: ya se
// hizo una única vez, de sorpresa, en la pantalla de acciones cotidianas.
function iniciarEvaluacion() {
  guardarCambio({ estado: 'EVALUATION' });
  actualizarConductas();
  mostrarPantalla('screen-evaluation');

  // Se avisa al servidor para que imprima el ticket (de momento, en la
  // fase 1, esto solo escribe el ticket por la consola del servidor; en
  // la fase 2 se sustituirá por la impresora térmica real, sin tener que
  // cambiar nada de aquí).
  fetch('/api/imprimir', { method: 'POST' })
    .catch((error) => console.warn('No se ha podido enviar la orden de impresión:', error));

  let porcentaje = 0;
  barraProgresoEvaluacion.style.width = '0%';
  barraProgresoEvaluacion.textContent = '0%';

  clearInterval(idIntervaloEvaluacion);
  idIntervaloEvaluacion = setInterval(() => {
    porcentaje = Math.min(100, porcentaje + 4);
    barraProgresoEvaluacion.style.width = `${porcentaje}%`;
    barraProgresoEvaluacion.textContent = `${porcentaje}%`;

    if (porcentaje >= 100) {
      clearInterval(idIntervaloEvaluacion);
      // Se deja un momento el "100%" a la vista (mientras la impresora
      // térmica saca el ticket) y después se reinicia todo, para que la
      // instalación quede lista para la siguiente persona.
      setTimeout(() => {
        enviarMensaje('session:reset');
      }, 4000);
    }
  }, 120);
}

// Cuando el servidor avisa de que la sesión se ha reiniciado (justo
// después de imprimir), la pantalla táctil vuelve a "Empezar" y se
// limpian todas las selecciones, para dejarlo todo listo para la
// siguiente persona.
function volverAlInicio() {
  participante = crearParticipanteVacio();
  fotoSorpresaTomada = false;

  ocultarEstados(pantallaIdioma);
  botonSiguienteIdioma.classList.add('esta-desactivado');

  ocultarEstados(pantallaGenero);
  botonSiguienteGenero.classList.add('esta-desactivado');

  // Las 4 preguntas (imagen + botones invisibles) se limpian igual: se
  // ocultan las imágenes de estado y se vuelve a tapar "Siguiente".
  ['screen-question-1', 'screen-question-2', 'screen-question-3', 'screen-question-4'].forEach((idPantalla) => {
    const pantalla = document.getElementById(idPantalla);
    ocultarEstados(pantalla);
    pantalla.querySelectorAll('[data-siguiente]').forEach((boton) => boton.classList.add('esta-desactivado'));
  });

  imagenPregunta3.classList.remove('is-watched');
  clearTimeout(idTemporizadorVigilancia);

  cuadriculaAcciones.querySelectorAll('.action-chip').forEach((b) => b.classList.remove('is-selected'));

  fotoEvaluacion.src = '';
  barraProgresoEvaluacion.style.width = '0%';
  barraProgresoEvaluacion.textContent = '0%';

  mostrarPantalla('screen-idle');
}

alRecibirMensaje((mensaje) => {
  if (mensaje.type === 'session:update' && mensaje.payload.estado === 'IDLE') {
    volverAlInicio();
  }
});

// Cuando llega desde el servidor la foto que ha hecho la segunda
// pantalla, se muestra aquí, en el recuadro de "Comunicado Oficial".
alRecibirMensaje((mensaje) => {
  if (mensaje.type === 'session:update' && mensaje.payload.foto) {
    fotoEvaluacion.src = mensaje.payload.foto;
  }
});

// --- Puesta en marcha --------------------------------------------------------

conectarConServidor();
construirRuedaAnios();
construirCuadriculaAcciones();

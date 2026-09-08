// Este es el "cerebro" de la segunda pantalla: "VER, OÍR Y CHIVAR"
// (sección 10 del prompt). No hace preguntas ni recoge datos: solo
// escucha lo que va pasando en la pantalla táctil (a través del
// servidor) y dibuja el expediente que se va acumulando.

// Orden y textos con los que se muestra cada categoría en el expediente
// ("Las paredes oyen"). El texto que se ve en pantalla puede ser distinto
// del nombre "oficial" de la categoría (el que usa evaluation.js), porque
// así aparece en el diseño.
const ORDEN_EXPEDIENTE = [
  { categoria: 'CRITICAR AL RÉGIMEN', texto: 'CRITICAR AL RÉGIMEN POLÍTICO' },
  { categoria: 'PARTICIPAR EN MANIFESTACIONES', texto: 'PARTICIPAR EN MANIFESTACIONES' },
  { categoria: 'MANTENER CONDUCTAS INMORALES', texto: 'MANTENER CONDUCTAS INMORALES' },
  { categoria: 'ACTUAR SIN AUTORIZACIÓN', texto: 'DECIDIR SIN PERMISO' },
  { categoria: 'CONSUMIR CONTENIDOS NO AUTORIZADOS', texto: 'CONSUMIR CONTENIDOS\nNO AUTORIZADOS' },
  { categoria: 'UTILIZAR UNA LENGUA NO AUTORIZADA', texto: 'UTILIZAR UNA LENGUA\nNO AUTORIZADA' }
];

// Cómo se escribe cada género en el ticket (abreviado, como en el diseño).
const LETRA_SEGUN_GENERO = { hombre: 'M', mujer: 'F' };

const pantallaReposo = document.getElementById('surveillance-idle');
const pantallaExpediente = document.getElementById('surveillance-active');
const casillaNumeroExpediente = document.getElementById('surveillance-numero');
const casillaGenero = document.getElementById('surveillance-genero');
const casillaAnio = document.getElementById('surveillance-anio');
const listaCategorias = document.getElementById('surveillance-categorias');
const videoVigilancia = document.getElementById('surveillance-video');
const videoReposo = document.getElementById('surveillance-video-reposo');

// Dibuja de nuevo el expediente completo con los datos de la sesión.
function dibujarExpediente(sesion) {
  casillaNumeroExpediente.textContent = sesion.numeroExpediente || '-----';
  casillaGenero.textContent = LETRA_SEGUN_GENERO[sesion.genero] || '—';
  casillaAnio.textContent = sesion.anioNacimiento || '—';

  listaCategorias.innerHTML = '';
  const conductasDetectadas = sesion.conductas || [];

  ORDEN_EXPEDIENTE.forEach(({ categoria, texto }) => {
    const fila = document.createElement('div');
    fila.className = 'surveillance-categoria';
    if (conductasDetectadas.includes(categoria)) fila.classList.add('is-checked');

    const casillaCheck = document.createElement('span');
    casillaCheck.className = 'surveillance-categoria__box';

    const etiqueta = document.createElement('span');
    etiqueta.className = 'surveillance-categoria__label';
    etiqueta.textContent = texto;

    fila.appendChild(casillaCheck);
    fila.appendChild(etiqueta);
    listaCategorias.appendChild(fila);
  });
}

// Decide si mostrar la pantalla de reposo o la del expediente, según si
// hay ya alguien haciendo el cuestionario.
function mostrarSegunSesion(sesion) {
  const hayAlguienHaciendoElCuestionario = sesion.estado && sesion.estado !== 'IDLE';

  pantallaReposo.classList.toggle('is-active', !hayAlguienHaciendoElCuestionario);
  pantallaExpediente.classList.toggle('is-active', hayAlguienHaciendoElCuestionario);

  if (hayAlguienHaciendoElCuestionario) {
    dibujarExpediente(sesion);
    iniciarCamara(videoVigilancia);
  }
}

// Cada vez que llega un mensaje del servidor con los datos de la sesión,
// se actualiza la pantalla.
alRecibirMensaje((mensaje) => {
  if (mensaje.type === 'session:update') mostrarSegunSesion(mensaje.payload);
});

// Cuando la pantalla táctil pide una foto (en el momento indicado del
// recorrido), se captura aquí mismo, con la cámara que ya está en
// directo, y se guarda en la sesión para que todos la puedan usar.
// Si la cámara todavía no está lista (por ejemplo, justo al principio),
// se reintenta unas cuantas veces antes de rendirse.
alRecibirMensaje((mensaje) => {
  if (mensaje.type !== 'foto:solicitar') return;
  intentarCapturarFoto();
});

function intentarCapturarFoto(intentosRestantes = 8) {
  const foto = capturarFoto(videoVigilancia);

  if (foto) {
    enviarMensaje('session:action', { foto });
    return;
  }

  if (intentosRestantes > 0) {
    setTimeout(() => intentarCapturarFoto(intentosRestantes - 1), 300);
  } else {
    console.warn('No se ha podido hacer la foto: la cámara no está lista.');
  }
}

// La webcam se enciende ya desde el principio (no hace falta esperar a
// que nadie empiece el cuestionario), para que se vea en directo a
// través del hueco transparente de la imagen de reposo.
iniciarCamara(videoReposo);

conectarConServidor();

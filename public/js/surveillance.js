// Este es el "cerebro" de la segunda pantalla: "VER, OÍR Y CHIVAR"
// (sección 10 del prompt). No hace preguntas ni recoge datos: solo
// escucha lo que va pasando en la pantalla táctil (a través del
// servidor) y dibuja el expediente que se va acumulando.

// El expediente que se ve en pantalla es el PNG "Registro de Conducta"
// (registro-base.png) con un PNG de tachón encima por cada conducta.
// evaluation.js guarda las conductas con su nombre en mayúsculas; aquí
// se traduce ese nombre al identificador que lleva cada PNG de tachón
// (el atributo data-conducta del HTML).
const NOMBRE_CONDUCTA_A_ID = {
  'CRITICAR AL RÉGIMEN': 'criticar_regimen',
  'PARTICIPAR EN MANIFESTACIONES': 'participar_manifestaciones',
  'MANTENER CONDUCTAS INMORALES': 'conductas_inmorales',
  'CONSUMIR CONTENIDOS NO AUTORIZADOS': 'contenidos_no_autorizados',
  'ACTUAR SIN AUTORIZACIÓN': 'actuar_sin_autorizacion',
  'UTILIZAR UNA LENGUA NO AUTORIZADA': 'lengua_no_autorizada'
};

const pantallaReposo = document.getElementById('surveillance-idle');
const pantallaExpediente = document.getElementById('surveillance-active');
const casillaNumeroExpediente = document.getElementById('surveillance-numero');
const tachones = document.querySelectorAll('.registro__tachon');
const videoVigilancia = document.getElementById('surveillance-video');
const videoReposo = document.getElementById('surveillance-video-reposo');

// Dibuja de nuevo el expediente con los datos de la sesión: escribe el
// número y enseña u oculta cada tachón según las conductas detectadas.
function dibujarExpediente(sesion) {
  casillaNumeroExpediente.textContent = sesion.numeroExpediente || '';

  const idsActivos = (sesion.conductas || [])
    .map((nombre) => NOMBRE_CONDUCTA_A_ID[nombre])
    .filter(Boolean);

  tachones.forEach((tachon) => {
    tachon.hidden = !idsActivos.includes(tachon.dataset.conducta);
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

// Cabecera de la pantalla activa: va rotando entre 3 banners, 10 segundos
// cada uno, con una barra que se llena de negro para marcar ese tiempo.
const BANNERS_CABECERA = [
  'assets/images/banner-1.png',
  'assets/images/banner-2.png',
  'assets/images/banner-3.png'
];
const DURACION_BANNER_MS = 10000;

const imagenBanner = document.getElementById('surveillance-banner');
const rellenoBarraCabecera = document.getElementById('surveillance-barra-relleno');
let indiceBannerActual = 0;

function mostrarBanner(indice) {
  imagenBanner.src = BANNERS_CABECERA[indice];

  // Se quita la barra a 0% y se obliga al navegador a "dibujarla" así
  // antes de volver a ponerla en marcha; si no, como ya estaba en el DOM,
  // seguiría animándose desde donde se había quedado en vez de reiniciar.
  rellenoBarraCabecera.classList.remove('en-marcha');
  rellenoBarraCabecera.getBoundingClientRect();
  rellenoBarraCabecera.classList.add('en-marcha');
}

mostrarBanner(indiceBannerActual);
setInterval(() => {
  indiceBannerActual = (indiceBannerActual + 1) % BANNERS_CABECERA.length;
  mostrarBanner(indiceBannerActual);
}, DURACION_BANNER_MS);

conectarConServidor();

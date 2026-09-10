// Este archivo controla la webcam (sección 11 del prompt).
// Enciende la cámara y la muestra en directo dentro de un <video>, y
// permite hacer una foto fija cuando la pantalla táctil lo pide.

let flujoCamara = null; // guarda la señal de vídeo mientras la cámara está encendida
let elementosVideoConectados = []; // <video> que tienen que mostrar la cámara
let intentandoEncender = false; // evita pedir la cámara dos veces a la vez

// Enciende la webcam y la conecta al elemento <video> que se le pase.
// Si la cámara ya estaba encendida, reutiliza la misma señal en vez de
// pedirla otra vez. Si algo falla (el navegador todavía no ha dado
// permiso, la cámara tarda en responder, etc.), lo vuelve a intentar
// solo, sin rendirse a la primera.
async function iniciarCamara(elementoVideo, intentosRestantes = 10) {
  if (!elementoVideo) return;

  // Nos acordamos de este <video> para volver a enchufarle la señal
  // cuando la cámara esté lista.
  if (!elementosVideoConectados.includes(elementoVideo)) {
    elementosVideoConectados.push(elementoVideo);
  }

  // Si ya tenemos la señal, se la damos a este <video> y listo.
  if (flujoCamara) {
    conectarFlujoA(elementoVideo);
    return;
  }

  // Si ya hay otra llamada intentando encender la cámara, no hacemos
  // nada más: cuando lo consiga, avisará a todos los <video>.
  if (intentandoEncender) return;
  intentandoEncender = true;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('Este navegador no permite usar la webcam desde la página.');
    intentandoEncender = false;
    return;
  }

  try {
    flujoCamara = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    console.log('Webcam encendida correctamente.');
    intentandoEncender = false;
    // Enchufamos la señal a todos los <video> que la estaban esperando.
    elementosVideoConectados.forEach(conectarFlujoA);
  } catch (error) {
    intentandoEncender = false;
    console.warn('No se ha podido acceder a la webcam:', error);

    // Reintento automático: puede que el permiso todavía no esté dado o
    // que la cámara tarde un poco en estar disponible al arrancar.
    if (intentosRestantes > 0) {
      setTimeout(() => iniciarCamara(elementoVideo, intentosRestantes - 1), 1000);
    }
  }
}

// Le pasa la señal de la cámara a un <video> y se asegura de que empiece
// a reproducirse (algunos navegadores no arrancan el vídeo solos).
function conectarFlujoA(elementoVideo) {
  if (!elementoVideo || !flujoCamara) return;
  if (elementoVideo.srcObject !== flujoCamara) {
    elementoVideo.srcObject = flujoCamara;
  }
  const promesa = elementoVideo.play();
  if (promesa && promesa.catch) {
    promesa.catch((error) => console.warn('El vídeo de la webcam no ha arrancado solo:', error));
  }
}

// Hace una foto fija del vídeo actual y la devuelve como una imagen en
// formato de texto (base64), lista para guardar o enviar al servidor.
// Se le sube un poco la exposición (brillo) al capturar, porque la webcam
// suele salir oscura y en el ticket impreso se ve peor todavía.
function capturarFoto(elementoVideo) {
  if (!elementoVideo || !elementoVideo.videoWidth) return null;

  const lienzo = document.createElement('canvas');
  lienzo.width = elementoVideo.videoWidth;
  lienzo.height = elementoVideo.videoHeight;

  const contexto = lienzo.getContext('2d');
  contexto.filter = 'brightness(1.35) contrast(1.05)';
  contexto.drawImage(elementoVideo, 0, 0);

  return lienzo.toDataURL('image/jpeg', 0.8);
}

// Apaga la webcam (por ejemplo, al reiniciar la experiencia).
function detenerCamara() {
  if (!flujoCamara) return;
  flujoCamara.getTracks().forEach((pista) => pista.stop());
  flujoCamara = null;
}

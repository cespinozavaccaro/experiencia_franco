// Este archivo controla la webcam (sección 11 del prompt).
// Por ahora solo enciende la cámara y la muestra en directo dentro de un
// <video>. La pantalla especial de "SOLICITANDO VERIFICACIÓN..." /
// "CAPTURANDO IMAGEN" se añadirá cuando llegue su diseño.

let flujoCamara = null; // guarda la señal de vídeo mientras la cámara está encendida

// Enciende la webcam y la conecta al elemento <video> que se le pase.
// Si la cámara ya estaba encendida (por ejemplo, porque se encendió antes
// en otra pantalla), reutiliza la misma señal en vez de pedirla otra vez.
async function iniciarCamara(elementoVideo) {
  if (!elementoVideo) return;

  if (!flujoCamara) {
    try {
      flujoCamara = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      console.log('Webcam encendida correctamente.');
    } catch (error) {
      // Si esto aparece en la consola, revisar si el navegador está
      // esperando que se acepte el permiso de la cámara (a veces el
      // aviso aparece pero no se nota si no se mira esa pestaña).
      console.warn('No se ha podido acceder a la webcam:', error);
      return;
    }
  }

  elementoVideo.srcObject = flujoCamara;
}

// Hace una foto fija del vídeo actual y la devuelve como una imagen en
// formato de texto (base64), lista para guardar o enviar al servidor.
function capturarFoto(elementoVideo) {
  if (!elementoVideo || !elementoVideo.videoWidth) return null;

  const lienzo = document.createElement('canvas');
  lienzo.width = elementoVideo.videoWidth;
  lienzo.height = elementoVideo.videoHeight;
  lienzo.getContext('2d').drawImage(elementoVideo, 0, 0);

  return lienzo.toDataURL('image/jpeg', 0.8);
}

// Apaga la webcam (por ejemplo, al reiniciar la experiencia).
function detenerCamara() {
  if (!flujoCamara) return;
  flujoCamara.getTracks().forEach((pista) => pista.stop());
  flujoCamara = null;
}

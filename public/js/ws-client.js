// Este archivo conecta cada pantalla (la táctil y la de vigilancia) con el
// servidor, usando WebSocket. Un WebSocket es como una llamada de teléfono
// que se queda abierta: el servidor puede avisar a las pantallas en
// cualquier momento, sin que ellas tengan que estar preguntando todo el
// rato "¿hay algo nuevo?".

let conexion = null;
const funcionesAlRecibirMensaje = [];
const funcionesAlConectar = [];

// Abre la conexión con el servidor. Si se corta (por ejemplo, si se
// reinicia el servidor), lo intenta otra vez solo, para que la instalación
// se recupere sin que nadie tenga que hacer nada.
function conectarConServidor() {
  const protocolo = window.location.protocol === 'https:' ? 'wss' : 'ws';
  conexion = new WebSocket(`${protocolo}://${window.location.host}`);

  conexion.addEventListener('open', () => {
    funcionesAlConectar.forEach((funcion) => funcion());
  });

  conexion.addEventListener('message', (evento) => {
    let mensaje;
    try {
      mensaje = JSON.parse(evento.data);
    } catch (error) {
      return;
    }
    funcionesAlRecibirMensaje.forEach((funcion) => funcion(mensaje));
  });

  conexion.addEventListener('close', () => {
    setTimeout(conectarConServidor, 1000);
  });

  return conexion;
}

// Registra una función que se ejecutará cada vez que se abra la conexión.
function alConectar(funcion) {
  funcionesAlConectar.push(funcion);
}

// Registra una función que se ejecutará cada vez que llegue un mensaje.
function alRecibirMensaje(funcion) {
  funcionesAlRecibirMensaje.push(funcion);
}

// Envía un mensaje al servidor. "tipo" dice de qué se trata (por ejemplo
// "session:action") y "datos" lleva la información.
function enviarMensaje(tipo, datos) {
  if (conexion && conexion.readyState === WebSocket.OPEN) {
    conexion.send(JSON.stringify({ type: tipo, payload: datos }));
  }
}

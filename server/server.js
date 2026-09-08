// Este es el servidor de la instalación "Esto con Franco sí pasaba".
// La Raspberry Pi hace de servidor: reparte las páginas web (HTML, CSS,
// JS) y mantiene conectadas la pantalla táctil y la segunda pantalla,
// para que ambas vean siempre los mismos datos en tiempo real. No hace
// falta internet para que esto funcione.

const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');

const { crearSesion, obtenerSesion, actualizarSesion, reiniciarSesion } = require('./session');
const { imprimirOrdenDetencion } = require('./printing');

const PUERTO = process.env.PORT || 3000;

// "aplicacion" es el servidor web normal (reparte los archivos de public/).
const aplicacion = express();
aplicacion.use(express.json({ limit: '5mb' })); // permite recibir la foto como texto largo (base64)
aplicacion.use(express.static(path.join(__dirname, '..', 'public')));

// "servidorHttp" envuelve la aplicación anterior para que también pueda
// usarse con WebSocket (la conexión en tiempo real entre pantallas).
const servidorHttp = http.createServer(aplicacion);
const servidorWebSocket = new WebSocketServer({ server: servidorHttp });

// Envía un mensaje a TODAS las pantallas conectadas (la táctil y la
// segunda pantalla), para que las dos se actualicen a la vez.
function enviarATodos(tipo, datos) {
  const mensaje = JSON.stringify({ type: tipo, payload: datos });
  servidorWebSocket.clients.forEach((conexion) => {
    if (conexion.readyState === WebSocket.OPEN) {
      conexion.send(mensaje);
    }
  });
}

// Decide qué hacer según el tipo de mensaje que llega desde una pantalla.
function gestionarMensaje(mensaje) {
  switch (mensaje.type) {
    case 'session:start': {
      const sesion = crearSesion();
      enviarATodos('session:update', sesion);
      break;
    }
    case 'session:action': {
      const sesion = actualizarSesion(mensaje.payload);
      enviarATodos('session:update', sesion);
      break;
    }
    case 'session:reset': {
      const sesion = reiniciarSesion();
      enviarATodos('session:update', sesion);
      break;
    }
    case 'foto:solicitar': {
      // La pantalla táctil pide que se haga una foto. Se reenvía a todas
      // las pantallas: la que tiene la cámara encendida (la segunda) la
      // escucha y hace la captura.
      enviarATodos('foto:solicitar', {});
      break;
    }
    default:
      console.warn('Mensaje de WebSocket no reconocido:', mensaje.type);
  }
}

servidorWebSocket.on('connection', (conexion) => {
  // Cuando una pantalla se conecta, le mandamos enseguida los datos
  // actuales, para que no empiece "en blanco".
  conexion.send(JSON.stringify({ type: 'session:update', payload: obtenerSesion() }));

  conexion.on('message', (textoRecibido) => {
    let mensaje;
    try {
      mensaje = JSON.parse(textoRecibido);
    } catch (error) {
      console.warn('Mensaje de WebSocket inválido:', textoRecibido.toString());
      return;
    }
    gestionarMensaje(mensaje);
  });
});

// Ruta para imprimir el ticket. La pantalla táctil llamará a esto cuando
// termine el recorrido. La lógica de impresión vive en printing.js porque
// es el servidor quien tiene acceso físico a la impresora.
aplicacion.post('/api/imprimir', (peticion, respuesta) => {
  const sesion = obtenerSesion();
  imprimirOrdenDetencion(sesion);
  respuesta.json({ ok: true });
});

servidorHttp.listen(PUERTO, '0.0.0.0', () => {
  console.log(`"Esto con Franco sí pasaba" escuchando en http://localhost:${PUERTO}`);
  console.log(`Pantalla táctil (cuestionario):        http://localhost:${PUERTO}/index.html`);
  console.log(`Segunda pantalla (VER, OÍR Y CHIVAR):  http://localhost:${PUERTO}/surveillance.html`);
});

# Esto con Franco sí pasaba

Instalación interactiva para proyecto académico de Diseño Interactivo.
La Raspberry Pi 5 funciona como servidor local (no requiere internet) y
sirve dos vistas por navegador:

- **Pantalla táctil (cuestionario):** `http://localhost:3000/index.html`
- **Segunda pantalla (VER, OÍR Y CHIVAR):** `http://localhost:3000/surveillance.html`

Ambas pantallas se sincronizan en tiempo real mediante WebSocket sobre el
mismo servidor Node.js.

## 1. Preparar la Raspberry Pi 5

1. Instala Node.js (versión LTS) si no está ya instalado:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
   (Este paso necesita internet una única vez, solo para instalar Node y
   las dependencias. Una vez instalado, la aplicación funciona sin red.)

2. Copia la carpeta del proyecto a la Raspberry Pi, por ejemplo a
   `~/esto-con-franco`.

## 2. Abrir el proyecto en Visual Studio Code

- Si trabajas directamente en la Raspberry Pi con pantalla y teclado:
  abre VS Code (`code ~/esto-con-franco`) o desde su interfaz gráfica.
- Si prefieres editar desde otro ordenador: instala la extensión
  **Remote - SSH** en VS Code, conéctate a la Raspberry Pi por SSH y abre
  la carpeta del proyecto de forma remota.

## 3. Instalar dependencias y ejecutar el servidor

Desde la terminal integrada de VS Code, dentro de la carpeta del proyecto:

```bash
npm install
npm start
```

Deberías ver:

```
"Esto con Franco sí pasaba" escuchando en http://localhost:3000
Pantalla táctil (cuestionario):     http://localhost:3000/index.html
Segunda pantalla (VER, OÍR Y CHIVAR): http://localhost:3000/surveillance.html
```

## 4. Mostrar cada pantalla en su monitor

Con las dos pantallas conectadas a la Raspberry Pi (modo escritorio
extendido, no espejo), abre un navegador Chromium en modo kiosco en cada
una:

```bash
# En la pantalla táctil (monitor 1)
chromium-browser --kiosk --app=http://localhost:3000/index.html --window-position=0,0

# En la segunda pantalla (monitor 2), ajustando la posición X según tu
# resolución (por ejemplo, si el primer monitor mide 1080px de ancho).
# --use-fake-ui-for-media-stream hace que Chromium acepte el permiso de
# la webcam automáticamente (sigue siendo la cámara real, solo evita el
# aviso de permiso, que en un kiosco sin ratón nadie podría aceptar):
chromium-browser --kiosk --use-fake-ui-for-media-stream --app=http://localhost:3000/surveillance.html --window-position=1080,0
```

**Importante sobre el permiso de la webcam**: solo la segunda pantalla
(`surveillance.html`) usa la cámara. La primera vez que Chromium la
abra sin el flag de arriba, pedirá permiso con un aviso en pantalla; si
nadie lo acepta, la cámara nunca se enciende y no se podrá hacer la foto
del ticket. Usando `--use-fake-ui-for-media-stream` este problema no
aparece, porque el permiso se concede solo, sin aviso.

Puedes automatizar el arranque de ambas ventanas y del servidor mediante
un script de inicio o un servicio `systemd`, algo que añadiremos en una
fase posterior del proyecto.

## 5. Webcam e impresora térmica

- La **webcam USB** solo la usa la segunda pantalla (`surveillance.html`),
  directamente desde el navegador (`getUserMedia`). Se enciende sola en
  cuanto alguien pulsa "Empezar" y se queda encendida de fondo, en
  directo, durante todo el recorrido.
- La **impresora térmica** (una Zijiang ZJ-58 por USB) ya está integrada
  de verdad. El sistema la tiene dada de alta como una cola de impresión
  normal llamada "Impresora" (`lpstat -p` para comprobarlo). La lógica de
  impresión vive de forma aislada en `server/printing.js`: construye el
  ticket completo (texto + la foto capturada) como un PDF con `pdfkit` y
  se lo manda a esa cola con el comando `lp`. Si en algún momento se
  cambia de impresora, solo hay que tocar este archivo.

## 6. Estado actual del desarrollo

Implementado hasta ahora (primera estación del cuestionario):

- Esqueleto del proyecto, servidor local y sistema de sesión del
  participante (`server/session.js`), siguiendo la estructura de datos
  de la sección 5 del prompt.
- Sincronización en tiempo real entre pantalla táctil y segunda pantalla
  vía WebSocket (`server/server.js`, `public/js/ws-client.js`).
- Pantallas: Inicio, Selección de idioma (+ aviso de idioma no
  autorizado), Selección de género (+ aviso de precaución), Año de
  nacimiento, Acciones cotidianas, Preguntas 1 a 4, y pantalla de
  evaluación ("Comunicado Oficial").
- Segunda pantalla con su estado de reposo ("La Pedagogía del Terror") y
  su estado activo ("Las paredes oyen"), con la webcam en directo
  ocupando todo el fondo y el expediente flotando encima, en
  construcción en tiempo real.
- Lógica de activación de conductas (`public/js/evaluation.js`) según la
  tabla de categorías proporcionada.
- Foto sorpresa (una sola, al primer clic en "¿Qué cosas has hecho
  alguna vez?"), capturada por la segunda pantalla y compartida con la
  primera para el ticket.
- Impresión real del ticket (texto + foto) en la impresora térmica al
  llegar a "Comunicado Oficial".
- Reinicio automático: tras imprimir, la sesión se borra sola y las dos
  pantallas vuelven a su estado inicial, listas para la siguiente
  persona.

Pendiente (a la espera de los diseños correspondientes):

- Pregunta 5 (varía según perfil).
- Referencias históricas concretas (leyes exactas) en el ticket.
- Sustituir el marcador de posición del águila del régimen
  (`public/assets/images/`) por el archivo de imagen real.
- El aviso "cuando alguien mira" en la pregunta de privacidad está
  simulado con un temporizador; si el proyecto necesita detección real
  por visión por computador, se implementará como una fase aparte.

// Este archivo se encarga solo de "imprimir". Está separado del resto de
// la aplicación (sección 13 del prompt) para que, si cambiamos de
// impresora, solo haya que tocar este archivo.
//
// La impresora térmica (una Zijiang ZJ-58, conectada por USB) ya está
// dada de alta en el sistema como una cola de impresión normal, con el
// nombre "Impresora" (se puede comprobar con el comando `lpstat -p`).
// Para poder imprimir también la foto (no solo texto), se construye un
// PDF con el ticket completo -texto + foto- y se manda esa cola con el
// comando `lp`. La propia impresora (a través de su driver) se encarga
// de convertirlo a los puntos que necesita el papel térmico.

const { spawn } = require('child_process');
const PDFDocument = require('pdfkit');

const NOMBRE_COLA_IMPRESORA = 'Impresora';
const ANCHURA_TICKET = 32; // caracteres por línea, para el papel de 58 mm

const MM_A_PUNTOS = 2.83465; // 1 mm en puntos PDF (unidad que usa pdfkit)
const ANCHO_PAPEL_MM = 48; // ancho útil de impresión del papel de 58 mm
const MARGEN_MM = 3;
const TAMANO_LETRA = 8;
const ALTURA_LINEA = TAMANO_LETRA * 1.4;

// Centra una línea de texto dentro del ancho del ticket.
function centrar(texto) {
  const espacios = Math.max(0, Math.floor((ANCHURA_TICKET - texto.length) / 2));
  return ' '.repeat(espacios) + texto;
}

// Reparte un texto largo en varias líneas, cortando por palabras
// completas, para que no se corte ninguna palabra a la mitad.
function repartirEnLineas(texto) {
  const palabras = texto.split(' ');
  const lineas = [];
  let lineaActual = '';

  palabras.forEach((palabra) => {
    const posibleLinea = lineaActual ? `${lineaActual} ${palabra}` : palabra;
    if (posibleLinea.length > ANCHURA_TICKET) {
      lineas.push(lineaActual);
      lineaActual = palabra;
    } else {
      lineaActual = posibleLinea;
    }
  });
  if (lineaActual) lineas.push(lineaActual);

  return lineas;
}

// Convierte la fecha guardada (formato ISO) en algo legible, tipo
// "20/11/2026  18:43".
function formatearFecha(timestampISO) {
  const fecha = new Date(timestampISO);
  const dosDigitos = (numero) => String(numero).padStart(2, '0');
  const diaMesAnio = `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
  const horaMinuto = `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
  return `${diaMesAnio}  ${horaMinuto}`;
}

// Construye, línea a línea, el texto del ticket (sección 12 del prompt).
// Se usa tanto para el aviso por consola como para el PDF que se imprime,
// así el contenido nunca queda desincronizado entre los dos.
// Las referencias históricas concretas se añadirán cuando se confirme su
// texto definitivo; de momento se deja el hueco, sin inventarlas.
function construirLineasTicket(datosParticipante) {
  const lineas = [];

  lineas.push(centrar('REGISTRO DE CONDUCTA'));
  lineas.push(centrar(`Nº ${datosParticipante.numeroExpediente}`));
  lineas.push('');
  lineas.push(formatearFecha(datosParticipante.timestamp));
  lineas.push('');
  lineas.push(centrar('SUJETO CLASIFICADO'));
  lineas.push('-'.repeat(ANCHURA_TICKET));
  lineas.push('CONDUCTAS DETECTADAS:');
  lineas.push('');

  const conductas = datosParticipante.conductas || [];
  if (conductas.length === 0) {
    lineas.push('(ninguna detectada)');
  } else {
    conductas.forEach((conducta, indice) => {
      const numero = String(indice + 1).padStart(2, '0');
      lineas.push(`${numero} - ${conducta}`);
    });
  }

  lineas.push('-'.repeat(ANCHURA_TICKET));
  lineas.push(centrar('ORDEN DE DETENCIÓN'));
  lineas.push(centrar(`Nº ${datosParticipante.numeroExpediente}`));
  lineas.push('');
  lineas.push(centrar('DOCUMENTO FICTICIO'));
  lineas.push('');
  lineas.push(...repartirEnLineas(
    'Esta reconstrucción utiliza legislación, normas y mecanismos de control reales de la dictadura franquista.'
  ));
  lineas.push('');
  lineas.push(...repartirEnLineas(
    'La correspondencia entre la conducta actual y la consecuencia histórica no es una equivalencia jurídica literal.'
  ));
  lineas.push('-'.repeat(ANCHURA_TICKET));
  lineas.push(centrar('50 AÑOS EN LIBERTAD'));
  lineas.push(centrar('¿VIVIRÍAS MEJOR EN'));
  lineas.push(centrar('UNA DICTADURA?'));
  lineas.push('');
  lineas.push('');
  lineas.push('');

  return lineas;
}

// Convierte la foto guardada (una "data URL" tipo "data:image/jpeg;base64,...")
// en los bytes de la imagen, listos para meterlos en el PDF.
function decodificarFoto(foto) {
  if (!foto) return null;
  const base64 = foto.includes(',') ? foto.split(',')[1] : foto;
  try {
    return Buffer.from(base64, 'base64');
  } catch (error) {
    console.warn('No se ha podido leer la foto del participante:', error.message);
    return null;
  }
}

// Construye el PDF completo del ticket (foto + texto) y devuelve sus
// bytes ya preparados para imprimir.
function construirPdfTicket(datosParticipante) {
  return new Promise((resolve, reject) => {
    const lineas = construirLineasTicket(datosParticipante);
    const fotoBuffer = decodificarFoto(datosParticipante.foto);

    const anchoPt = ANCHO_PAPEL_MM * MM_A_PUNTOS;
    const margenPt = MARGEN_MM * MM_A_PUNTOS;
    const anchoUtilPt = anchoPt - margenPt * 2;

    // Se calcula la altura de la foto suponiendo una proporción 4:3
    // (la misma que usa la webcam al hacer la captura).
    const altoFotoPt = fotoBuffer ? anchoUtilPt * (3 / 4) : 0;
    const espacioTrasFoto = fotoBuffer ? 10 : 0;
    const altoTextoPt = lineas.length * ALTURA_LINEA;
    const altoTotalPt = margenPt * 2 + altoFotoPt + espacioTrasFoto + altoTextoPt + 20;

    const documento = new PDFDocument({
      size: [anchoPt, altoTotalPt],
      margins: { top: margenPt, bottom: margenPt, left: margenPt, right: margenPt }
    });

    const trozos = [];
    documento.on('data', (trozo) => trozos.push(trozo));
    documento.on('end', () => resolve(Buffer.concat(trozos)));
    documento.on('error', reject);

    if (fotoBuffer) {
      try {
        documento.image(fotoBuffer, margenPt, margenPt, { width: anchoUtilPt });
        documento.y = margenPt + altoFotoPt + espacioTrasFoto;
      } catch (error) {
        console.warn('No se ha podido incluir la foto en el ticket:', error.message);
      }
    }

    documento.font('Courier').fontSize(TAMANO_LETRA);
    lineas.forEach((linea) => {
      documento.text(linea, { width: anchoUtilPt, align: 'left' });
    });

    documento.end();
  });
}

// Manda los bytes ya construidos (el PDF) a la cola de impresión del
// sistema (equivale a escribir en la terminal: `lp -d Impresora`).
function enviarAImpresora(bytes) {
  const proceso = spawn('lp', ['-d', NOMBRE_COLA_IMPRESORA]);

  proceso.on('error', (error) => {
    console.warn(`No se ha podido hablar con la impresora "${NOMBRE_COLA_IMPRESORA}": ${error.message}`);
  });

  proceso.on('exit', (codigo) => {
    if (codigo === 0) {
      console.log(`Ticket enviado a la impresora "${NOMBRE_COLA_IMPRESORA}".`);
    } else {
      console.warn(`La impresora "${NOMBRE_COLA_IMPRESORA}" ha devuelto un error (código ${codigo}).`);
    }
  });

  proceso.stdin.write(bytes);
  proceso.stdin.end();
}

async function imprimirOrdenDetencion(datosParticipante) {
  const lineas = construirLineasTicket(datosParticipante);

  // Se deja también en la consola, para poder comprobar el contenido sin
  // gastar papel cada vez que se prueba.
  console.log('================================================================');
  console.log(lineas.join('\n'));
  console.log('================================================================');

  try {
    const pdf = await construirPdfTicket(datosParticipante);
    enviarAImpresora(pdf);
  } catch (error) {
    console.warn('No se ha podido generar el PDF del ticket:', error.message);
  }

  return true;
}

module.exports = { imprimirOrdenDetencion };

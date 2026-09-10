// Este archivo se encarga solo de "imprimir". Está separado del resto de
// la aplicación (sección 13 del prompt) para que, si cambiamos de
// impresora, solo haya que tocar este archivo.
//
// La impresora térmica (una Zijiang ZJ-58, conectada por USB) ya está
// dada de alta en el sistema como una cola de impresión normal, con el
// nombre "Impresora" (se puede comprobar con el comando `lpstat -p`).
// El ticket se construye como un PDF (con pdfkit) y se manda a esa cola
// con el comando `lp`. La impresora, a través de su driver, lo convierte
// a los puntos que necesita el papel térmico.
//
// El ticket tiene esta estructura (de arriba abajo):
//   1. Fecha y hora           -> texto (fuente GeistMono)
//   2. Imagen INICIO           -> ticket-inicio.png a ancho completo
//   3. "SOSPECHOSO" + Nº       -> texto (fuente StardosStencil / GeistMono)
//   4. Fotografía              -> la foto que ha hecho la webcam
//   5. Género, edad y año      -> texto (GeistMono)
//   6. Conductas detectadas    -> texto (GeistMono), con las normas
//                                 infringidas sacadas de conductas.json
//   7. Imagen FINAL            -> ticket-final.png a ancho completo

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const PDFDocument = require('pdfkit');

const NOMBRE_COLA_IMPRESORA = 'Impresora';

// Datos de las conductas (mismo archivo que usa la pantalla 2). De aquí
// se saca, para cada conducta detectada, el nombre legal y el texto de
// la norma infringida que se imprime en el ticket.
const RUTA_DATOS_CONDUCTAS = path.join(__dirname, '..', 'public', 'datos', 'conductas.json');
let datosConductas = { conductas: [], cuestionario: [] };
try {
  datosConductas = JSON.parse(fs.readFileSync(RUTA_DATOS_CONDUCTAS, 'utf8'));
} catch (error) {
  console.warn('No se ha podido leer public/datos/conductas.json:', error.message);
}

// evaluation.js guarda cada conducta con su nombre en mayúsculas. Esta
// tabla lo traduce al identificador que usa conductas.json.
const NOMBRE_CONDUCTA_A_ID = {
  'CRITICAR AL RÉGIMEN': 'criticar_regimen',
  'PARTICIPAR EN MANIFESTACIONES': 'participar_manifestaciones',
  'MANTENER CONDUCTAS INMORALES': 'conductas_inmorales',
  'CONSUMIR CONTENIDOS NO AUTORIZADOS': 'contenidos_no_autorizados',
  'ACTUAR SIN AUTORIZACIÓN': 'actuar_sin_autorizacion',
  'UTILIZAR UNA LENGUA NO AUTORIZADA': 'lengua_no_autorizada'
};

// Devuelve la ficha completa (de conductas.json) de una conducta a
// partir de su nombre en mayúsculas, o null si no se encuentra.
function fichaConducta(nombreConducta) {
  const id = NOMBRE_CONDUCTA_A_ID[nombreConducta];
  return datosConductas.conductas.find((conducta) => conducta.id === id) || null;
}

// Medidas EXACTAS que exige el driver de la impresora (sacadas de su PPD):
//   - El papel de 58 mm son 164 puntos de ancho, y ese ancho es FIJO
//     (la impresora no acepta otro; si se le manda más, se atasca).
//   - Tiene un margen de hardware de 14 puntos (~5 mm) a cada lado que no
//     se puede imprimir. La zona imprimible es, por tanto, de 136 puntos.
// Hacemos la PÁGINA de 164 puntos (papel completo) y dejamos 15 puntos de
// margen a cada lado, así el contenido (134 pt) cae centrado dentro de la
// zona imprimible y no se corta ningún borde.
const ANCHO_PAGINA_PT = 164;
const MARGEN_PT = 15;

const RUTA_FUENTE_MONO = path.join(__dirname, 'fonts', 'GeistMono.ttf');
const RUTA_FUENTE_STENCIL = path.join(__dirname, 'fonts', 'StardosStencil-Bold.ttf');
const RUTA_IMAGEN_INICIO = path.join(__dirname, '..', 'public', 'assets', 'images', 'ticket-inicio.png');
const RUTA_IMAGEN_FINAL = path.join(__dirname, '..', 'public', 'assets', 'images', 'ticket-final.png');

// Proporción alto/ancho de las dos imágenes (medidas de los PNG originales),
// para saber cuánto ocuparán de alto al ponerlas a ancho completo.
const PROPORCION_IMAGEN_INICIO = 888 / 335;
const PROPORCION_IMAGEN_FINAL = 857 / 354;

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

// --- Pequeñas utilidades para dibujar ------------------------------------

// Deja un hueco vertical de "puntos" píxeles.
function hueco(doc, puntos) {
  doc.y += puntos;
}

// Dibuja una línea horizontal de lado a lado del contenido.
function lineaHorizontal(doc, x, ancho, discontinua = false) {
  doc.moveTo(x, doc.y).lineTo(x + ancho, doc.y).lineWidth(1);
  if (discontinua) doc.dash(3, { space: 3 });
  doc.stroke();
  doc.undash();
  doc.y += 4;
}

// Coloca una imagen a ancho completo y adelanta el cursor su alto.
function imagenAnchoCompleto(doc, rutaOBytes, x, ancho, proporcionAltoAncho) {
  const alto = ancho * proporcionAltoAncho;
  doc.image(rutaOBytes, x, doc.y, { width: ancho });
  doc.y += alto;
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

// Fecha y hora en el formato del diseño: "20 NOVIEMBRE 2026" y "13:35".
function partesFecha(timestampISO) {
  const fecha = timestampISO ? new Date(timestampISO) : new Date();
  const dosDigitos = (n) => String(n).padStart(2, '0');
  return {
    dia: `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`,
    hora: `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
  };
}

// --- Contenido del ticket ----------------------------------------------

// Dibuja TODO el ticket dentro del documento "doc". Es una función
// determinista: dibuja exactamente lo mismo cada vez que se llama, así
// se puede usar una primera vez solo para medir cuánto ocupa y una
// segunda vez para el PDF de verdad, ya con la altura justa.
function pintarTicket(doc, datos, fotoBuffer) {
  const margen = MARGEN_PT;
  const ancho = ANCHO_PAGINA_PT - margen * 2;

  doc.x = margen;
  doc.y = margen;

  const { dia, hora } = partesFecha(datos.timestamp);
  const genero = (datos.genero || '').toUpperCase() || '—';
  const edad = datos.edad || '—';
  const anioNacimiento = datos.anioNacimiento || '—';
  const numeroExpediente = String(datos.numeroExpediente || '0').padStart(5, '0');
  const conductas = datos.conductas || [];

  // 1) Fecha y hora
  doc.font('mono').fontSize(9).fillColor('#000000');
  doc.text(dia, margen, doc.y, { width: ancho, align: 'center' });
  doc.text(`EN MADRID, ${hora} HORAS`, margen, doc.y, { width: ancho, align: 'center' });
  hueco(doc, 8);

  // 2) Imagen de inicio (título + águila + "documento ficticio" + aviso)
  imagenAnchoCompleto(doc, RUTA_IMAGEN_INICIO, margen, ancho, PROPORCION_IMAGEN_INICIO);
  hueco(doc, 10);

  // 3) "SOSPECHOSO" y número de expediente en una caja
  lineaHorizontal(doc, margen, ancho);
  doc.font('stencil').fontSize(15);
  doc.text('SOSPECHOSO', margen, doc.y, { width: ancho, align: 'center', lineBreak: false });
  hueco(doc, 2);
  lineaHorizontal(doc, margen, ancho);
  hueco(doc, 6);

  const altoCaja = 28;
  doc.rect(margen, doc.y, ancho, altoCaja).lineWidth(1.5).stroke();
  doc.font('mono').fontSize(15);
  doc.text(numeroExpediente, margen, doc.y + altoCaja / 2 - 8, { width: ancho, align: 'center' });
  doc.y += altoCaja;
  hueco(doc, 8);

  // 4) Fotografía (o un hueco gris con "(FOTO)" si no hay)
  if (fotoBuffer) {
    const imagen = doc.openImage(fotoBuffer);
    imagenAnchoCompleto(doc, fotoBuffer, margen, ancho, imagen.height / imagen.width);
  } else {
    const altoFoto = ancho * 0.75;
    doc.rect(margen, doc.y, ancho, altoFoto).fill('#cccccc');
    doc.fillColor('#000000').font('mono').fontSize(13);
    doc.text('(FOTO)', margen, doc.y + altoFoto / 2 - 8, { width: ancho, align: 'center' });
    doc.y += altoFoto;
  }
  hueco(doc, 8);

  // 5) Género, edad y año de nacimiento
  doc.font('mono').fontSize(9).fillColor('#000000');
  doc.text(`${genero}, DE ${edad} AÑOS`, margen, doc.y, { width: ancho, align: 'center' });
  doc.text(`(${anioNacimiento})`, margen, doc.y, { width: ancho, align: 'center' });
  hueco(doc, 12);

  // 6) Conductas detectadas + normas infringidas
  doc.font('stencil').fontSize(9);
  doc.text('CONDUCTAS DETECTADAS:', margen, doc.y, { width: ancho, lineBreak: false });
  hueco(doc, 6);

  if (conductas.length === 0) {
    doc.font('mono').fontSize(8.5);
    doc.text('(NINGUNA DETECTADA)', margen, doc.y, { width: ancho });
  } else {
    conductas.forEach((nombreConducta, indice) => {
      const ficha = fichaConducta(nombreConducta);
      const numero = String(indice + 1).padStart(2, '0');
      const titulo = (ficha ? ficha.nombre_legal : nombreConducta).toUpperCase();

      // Título: el nombre legal de la norma.
      doc.font('mono').fontSize(9);
      doc.text(`${numero}. ${titulo}`, margen, doc.y, { width: ancho, lineGap: 2 });
      hueco(doc, 5);

      // Cuerpo: explicación + referencia legal + caso real. Es el campo
      // "texto_ticket_final" de conductas.json (lleva saltos de línea).
      // "lineGap" separa un poco las líneas para que no salga todo pegado.
      doc.font('mono').fontSize(7.5);
      doc.text(ficha ? ficha.texto_ticket_final : '', margen, doc.y, { width: ancho, lineGap: 3 });

      hueco(doc, 8);
      if (indice < conductas.length - 1) {
        lineaHorizontal(doc, margen, ancho, true);
        hueco(doc, 6);
      }
    });
  }
  hueco(doc, 8);

  // 7) Imagen final ("CON FRANCO NO SE VIVÍA MEJOR..." + logos)
  imagenAnchoCompleto(doc, RUTA_IMAGEN_FINAL, margen, ancho, PROPORCION_IMAGEN_FINAL);

  // Un poco de papel en blanco al final, antes del corte.
  hueco(doc, 24);
}

// Construye el PDF completo del ticket y devuelve sus bytes.
function construirPdfTicket(datos) {
  return new Promise((resolve, reject) => {
    const fotoBuffer = decodificarFoto(datos.foto);

    // Primera pasada: se dibuja todo en un documento "de mentira", muy
    // alto, solo para medir cuánto ocupa el ticket de verdad.
    const docMedida = new PDFDocument({ size: [ANCHO_PAGINA_PT, 5000], margin: 0 });
    docMedida.registerFont('mono', RUTA_FUENTE_MONO);
    docMedida.registerFont('stencil', RUTA_FUENTE_STENCIL);
    docMedida.on('data', () => {});
    docMedida.on('error', reject);
    pintarTicket(docMedida, datos, fotoBuffer);
    const alturaTicket = Math.ceil(docMedida.y);
    docMedida.end();

    // Segunda pasada: el documento real, ya con la altura justa.
    const doc = new PDFDocument({ size: [ANCHO_PAGINA_PT, alturaTicket], margin: 0 });
    doc.registerFont('mono', RUTA_FUENTE_MONO);
    doc.registerFont('stencil', RUTA_FUENTE_STENCIL);

    const trozos = [];
    doc.on('data', (trozo) => trozos.push(trozo));
    doc.on('end', () => resolve({
      pdf: Buffer.concat(trozos),
      anchoPt: ANCHO_PAGINA_PT,
      altoPt: alturaTicket
    }));
    doc.on('error', reject);

    pintarTicket(doc, datos, fotoBuffer);
    doc.end();
  });
}

// Manda los bytes del PDF a la cola de impresión del sistema.
// Se le pasa el tamaño EXACTO de página (en puntos, que es lo que espera
// el driver) para que la impresora no reescale ni descoloque el ticket.
function enviarAImpresora(bytes, anchoPt, altoPt) {
  const proceso = spawn('lp', [
    '-d', NOMBRE_COLA_IMPRESORA,
    '-o', `PageSize=Custom.${anchoPt}x${altoPt}`,
    '-o', 'fit-to-page=false'
  ]);

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
  const { dia, hora } = partesFecha(datosParticipante.timestamp);
  console.log('================================================================');
  console.log(` TICKET  |  ${dia}  ${hora}  |  Nº ${datosParticipante.numeroExpediente}`);
  console.log(` Conductas: ${(datosParticipante.conductas || []).join(', ') || '(ninguna)'}`);
  console.log(` Foto: ${datosParticipante.foto ? 'sí' : 'no'}`);
  console.log('================================================================');

  try {
    const { pdf, anchoPt, altoPt } = await construirPdfTicket(datosParticipante);
    enviarAImpresora(pdf, anchoPt, altoPt);
  } catch (error) {
    console.warn('No se ha podido generar el PDF del ticket:', error.message);
  }

  return true;
}

module.exports = { imprimirOrdenDetencion };

// Preguntas del cuestionario (secciones 8 y 9 del prompt), todas juntas en
// un solo sitio para que sea fácil añadir o cambiar preguntas. Cada una
// lleva la categoría de conducta que activa su respuesta, según la tabla
// "Cuestionario Final".
//
// NOTA: las pantallas de las preguntas 1, 2 y 4 (más idioma y género)
// ahora se construyen a partir de las capturas de Figma, directamente en
// index.html/app.js, así que el texto que hay aquí abajo ya no se usa
// para dibujarlas (el texto viene "pintado" en la imagen). Esta lista se
// deja preparada para cuando llegue el diseño de la PREGUNTA 5, que sí
// cambia según el perfil de la persona (todavía no definida: no hay que
// inventarla).

const PREGUNTAS_BASE = [
  {
    id: 'P01',
    texto: '¿Has compartido algún contenido de política en tus redes sociales?',
    tipo: 'SI_NO',
    categoriaSiResponde: 'CRITICAR AL RÉGIMEN'
  },
  {
    id: 'P02',
    texto: '¿Dejarías que otra persona decidiera siempre por ti?',
    subtitulo: 'Por ejemplo: decidiendo cómo tienes que pensar o cómo debes vestirte.',
    tipo: 'SI_NO',
    categoriaSiResponde: 'ACTUAR SIN AUTORIZACIÓN'
  },
  {
    id: 'P03',
    texto: '¿Cuánto valoras tu privacidad?',
    subtitulo: 'En la escala, el 0 es nada y el 5 es mucho.',
    tipo: 'ESCALA_1_5'
    // Esta pregunta no activa ninguna categoría (ver tabla "Cuestionario Final").
  },
  {
    id: 'P04',
    texto: '¿Votarás en las elecciones del próximo año?',
    tipo: 'SI_NO'
    // Esta pregunta tampoco activa ninguna categoría.
  },
  {
    id: 'P05',
    texto: null, // Pendiente de recibir el diseño de cada perfil.
    tipo: null
  }
];

// De momento las mismas preguntas sirven para los cuatro perfiles.
// Cuando lleguen preguntas distintas para cada uno, se añaden aquí sin
// tocar el resto del código.
const BANCO_PREGUNTAS = {
  hombre_18_25: PREGUNTAS_BASE,
  hombre_25: PREGUNTAS_BASE,
  mujer_18_25: PREGUNTAS_BASE,
  mujer_25: PREGUNTAS_BASE
};

// Devuelve la lista de preguntas que corresponde según el género y la edad.
function obtenerPreguntasSegunPerfil(genero, edad) {
  const tramoEdad = edad >= 18 && edad <= 25 ? '18_25' : '25';
  const clave = `${genero}_${tramoEdad}`;
  return BANCO_PREGUNTAS[clave] || PREGUNTAS_BASE;
}

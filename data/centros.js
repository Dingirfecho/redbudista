// Directorio de grupos y centros de la Red Budista de Argentina.
//
// Solo se publican centros confirmados por Federico Andino y con la información
// que cada centro informó. Cada centro es dueño de sus datos: ante diferencias,
// manda lo que informe el centro.
//
// Para sumar un centro, agregá un objeto al arreglo con esta forma:
//   {
//     id: 'nombre-corto-sin-espacios',
//     name: 'Nombre del centro',
//     tradition: 'theravada' | 'vajrayana' | 'mahayana' | 'moderno',   // una sola, la principal
//     lineage: 'Linaje o escuela, en texto libre (opcional)',          // ej.: 'Zen Sōtō', 'Nyingma', 'Tierra Pura'
//     city: 'Ciudad',
//     province: 'Provincia',
//     modality: 'presencial' | 'online' | 'mixta',
//     schedule: 'Días y horarios, en una frase corta',
//     description: 'Qué se practica, en una o dos frases',
//     url: 'https://…'        // opcional: web, red social o mailto: del centro
//   }
// Si falta un dato, no lo inventes: preguntalo al centro.

window.RB_CENTROS = [];

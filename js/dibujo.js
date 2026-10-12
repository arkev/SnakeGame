// =============================================================================
// Dibujo: todo lo que se pinta en el canvas. Estas funciones no guardan estado
// del juego; reciben por parámetro lo que necesitan mostrar.
// =============================================================================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const ancho = canvas.width;
const alto = canvas.height;

// Tamaño de la celda en píxeles (450 / 10 = cuadrícula de 45x45)
const TAM_CELDA = 10;
export const COLUMNAS = ancho / TAM_CELDA;
export const FILAS = alto / TAM_CELDA;

// Paleta y tipografía del canvas (mismos valores que las variables de style.css)
const COLOR_FONDO = "#9fb87a";
const COLOR_PIXEL = "#040207";
const COLOR_TENUE = "#3a4628";
const COLOR_TENUE_OSCURO = "#222a18";
const FUENTE_RETRO = '"Press Start 2P", "Courier New", monospace';
function fuente(px, negrita) {
    return (negrita ? "bold " : "") + px + "px " + FUENTE_RETRO;
}

function dibujarCelda(x, y) {
    ctx.fillStyle = COLOR_PIXEL;
    ctx.fillRect(x * TAM_CELDA, y * TAM_CELDA, TAM_CELDA, TAM_CELDA);
    ctx.strokeStyle = COLOR_FONDO;
    ctx.lineWidth = 1;
    ctx.strokeRect(x * TAM_CELDA, y * TAM_CELDA, TAM_CELDA, TAM_CELDA);
}

function limpiarPantalla() {
    ctx.fillStyle = COLOR_FONDO;
    ctx.fillRect(0, 0, ancho, alto);
}

export function dibujarInicio(top5, parpadeoVisible) {
    limpiarPantalla();

    // Título principal con estilo pixel art
    ctx.fillStyle = COLOR_PIXEL;
    ctx.font = fuente(36, true);
    ctx.textAlign = "center";
    ctx.fillText("SNAKE", ancho / 2, 108);
    ctx.font = fuente(16, true);
    ctx.fillText("RETRO GAME", ancho / 2, 136);

    // Mejor puntaje local (HI-SCORE)
    ctx.font = fuente(11);
    if (top5.length > 0) {
        ctx.fillText("HI: " + top5[0].nombre + " " + top5[0].puntos, ancho / 2, 166);
    } else {
        ctx.fillStyle = COLOR_TENUE;
        ctx.fillText("SIN RÉCORDS", ancho / 2, 166);
        ctx.fillStyle = COLOR_PIXEL;
    }

    // Decoración retro: mini serpiente pixelada
    dibujarSerpienteDecorativa();

    // Texto parpadeante de START
    if (parpadeoVisible) {
        ctx.font = fuente(14);
        ctx.fillText("PRESIONA START", ancho / 2, 330);
    }

    // Subtítulo de créditos
    ctx.font = fuente(10);
    ctx.fillStyle = COLOR_TENUE;
    ctx.fillText("BACK: CRÉDITOS", ancho / 2, 390);
}

function dibujarSerpienteDecorativa() {
    const startX = 140;
    const startY = 190;
    const s = 14; // tamaño celda decorativa

    // Cuerpo en forma de 'S'
    const segmentos = [
        { x: 5, y: 1 }, { x: 4, y: 1 }, { x: 3, y: 1 },
        { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 3 },
        { x: 5, y: 3 }, { x: 6, y: 3 }, { x: 7, y: 3 },
        { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 6, y: 5 },
        { x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }
    ];

    ctx.fillStyle = COLOR_PIXEL;
    ctx.strokeStyle = COLOR_FONDO;
    ctx.lineWidth = 1;

    for (let i = 0; i < segmentos.length; i++) {
        const px = startX + segmentos[i].x * s;
        const py = startY + segmentos[i].y * s;
        ctx.fillRect(px, py, s, s);
        ctx.strokeRect(px, py, s, s);
    }

    // Comida decorativa
    const fx = startX + 9 * s;
    const fy = startY + 1 * s;
    ctx.fillRect(fx, fy, s, s);
}

export function dibujarPausa() {
    // Superposición semi-transparente sobre el estado actual
    ctx.fillStyle = "rgba(159, 184, 122, 0.75)";
    ctx.fillRect(0, 0, ancho, alto);

    // Cuadro de diálogo central
    ctx.fillStyle = COLOR_FONDO;
    ctx.fillRect(55, 175, 340, 110);
    ctx.strokeStyle = COLOR_PIXEL;
    ctx.lineWidth = 4;
    ctx.strokeRect(55, 175, 340, 110);

    ctx.fillStyle = COLOR_PIXEL;
    ctx.textAlign = "center";
    ctx.font = fuente(24, true);
    ctx.fillText("PAUSA", ancho / 2, 225);

    ctx.font = fuente(11);
    ctx.fillText("START: REANUDAR", ancho / 2, 255);
    ctx.fillText("BACK: SALIR AL MENÚ", ancho / 2, 273);
}

export function dibujarGameOver(puntaje, top5, ultimoRecord, parpadeoVisible) {
    limpiarPantalla();

    ctx.fillStyle = COLOR_PIXEL;
    ctx.textAlign = "center";
    ctx.font = fuente(24, true);
    ctx.fillText("GAME OVER", ancho / 2, 70);

    // Marcador final
    ctx.font = fuente(14);
    ctx.fillText("PUNTOS: " + puntaje, ancho / 2, 105);

    // Aviso de nuevo récord
    if (ultimoRecord.esNuevo) {
        ctx.font = fuente(10);
        ctx.fillText("¡NUEVO RÉCORD! #" + (ultimoRecord.posicion + 1), ancho / 2, 132);
    }

    // Top 5 local (con iniciales)
    ctx.font = fuente(11);
    ctx.fillText("TOP 5", ancho / 2, 162);
    ctx.font = fuente(10);
    if (top5.length === 0) {
        ctx.fillStyle = COLOR_TENUE;
        ctx.fillText("SIN RÉCORDS", ancho / 2, 185);
        ctx.fillStyle = COLOR_PIXEL;
    } else {
        for (let i = 0; i < top5.length; i++) {
            const prefijo = (i === ultimoRecord.posicion && ultimoRecord.esNuevo) ? "> " : "";
            ctx.fillText(prefijo + (i + 1) + ". " + top5[i].nombre + " " + top5[i].puntos, ancho / 2, 185 + i * 20);
        }
    }

    // Opciones: si hay récord pendiente, START lleva al registro
    if (parpadeoVisible) {
        ctx.font = fuente(11);
        if (ultimoRecord.esNuevo) {
            ctx.fillText("START: REGISTRAR", ancho / 2, 330);
        } else {
            ctx.fillText("START: REINTENTAR", ancho / 2, 330);
        }
    }

    ctx.font = fuente(9);
    ctx.fillStyle = COLOR_TENUE;
    ctx.fillText("BACK: MENÚ PRINCIPAL", ancho / 2, 360);
}

export function dibujarCreditos(top5) {
    limpiarPantalla();

    ctx.fillStyle = COLOR_PIXEL;
    ctx.textAlign = "center";
    ctx.font = fuente(18, true);
    ctx.fillText("CRÉDITOS", ancho / 2, 55);

    ctx.lineWidth = 2;
    ctx.strokeStyle = COLOR_PIXEL;
    ctx.beginPath();
    ctx.moveTo(70, 68);
    ctx.lineTo(380, 68);
    ctx.stroke();

    ctx.font = fuente(10);
    ctx.fillText("SNAKE", ancho / 2, 85);
    ctx.font = fuente(8);
    ctx.fillText("RETRO GAME", ancho / 2, 98);

    ctx.font = fuente(8);
    ctx.fillStyle = COLOR_TENUE_OSCURO;
    ctx.fillText("DESARROLLADO POR:", ancho / 2, 114);

    ctx.fillStyle = COLOR_PIXEL;
    ctx.font = fuente(13, true);
    ctx.fillText("ARKEV", ancho / 2, 136);

    // Top 5 con iniciales (se muestra aquí tras guardar un récord)
    ctx.font = fuente(11);
    ctx.fillText("TOP 5", ancho / 2, 168);
    ctx.font = fuente(10);
    if (top5.length === 0) {
        ctx.fillStyle = COLOR_TENUE;
        ctx.fillText("SIN RÉCORDS", ancho / 2, 192);
        ctx.fillStyle = COLOR_PIXEL;
    } else {
        for (let i = 0; i < top5.length; i++) {
            ctx.fillText((i + 1) + ". " + top5[i].nombre + " " + top5[i].puntos, ancho / 2, 192 + i * 22);
        }
    }

    ctx.font = fuente(8);
    ctx.fillStyle = COLOR_TENUE_OSCURO;
    ctx.fillText("HTML5 CANVAS + JS VANILLA", ancho / 2, 322);

    ctx.fillStyle = COLOR_TENUE;
    ctx.font = fuente(10);
    ctx.fillText("PRESIONA BACK", ancho / 2, 360);
    ctx.font = fuente(9);
    ctx.fillText("START: MENÚ", ancho / 2, 382);
}

// Pantalla de juego: serpiente, comida y marcador
export function dibujarJuego(serpiente, comida, puntaje) {
    limpiarPantalla();

    serpiente.forEach(function (celda) {
        dibujarCelda(celda.x, celda.y);
    });
    dibujarCelda(comida.x, comida.y);

    ctx.fillStyle = COLOR_PIXEL;
    ctx.textAlign = "left";
    ctx.font = fuente(10);
    ctx.fillText("PUNTOS: " + puntaje, 10, 18);
}

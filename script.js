// =============================================================================
// Snake Game - archivo principal: reglas del juego y máquina de estados.
// El resto está repartido en módulos:
//   js/records.js  Top 5 en localStorage
//   js/audio.js    SFX, música y Mute
//   js/dibujo.js   pantallas del canvas
//   js/entrada.js  botones, teclado y registro de iniciales
// =============================================================================
import { cargarTop, cabeEnTop, guardarRecord } from "./js/records.js";
import { iniciarAudio, desbloquearAudio, reproducirSFX, ponerMusica } from "./js/audio.js";
import {
    COLUMNAS, FILAS,
    dibujarInicio, dibujarPausa, dibujarGameOver, dibujarCreditos, dibujarJuego
} from "./js/dibujo.js";
import { conectarEntrada, mostrarRegistro, ocultarRegistro, confirmarRegistro } from "./js/entrada.js";

// Serpiente y comida
let serpiente = [];
let comida;
let direccion = "right";            // Dirección actual
let direccionSiguiente = "right";   // Dirección en cola para el siguiente paso
let puntaje = 0;
let bucleJuego = null;

// Velocidad: intervalo base 150ms (40% de la velocidad original de 60ms)
// Cada 5 puntos se incrementa 5% compuesto, sin tope.
const intervaloBase = 150;
let intervaloActual = intervaloBase;

// Récords
let top5 = cargarTop();
let ultimoRecord = { esNuevo: false, posicion: -1, puntos: 0 };

// Máquina de estados: "INICIO", "JUGANDO", "PAUSA", "GAME_OVER", "REGISTRO", "CREDITOS"
let estado = "INICIO";
let animacionTimer = null;
let parpadeoVisible = true;

// =============================================================================
// Inicialización del juego y reinicio
// =============================================================================
function reiniciarJuego() {
    direccion = "right";
    direccionSiguiente = "right";
    crearSerpiente();
    crearComida();
    puntaje = 0;
    intervaloActual = intervaloBase;
}

function crearSerpiente() {
    const length = 5;
    serpiente = [];
    for (let i = length - 1; i >= 0; i--) {
        serpiente.push({ x: i, y: 0 });
    }
}

function crearComida() {
    // Repetir hasta caer en una celda libre (no encima de la serpiente)
    do {
        comida = {
            x: Math.floor(Math.random() * COLUMNAS),
            y: Math.floor(Math.random() * FILAS)
        };
    } while (hayColision(comida.x, comida.y, serpiente));
}

function hayColision(x, y, celdas) {
    for (let i = 0; i < celdas.length; i++) {
        if (celdas[i].x === x && celdas[i].y === y) return true;
    }
    return false;
}

// =============================================================================
// Máquina de Estados
// =============================================================================
// Redibuja la pantalla actual alternando el texto parpadeante cada 500 ms
function animarParpadeo(dibujar) {
    parpadeoVisible = true;
    dibujar();
    animacionTimer = setInterval(function () {
        parpadeoVisible = !parpadeoVisible;
        dibujar();
    }, 500);
}

function pintarInicio() {
    dibujarInicio(top5, parpadeoVisible);
}

function pintarGameOver() {
    dibujarGameOver(puntaje, top5, ultimoRecord, parpadeoVisible);
}

function cambiarEstado(nuevoEstado) {
    // Limpiar bucles previos
    if (bucleJuego) {
        clearInterval(bucleJuego);
        bucleJuego = null;
    }
    if (animacionTimer) {
        clearInterval(animacionTimer);
        animacionTimer = null;
    }
    // Ocultar overlay de registro salvo en estado REGISTRO
    if (nuevoEstado !== "REGISTRO") {
        ocultarRegistro();
    }

    estado = nuevoEstado;

    switch (estado) {
        case "INICIO":
            animarParpadeo(pintarInicio);
            break;

        case "JUGANDO":
            // Si aún no hay partida en curso, reiniciar variables del juego
            if (serpiente.length === 0) {
                reiniciarJuego();
            }
            // Usa intervaloActual para conservar la velocidad al salir de PAUSA
            bucleJuego = setInterval(pasoJuego, intervaloActual);
            break;

        case "PAUSA":
            dibujarPausa();
            break;

        case "GAME_OVER": {
            // Solo verificar si cabe en el Top 5 (sin guardar aún)
            top5 = cargarTop();
            const cabe = cabeEnTop(puntaje);
            ultimoRecord = { esNuevo: cabe.cabe, posicion: cabe.posicion, puntos: puntaje };
            reproducirSFX("choque");
            if (cabe.cabe) {
                setTimeout(function () { reproducirSFX("record"); }, 500);
            }
            animarParpadeo(pintarGameOver);
            break;
        }

        case "REGISTRO":
            // Solo se entra si hay récord pendiente; si no, volver a GAME_OVER
            if (!ultimoRecord.esNuevo) {
                cambiarEstado("GAME_OVER");
                return;
            }
            parpadeoVisible = true;
            pintarGameOver();
            mostrarRegistro(ultimoRecord.puntos);
            break;

        case "CREDITOS":
            top5 = cargarTop();
            dibujarCreditos(top5);
            break;
    }
    actualizarMusicaPorEstado();
}

function actualizarMusicaPorEstado() {
    if (estado === "JUGANDO") {
        ponerMusica("juego");
    } else if (estado === "PAUSA") {
        ponerMusica(null);
    } else {
        // INICIO, GAME_OVER, REGISTRO, CREDITOS comparten loop de menú.
        ponerMusica("menu");
    }
}

// =============================================================================
// Bucle Principal del Juego (JUGANDO)
// =============================================================================
function actualizarVelocidad() {
    const nivel = Math.floor(puntaje / 5);
    intervaloActual = intervaloBase / Math.pow(1.05, nivel);
    if (bucleJuego) {
        clearInterval(bucleJuego);
        bucleJuego = setInterval(pasoJuego, intervaloActual);
    }
}

function pasoJuego() {
    // Aplicar la dirección en cola
    direccion = direccionSiguiente;

    // Movimiento de la serpiente
    let nx = serpiente[0].x;
    let ny = serpiente[0].y;

    if (direccion === "right") nx++;
    else if (direccion === "left") nx--;
    else if (direccion === "up") ny--;
    else if (direccion === "down") ny++;

    // Detección de colisión con paredes o consigo misma
    if (nx < 0 || nx >= COLUMNAS || ny < 0 || ny >= FILAS || hayColision(nx, ny, serpiente)) {
        cambiarEstado("GAME_OVER");
        return;
    }

    // Ingesta de comida
    let cabeza;
    if (nx === comida.x && ny === comida.y) {
        cabeza = { x: nx, y: ny };
        puntaje++;
        crearComida();
        reproducirSFX("comer");
        // Cada 5 puntos: +5% velocidad compuesto (sin tope)
        if (puntaje % 5 === 0) {
            actualizarVelocidad();
            reproducirSFX("nivel");
        }
    } else {
        // Sin comer: la cola pasa a ser la nueva cabeza
        cabeza = serpiente.pop();
        cabeza.x = nx;
        cabeza.y = ny;
    }

    serpiente.unshift(cabeza);

    dibujarJuego(serpiente, comida, puntaje);
}

// =============================================================================
// Acciones del jugador (las dispara js/entrada.js)
// =============================================================================
function accionBotonVerde() {
    desbloquearAudio();
    if (estado === "INICIO") {
        reproducirSFX("start");
        reiniciarJuego();
        cambiarEstado("JUGANDO");
    } else if (estado === "JUGANDO") {
        reproducirSFX("ui");
        cambiarEstado("PAUSA");
    } else if (estado === "PAUSA") {
        reproducirSFX("start");
        cambiarEstado("JUGANDO");
    } else if (estado === "GAME_OVER") {
        if (ultimoRecord.esNuevo) {
            reproducirSFX("ui");
            cambiarEstado("REGISTRO");
        } else {
            reproducirSFX("start");
            reiniciarJuego();
            cambiarEstado("JUGANDO");
        }
    } else if (estado === "REGISTRO") {
        confirmarRegistro();
    } else if (estado === "CREDITOS") {
        reproducirSFX("ui");
        cambiarEstado("INICIO");
    }
}

function accionBotonRojo() {
    desbloquearAudio();
    if (estado === "INICIO") {
        reproducirSFX("ui");
        cambiarEstado("CREDITOS");
    } else if (estado === "CREDITOS") {
        reproducirSFX("back");
        cambiarEstado("INICIO");
    } else if (estado === "REGISTRO") {
        // BACK en registro: descartar (no guardar) e ir al menú
        reproducirSFX("back");
        ultimoRecord = { esNuevo: false, posicion: -1, puntos: ultimoRecord.puntos };
        cambiarEstado("INICIO");
    } else if (estado === "JUGANDO" || estado === "PAUSA" || estado === "GAME_OVER") {
        reproducirSFX("back");
        cambiarEstado("INICIO");
    }
}

const DIRECCION_OPUESTA = { left: "right", right: "left", up: "down", down: "up" };

function cambiarDireccion(nuevaDir) {
    if (estado !== "JUGANDO") return;

    // No se permite girar 180° sobre sí misma
    if (DIRECCION_OPUESTA[nuevaDir] && direccion !== DIRECCION_OPUESTA[nuevaDir]) {
        direccionSiguiente = nuevaDir;
    }
}

// El registro entrega las 3 iniciales ya confirmadas
function guardarRegistro(nombre) {
    if (estado !== "REGISTRO") return;
    const puntos = ultimoRecord.puntos || puntaje;
    top5 = guardarRecord(nombre, puntos);
    ultimoRecord = { esNuevo: false, posicion: -1, puntos: puntos };
    reproducirSFX("guardar");
    cambiarEstado("CREDITOS");
}

// =============================================================================
// Arranque
// =============================================================================
iniciarAudio();
conectarEntrada({
    alStart: accionBotonVerde,
    alBack: accionBotonRojo,
    alDireccion: cambiarDireccion,
    alGuardar: guardarRegistro
});

// Re-dibujar pantalla inicial una vez que la fuente web esté lista
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
        if (estado === "INICIO") {
            pintarInicio();
        }
    });
}

// Iniciar en la pantalla de bienvenida
cambiarEstado("INICIO");

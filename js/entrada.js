// =============================================================================
// Entrada: botones físicos de la consola, teclado, botón Mute y el registro de
// iniciales (overlay + teclado virtual). Este módulo no conoce las reglas del
// juego: avisa de lo que hizo el jugador mediante las funciones que recibe en
// conectarEntrada().
// =============================================================================
import { alternarMute, clicTactil, desbloquearAudio, reproducirSFX, sonidoEstaActivado } from "./audio.js";

// Elementos de la interfaz (botones físicos)
const btnStart = document.getElementById("btn-start");
const btnBack = document.getElementById("btn-back");
const btnMute = document.getElementById("btn-mute");
const iconoMute = document.getElementById("mute-icon");
const dpadButtons = document.querySelectorAll(".dpad__btn");

// Elementos del registro de récord (overlay + teclado virtual)
const registroOverlay = document.getElementById("registro-overlay");
const registroPuntos = document.getElementById("registro-puntos");
const registroTeclado = document.getElementById("registro-teclado");
const btnGuardar = document.getElementById("registro-guardar");
const btnCancelar = document.getElementById("registro-cancelar");

// Lo que el juego quiere que pase con cada entrada (ver conectarEntrada)
let acciones = null;

// =============================================================================
// Hápticos en botones (cruceta, START, BACK, Mute). NO en eventos del juego.
// A) navigator.vibrate (Android Chrome/Edge/Samsung). Pulsos de 30 ms o más:
//    por debajo de ~20 ms muchos motores no alcanzan a arrancar y no se siente.
// B) iOS: Safari no tiene API de vibración (el hack del switch lo cerró Apple
//    en iOS 26.5), así que suena un "clic" de audio cortito como respaldo.
// Solo en pantallas táctiles: en escritorio no hace nada.
// =============================================================================
const VIBRACION_MS = 40;

let esTactil = false;
try {
    esTactil = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
} catch (e) { esTactil = false; }

function vibrar(ms) {
    let conVibrate = false;
    try {
        conVibrate = ("vibrate" in navigator) && typeof navigator.vibrate === "function";
    } catch (e) { conVibrate = false; }
    if (conVibrate) {
        try { navigator.vibrate(ms); } catch (e) {}
        return;
    }
    if (!esTactil) return;
    clicTactil(ms);
}

// =============================================================================
// Botón Mute
// =============================================================================
function actualizarBotonMute() {
    if (!btnMute) return;
    const activado = sonidoEstaActivado();
    if (iconoMute) iconoMute.textContent = activado ? "volume_up" : "volume_off";
    btnMute.classList.toggle("btn-mute--off", !activado);
    btnMute.setAttribute("aria-pressed", activado ? "false" : "true");
    btnMute.setAttribute("aria-label", activado ? "Silenciar sonido" : "Activar sonido");
}

function conmutarMute() {
    alternarMute();
    actualizarBotonMute();
}

// =============================================================================
// Registro de récord: 3 iniciales + teclado virtual
// =============================================================================
let registroAbierto = false;
let registroLetras = [];
let tecladoConstruido = false;
// Iniciales: ["","",""] + cursor a la casilla que se está escribiendo
let iniciales = ["", "", ""];
let cursorInicial = 0;

function crearTecla(texto, etiqueta, alPulsar) {
    const tecla = document.createElement("button");
    tecla.type = "button";
    tecla.className = "registro__tecla";
    tecla.textContent = texto;
    tecla.setAttribute("aria-label", etiqueta);
    tecla.addEventListener("pointerdown", function alPulsarTecla(e) {
        e.preventDefault();
        alPulsar();
    });
    registroTeclado.appendChild(tecla);
    return tecla;
}

function construirTeclado() {
    if (tecladoConstruido || !registroTeclado) return;
    "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("").forEach(function (letra) {
        crearTecla(letra, "Letra " + letra, function () { agregarLetra(letra); });
    });
    crearTecla("⌫", "Borrar", borrarLetra).classList.add("registro__tecla--borrar");
    tecladoConstruido = true;
}

function cachearLetras() {
    if (registroLetras.length || !registroOverlay) return;
    registroLetras = Array.from(registroOverlay.querySelectorAll(".registro__letra"));
    registroLetras.forEach(function (casilla, indice) {
        casilla.addEventListener("pointerdown", function alTocarCasilla(e) {
            e.preventDefault();
            cursorInicial = indice;
            renderIniciales();
        });
    });
}

export function mostrarRegistro(puntos) {
    iniciales = ["", "", ""];
    cursorInicial = 0;
    if (registroPuntos) {
        registroPuntos.textContent = puntos + (puntos === 1 ? " PTO" : " PTS");
    }
    construirTeclado();
    cachearLetras();
    renderIniciales();
    if (registroOverlay) {
        registroOverlay.hidden = false;
    }
    registroAbierto = true;
}

export function ocultarRegistro() {
    if (registroOverlay) {
        registroOverlay.hidden = true;
    }
    registroAbierto = false;
}

function renderIniciales() {
    if (!registroLetras.length) return;
    for (let i = 0; i < 3; i++) {
        registroLetras[i].textContent = iniciales[i] || "_";
        registroLetras[i].classList.toggle("registro__letra--activo", i === cursorInicial);
    }
    // El aspecto atenuado lo da .registro__btn:disabled en style.css
    if (btnGuardar) btnGuardar.disabled = !inicialesCompletas();
}

function inicialesCompletas() {
    return Boolean(iniciales[0] && iniciales[1] && iniciales[2]);
}

function agregarLetra(letra) {
    if (!registroAbierto) return;
    const l = String(letra || "").toUpperCase();
    if (!/^[A-ZÑ0-9]$/.test(l)) return;
    if (cursorInicial < 0) cursorInicial = 0;
    if (cursorInicial > 2) cursorInicial = 2;
    iniciales[cursorInicial] = l;
    reproducirSFX("tecla");
    if (cursorInicial < 2) {
        cursorInicial++;
    } else if (inicialesCompletas()) {
        cursorInicial = 3; // sin casilla activa: listo para guardar
    }
    renderIniciales();
}

function borrarLetra() {
    if (!registroAbierto) return;
    if (cursorInicial > 2) cursorInicial = 2;
    if (iniciales[cursorInicial]) {
        iniciales[cursorInicial] = "";
    } else if (cursorInicial > 0) {
        cursorInicial--;
        iniciales[cursorInicial] = "";
    }
    reproducirSFX("borrar");
    renderIniciales();
}

function moverCursor(dir) {
    if (!registroAbierto) return;
    cursorInicial += dir;
    if (cursorInicial < 0) cursorInicial = 0;
    if (cursorInicial > 2) cursorInicial = 2;
    renderIniciales();
}

// Entrega las iniciales al juego si ya están las 3
export function confirmarRegistro() {
    if (!registroAbierto || !inicialesCompletas()) return;
    acciones.alGuardar(iniciales.join(""));
}

// =============================================================================
// Botones físicos (Pointer Events: touch y ratón)
// =============================================================================
// Botón físico de la consola: actúa al presionar (pointerdown, sin esperar al
// click) y se ve hundido hasta que se suelta, se sale el dedo o se cancela.
function conectarBotonFisico(btn, claseActiva, alPresionar) {
    if (!btn) return;
    function soltar() {
        btn.classList.remove(claseActiva);
    }
    btn.addEventListener("pointerdown", function presionar(e) {
        e.preventDefault();
        btn.classList.add(claseActiva);
        vibrar(VIBRACION_MS);
        alPresionar();
    });
    btn.addEventListener("pointerup", soltar);
    btn.addEventListener("pointerleave", soltar);
    btn.addEventListener("pointercancel", soltar);
}

// En el registro la cruceta mueve el cursor de las iniciales
function accionCruceta(dir) {
    if (registroAbierto) {
        if (dir === "left") moverCursor(-1);
        else if (dir === "right") moverCursor(1);
    } else {
        acciones.alDireccion(dir);
    }
}

// =============================================================================
// Teclado
// =============================================================================
const TECLAS_DIRECCION = {
    ArrowLeft: "left", a: "left",
    ArrowUp: "up", w: "up",
    ArrowRight: "right", d: "right",
    ArrowDown: "down", s: "down"
};

// Hunde un instante el botón en pantalla cuando se usa su tecla equivalente
function destellarBoton(btn) {
    if (!btn) return;
    btn.classList.add("btn--activo");
    setTimeout(function () {
        btn.classList.remove("btn--activo");
    }, 120);
}

// En el registro las letras son iniciales, no direcciones (A/D/W/S chocan).
// Devuelve true si la tecla se usó.
function teclaEnRegistro(tecla) {
    if (tecla === "Enter") confirmarRegistro();
    else if (tecla === "Escape") acciones.alBack();
    else if (tecla === "Backspace") borrarLetra();
    else if (tecla === "ArrowLeft") moverCursor(-1);
    else if (tecla === "ArrowRight") moverCursor(1);
    else if (/^[a-z0-9ñ]$/.test(tecla)) agregarLetra(tecla);
    else return tecla === " "; // el espacio se ignora, pero sin hacer scroll
    return true;
}

// Devuelve true si la tecla se usó.
function teclaEnJuego(tecla) {
    if (tecla === "m") {
        desbloquearAudio();
        conmutarMute();
    } else if (TECLAS_DIRECCION[tecla]) {
        acciones.alDireccion(TECLAS_DIRECCION[tecla]);
    } else if (tecla === "Enter" || tecla === " ") {
        destellarBoton(btnStart);
        acciones.alStart();
    } else if (tecla === "Escape" || tecla === "Backspace") {
        destellarBoton(btnBack);
        acciones.alBack();
    } else {
        return false;
    }
    return true;
}

function alPulsarTecla(e) {
    // No interceptar atajos del navegador (Ctrl/Cmd/Alt + tecla)
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Las letras se comparan en minúscula ("A" y "a" son la misma tecla)
    const tecla = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const usada = registroAbierto ? teclaEnRegistro(tecla) : teclaEnJuego(tecla);
    if (usada) e.preventDefault();
}

// =============================================================================
// Conexión con el juego
// =============================================================================
// accionesDelJuego = {
//     alStart():          botón verde / Enter / Espacio
//     alBack():           botón rojo / Escape / Retroceso
//     alDireccion(dir):   cruceta, flechas o WASD ("left" | "up" | "right" | "down")
//     alGuardar(nombre):  3 iniciales confirmadas en el registro
// }
export function conectarEntrada(accionesDelJuego) {
    acciones = accionesDelJuego;

    conectarBotonFisico(btnStart, "btn--activo", acciones.alStart);
    conectarBotonFisico(btnBack, "btn--activo", acciones.alBack);
    dpadButtons.forEach(function (btn) {
        const dir = btn.getAttribute("data-dir");
        conectarBotonFisico(btn, "dpad__btn--activo", function () { accionCruceta(dir); });
    });

    // Botones del overlay de registro: 'click' cubre touch, ratón y teclado.
    if (btnGuardar) btnGuardar.addEventListener("click", confirmarRegistro);
    if (btnCancelar) btnCancelar.addEventListener("click", acciones.alBack);

    // Botón Mute: switch con un solo clic (no hay que mantenerlo).
    // OJO: solo 'click', sin 'pointerdown', para no alternar dos veces por pulsación.
    actualizarBotonMute();
    if (btnMute) {
        btnMute.addEventListener("click", function alPulsarMute() {
            vibrar(VIBRACION_MS);
            conmutarMute();
        });
    }

    document.addEventListener("keydown", alPulsarTecla);
}

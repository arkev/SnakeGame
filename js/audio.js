// =========================================================================
// Audio procedural 8-bit (Web Audio API + ZzFX para SFX + secuenciador propio para música)
// - Sonido ACTIVADO por defecto. El Mute persiste en localStorage.
// - SFX: pega tus TXT de ZzFX Designer en el objeto SFX (ver comentarios PEGA AQUÍ).
// - MÚSICA: pega tus secuencias de notas en el objeto MUSICA (ver comentarios PEGA AQUÍ).
// =========================================================================
const MUTE_KEY = "snakegame_mute_v1";
let sonidoActivado = true;
try {
    sonidoActivado = localStorage.getItem(MUTE_KEY) !== "1";
} catch (e) { }

// Contadores para el diagnóstico de audio (?audio-debug)
const audioInfo = { gestos: 0, ultimoSFX: "-", ultimoError: "-", notas: 0 };

// --- ZzFXMicro v1.4.0 by Frank Force (MIT, https://github.com/KilledByAPixel/ZzFX) ---
// Motor tiny que convierte arrays de números (tus TXT) en sonido 8-bit. No tocar.
const zzfxV = 0.3;
// OJO iOS: el contexto NO se crea al cargar, sino dentro del primer gesto
// (tap/tecla). Un contexto nacido antes del gesto queda suspendido para siempre en iOS.
let zzfxX = null;
function crearContextoSiFalta() {
    if (zzfxX) return zzfxX;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) zzfxX = new AC();
        else if (typeof audioAnotarError === "function") audioAnotarError("sin AudioContext ni webkit");
    } catch (e) {
        zzfxX = null;
        if (typeof audioAnotarError === "function") audioAnotarError("crear ctx: " + (e && e.message || e));
    }
    return zzfxX;
}
const zzfx = function (p, k, b, e, r, t, q, D, u, y, v, z, l, E, A, F, c, w, m, B, N) {
    if (!zzfxX) return;
    if (p === undefined) p = 1; if (k === undefined) k = 0.05; if (b === undefined) b = 220;
    if (e === undefined) e = 0; if (r === undefined) r = 0; if (t === undefined) t = 0.1;
    if (q === undefined) q = 0; if (D === undefined) D = 1; if (u === undefined) u = 0;
    if (y === undefined) y = 0; if (v === undefined) v = 0; if (z === undefined) z = 0;
    if (l === undefined) l = 0; if (E === undefined) E = 0; if (A === undefined) A = 0;
    if (F === undefined) F = 0; if (c === undefined) c = 0; if (w === undefined) w = 1;
    if (m === undefined) m = 0; if (B === undefined) B = 0; if (N === undefined) N = 0;
    var M = Math, d = 2 * M.PI, R = 44100, G = u *= 500 * d / R / R, C = b *= (1 - k + 2 * k * M.random(k = [])) * d / R,
        g = 0, H = 0, a = 0, n = 1, I = 0, J = 0, f = 0, h = N < 0 ? -1 : 1, x = d * h * N * 2 / R, L = M.cos(x), Z = M.sin,
        K = Z(x) / 4, O = 1 + K, X = -2 * L / O, Y = (1 - K) / O, P = (1 + h * L) / 2 / O, Q = -(h + L) / O, S = P, T = 0, U = 0, V = 0, W = 0;
    e = R * e + 9; m *= R; r *= R; t *= R; c *= R; y *= 500 * d / R / R / R; A *= d / R; v *= d / R; z *= R; l = R * l | 0; p *= zzfxV;
    for (h = e + m + r + t + c | 0; a < h; k[a++] = f * p)++J % (100 * F | 0) || (f = q ? 1 < q ? 2 < q ? 3 < q ? 4 < q ? (g / d % 1 < D / 2) * 2 - 1 : Z(g * g * g) : M.max(M.min(M.tan(g), 1), -1) : 1 - (2 * g / d % 2 + 2) % 2 : 1 - 4 * M.abs(M.round(g / d) - g / d) : Z(g), f = (l ? 1 - B + B * Z(d * a / l) : 1) * (4 < q ? f : (f < 0 ? -1 : 1) * M.pow(M.abs(f), D)) * (a < e ? a / e : a < e + m ? 1 - (a - e) / m * (1 - w) : a < e + m + r ? w : a < h - c ? (h - a - c) / t * w : 0), f = c ? f / 2 + (c > a ? 0 : (a < h - c ? 1 : (h - a) / c) * k[a - c | 0] / 2 / p) : f, N ? f = W = S * T + Q * (T = U) + P * (U = f) - Y * V - X * (V = W) : 0), x = (b += u += y) * M.cos(A * H++), g += x + x * E * (a * a * d % 2 - 1), n && ++n > z && (b += v, C += v, n = 0), !l || ++I % l || (b = C, u = G, n = n || 1);
    X = zzfxX; p = X.createBuffer(1, h, R); p.getChannelData(0).set(k); b = X.createBufferSource(); b.buffer = p; b.connect(X.destination); b.start();
};

// -------------------------------------------------------------------------
// SFX: PEGA AQUÍ TUS TXT de ZzFX Designer
// Cómo pegar: en la app dale a tu sonido -> Export TXT -> copia los números
// y reemplaza SOLO el array de esa clave. Ejemplo:
//   comer: [0.8, 0, 800, 0.1, ...],   <-- tus números aquí dentro
// No borres el nombre de la clave ni la coma final. Si dejas un array vacío
// [], ese sonido simplemente no suena.
// -------------------------------------------------------------------------
const SFX = {
    // Al comer comida
    comer: [, , 618, .15, , .009, 1, 3.3, , , -247, .02, .01, , , , , .93, , , 163], // PEGA AQUÍ TU TXT de comer
    // Al subir de nivel (cada 5 puntos)
    nivel: [1.4, , 687, .03, .06, .3, , 1.3, , , 471, .07, , , , , .02, .98, .01], // PEGA AQUÍ TU TXT de nivel
    // Al chocar / game over
    choque: [, , 31, .06, .3, .4, 5, .1, 4, , , , , 1.1, , .2, , .45, .16], // PEGA AQUÍ TU TXT de choque
    // Al lograr nuevo récord (fanfarria, suena 0.5s después del choque)
    record: [.8, , 253, .38, .12, .41, , 1.8, , 26, , , .22, , 143, , .16, .98, .05, , 139], // PEGA AQUÍ TU TXT de récord
    // Botón START / confirmar
    start: [5, , 9, , , .04, , .7, , , , , , .2, 320, .2, , .78], // PEGA AQUÍ TU TXT de start
    // Botón BACK / cancelar
    back: [.5, , 53, , .02, .01, 3, 1.4, , , , , , , , , , .76, .1, , 242], // PEGA AQUÍ TU TXT de back
    // Tecla del teclado virtual / escribir inicial
    tecla: [, , 700, .03, .05, .12, 1, 1.4], // PEGA AQUÍ TU TXT de tecla
    // Borrar inicial (⌫)
    borrar: [, , 300, .04, .06, .14, 1, .9], // PEGA AQUÍ TU TXT de borrar
    // Al guardar récord (ir a créditos)
    guardar: [2.2, , 77, .07, , .04, 1, 3.7, , , 93, .04, , , , .1, .24, .65, , , 152], // PEGA AQUÍ TU TXT de guardar
    // Movimiento UI genérico (pausa, créditos)
    ui: [, , 520, .04, .06, .14, 1, 1.1] // PEGA AQUÍ TU TXT de ui
};

export function desbloquearAudio() {
    crearContextoSiFalta();
    try {
        if (zzfxX && typeof zzfxX.state === "string" && zzfxX.state !== "running") {
            const pr = zzfxX.resume();
            if (pr && pr.catch) pr.catch(function () { });
        }
    } catch (e) { }
}

export function reproducirSFX(nombre) {
    if (!sonidoActivado) return;
    const preset = SFX[nombre];
    if (!preset || !preset.length) return;
    audioInfo.ultimoSFX = nombre;
    desbloquearAudio();
    try {
        zzfx.apply(null, preset);
    } catch (e) {
        audioAnotarError("sfx " + nombre + ": " + (e && e.message || e));
    }
}
// -------------------------------------------------------------------------
// MÚSICA EN LOOP: PEGA AQUÍ TUS NOTAS
// Formato por pista: array de [NOTA, PASOS]. NOTA puede ser:
//   "C4","C#4","Db4","D4","E4","F4","F#4","G4","A4","B4","C5"... ("-" = silencio)
//   o un número = frecuencia directa en Hz. PASOS = duración en pasos.
// Para sacarlas de BeepBox: copia tu melodía/ bajo como lista de notas y
// pégala aquí reemplazando los arrays demo. Ajusta pasoMenu/pasoJuego (seg/paso).
// Lead = square (melodía), Bass = triangle (bajo). Volumen 0-0.2 aprox.
// -------------------------------------------------------------------------
const MUSICA = {
    pasoMenu: 0.16,
    pasoJuego: 0.125,
    volLead: 0.05,
    volBass: 0.08,
    // Loop tranquilo para INICIO / CRÉDITOS / GAME_OVER / REGISTRO
    menuLead: [["C5", 1], ["E5", 1], ["G5", 1], ["C6", 2], ["B5", 1], ["G5", 1], ["E5", 1], ["C5", 1], ["D5", 1], ["F5", 1], ["A5", 1], ["D6", 2], ["C6", 1], ["G5", 1], ["E5", 1], ["C5", 1]], // PEGA AQUÍ TU MELODÍA de menú
    menuBass: [["C3", 2], ["G2", 2], ["A2", 2], ["G2", 2], ["F2", 2], ["G2", 2], ["C3", 2], ["G2", 2]], // PEGA AQUÍ TU BAJO de menú
    // Loop más movido para JUGANDO
    juegoLead: [["A4", 1], ["C5", 1], ["E5", 1], ["A5", 1], ["G5", 1], ["E5", 1], ["C5", 1], ["E5", 1], ["F5", 1], ["A5", 1], ["F5", 1], ["E5", 1], ["D5", 1], ["E5", 1], ["C5", 1], ["A4", 1]], // PEGA AQUÍ TU MELODÍA de juego
    juegoBass: [["A2", 1], ["A2", 1], ["F2", 1], ["F2", 1], ["C3", 1], ["C3", 1], ["G2", 1], ["G2", 1], ["F2", 1], ["F2", 1], ["G2", 1], ["G2", 1], ["A2", 1], ["A2", 1], ["A2", 1], ["A2", 1]] // PEGA AQUÍ TU BAJO de juego
};
let musicaModo = null; // "menu" | "juego" | null
let musicaTimer = null;
let idxLead = 0, idxBass = 0;
let pasoContadorLead = 0, pasoContadorBass = 0;

function notaAFrec(nota) {
    if (typeof nota === "number") return nota;
    if (!nota || nota === "-") return 0;
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(String(nota).toUpperCase());
    if (!m) return 0;
    let base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    if (m[2] === "#") base += 1;
    if (m[2] === "B") base -= 1;
    const oct = parseInt(m[3], 10);
    const midi = (oct + 1) * 12 + base;
    return 440 * Math.pow(2, (midi - 69) / 12);
}

function tocarNota(frec, dur, tipo, vol) {
    if (!zzfxX || !sonidoActivado || !frec || frec <= 0) return;
    try {
        const t = zzfxX.currentTime;
        const osc = zzfxX.createOscillator();
        const g = zzfxX.createGain();
        osc.type = tipo;
        osc.frequency.setValueAtTime(frec, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur * 0.92, 0.05));
        osc.connect(g);
        g.connect(zzfxX.destination);
        osc.start(t);
        osc.stop(t + dur);
        audioInfo.notas++;
    } catch (e) {
        audioAnotarError("nota: " + (e && e.message || e));
    }
}

function programarPasoMusica() {
    if (!musicaModo || !sonidoActivado) return;
    if (!zzfxX || zzfxX.state !== "running") {
        // Contexto aún no disponible (iOS antes del primer gesto):
        // reintentar hasta que corra, sin programar notas mudas.
        if (musicaTimer) clearTimeout(musicaTimer);
        musicaTimer = setTimeout(programarPasoMusica, 300);
        return;
    }
    const esMenu = musicaModo === "menu";
    const lead = esMenu ? MUSICA.menuLead : MUSICA.juegoLead;
    const bass = esMenu ? MUSICA.menuBass : MUSICA.juegoBass;
    const paso = esMenu ? MUSICA.pasoMenu : MUSICA.pasoJuego;
    if (!lead.length || !bass.length) return;
    const nL = lead[idxLead % lead.length];
    const nB = bass[idxBass % bass.length];
    tocarNota(notaAFrec(nL[0]), paso * nL[1], "square", MUSICA.volLead);
    tocarNota(notaAFrec(nB[0]), paso * nB[1], "triangle", MUSICA.volBass);
    const avance = Math.min(nL[1], nB[1]);
    // Avanzar cada pista según su duración (soporta notas de varios pasos)
    pasoContadorLead += avance;
    pasoContadorBass += avance;
    if (pasoContadorLead >= nL[1]) { pasoContadorLead = 0; idxLead++; }
    if (pasoContadorBass >= nB[1]) { pasoContadorBass = 0; idxBass++; }
    musicaTimer = setTimeout(programarPasoMusica, Math.max(avance * paso * 1000, 30));
}

function iniciarMusica(modo) {
    if (musicaModo === modo && musicaTimer) return;
    detenerMusica();
    if (!sonidoActivado) { musicaModo = modo; return; } // recuerda modo para reanudar al quitar mute
    musicaModo = modo;
    idxLead = 0; idxBass = 0; pasoContadorLead = 0; pasoContadorBass = 0;
    // Sin desbloquearAudio aquí: al cargar no hay gesto aún (iOS) y el
    // programador reintenta solo hasta que el contexto corra.
    programarPasoMusica();
}

function detenerMusica() {
    musicaModo = null;
    if (musicaTimer) { clearTimeout(musicaTimer); musicaTimer = null; }
}

// La música que corresponde a la pantalla actual ("menu" | "juego" | null).
// Se recuerda aparte para poder reanudarla al quitar el Mute.
let musicaDeseada = null;

export function ponerMusica(modo) {
    musicaDeseada = modo;
    if (modo) {
        // Arranca desde el inicio (intento de autoplay; el navegador la deja
        // sonar tras el primer gesto del usuario).
        iniciarMusica(modo);
    } else {
        detenerMusica();
    }
}

export function sonidoEstaActivado() {
    return sonidoActivado;
}

export function alternarMute() {
    sonidoActivado = !sonidoActivado;
    try {
        localStorage.setItem(MUTE_KEY, sonidoActivado ? "0" : "1");
    } catch (e) { }
    if (!sonidoActivado) {
        detenerMusica();
    } else {
        desbloquearAudio();
        reproducirSFX("ui");
        if (musicaDeseada) iniciarMusica(musicaDeseada);
    }
    return sonidoActivado;
}

// Respaldo audible: "tic" grave de ~20 ms que se siente como un clic físico.
// Respeta el Mute. La intensidad escala un poco con la duración pedida.
export function clicTactil(ms) {
    if (!sonidoActivado) return;
    desbloquearAudio();
    if (!zzfxX) return;
    try {
        const t = zzfxX.currentTime;
        const dur = 0.02;
        const vol = Math.min(0.35, 0.15 + (ms || 30) * 0.005);
        const osc = zzfxX.createOscillator();
        const g = zzfxX.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g);
        g.connect(zzfxX.destination);
        osc.start(t);
        osc.stop(t + dur + 0.01);
    } catch (e) { }
}

// -------------------------------------------------------------------------
// Diagnóstico de audio (?audio-debug en la URL). Solo para depurar en iOS:
// abre el juego como index.html?audio-debug, toca la pantalla y lee el recuadro.
// Muestra: gestos recibidos, estado del contexto, mute, música y último error.
// Para quitarlo, abre la URL normal sin el parámetro (no afecta el juego).
// -------------------------------------------------------------------------
let audioDebug = false;
try {
    audioDebug = /audio-debug/.test(window.location.search || "");
} catch (e) { audioDebug = false; }
function audioAnotarError(msg) {
    audioInfo.ultimoError = String(msg).slice(0, 90);
}
let audioDebugEl = null;
if (audioDebug) {
    try {
        audioDebugEl = document.createElement("div");
        audioDebugEl.id = "audio-debug";
        audioDebugEl.setAttribute("style", "position:fixed;left:8px;bottom:8px;z-index:9999;max-width:92vw;background:rgba(0,0,0,0.85);color:#0f0;font:11px/1.5 monospace;white-space:pre-wrap;padding:8px 10px;border-radius:8px;pointer-events:none;");
        audioDebugEl.textContent = "audio-debug...";
        document.body.appendChild(audioDebugEl);
        setInterval(function () {
            if (!audioDebugEl) return;
            const ctxEstado = zzfxX ? (zzfxX.state || "?") : "NULL (sin crear)";
            let sr = "";
            try { sr = zzfxX ? ", " + zzfxX.sampleRate + "Hz" : ""; } catch (e) { }
            audioDebugEl.textContent =
                "ctx=" + ctxEstado + sr +
                " | mute=" + (sonidoActivado ? "OFF" : "ON") +
                " | musica=" + (musicaModo || "-") +
                (musicaTimer ? "(timer)" : "(sin timer)") +
                "\ngestos=" + audioInfo.gestos +
                " | sfx=" + audioInfo.ultimoSFX +
                " | notas=" + audioInfo.notas +
                "\nerr=" + audioInfo.ultimoError;
        }, 500);
    } catch (e) { audioDebugEl = null; }
}

// Desbloqueo de audio en CUALQUIER gesto (el navegador exige uno antes de sonar).
// La música intenta arrancar desde el inicio; tras el primer tap/tecla suena sola,
// sin necesidad de oprimir START. Si molesta, se apaga con el botón.
function reanudarAudioTrasGesto() {
    audioInfo.gestos++;
    desbloquearAudio();
    if (sonidoActivado && musicaModo && !musicaTimer) {
        const modo = musicaModo;
        musicaModo = null;
        iniciarMusica(modo);
    }
}

export function iniciarAudio() {
    document.addEventListener("pointerdown", reanudarAudioTrasGesto, { passive: true });
    document.addEventListener("keydown", reanudarAudioTrasGesto);
    document.addEventListener("touchstart", reanudarAudioTrasGesto, { passive: true });
    document.addEventListener("touchend", reanudarAudioTrasGesto, { passive: true });
}

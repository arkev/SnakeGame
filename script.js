document.addEventListener("DOMContentLoaded", function () {
    // Configuración del canvas
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;

    // Tamaño de la celda en píxeles (450 / 10 = cuadrícula de 45x45)
    var cw = 10;
    var d = "right";        // Dirección actual
    var next_d = "right";   // Dirección en cola para el siguiente paso
    var food;
    var score = 0;
    var snake_array = [];
    var game_loop = null;

    // Velocidad: intervalo base 150ms (40% de la velocidad original de 60ms)
    // Cada 5 puntos se incrementa 5% compuesto, sin tope.
    var intervalo_base = 150;
    var intervalo_actual = intervalo_base;

    // Récords Top 5 en localStorage (sin base de datos, por navegador/dispositivo)
    // Formato: [{ nombre: "ABC", puntos: 12 }]
    var TOP_KEY = "snakegame_top5_v1";
    var top5 = cargarTop();
    var ultimoRecord = { esNuevo: false, posicion: -1, puntos: 0 };

    function limpiarNombre(nombre) {
        var s = String(nombre || "").toUpperCase().replace(/[^A-Z0-9Ñ]/g, "");
        s = s.slice(0, 3);
        while (s.length < 3) s += "A";
        return s;
    }

    function normalizarEntrada(e) {
        if (typeof e === "number" && isFinite(e) && e >= 0) {
            return { nombre: "---", puntos: Math.floor(e) };
        }
        if (e && typeof e === "object" && typeof e.puntos === "number" && isFinite(e.puntos) && e.puntos >= 0) {
            return { nombre: limpiarNombre(e.nombre || "---"), puntos: Math.floor(e.puntos) };
        }
        return null;
    }

    function cargarTop() {
        try {
            var raw = localStorage.getItem(TOP_KEY);
            if (!raw) return [];
            var arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return [];
            var lista = [];
            for (var i = 0; i < arr.length; i++) {
                var n = normalizarEntrada(arr[i]);
                if (n) lista.push(n);
            }
            lista.sort(function (a, b) { return b.puntos - a.puntos; });
            return lista.slice(0, 5);
        } catch (e) {
            return [];
        }
    }

    function cabeEnTop(puntos) {
        if (typeof puntos !== "number" || puntos <= 0) {
            return { cabe: false, posicion: -1 };
        }
        var lista = cargarTop();
        if (lista.length < 5) {
            var pos = lista.length;
            for (var i = 0; i < lista.length; i++) {
                if (puntos > lista[i].puntos) { pos = i; break; }
            }
            return { cabe: true, posicion: pos };
        }
        if (puntos <= lista[lista.length - 1].puntos) {
            return { cabe: false, posicion: -1 };
        }
        var p2 = 0;
        for (var j = 0; j < lista.length; j++) {
            if (puntos > lista[j].puntos) { p2 = j; break; }
            p2 = j + 1;
        }
        return { cabe: true, posicion: p2 };
    }

    function guardarRecord(nombre, puntos) {
        var lista = cargarTop();
        var entry = { nombre: limpiarNombre(nombre), puntos: Math.floor(puntos) };
        lista.push(entry);
        lista.sort(function (a, b) { return b.puntos - a.puntos; });
        lista = lista.slice(0, 5);
        try {
            localStorage.setItem(TOP_KEY, JSON.stringify(lista));
        } catch (e) {
            // Modo privado o almacenamiento bloqueado: se sigue mostrando en sesión
        }
        return lista;
    }

    // Máquina de estados: "INICIO", "JUGANDO", "PAUSA", "GAME_OVER", "REGISTRO", "CREDITOS"
    var estado = "INICIO";
    var animacion_timer = null;
    var parpadeo_visible = true;

    // Elementos de la interfaz (botones físicos)
    var btnStart = document.getElementById("btn-start");
    var btnBack = document.getElementById("btn-back");
    var btnMute = document.getElementById("btn-mute");
    var dpadButtons = document.querySelectorAll(".dpad__btn");

    // Elementos del registro de récord (overlay + teclado virtual)
    var registroOverlay = document.getElementById("registro-overlay");
    var registroPuntos = document.getElementById("registro-puntos");
    var registroTeclado = document.getElementById("registro-teclado");
    var registroLetras = [];
    var btnGuardar = document.getElementById("registro-guardar");
    var btnCancelar = document.getElementById("registro-cancelar");
    var tecladoConstruido = false;
    // Iniciales: ["","",""] + cursor a la siguiente casilla vacía
    var iniciales = ["", "", ""];
    var cursorInicial = 0;

    // =========================================================================
    // Audio procedural 8-bit (Web Audio API + ZzFX para SFX + secuenciador propio para música)
    // - Sonido ACTIVADO por defecto. Botón Mute (🔊/🔇) persiste en localStorage.
    // - SFX: pega tus TXT de ZzFX Designer en el objeto SFX (ver comentarios PEGA AQUÍ).
    // - MÚSICA: pega tus secuencias de notas en el objeto MUSICA (ver comentarios PEGA AQUÍ).
    // =========================================================================
    var MUTE_KEY = "snakegame_mute_v1";
    var sonidoActivado = true;
    try {
        sonidoActivado = localStorage.getItem(MUTE_KEY) !== "1";
    } catch (e) { }

    // --- ZzFXMicro v1.4.0 by Frank Force (MIT, https://github.com/KilledByAPixel/ZzFX) ---
    // Motor tiny que convierte arrays de números (tus TXT) en sonido 8-bit. No tocar.
    var zzfxV = 0.3;
    // OJO iOS: el contexto NO se crea al cargar, sino dentro del primer gesto
    // (tap/tecla). Un contexto nacido antes del gesto queda suspendido para siempre en iOS.
    var zzfxX = null;
    function crearContextoSiFalta() {
        if (zzfxX) return zzfxX;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) zzfxX = new AC();
            else if (typeof audioAnotarError === "function") audioAnotarError("sin AudioContext ni webkit");
        } catch (e) {
            zzfxX = null;
            if (typeof audioAnotarError === "function") audioAnotarError("crear ctx: " + (e && e.message || e));
        }
        return zzfxX;
    }
    var zzfx = function (p, k, b, e, r, t, q, D, u, y, v, z, l, E, A, F, c, w, m, B, N) {
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
    var SFX = {
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

    function desbloquearAudio() {
        crearContextoSiFalta();
        try {
            if (zzfxX && typeof zzfxX.state === "string" && zzfxX.state !== "running") {
                var pr = zzfxX.resume();
                if (pr && pr.catch) pr.catch(function () {});
            }
        } catch (e) {}
    }

    function reproducirSFX(nombre) {
        if (!sonidoActivado) return;
        var preset = SFX[nombre];
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
    var MUSICA = {
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
    var musicaModo = null; // "menu" | "juego" | null
    var musicaTimer = null;
    var idxLead = 0, idxBass = 0;

    function notaAFrec(nota) {
        if (typeof nota === "number") return nota;
        if (!nota || nota === "-") return 0;
        var m = /^([A-G])([#b]?)(-?\d)$/.exec(String(nota).toUpperCase());
        if (!m) return 0;
        var base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
        if (m[2] === "#") base += 1;
        if (m[2] === "B") base -= 1;
        var oct = parseInt(m[3], 10);
        var midi = (oct + 1) * 12 + base;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function tocarNota(frec, dur, tipo, vol) {
        if (!zzfxX || !sonidoActivado || !frec || frec <= 0) return;
        try {
            var t = zzfxX.currentTime;
            var osc = zzfxX.createOscillator();
            var g = zzfxX.createGain();
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
        var esMenu = musicaModo === "menu";
        var lead = esMenu ? MUSICA.menuLead : MUSICA.juegoLead;
        var bass = esMenu ? MUSICA.menuBass : MUSICA.juegoBass;
        var paso = esMenu ? MUSICA.pasoMenu : MUSICA.pasoJuego;
        if (!lead.length || !bass.length) return;
        var nL = lead[idxLead % lead.length];
        var nB = bass[idxBass % bass.length];
        tocarNota(notaAFrec(nL[0]), paso * nL[1], "square", MUSICA.volLead);
        tocarNota(notaAFrec(nB[0]), paso * nB[1], "triangle", MUSICA.volBass);
        var avance = Math.min(nL[1], nB[1]);
        // Avanzar cada pista según su duración (soporta notas de varios pasos)
        pasoContadorLead += avance;
        pasoContadorBass += avance;
        if (pasoContadorLead >= nL[1]) { pasoContadorLead = 0; idxLead++; }
        if (pasoContadorBass >= nB[1]) { pasoContadorBass = 0; idxBass++; }
        musicaTimer = setTimeout(programarPasoMusica, Math.max(avance * paso * 1000, 30));
    }
    var pasoContadorLead = 0, pasoContadorBass = 0;

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

    function actualizarMusicaPorEstado() {
        if (estado === "JUGANDO") {
            iniciarMusica("juego");
        } else if (estado === "PAUSA") {
            detenerMusica();
        } else {
            // INICIO, GAME_OVER, REGISTRO, CREDITOS comparten loop de menú.
            // Arranca desde el inicio (intento de autoplay; el navegador lo
            // deja sonar tras el primer gesto del usuario).
            iniciarMusica("menu");
        }
    }

    function actualizarBotonMute() {
        if (!btnMute) return;
        var icono = document.getElementById("mute-icon");
        if (icono) {
            icono.textContent = sonidoActivado ? "volume_up" : "volume_off";
        } else {
            btnMute.textContent = sonidoActivado ? "ON" : "OFF";
        }
        if (sonidoActivado) {
            btnMute.classList.remove("btn-mute--off");
        } else {
            btnMute.classList.add("btn-mute--off");
        }
        btnMute.setAttribute("aria-pressed", sonidoActivado ? "false" : "true");
        btnMute.setAttribute("aria-label", sonidoActivado ? "Silenciar sonido" : "Activar sonido");
    }

    function alternarMute() {
        sonidoActivado = !sonidoActivado;
        try {
            localStorage.setItem(MUTE_KEY, sonidoActivado ? "0" : "1");
        } catch (e) { }
        actualizarBotonMute();
        if (!sonidoActivado) {
            detenerMusica();
        } else {
            desbloquearAudio();
            reproducirSFX("ui");
            actualizarMusicaPorEstado();
        }
    }

    // =========================================================================
    // Hápticos en botones (cruceta, START, BACK, Mute). NO en eventos del juego.
    // A) navigator.vibrate (Android Chrome/Edge/Samsung).
    // B) iOS (sin vibrate): hack del <label> con switch (iOS 17.4–26.4; Apple lo
    //    cerró en 26.5) + un "clic" de audio cortito como respaldo para todos.
    // Solo en pantallas táctiles: en escritorio no hace nada.
    // =========================================================================
    var esTactil = false;
    try {
        esTactil = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    } catch (e) { esTactil = false; }

    // Hack iOS: hay que hacer click() en el LABEL (no en el input) para que
    // iOS lo trate como toque real al switch y dispare el háptico del sistema.
    var vibraLabelEl = null;
    function vibraSwitchIOS() {
        try {
            if (!vibraLabelEl) {
                vibraLabelEl = document.createElement("label");
                vibraLabelEl.setAttribute("aria-hidden", "true");
                vibraLabelEl.setAttribute("style", "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;");
                var input = document.createElement("input");
                input.type = "checkbox";
                input.setAttribute("switch", "");
                input.tabIndex = -1;
                vibraLabelEl.appendChild(input);
                document.body.appendChild(vibraLabelEl);
            }
            vibraLabelEl.click();
        } catch (e) {}
    }

    // iOS solo acepta el click simulado dentro de un gesto válido (pointerup /
    // touchend / click; pointerdown táctil no cuenta). Si al llamar vibrar() aún
    // no hay gesto activo (cruceta en pointerdown), se deja pendiente y se
    // dispara al soltar el dedo.
    var hapticoPendiente = false;
    function hayGestoActivo() {
        try {
            if (navigator.userActivation) return navigator.userActivation.isActive;
        } catch (e) {}
        return false;
    }
    function dispararHapticoPendiente() {
        if (!hapticoPendiente) return;
        hapticoPendiente = false;
        vibraSwitchIOS();
    }
    document.addEventListener("pointerup", dispararHapticoPendiente, true);
    document.addEventListener("touchend", dispararHapticoPendiente, true);
    document.addEventListener("pointercancel", function () { hapticoPendiente = false; }, true);

    // Respaldo audible: "tic" grave de ~20 ms que se siente como un clic físico.
    // Respeta el Mute. La intensidad escala un poco con la duración pedida.
    function clicTactilAudio(ms) {
        if (!sonidoActivado) return;
        desbloquearAudio();
        if (!zzfxX) return;
        try {
            var t = zzfxX.currentTime;
            var dur = 0.02;
            var vol = Math.min(0.35, 0.15 + (ms || 10) * 0.012);
            var osc = zzfxX.createOscillator();
            var g = zzfxX.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.exponentialRampToValueAtTime(60, t + dur);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            osc.connect(g);
            g.connect(zzfxX.destination);
            osc.start(t);
            osc.stop(t + dur + 0.01);
        } catch (e) {}
    }

    function vibrar(patron) {
        var conVibrate = false;
        try {
            conVibrate = ("vibrate" in navigator) && typeof navigator.vibrate === "function";
        } catch (e) { conVibrate = false; }
        if (conVibrate) {
            try { navigator.vibrate(patron); } catch (e) {}
            return;
        }
        if (!esTactil) return;
        clicTactilAudio(typeof patron === "number" ? patron : 10);
        if (hayGestoActivo()) {
            hapticoPendiente = false;
            vibraSwitchIOS();
        } else {
            hapticoPendiente = true;
        }
    }

    // -------------------------------------------------------------------------
    // Diagnóstico de audio (?audio-debug en la URL). Solo para depurar en iOS:
    // abre el juego como index.html?audio-debug, toca la pantalla y lee el recuadro.
    // Muestra: gestos recibidos, estado del contexto, mute, música y último error.
    // Para quitarlo, abre la URL normal sin el parámetro (no afecta el juego).
    // -------------------------------------------------------------------------
    var audioDebug = false;
    try {
        audioDebug = /audio-debug/.test(window.location.search || "");
    } catch (e) { audioDebug = false; }
    var audioInfo = { gestos: 0, ultimoSFX: "-", ultimoError: "-", notas: 0 };
    function audioAnotarError(msg) {
        audioInfo.ultimoError = String(msg).slice(0, 90);
    }
    var audioDebugEl = null;
    if (audioDebug) {
        try {
            audioDebugEl = document.createElement("div");
            audioDebugEl.id = "audio-debug";
            audioDebugEl.setAttribute("style", "position:fixed;left:8px;bottom:8px;z-index:9999;max-width:92vw;background:rgba(0,0,0,0.85);color:#0f0;font:11px/1.5 monospace;white-space:pre-wrap;padding:8px 10px;border-radius:8px;pointer-events:none;");
            audioDebugEl.textContent = "audio-debug...";
            document.body.appendChild(audioDebugEl);
            setInterval(function () {
                if (!audioDebugEl) return;
                var ctxEstado = zzfxX ? (zzfxX.state || "?") : "NULL (sin crear)";
                var sr = "";
                try { sr = zzfxX ? ", " + zzfxX.sampleRate + "Hz" : ""; } catch (e) {}
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

    // =========================================================================
    // Inicialización del juego y reinicio
    // =========================================================================
    function reiniciarJuego() {
        d = "right";
        next_d = "right";
        create_snake();
        create_food();
        score = 0;
        intervalo_actual = intervalo_base;
    }

    function create_snake() {
        var length = 5;
        snake_array = [];
        for (var i = length - 1; i >= 0; i--) {
            snake_array.push({ x: i, y: 0 });
        }
    }

    function create_food() {
        food = {
            x: Math.round(Math.random() * (w - cw) / cw),
            y: Math.round(Math.random() * (h - cw) / cw)
        };
        // Evitar que la comida aparezca encima del cuerpo de la serpiente
        for (var i = 0; i < snake_array.length; i++) {
            if (snake_array[i].x === food.x && snake_array[i].y === food.y) {
                create_food();
                break;
            }
        }
    }

    // =========================================================================
    // Máquina de Estados
    // =========================================================================
    function cambiarEstado(nuevoEstado) {
        // Limpiar bucles previos
        if (game_loop) {
            clearInterval(game_loop);
            game_loop = null;
        }
        if (animacion_timer) {
            clearInterval(animacion_timer);
            animacion_timer = null;
        }
        // Ocultar overlay de registro salvo en estado REGISTRO
        if (nuevoEstado !== "REGISTRO") {
            ocultarRegistro();
        }

        estado = nuevoEstado;

        switch (estado) {
            case "INICIO":
                parpadeo_visible = true;
                dibujarInicio();
                animacion_timer = setInterval(function () {
                    parpadeo_visible = !parpadeo_visible;
                    dibujarInicio();
                }, 500);
                break;

            case "JUGANDO":
                // Si venimos de INICIO o GAME_OVER, reiniciar variables del juego
                if (snake_array.length === 0 || score === undefined) {
                    reiniciarJuego();
                }
                // Usa intervalo_actual para conservar la velocidad al salir de PAUSA
                game_loop = setInterval(paint, intervalo_actual);
                break;

            case "PAUSA":
                dibujarPausa();
                break;

            case "GAME_OVER":
                parpadeo_visible = true;
                // Solo verificar si cabe en el Top 5 (sin guardar aún)
                top5 = cargarTop();
                var cabe = cabeEnTop(score);
                ultimoRecord = { esNuevo: cabe.cabe, posicion: cabe.posicion, puntos: score };
                reproducirSFX("choque");
                if (cabe.cabe) {
                    setTimeout(function () { reproducirSFX("record"); }, 500);
                }
                dibujarGameOver();
                animacion_timer = setInterval(function () {
                    parpadeo_visible = !parpadeo_visible;
                    dibujarGameOver();
                }, 500);
                break;

            case "REGISTRO":
                // Solo se entra si hay récord pendiente; si no, volver a GAME_OVER
                if (!ultimoRecord.esNuevo) {
                    cambiarEstado("GAME_OVER");
                    return;
                }
                parpadeo_visible = true;
                dibujarGameOver();
                mostrarRegistro(ultimoRecord.puntos);
                break;

            case "CREDITOS":
                top5 = cargarTop();
                dibujarCreditos();
                break;
        }
        actualizarMusicaPorEstado();
    }

    // =========================================================================
    // Pantallas del Canvas
    // =========================================================================
    function limpiarPantalla() {
        ctx.fillStyle = "#9fb87a";
        ctx.fillRect(0, 0, w, h);
    }

    function dibujarInicio() {
        limpiarPantalla();

        // Título principal con estilo pixel art
        ctx.fillStyle = "#040207";
        ctx.font = 'bold 36px "Press Start 2P", "Courier New", monospace';
        ctx.textAlign = "center";
        ctx.fillText("SNAKE", w / 2, 130);

        // Mejor puntaje local (HI-SCORE)
        top5 = top5 && top5.length ? top5 : cargarTop();
        ctx.font = '11px "Press Start 2P", "Courier New", monospace';
        if (top5.length > 0) {
            ctx.fillText("HI: " + top5[0].nombre + " " + top5[0].puntos, w / 2, 160);
        } else {
            ctx.fillStyle = "#3a4628";
            ctx.fillText("SIN RÉCORDS", w / 2, 160);
            ctx.fillStyle = "#040207";
        }

        // Decoración retro: mini serpiente pixelada
        dibujarSerpienteDecorativa();

        // Texto parpadeante de START
        if (parpadeo_visible) {
            ctx.font = '14px "Press Start 2P", "Courier New", monospace';
            ctx.fillText("PRESIONA START", w / 2, 330);
        }

        // Subtítulo de créditos
        ctx.font = '10px "Press Start 2P", "Courier New", monospace';
        ctx.fillStyle = "#3a4628";
        ctx.fillText("BACK: CRÉDITOS", w / 2, 390);
    }

    function dibujarSerpienteDecorativa() {
        var startX = 140;
        var startY = 190;
        var s = 14; // tamaño celda decorativa

        // Cuerpo en forma de 'S'
        var segmentos = [
            { x: 5, y: 1 }, { x: 4, y: 1 }, { x: 3, y: 1 },
            { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 3 },
            { x: 5, y: 3 }, { x: 6, y: 3 }, { x: 7, y: 3 },
            { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 6, y: 5 },
            { x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }
        ];

        ctx.fillStyle = "#040207";
        ctx.strokeStyle = "#9fb87a";
        ctx.lineWidth = 1;

        for (var i = 0; i < segmentos.length; i++) {
            var px = startX + segmentos[i].x * s;
            var py = startY + segmentos[i].y * s;
            ctx.fillRect(px, py, s, s);
            ctx.strokeRect(px, py, s, s);
        }

        // Comida decorativa
        var fx = startX + 9 * s;
        var fy = startY + 1 * s;
        ctx.fillRect(fx, fy, s, s);
    }

    function dibujarPausa() {
        // Superposición semi-transparente sobre el estado actual
        ctx.fillStyle = "rgba(159, 184, 122, 0.75)";
        ctx.fillRect(0, 0, w, h);

        // Cuadro de diálogo central
        ctx.fillStyle = "#9fb87a";
        ctx.fillRect(55, 175, 340, 110);
        ctx.strokeStyle = "#040207";
        ctx.lineWidth = 4;
        ctx.strokeRect(55, 175, 340, 110);

        ctx.fillStyle = "#040207";
        ctx.textAlign = "center";
        ctx.font = 'bold 24px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("PAUSA", w / 2, 225);

        ctx.font = '11px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("START: REANUDAR", w / 2, 255);
        ctx.fillText("BACK: SALIR AL MENÚ", w / 2, 273);
    }

    function dibujarGameOver() {
        limpiarPantalla();

        ctx.fillStyle = "#040207";
        ctx.textAlign = "center";
        ctx.font = 'bold 24px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("GAME OVER", w / 2, 70);

        // Marcador final
        ctx.font = '14px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("PUNTOS: " + score, w / 2, 105);

        // Aviso de nuevo récord
        if (ultimoRecord.esNuevo) {
            ctx.font = '10px "Press Start 2P", "Courier New", monospace';
            ctx.fillText("¡NUEVO RÉCORD! #" + (ultimoRecord.posicion + 1), w / 2, 132);
        }

        // Top 5 local (con iniciales)
        ctx.font = '11px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("TOP 5", w / 2, 162);
        ctx.font = '10px "Press Start 2P", "Courier New", monospace';
        if (top5.length === 0) {
            ctx.fillStyle = "#3a4628";
            ctx.fillText("SIN RÉCORDS", w / 2, 185);
            ctx.fillStyle = "#040207";
        } else {
            for (var i = 0; i < top5.length; i++) {
                var prefijo = (i === ultimoRecord.posicion && ultimoRecord.esNuevo) ? "> " : "";
                ctx.fillText(prefijo + (i + 1) + ". " + top5[i].nombre + " " + top5[i].puntos, w / 2, 185 + i * 20);
            }
        }

        // Opciones: si hay récord pendiente, START lleva al registro
        if (parpadeo_visible) {
            ctx.font = '11px "Press Start 2P", "Courier New", monospace';
            if (ultimoRecord.esNuevo) {
                ctx.fillText("START: REGISTRAR", w / 2, 330);
            } else {
                ctx.fillText("START: REINTENTAR", w / 2, 330);
            }
        }

        ctx.font = '9px "Press Start 2P", "Courier New", monospace';
        ctx.fillStyle = "#3a4628";
        ctx.fillText("BACK: MENÚ PRINCIPAL", w / 2, 360);
    }

    function dibujarCreditos() {
        limpiarPantalla();

        ctx.fillStyle = "#040207";
        ctx.textAlign = "center";
        ctx.font = 'bold 18px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("CRÉDITOS", w / 2, 55);

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#040207";
        ctx.beginPath();
        ctx.moveTo(70, 68);
        ctx.lineTo(380, 68);
        ctx.stroke();

        ctx.font = '10px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("SNAKE GAME RETRO", w / 2, 92);

        ctx.font = '8px "Press Start 2P", "Courier New", monospace';
        ctx.fillStyle = "#222a18";
        ctx.fillText("DESARROLLADO POR:", w / 2, 114);

        ctx.fillStyle = "#040207";
        ctx.font = 'bold 13px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("ARKEV", w / 2, 136);

        // Top 5 con iniciales (se muestra aquí tras guardar un récord)
        ctx.font = '11px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("TOP 5", w / 2, 168);
        ctx.font = '10px "Press Start 2P", "Courier New", monospace';
        if (top5.length === 0) {
            ctx.fillStyle = "#3a4628";
            ctx.fillText("SIN RÉCORDS", w / 2, 192);
            ctx.fillStyle = "#040207";
        } else {
            for (var i = 0; i < top5.length; i++) {
                ctx.fillText((i + 1) + ". " + top5[i].nombre + " " + top5[i].puntos, w / 2, 192 + i * 22);
            }
        }

        ctx.font = '8px "Press Start 2P", "Courier New", monospace';
        ctx.fillStyle = "#222a18";
        ctx.fillText("HTML5 CANVAS + JS VANILLA", w / 2, 322);

        ctx.fillStyle = "#3a4628";
        ctx.font = '10px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("PRESIONA BACK", w / 2, 360);
        ctx.font = '9px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("START: MENÚ", w / 2, 382);
    }

    // =========================================================================
    // Bucle Principal del Juego (JUGANDO)
    // =========================================================================
    function actualizarVelocidad() {
        var nivel = Math.floor(score / 5);
        intervalo_actual = intervalo_base / Math.pow(1.05, nivel);
        if (game_loop) {
            clearInterval(game_loop);
            game_loop = setInterval(paint, intervalo_actual);
        }
    }

    function paint() {
        limpiarPantalla();

        // Aplicar la dirección en cola
        d = next_d;

        // Movimiento de la serpiente
        var nx = snake_array[0].x;
        var ny = snake_array[0].y;

        if (d == "right") nx++;
        else if (d == "left") nx--;
        else if (d == "up") ny--;
        else if (d == "down") ny++;

        // Detección de colisión con paredes o consigo misma
        if (nx == -1 || nx == w / cw || ny == -1 || ny == h / cw || check_collision(nx, ny, snake_array)) {
            cambiarEstado("GAME_OVER");
            return;
        }

        // Ingesta de comida
        var tail;
        if (nx == food.x && ny == food.y) {
            tail = { x: nx, y: ny };
            score++;
            create_food();
            reproducirSFX("comer");
            // Cada 5 puntos: +5% velocidad compuesto (sin tope)
            if (score % 5 === 0) {
                actualizarVelocidad();
                reproducirSFX("nivel");
            }
        } else {
            tail = snake_array.pop();
            tail.x = nx;
            tail.y = ny;
        }

        snake_array.unshift(tail);

        // Dibujar cuerpo de la serpiente
        for (var i = 0; i < snake_array.length; i++) {
            var c = snake_array[i];
            paint_cell(c.x, c.y);
        }

        // Dibujar comida
        paint_cell(food.x, food.y);

        // Marcador superior en pantalla
        ctx.fillStyle = "#040207";
        ctx.textAlign = "left";
        ctx.font = '10px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("PUNTOS: " + score, 10, 18);
    }

    function paint_cell(x, y) {
        ctx.fillStyle = "#040207";
        ctx.fillRect(x * cw, y * cw, cw, cw);
        ctx.strokeStyle = "#9fb87a";
        ctx.lineWidth = 1;
        ctx.strokeRect(x * cw, y * cw, cw, cw);
    }

    function check_collision(x, y, array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].x == x && array[i].y == y) return true;
        }
        return false;
    }

    // =========================================================================
    // Registro de récord: 3 iniciales + teclado virtual
    // =========================================================================
    function construirTeclado() {
        if (tecladoConstruido || !registroTeclado) return;
        var letras = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
        for (var i = 0; i < letras.length; i++) {
            (function (letra) {
                var b = document.createElement("button");
                b.type = "button";
                b.className = "registro__tecla";
                b.textContent = letra;
                b.setAttribute("aria-label", "Letra " + letra);
                b.addEventListener("pointerdown", function (e) {
                    e.preventDefault();
                    agregarLetra(letra);
                });
                registroTeclado.appendChild(b);
            })(letras.charAt(i));
        }
        var borrar = document.createElement("button");
        borrar.type = "button";
        borrar.className = "registro__tecla registro__tecla--borrar";
        borrar.textContent = "⌫";
        borrar.setAttribute("aria-label", "Borrar");
        borrar.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            borrarLetra();
        });
        registroTeclado.appendChild(borrar);
        tecladoConstruido = true;
    }

    function cachearLetras() {
        if (!registroLetras.length && registroOverlay) {
            registroLetras = Array.prototype.slice.call(
                registroOverlay.querySelectorAll(".registro__letra")
            );
            for (var i = 0; i < registroLetras.length; i++) {
                (function (idx) {
                    registroLetras[idx].addEventListener("pointerdown", function (e) {
                        e.preventDefault();
                        cursorInicial = idx;
                        renderIniciales();
                    });
                })(i);
            }
        }
    }

    function mostrarRegistro(puntos) {
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
    }

    function ocultarRegistro() {
        if (registroOverlay) {
            registroOverlay.hidden = true;
        }
    }

    function renderIniciales() {
        if (!registroLetras.length) return;
        for (var i = 0; i < 3; i++) {
            var txt = iniciales[i] || "_";
            registroLetras[i].textContent = txt;
            if (i === cursorInicial && cursorInicial < 3) {
                registroLetras[i].classList.add("registro__letra--activo");
            } else {
                registroLetras[i].classList.remove("registro__letra--activo");
            }
        }
        actualizarBotonGuardar();
    }

    function actualizarBotonGuardar() {
        if (!btnGuardar) return;
        var completo = iniciales[0] && iniciales[1] && iniciales[2];
        btnGuardar.disabled = !completo;
        btnGuardar.style.opacity = completo ? "1" : "0.5";
    }

    function agregarLetra(letra) {
        if (estado !== "REGISTRO") return;
        var l = String(letra || "").toUpperCase();
        if (!/^[A-ZÑ0-9]$/.test(l)) return;
        if (cursorInicial < 0) cursorInicial = 0;
        if (cursorInicial > 2) cursorInicial = 2;
        iniciales[cursorInicial] = l;
        reproducirSFX("tecla");
        if (cursorInicial < 2) {
            // Avanzar a la siguiente casilla vacía si es posible
            var siguiente = cursorInicial + 1;
            cursorInicial = siguiente;
        } else {
            cursorInicial = 2;
            // Si ya están las 3, el cursor se queda en la última
            if (iniciales[0] && iniciales[1] && iniciales[2]) {
                cursorInicial = 3; // sin activo, listo para guardar
            }
        }
        renderIniciales();
    }

    function borrarLetra() {
        if (estado !== "REGISTRO") return;
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
        if (estado !== "REGISTRO") return;
        cursorInicial += dir;
        if (cursorInicial < 0) cursorInicial = 0;
        if (cursorInicial > 2) cursorInicial = 2;
        renderIniciales();
    }

    function intentarGuardarRegistro() {
        if (estado !== "REGISTRO") return;
        if (!(iniciales[0] && iniciales[1] && iniciales[2])) {
            return; // Aún faltan iniciales
        }
        var nombre = iniciales.join("");
        var puntos = ultimoRecord.puntos || score;
        top5 = guardarRecord(nombre, puntos);
        ultimoRecord = { esNuevo: false, posicion: -1, puntos: puntos };
        reproducirSFX("guardar");
        cambiarEstado("CREDITOS");
    }

    // =========================================================================
    // Acciones de Botones Físicos / Entrada
    // =========================================================================
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
            intentarGuardarRegistro();
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

    function cambiarDireccion(nuevaDir) {
        if (estado !== "JUGANDO") return;

        if (nuevaDir === "left" && d !== "right") {
            next_d = "left";
        } else if (nuevaDir === "up" && d !== "down") {
            next_d = "up";
        } else if (nuevaDir === "right" && d !== "left") {
            next_d = "right";
        } else if (nuevaDir === "down" && d !== "up") {
            next_d = "down";
        }
    }

    // =========================================================================
    // Manejo de Eventos Táctiles y Ratón (Pointer Events)
    // =========================================================================
    if (btnStart) {
        btnStart.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            btnStart.classList.add("btn--activo");
            vibrar(15);
            accionBotonVerde();
        });
        btnStart.addEventListener("pointerup", function () {
            btnStart.classList.remove("btn--activo");
        });
        btnStart.addEventListener("pointerleave", function () {
            btnStart.classList.remove("btn--activo");
        });
    }

    if (btnBack) {
        btnBack.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            btnBack.classList.add("btn--activo");
            vibrar(15);
            accionBotonRojo();
        });
        btnBack.addEventListener("pointerup", function () {
            btnBack.classList.remove("btn--activo");
        });
        btnBack.addEventListener("pointerleave", function () {
            btnBack.classList.remove("btn--activo");
        });
    }

    dpadButtons.forEach(function (btn) {
        var dir = btn.getAttribute("data-dir");

        btn.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            btn.classList.add("dpad__btn--activo");
            vibrar(12);
            if (estado === "REGISTRO") {
                if (dir === "left") moverCursor(-1);
                else if (dir === "right") moverCursor(1);
            } else {
                cambiarDireccion(dir);
            }
        });

        btn.addEventListener("pointerup", function () {
            btn.classList.remove("dpad__btn--activo");
        });

        btn.addEventListener("pointerleave", function () {
            btn.classList.remove("dpad__btn--activo");
        });

        btn.addEventListener("pointercancel", function () {
            btn.classList.remove("dpad__btn--activo");
        });
    });

    // Botones del overlay de registro (touch / mouse)
    if (btnGuardar) {
        btnGuardar.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            e.stopPropagation();
            intentarGuardarRegistro();
        });
    }
    if (btnCancelar) {
        btnCancelar.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            e.stopPropagation();
            accionBotonRojo();
        });
    }
    // Click como respaldo (algunos navegadores móviles)
    if (btnGuardar) {
        btnGuardar.addEventListener("click", function (e) {
            e.preventDefault();
            intentarGuardarRegistro();
        });
    }
    if (btnCancelar) {
        btnCancelar.addEventListener("click", function (e) {
            e.preventDefault();
            accionBotonRojo();
        });
    }

    // =========================================================================
    // Control por Teclado
    // =========================================================================
    document.addEventListener("keydown", function (e) {
        var key = e.which || e.keyCode;

        // M para mute en cualquier estado (salvo escribiendo iniciales con M)
        if ((e.key === "m" || e.key === "M") && estado !== "REGISTRO") {
            e.preventDefault();
            desbloquearAudio();
            alternarMute();
            return;
        }

        // En REGISTRO las letras son iniciales, no direcciones (A/D/W/S chocan)
        if (estado === "REGISTRO") {
            var k = e.key || "";
            if (k === "Enter") {
                e.preventDefault();
                intentarGuardarRegistro();
                return;
            }
            if (k === "Escape") {
                e.preventDefault();
                accionBotonRojo();
                return;
            }
            if (k === "Backspace") {
                e.preventDefault();
                borrarLetra();
                return;
            }
            if (k === "ArrowLeft") {
                e.preventDefault();
                moverCursor(-1);
                return;
            }
            if (k === "ArrowRight") {
                e.preventDefault();
                moverCursor(1);
                return;
            }
            if (k.length === 1 && /^[a-zA-Z0-9ñÑ]$/.test(k)) {
                e.preventDefault();
                agregarLetra(k);
                return;
            }
            if (k === " " || k === "Spacebar") {
                e.preventDefault();
                return;
            }
            return;
        }

        // Flechas o WASD para dirección
        if (key === 37 || e.key === "ArrowLeft" || key === 65 || e.key === "a" || e.key === "A") {
            e.preventDefault();
            cambiarDireccion("left");
        } else if (key === 38 || e.key === "ArrowUp" || key === 87 || e.key === "w" || e.key === "W") {
            e.preventDefault();
            cambiarDireccion("up");
        } else if (key === 39 || e.key === "ArrowRight" || key === 68 || e.key === "d" || e.key === "D") {
            e.preventDefault();
            cambiarDireccion("right");
        } else if (key === 40 || e.key === "ArrowDown" || key === 83 || e.key === "s" || e.key === "S") {
            e.preventDefault();
            cambiarDireccion("down");
        }
        // Enter o Barra Espaciadora -> Botón Verde (Start / Pause)
        else if (key === 13 || e.key === "Enter" || key === 32 || e.key === " ") {
            e.preventDefault();
            if (btnStart) {
                btnStart.classList.add("btn--activo");
                setTimeout(function () {
                    btnStart.classList.remove("btn--activo");
                }, 120);
            }
            accionBotonVerde();
        }
        // Escape o Backspace -> Botón Rojo (Back / Créditos)
        else if (key === 27 || e.key === "Escape" || key === 8 || e.key === "Backspace") {
            e.preventDefault();
            if (btnBack) {
                btnBack.classList.add("btn--activo");
                setTimeout(function () {
                    btnBack.classList.remove("btn--activo");
                }, 120);
            }
            accionBotonRojo();
        }
    });

    // Re-dibujar pantalla inicial una vez que la fuente web esté lista
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
            if (estado === "INICIO") {
                dibujarInicio();
            }
        });
    }

    // Botón Mute: switch con un solo clic (no hay que mantenerlo).
    // OJO: solo 'click', sin 'pointerdown', para no alternar dos veces por pulsación.
    actualizarBotonMute();
    if (btnMute) {
        btnMute.addEventListener("click", function (e) {
            e.preventDefault();
            vibrar(10);
            alternarMute();
        });
    }
    // Desbloqueo de audio en CUALQUIER gesto (el navegador exige uno antes de sonar).
    // La música intenta arrancar desde el inicio; tras el primer tap/tecla suena sola,
    // sin necesidad de oprimir START. Si molesta, se apaga con el botón.
    function reanudarAudioTrasGesto() {
        audioInfo.gestos++;
        desbloquearAudio();
        if (sonidoActivado && musicaModo && !musicaTimer) {
            var m = musicaModo;
            musicaModo = null;
            iniciarMusica(m);
        }
    }
    document.addEventListener("pointerdown", reanudarAudioTrasGesto, { passive: true });
    document.addEventListener("keydown", reanudarAudioTrasGesto);
    document.addEventListener("touchstart", reanudarAudioTrasGesto, { passive: true });
    document.addEventListener("touchend", reanudarAudioTrasGesto, { passive: true });

    // Iniciar en la pantalla de bienvenida
    cambiarEstado("INICIO");
});
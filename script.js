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
            // Cada 5 puntos: +5% velocidad compuesto (sin tope)
            if (score % 5 === 0) {
                actualizarVelocidad();
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
        cambiarEstado("CREDITOS");
    }

    // =========================================================================
    // Acciones de Botones Físicos / Entrada
    // =========================================================================
    function accionBotonVerde() {
        if (estado === "INICIO") {
            reiniciarJuego();
            cambiarEstado("JUGANDO");
        } else if (estado === "JUGANDO") {
            cambiarEstado("PAUSA");
        } else if (estado === "PAUSA") {
            cambiarEstado("JUGANDO");
        } else if (estado === "GAME_OVER") {
            if (ultimoRecord.esNuevo) {
                cambiarEstado("REGISTRO");
            } else {
                reiniciarJuego();
                cambiarEstado("JUGANDO");
            }
        } else if (estado === "REGISTRO") {
            intentarGuardarRegistro();
        } else if (estado === "CREDITOS") {
            cambiarEstado("INICIO");
        }
    }

    function accionBotonRojo() {
        if (estado === "INICIO") {
            cambiarEstado("CREDITOS");
        } else if (estado === "CREDITOS") {
            cambiarEstado("INICIO");
        } else if (estado === "REGISTRO") {
            // BACK en registro: descartar (no guardar) e ir al menú
            ultimoRecord = { esNuevo: false, posicion: -1, puntos: ultimoRecord.puntos };
            cambiarEstado("INICIO");
        } else if (estado === "JUGANDO" || estado === "PAUSA" || estado === "GAME_OVER") {
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

    // Iniciar en la pantalla de bienvenida
    cambiarEstado("INICIO");
});
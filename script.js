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

    // Máquina de estados: "INICIO", "JUGANDO", "PAUSA", "GAME_OVER", "CREDITOS"
    var estado = "INICIO";
    var animacion_timer = null;
    var parpadeo_visible = true;

    // Elementos de la interfaz (botones físicos)
    var btnStart = document.getElementById("btn-start");
    var btnBack = document.getElementById("btn-back");
    var dpadButtons = document.querySelectorAll(".dpad__btn");

    // =========================================================================
    // Inicialización del juego y reinicio
    // =========================================================================
    function reiniciarJuego() {
        d = "right";
        next_d = "right";
        create_snake();
        create_food();
        score = 0;
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
                game_loop = setInterval(paint, 60);
                break;

            case "PAUSA":
                dibujarPausa();
                break;

            case "GAME_OVER":
                parpadeo_visible = true;
                dibujarGameOver();
                animacion_timer = setInterval(function () {
                    parpadeo_visible = !parpadeo_visible;
                    dibujarGameOver();
                }, 500);
                break;

            case "CREDITOS":
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
        ctx.fillText("BACK: CREDITOS", w / 2, 390);
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
        ctx.fillText("BACK: SALIR AL MENU", w / 2, 273);
    }

    function dibujarGameOver() {
        limpiarPantalla();

        ctx.fillStyle = "#040207";
        ctx.textAlign = "center";
        ctx.font = 'bold 28px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("GAME OVER", w / 2, 140);

        // Marcador final
        ctx.font = '14px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("PUNTOS: " + score, w / 2, 210);

        // Línea divisoria retro
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#040207";
        ctx.beginPath();
        ctx.moveTo(90, 240);
        ctx.lineTo(360, 240);
        ctx.stroke();

        // Opciones parpadeantes
        if (parpadeo_visible) {
            ctx.font = '12px "Press Start 2P", "Courier New", monospace';
            ctx.fillText("START: REINTENTAR", w / 2, 310);
        }

        ctx.font = '10px "Press Start 2P", "Courier New", monospace';
        ctx.fillStyle = "#3a4628";
        ctx.fillText("BACK: MENU PRINCIPAL", w / 2, 360);
    }

    function dibujarCreditos() {
        limpiarPantalla();

        ctx.fillStyle = "#040207";
        ctx.textAlign = "center";
        ctx.font = 'bold 22px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("CREDITOS", w / 2, 80);

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#040207";
        ctx.beginPath();
        ctx.moveTo(70, 105);
        ctx.lineTo(380, 105);
        ctx.stroke();

        ctx.font = '11px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("SNAKE GAME RETRO", w / 2, 155);

        ctx.font = '9px "Press Start 2P", "Courier New", monospace';
        ctx.fillStyle = "#222a18";
        ctx.fillText("DESARROLLADO CON:", w / 2, 205);
        ctx.fillText("HTML5 CANVAS + JS VANILLA", w / 2, 230);
        ctx.fillText("ESTETICA GAME BOY & NOKIA", w / 2, 255);

        ctx.fillStyle = "#040207";
        ctx.font = '9px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("CONTROLES: TECLADO Y TOUCH", w / 2, 310);

        ctx.fillStyle = "#3a4628";
        ctx.font = '11px "Press Start 2P", "Courier New", monospace';
        ctx.fillText("PRESIONA BACK", w / 2, 390);
    }

    // =========================================================================
    // Bucle Principal del Juego (JUGANDO)
    // =========================================================================
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
        ctx.fillText("SCORE: " + score, 10, 18);
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
            reiniciarJuego();
            cambiarEstado("JUGANDO");
        } else if (estado === "CREDITOS") {
            cambiarEstado("INICIO");
        }
    }

    function accionBotonRojo() {
        if (estado === "INICIO") {
            cambiarEstado("CREDITOS");
        } else if (estado === "CREDITOS") {
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
            cambiarDireccion(dir);
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

    // =========================================================================
    // Control por Teclado
    // =========================================================================
    document.addEventListener("keydown", function (e) {
        var key = e.which || e.keyCode;

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
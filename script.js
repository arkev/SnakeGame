$(document).ready(function () {
    // Configuración del canvas
    var canvas = $("#canvas")[0];
    var ctx = canvas.getContext("2d");
    var w = $("#canvas").width();
    var h = $("#canvas").height();

    // Guardamos el ancho de la celda en una variable para fácil control
    var cw = 10;
    var d;
    var food;
    var score;

    // Creamos la serpiente
    var snake_array; // Arreglo de celdas que forman la serpiente

    function init() {
        d = "right"; // Dirección por defecto
        create_snake();
        create_food(); // Ahora podemos ver la comida
        // Por último, inicializamos la puntuación
        score = 0;

        // Movemos la serpiente usando un temporizador que ejecutará la función paint
        // cada 60ms
        if (typeof game_loop != "undefined") clearInterval(game_loop);
        game_loop = setInterval(paint, 60);
    }
    init();

    function create_snake() {
        var length = 5; // Longitud de la serpiente
        snake_array = []; // Arreglo vacío para comenzar
        for (var i = length - 1; i >= 0; i--) {
            // Esto creará una serpiente horizontal comenzando desde la parte superior izquierda
            snake_array.push({ x: i, y: 0 });
        }
    }

    // Creamos la comida
    function create_food() {
        food = {
            x: Math.round(Math.random() * (w - cw) / cw),
            y: Math.round(Math.random() * (h - cw) / cw),
        };
        // Esto creará una celda con x/y entre 0-44
        // Porque hay 45 (450/10) posiciones a lo largo de las filas y columnas
    }

    // Dibujamos la serpiente
    function paint() {
        // Para evitar el rastro de la serpiente, necesitamos pintar el fondo en cada fotograma
        // Pintamos el canvas
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "black";
        ctx.strokeRect(0, 0, w, h);

        // El código de movimiento de la serpiente va aquí.
        // La lógica es simple:
        // Extraer la celda de la cola y colocarla delante de la celda de la cabeza
        var nx = snake_array[0].x;
        var ny = snake_array[0].y;
        // Estas eran las posiciones de la celda de la cabeza.
        // La incrementaremos para obtener la nueva posición de la cabeza
        // Añadimos el movimiento según la dirección correspondiente
        if (d == "right") nx++;
        else if (d == "left") nx--;
        else if (d == "up") ny--;
        else if (d == "down") ny++;

        // Añadimos las condiciones de fin del juego (game over)
        // Esto reiniciará el juego si la serpiente choca con la pared
        // Añadimos el código para la colisión con el cuerpo
        // Ahora, si la cabeza de la serpiente choca con su cuerpo, el juego se reiniciará
        if (nx == -1 || nx == w / cw || ny == -1 || ny == h / cw || check_collision(nx, ny, snake_array)) {
            // Reiniciar juego
            init();
            // Salimos para detener la ejecución de este ciclo
            return;
        }

        // Escribimos el código para que la serpiente coma la comida
        // La lógica es simple:
        // Si la nueva posición de la cabeza coincide con la de la comida,
        // creamos una nueva cabeza en lugar de mover la cola
        if (nx == food.x && ny == food.y) {
            var tail = { x: nx, y: ny };
            score++;
            // Crear nueva comida
            create_food();
        }
        else {
            var tail = snake_array.pop(); // Extrae la última celda
            tail.x = nx; tail.y = ny;
        }
        // La serpiente ahora puede comer la comida.

        snake_array.unshift(tail); // Coloca de nuevo la cola como la primera celda

        for (var i = 0; i < snake_array.length; i++) {
            var c = snake_array[i];
            // Dibujamos celdas de 10px de ancho
            paint_cell(c.x, c.y);
        }

        // Dibujamos la comida
        paint_cell(food.x, food.y);
        // Dibujamos la puntuación
        var score_text = "Score: " + score;
        ctx.fillText(score_text, 5, h - 5);
    }

    // Creamos primero una función genérica para pintar celdas
    function paint_cell(x, y) {
        ctx.fillStyle = "blue";
        ctx.fillRect(x * cw, y * cw, cw, cw);
        ctx.strokeStyle = "white";
        ctx.strokeRect(x * cw, y * cw, cw, cw);
    }

    function check_collision(x, y, array) {
        // Esta función comprobará si las coordenadas x/y proporcionadas existen
        // en un arreglo de celdas o no
        for (var i = 0; i < array.length; i++) {
            if (array[i].x == x && array[i].y == y)
                return true;
        }
        return false;
    }

    // Añadimos los controles del teclado
    $(document).keydown(function (e) {
        var key = e.which;
        // Añadimos una condición para evitar el giro en dirección contraria
        if (key == "37" && d != "right") d = "left";
        else if (key == "38" && d != "down") d = "up";
        else if (key == "39" && d != "left") d = "right";
        else if (key == "40" && d != "up") d = "down";
        // La serpiente ahora se puede controlar mediante el teclado
    })
})
# 🐍 Juego de la Serpiente (Snake Game)

Una implementación clásica del popular juego de la serpiente desarrollada con **HTML5 Canvas**, **CSS3** y **JavaScript** (jQuery).

---

## 🎮 Descripción

El objetivo del juego es guiar a la serpiente para que consuma la mayor cantidad de alimento posible. Con cada comida ingerida, la serpiente crece en longitud y la puntuación aumenta. El juego se reinicia si la serpiente colisiona contra los bordes de la pantalla o contra su propio cuerpo.

## ✨ Características

- **Mecánica clásica**: Movimiento continuo y crecimiento progresivo de la serpiente al comer.
- **Prevención de retroceso**: Evita que la serpiente colisione accidentalmente consigo misma al presionar la dirección opuesta a su marcha.
- **Generación aleatoria de comida**: El alimento aparece de forma aleatoria en el área de juego (cuadrícula de 45×45 celdas).
- **Contador de puntos**: Marcador en tiempo real visible en el lienzo.
- **Detección de colisiones**: Reinicio automático ante choques con los límites del canvas o el cuerpo de la serpiente.

## 🕹️ Controles

Utiliza las flechas de dirección del teclado:

| Tecla | Dirección |
| :--- | :--- |
| ⬆️ **Flecha Arriba** | Mover hacia arriba |
| ⬇️ **Flecha Abajo** | Mover hacia abajo |
| ⬅️ **Flecha Izquierda** | Mover hacia la izquierda |
| ➡️ **Flecha Derecha** | Mover hacia la derecha |

## 🛠️ Tecnologías Utilizadas

- **HTML5**: Estructura semántica y renderizado con la API `<canvas>`.
- **CSS3**: Diseño centrado y presentación del área de juego.
- **JavaScript**: Lógica del juego, detección de colisiones y bucle de pintado a 60ms.
- **jQuery (1.7.1)**: Manipulación del DOM y captura de eventos del teclado.

## 🚀 Cómo Ejecutar el Proyecto

1. Clona o descarga el repositorio:
   ```bash
   git clone https://github.com/arkev/SnakeGame.git
   ```
2. Abre el archivo `index.html` en cualquier navegador web moderno (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari, etc.).
3. ¡Usa las flechas del teclado para empezar a jugar!

## 📂 Estructura del Repositorio

```text
SnakeGame/
├── index.html    # Estructura principal, canvas y scripts externos
├── style.css     # Estilos visuales y centrado en pantalla
├── script.js     # Lógica, bucle de juego, colisiones y controles
└── README.md     # Documentación del proyecto
```

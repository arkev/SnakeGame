# 🎮 Snake Retro Game

Una versión mejorada del legendario juego de la serpiente, renderizada dentro de una **carcasa de consola retro** inspirada en el diseño icónico de la **Game Boy** y los teléfonos clásicos **Nokia**.

Desarrollado con **HTML5 Canvas**, **CSS3 moderno** y **JavaScript Vanilla** en módulos ES (sin dependencias ni librerías externas).

> 🌐 **Demo en Vivo / Versión Pública:**  
> Puedes jugar directamente desde tu navegador en **GitHub Pages**:  
> 👉 **[https://arkev.github.io/SnakeGame/](https://arkev.github.io/SnakeGame/)**  
>  
> *Nota: Esta rama (`gh-pages`) corresponde a la versión pública oficial lista para producción y alojada en GitHub Pages.*

---

## ✨ Características Principales

- **Diseño de Consola Retro**: Carcasa detallada con biseles, marco de pantalla LCD verdoso, cruceta direccional (D-pad), botones diagonales con iluminación retro y ranuras de altavoz.
- **Máquina de Estados Completa**:
  - `INICIO`: Pantalla de bienvenida con arte pixel, animación parpadeante y `HI` con el mejor récord local.
  - `JUGANDO`: Bucle de juego con velocidad progresiva y marcador `PUNTOS` en tiempo real.
  - `PAUSA`: Pausa instantánea manteniendo velocidad y estado de la partida.
  - `GAME_OVER`: Puntuación final, `TOP 5` local y acceso al registro si entraste al top.
  - `REGISTRO`: Captura de 3 iniciales con teclado virtual (sin scroll).
  - `CRÉDITOS`: Autoría del proyecto (Desarrollado por **Arkev**) + `TOP 5` con iniciales.
- **Velocidad Progresiva**:
  - Inicio en `150 ms` por paso (~6.67 pasos/s), es decir, 40% de la velocidad original de `60 ms`.
  - Cada 5 puntos: `+5%` de velocidad compuesta (`intervalo = 150 / 1.05^nivel`, `nivel = floor(puntos/5)`), sin tope.
  - La velocidad original (~60 ms) se alcanza alrededor del nivel 19 (95 puntos).
  - Cada partida reinicia a `150 ms`; pausar/reanudar conserva la velocidad.
- **Récords Locales sin Base de Datos (Top 5)**:
  - Guardado en `localStorage` (`snakegame_top5_v1`) como `[{nombre:"ABC", puntos:12}]`. Persiste por navegador/dispositivo.
  - Migra récords viejos en formato número a `{nombre:"---", puntos:N}`.
  - Solo entra si `puntos > 0` y supera al 5to lugar (el empate no desplaza).
- **Doble Esquema de Control**:
  - **Físico / Táctil**: Cruceta direccional y botones `START`/`BACK` compatibles con touch y mouse. En `REGISTRO`, D-pad ◀/▶ mueve el cursor.
  - **Teclado virtual**: A-Z + Ñ + ⌫ dentro de la pantalla (4 filas de 7 teclas), sin scroll, especial para celular.
  - **Teclado físico**: Flechas o `W`, `A`, `S`, `D`, más `Enter`/`Espacio` y `Escape`. En `REGISTRO`, letras/números escriben, `Backspace` borra, `Enter` guarda y `Escape` sale.
- **Audio Procedural 8-bit (Web Audio API, sin archivos)**:
  - SFX con motor ZzFX vendoreado (MIT Frank Force): `comer`, `nivel` (cada 5 pts), `choque`, `record`, `start`, `back`, `tecla`, `borrar`, `guardar`, `ui`. Sonido activado por defecto.
  - Música en loop con secuenciador propio (square lead + triangle bass): loop tranquilo en `INICIO/GAME_OVER/REGISTRO/CRÉDITOS`, loop movido en `JUGANDO`, pausa en `PAUSA`.
  - La música intenta arrancar desde el inicio; iOS/Android exigen un primer gesto (cualquier tap/tecla) y luego suena sola.
  - Botón Mute como switch (un clic apaga/enciende, sin mantener): icono Material Symbols Rounded `volume_up`/`volume_off`, persiste en `localStorage` (`snakegame_mute_v1`). Tecla `M` también alterna (fuera de `REGISTRO`).
- **Respuesta Háptica en los Botones** (cruceta, `START`, `BACK` y Mute; no en eventos del juego):
  - **Android** (Chrome/Edge/Samsung): pulso de `40 ms` con `navigator.vibrate`. Depende de que la vibración al tocar esté activa en el sistema.
  - **iOS**: Safari no ofrece API de vibración, así que suena un "tic" grave de ~20 ms como respaldo (respeta el Mute).
  - **Escritorio**: sin efecto.
- **Áreas Táctiles Cómodas**:
  - Cruceta de `44 px` por botón y `START`/`BACK` de `44–48 px` en cualquier tamaño de pantalla.
  - Teclas del registro de `44 px` de alto; el ancho depende de la pantalla de la consola (~38 px en un teléfono de 375 px) y se encogen solas en pantallas muy pequeñas en vez de recortarse.
  - El botón Mute conserva su tamaño visual, con área táctil ampliada a `44×44 px`.
- **Accesibilidad**:
  - Foco visible al navegar con teclado (`:focus-visible`), sin aparecer al tocar o hacer clic.
  - Etiquetas ARIA en botones, canvas y registro; iconos y flechas decorativas ocultos a lectores de pantalla.
  - Zoom del navegador permitido (pellizco); el doble toque no hace zoom gracias a `touch-action: manipulation`.
- **Prevención de Suicidio / Auto-Giro**: Sistema de cola de entrada que impide colisiones accidentales al presionar giros rápidos contrarios.
- **Optimizado para Móviles y Web App**: 
  - Meta tags para pantalla completa (`mobile-web-app-capable`, `apple-mobile-web-app-capable`) y `theme-color`.
  - Iconos personalizados y favicon en carpeta `images/`.
  - Prevención de zoom por doble toque, scroll y selección de texto.
- **Diseño 100% Responsivo**: Se adapta fluidamente a teléfonos móviles, tablets y monitores de escritorio.
- **Cero Dependencias**: Implementación pura en Vanilla JS sin jQuery ni librerías pesadas, organizada en módulos ES nativos (`import`/`export`).

---

## 🕹️ Controles

| Acción | Botón en Consola | Teclado |
| :--- | :--- | :--- |
| **Mover Arriba** | Cruceta ▲ | `▲ Flecha Arriba` / `W` |
| **Mover Abajo** | Cruceta ▼ | `▼ Flecha Abajo` / `S` |
| **Mover Izquierda** | Cruceta ◀ | `◀ Flecha Izquierda` / `A` |
| **Mover Derecha** | Cruceta ▶ | `▶ Flecha Derecha` / `D` |
| **Iniciar / Pausar / Reanudar** | Botón Verde (`START`) | `Enter` / `Espacio` |
| **Reintentar (sin récord)** | Botón Verde (`START`) en `GAME_OVER` | `Enter` / `Espacio` |
| **Registrar récord** | Botón Verde (`START`) en `GAME_OVER` → `REGISTRO` | `Enter` en `GAME_OVER` |
| **Guardar iniciales** | Botón Verde (`START`) o `START: GUARDAR` en pantalla | `Enter` (requiere 3 iniciales) |
| **Salir / Cancelar registro** | Botón Rojo (`BACK`) o `BACK: SALIR` en pantalla (descarta sin guardar) | `Escape` (en `REGISTRO`, `Backspace` borra) |
| **Escribir iniciales** | Teclado virtual A-Z + Ñ + ⌫ (tocar letras/casillas) | Letras `A-Z`, `Ñ`, `0-9` |
| **Mover cursor (registro)** | Cruceta ◀ / ▶ | `◀` / `▶` |
| **Silenciar / Activar sonido** | Botón superior (switch, un clic) | `M` (fuera de `REGISTRO`) |
| **Volver / Salir / Créditos** | Botón Rojo (`BACK`) | `Escape` / `Backspace` (fuera de `REGISTRO`) |

---

## 🏗️ Flujo de Pantallas

```mermaid
stateDiagram-v2
    [*] --> INICIO
    INICIO --> JUGANDO : START (Verde) / Enter
    INICIO --> CREDITOS : BACK (Rojo) / Escape
    CREDITOS --> INICIO : BACK (Rojo) / Escape / START
    JUGANDO --> PAUSA : START (Verde) / Enter
    PAUSA --> JUGANDO : START (Verde) / Enter
    PAUSA --> INICIO : BACK (Rojo) / Escape
    JUGANDO --> GAME_OVER : Colisión
    GAME_OVER --> REGISTRO : START si hay récord Top 5
    GAME_OVER --> JUGANDO : START (Verde) / Enter sin récord
    GAME_OVER --> INICIO : BACK (Rojo) / Escape
    REGISTRO --> CREDITOS : START Guardar 3 iniciales
    REGISTRO --> INICIO : BACK descartar
```

> **Notas de flujo:** `BACK` en `REGISTRO` descarta las iniciales y no guarda. `START` en `REGISTRO` solo guarda con las 3 iniciales completas y muestra el `TOP 5` en `CRÉDITOS`.

---

## 🛠️ Tecnologías

- **HTML5**: Estructura semántica, accesibilidad ARIA, metaetiquetas para Web App móvil y renderizado gráfico mediante `<canvas>` (450×450 píxeles nativos).
- **CSS3**: Diseño retro realista mediante degradados, sombras multicapa, variables CSS para la paleta, CSS Grid para la cruceta y el teclado virtual, y consultas de medios responsive.
- **JavaScript Vanilla (módulos ES)**: Lógica de máquina de estados (`INICIO/JUGANDO/PAUSA/GAME_OVER/REGISTRO/CREDITOS`), velocidad progresiva, récords en `localStorage`, teclado virtual, audio procedural (ZzFX + secuenciador), hápticos, manejo de eventos pointer (táctiles y mouse), gestión de colisiones y bucle de juego. `script.js` se carga con `<script type="module">` e importa el resto desde `js/`.
- **Google Fonts**: Tipografía pixelada estilo 8-bit (*Press Start 2P*) + iconos (*Material Symbols Rounded*, solo los dos glifos del Mute: `volume_up` y `volume_off`).
- **ZzFXMicro v1.4.0** (MIT, Frank Force): motor tiny vendoreado en `js/audio.js` para SFX sin archivos.
- **CodeKit** (opcional): compila y minifica el proyecto en `build/` conservando los módulos.

---

## 🔊 Audio: cómo pegar tus sonidos

- **SFX**: diseña en [ZzFX Designer](https://killedbyapixel.github.io/ZzFX/) → Export TXT → en `js/audio.js` busca `const SFX = {` y reemplaza solo el array de cada clave (`comer`, `nivel`, `choque`, `record`, `start`, `back`, `tecla`, `borrar`, `guardar`, `ui`). Con `[]` ese sonido queda mudo. Trae presets demo.
- **Diagnóstico**: abre el juego como `index.html?audio-debug` para ver en pantalla el estado del audio (contexto, mute, música, gestos recibidos y último error). Útil para depurar en iOS.
- **Música**: compone en [BeepBox](https://www.beepbox.co/) → en `js/audio.js` busca `const MUSICA = {` y pega tus notas como `[["C5",1],["E5",1],["-",1]]` en `menuLead/menuBass` y `juegoLead/juegoBass`. Ajusta `pasoMenu/pasoJuego`. Trae melodías demo.

---

## 🏆 Récords

- El `TOP 5` vive solo en el navegador (`localStorage`, sin servidor).
- Formato: `[{ "nombre": "ABC", "puntos": 12 }]`.
- Limitaciones: no es global (cada celular/navegador tiene su top), se borra al limpiar datos del sitio y es editable desde DevTools.

---

## 🚀 Cómo Ejecutar

### En línea (Recomendado)
Accede directamente a la versión pública en:  
🔗 **[https://arkev.github.io/SnakeGame/](https://arkev.github.io/SnakeGame/)**

### Localmente
1. Clona o descarga el repositorio:
   ```bash
   git clone -b gh-pages https://github.com/arkev/SnakeGame.git
   ```
2. Levanta un servidor local en la carpeta del proyecto. El juego usa módulos ES, que los navegadores no cargan desde `file://`, así que **no funciona abriendo `index.html` con doble clic**:
   ```bash
   # Opción con Python
   python3 -m http.server 8080

   # Opción con Node.js / npx
   npx serve .
   ```
3. Abre `http://localhost:8080` (o el puerto que indique el servidor) en cualquier navegador moderno (Chrome, Firefox, Safari, Edge).
4. ¡Disfruta la experiencia retro en tu ordenador o dispositivo móvil!

---

## 📁 Estructura del Proyecto

```text
SnakeGame/
├── images/
│   ├── consola.svg       # Arte vectorial original de la consola
│   ├── favicon.png       # Favicon del sitio
│   └── snakeGame.png     # Icono de la aplicación para dispositivos móviles
├── build/                # Salida compilada y minificada por CodeKit (misma estructura que la raíz)
├── index.html            # Estructura de la consola, botón Mute, canvas, overlay de registro + teclado virtual, meta tags e iconos
├── style.css             # Estilos de la carcasa, pantalla, cruceta, registro sin scroll, botón Mute, foco de teclado y responsive
├── js/                   # Módulos ES (se cargan desde script.js con import)
│   ├── audio.js          # Audio procedural: SFX (ZzFX), música en loop, Mute y diagnóstico ?audio-debug
│   ├── records.js        # Top 5 en localStorage
│   ├── dibujo.js         # Pantallas del canvas (inicio, juego, pausa, game over, créditos)
│   └── entrada.js        # Botones, cruceta, teclado, hápticos y registro de iniciales
├── script.js             # Archivo principal: reglas del juego, velocidad progresiva y máquina de estados
├── config.codekit3       # Configuración de CodeKit
└── README.md             # Documentación completa del proyecto
```

---

## 👤 Autor

Desarrollado por **Arkev**.

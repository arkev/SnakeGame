// =============================================================================
// Récords: Top 5 en localStorage (sin base de datos, por navegador/dispositivo)
// Formato guardado: [{ nombre: "ABC", puntos: 12 }]
// =============================================================================
const TOP_KEY = "snakegame_top5_v1";

function limpiarNombre(nombre) {
    let s = String(nombre || "").toUpperCase().replace(/[^A-Z0-9Ñ]/g, "");
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

export function cargarTop() {
    try {
        const raw = localStorage.getItem(TOP_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        const lista = [];
        for (let i = 0; i < arr.length; i++) {
            const n = normalizarEntrada(arr[i]);
            if (n) lista.push(n);
        }
        lista.sort(function (a, b) { return b.puntos - a.puntos; });
        return lista.slice(0, 5);
    } catch (e) {
        return [];
    }
}

export function cabeEnTop(puntos) {
    if (typeof puntos !== "number" || puntos <= 0) {
        return { cabe: false, posicion: -1 };
    }
    const lista = cargarTop();
    if (lista.length < 5) {
        let pos = lista.length;
        for (let i = 0; i < lista.length; i++) {
            if (puntos > lista[i].puntos) { pos = i; break; }
        }
        return { cabe: true, posicion: pos };
    }
    if (puntos <= lista[lista.length - 1].puntos) {
        return { cabe: false, posicion: -1 };
    }
    let p2 = 0;
    for (let j = 0; j < lista.length; j++) {
        if (puntos > lista[j].puntos) { p2 = j; break; }
        p2 = j + 1;
    }
    return { cabe: true, posicion: p2 };
}

export function guardarRecord(nombre, puntos) {
    let lista = cargarTop();
    const entry = { nombre: limpiarNombre(nombre), puntos: Math.floor(puntos) };
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

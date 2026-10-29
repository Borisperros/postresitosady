const SUPABASE_URL = "https://gptaqxoeztqwxgjegnbf.supabase.co";
const SUPABASE_KEY = "sb_publishable_TTaAufosLbhWJi10QVaQvw_I31rGQGZ";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let productos = [];
let productoSeleccionado = null;
let guardando = false;

// Las cantidades se conservan en el navegador.
// Los productos y precios se conservan en Supabase.
function cargarCantidadesLocales() {
    try {
        return JSON.parse(
            localStorage.getItem("postresitos_cantidades") || "{}"
        );
    } catch {
        return {};
    }
}

let cantidadesGuardadas = cargarCantidadesLocales();

// Conversión a gramos o mililitros.
// No convertimos masa a volumen porque depende del ingrediente.
const unidades = {
    g:  { tipo: "masa", factor: 1 },
    kg: { tipo: "masa", factor: 1000 },
    ml: { tipo: "volumen", factor: 1 },
    l:  { tipo: "volumen", factor: 1000 }
};

function guardarCantidadesLocales() {
    localStorage.setItem(
        "postresitos_cantidades",
        JSON.stringify(cantidadesGuardadas)
    );
}

function mostrarEstado(texto) {
    const estado = document.getElementById("estadoConexion");
    if (estado) estado.textContent = texto;
}

function escapar(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);
}

// Convierte una cantidad a la unidad en la que se compra.
function convertirCantidad(cantidad, unidadUso, unidadCompra) {
    const uso = unidades[unidadUso];
    const compra = unidades[unidadCompra];

    if (!uso || !compra || uso.tipo !== compra.tipo) {
        return null;
    }

    const cantidadBase = cantidad * uso.factor;
    return cantidadBase / compra.factor;
}

function calcularCosto(producto, cantidad, unidadUso) {
    const cantidadCompra = convertirCantidad(
        cantidad,
        unidadUso,
        producto.unidad
    );

    if (cantidadCompra === null) return null;

    return cantidadCompra * Number(producto.precio);
}

// ==========================================
// CARGAR PRODUCTOS DESDE SUPABASE
// ==========================================

async function cargarProductos() {
    mostrarEstado("Cargando ingredientes...");

    const { data, error } = await db
        .from("productos")
        .select("id, nombre, unidad, precio")
        .order("id", { ascending: true });

    if (error) {
        mostrarEstado("Error al cargar: " + error.message);
        return;
    }

    productos = data || [];

    // Limpiar cantidades de ingredientes eliminados.
    const ids = new Set(productos.map(p => String(p.id)));

    Object.keys(cantidadesGuardadas).forEach(id => {
        if (!ids.has(id)) delete cantidadesGuardadas[id];
    });

    guardarCantidadesLocales();
    mostrarProductos();

    mostrarEstado("Ingredientes sincronizados correctamente.");
}

// ==========================================
// AGREGAR PRODUCTO
// ==========================================

async function agregarProducto() {
    if (guardando) return;

    const nombre = document
        .getElementById("nombreProducto").value.trim();

    const unidad = document
        .getElementById("unidadProducto").value;

    const valorPrecio = document
        .getElementById("precioProducto").value;

    const precio = Number(valorPrecio);

    if (!nombre) {
        alert("Escribe el nombre del producto.");
        return;
    }

    if (valorPrecio === "" || !Number.isFinite(precio) || precio <= 0) {
        alert("Introduce un precio mayor que cero.");
        return;
    }

    if (!unidades[unidad]) {
        alert("Selecciona una unidad válida.");
        return;
    }

    guardando = true;
    const boton = document.querySelector("#modalProducto .btn-save");
    if (boton) boton.disabled = true;

    try {
        const { error } = await db
            .from("productos")
            .insert([{ nombre, unidad, precio }]);

        if (error) throw error;

        document.getElementById("nombreProducto").value = "";
        document.getElementById("precioProducto").value = "";
        document.getElementById("unidadProducto").value = "g";

        bootstrap.Modal
            .getOrCreateInstance(document.getElementById("modalProducto"))
            .hide();

        await cargarProductos();
    } catch (error) {
        alert("No se pudo guardar: " + error.message);
    } finally {
        guardando = false;
        if (boton) boton.disabled = false;
    }
}

// ==========================================
// MOSTRAR PRODUCTOS
// ==========================================

function mostrarProductos() {
    const lista = document.getElementById("listaProductos");
    const mensaje = document.getElementById("mensajeVacio");

    lista.innerHTML = "";

    mensaje.style.display = productos.length ? "none" : "block";

    productos.forEach(producto => {
        const guardado = cantidadesGuardadas[producto.id] || {
            cantidad: 0,
            unidad: producto.unidad
        };

        const cantidad = Number(guardado.cantidad);
        const unidadUso = guardado.unidad || producto.unidad;

        const costo = calcularCosto(producto, cantidad, unidadUso);
        const costoTexto = costo === null
            ? "Unidades incompatibles"
            : "$" + costo.toFixed(2);

        const columna = document.createElement("div");
        columna.className = "col-12 col-md-6";

        columna.innerHTML = `
            <div class="product-card"
                 role="button" tabindex="0"
                 data-producto="${producto.id}"
                 style="cursor:pointer">

                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="product-name">
                            ${escapar(producto.nombre)}
                        </div>

                        <div class="product-price">
                            $${Number(producto.precio).toFixed(2)}
                            / ${escapar(producto.unidad)}
                        </div>
                    </div>

                    <button type="button" class="btn-delete">
                        🗑
                    </button>
                </div>

                <hr>

                <div class="d-flex justify-content-between align-items-end">
                    <div>
                        <div class="product-quantity">
                            Cantidad utilizada:
                            <strong>
                                ${cantidad} ${escapar(unidadUso)}
                            </strong>
                        </div>
                        <small class="text-muted">
                            Haz clic para cambiar
                        </small>
                    </div>

                    <div class="product-cost">${costoTexto}</div>
                </div>
            </div>
        `;

        const tarjeta = columna.querySelector(".product-card");

        tarjeta.addEventListener("click", () => {
            seleccionarProducto(producto.id);
        });

        tarjeta.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                seleccionarProducto(producto.id);
            }
        });

        tarjeta.querySelector(".btn-delete").addEventListener(
            "click",
            event => {
                event.stopPropagation();
                eliminarProducto(producto.id);
            }
        );

        lista.appendChild(columna);
    });

    actualizarTotal();
}

// ==========================================
// SELECCIONAR PRODUCTO
// ==========================================

function seleccionarProducto(id) {
    productoSeleccionado = productos.find(
        p => String(p.id) === String(id)
    );

    if (!productoSeleccionado) return;

    const guardado = cantidadesGuardadas[id] || {
        cantidad: 0,
        unidad: productoSeleccionado.unidad
    };

    document.getElementById("tituloCantidad").textContent =
        "Cantidad de " + productoSeleccionado.nombre;

    document.getElementById("cantidadProducto").value =
        guardado.cantidad;

    const selector = document.getElementById("unidadCantidad");
    const unidadGuardada = guardado.unidad;

    // Solo permitir conversiones compatibles con la unidad de compra.
    [...selector.options].forEach(opcion => {
        opcion.disabled =
            unidades[opcion.value]?.tipo !==
            unidades[productoSeleccionado.unidad]?.tipo;
    });

    selector.value = unidades[unidadGuardada] &&
        unidades[unidadGuardada].tipo ===
        unidades[productoSeleccionado.unidad]?.tipo
        ? unidadGuardada
        : productoSeleccionado.unidad;

    bootstrap.Modal
        .getOrCreateInstance(document.getElementById("modalCantidad"))
        .show();
}

// ==========================================
// GUARDAR CANTIDAD
// ==========================================

function guardarCantidad() {
    if (!productoSeleccionado) return;

    const valor = document.getElementById("cantidadProducto").value;
    const cantidad = Number(valor);
    const unidadUso = document.getElementById("unidadCantidad").value;

    if (valor === "" || !Number.isFinite(cantidad) || cantidad < 0) {
        alert("Introduce una cantidad válida.");
        return;
    }

    const costo = calcularCosto(
        productoSeleccionado,
        cantidad,
        unidadUso
    );

    if (costo === null) {
        alert("No se pueden convertir esas unidades.");
        return;
    }

    cantidadesGuardadas[productoSeleccionado.id] = {
        cantidad,
        unidad: unidadUso
    };

    guardarCantidadesLocales();
    mostrarProductos();

    bootstrap.Modal
        .getOrCreateInstance(document.getElementById("modalCantidad"))
        .hide();
}

// ==========================================
// ELIMINAR PRODUCTO
// ==========================================

async function eliminarProducto(id) {
    if (guardando) return;

    if (!confirm("¿Quieres eliminar este producto?")) return;

    guardando = true;

    try {
        const { error } = await db
            .from("productos")
            .delete()
            .eq("id", id);

        if (error) throw error;

        delete cantidadesGuardadas[id];
        guardarCantidadesLocales();

        await cargarProductos();
    } catch (error) {
        alert("No se pudo eliminar: " + error.message);
    } finally {
        guardando = false;
    }
}


function actualizarTotal() {
    let total = 0;

    for (const producto of productos) {
        const guardado = cantidadesGuardadas[producto.id] || {
            cantidad: 0,
            unidad: producto.unidad
        };

        const costo = calcularCosto(
            producto,
            Number(guardado.cantidad),
            guardado.unidad
        );

        if (costo !== null) total += costo;
    }

    document.getElementById("total").textContent =
        "$" + total.toFixed(2);
}

// ==========================================
// INICIAR
// ==========================================

async function iniciar() {
    if (!SUPABASE_URL.startsWith("https://gptaqxoeztqwxgjegnbf.supabase.co") ||
        SUPABASE_KEY === "sb_publishable_TTaAufosLbhWJi10QVaQvw_I31rGQGZ") {
        mostrarEstado("Configura las credenciales de Supabase.");
        return;
    }

    await cargarProductos();
}

iniciar();

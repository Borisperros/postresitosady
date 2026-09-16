
let productos = [];

let productoSeleccionado = null;


// ==========================================
// AGREGAR PRODUCTO
// ==========================================

function agregarProducto() {

    const nombre = document.getElementById("nombreProducto").value.trim();
    const unidad = document.getElementById("unidadProducto").value;
    const precio = parseFloat(
        document.getElementById("precioProducto").value
    );


    // Revisar que los datos estén completos
    if (nombre === "") {
        alert("Escribe el nombre del producto.");
        return;
    }

    if (isNaN(precio) || precio <= 0) {
        alert("Introduce un precio válido.");
        return;
    }


    // Crear producto
    const producto = {

        id: Date.now(),

        nombre: nombre,

        unidad: unidad,

        precio: precio,

        cantidad: 0,

        costo: 0
    };


    // Agregar a la lista
    productos.push(producto);


    // Limpiar formulario
    document.getElementById("nombreProducto").value = "";
    document.getElementById("precioProducto").value = "";
    document.getElementById("unidadProducto").value = "g";


    // Cerrar ventana
    const modal = bootstrap.Modal.getInstance(
        document.getElementById("modalProducto")
    );

    modal.hide();


    // Actualizar pantalla
    mostrarProductos();
}


// ==========================================
// MOSTRAR PRODUCTOS
// ==========================================

function mostrarProductos() {

    const lista = document.getElementById("listaProductos");

    const mensaje = document.getElementById("mensajeVacio");


    lista.innerHTML = "";


    // Si no hay productos
    if (productos.length === 0) {

        mensaje.style.display = "block";

        actualizarTotal();

        return;
    }


    mensaje.style.display = "none";


    // Crear tarjeta para cada producto
    productos.forEach(producto => {

        const columna = document.createElement("div");

        columna.className = "col-12 col-md-6";


        columna.innerHTML = `

            <div class="product-card"
                 onclick="seleccionarProducto(${producto.id})">

                <div class="d-flex justify-content-between align-items-start">

                    <div>

                        <div class="product-name">
                            ${producto.nombre}
                        </div>

                        <div class="product-price">
                            $${producto.precio.toFixed(2)}
                            / ${producto.unidad}
                        </div>

                    </div>


                    <button
                        class="btn-delete"
                        onclick="event.stopPropagation(); eliminarProducto(${producto.id})">

                        🗑

                    </button>

                </div>


                <hr>


                <div class="d-flex justify-content-between align-items-end">

                    <div>

                        <div class="product-quantity">

                            Cantidad utilizada:

                            <strong>
                                ${producto.cantidad}
                                ${producto.unidad}
                            </strong>

                        </div>

                        <small class="text-muted">
                            Haz clic para cambiar
                        </small>

                    </div>


                    <div class="product-cost">

                        $${producto.costo.toFixed(2)}

                    </div>

                </div>

            </div>
        `;


        lista.appendChild(columna);

    });


    actualizarTotal();
}


// ==========================================
// SELECCIONAR PRODUCTO
// ==========================================

function seleccionarProducto(id) {

    productoSeleccionado = productos.find(
        producto => producto.id === id
    );


    if (!productoSeleccionado) {
        return;
    }


    // Cambiar título
    document.getElementById("tituloCantidad").textContent =
        "Cantidad de " + productoSeleccionado.nombre;


    // Mostrar unidad
    document.getElementById("unidadCantidad").textContent =
        productoSeleccionado.unidad;


    // Mostrar cantidad actual
    document.getElementById("cantidadProducto").value =
        productoSeleccionado.cantidad;


    // Abrir modal
    const modal = new bootstrap.Modal(
        document.getElementById("modalCantidad")
    );

    modal.show();

}


// ==========================================
// GUARDAR CANTIDAD
// ==========================================

function guardarCantidad() {

    if (!productoSeleccionado) {
        return;
    }


    const cantidad = parseFloat(
        document.getElementById("cantidadProducto").value
    );


    if (isNaN(cantidad) || cantidad < 0) {

        alert("Introduce una cantidad válida.");

        return;
    }


    // Guardar cantidad
    productoSeleccionado.cantidad = cantidad;


    // Calcular costo
    productoSeleccionado.costo =
        (cantidad / 1) * productoSeleccionado.precio;


    // IMPORTANTE:
    // Si usamos gramos o mililitros,
    // el precio introducido debe ser por gramo/ml.
    //
    // Ejemplo:
    // 500 g de harina = $20
    //
    // Precio por gramo = 20 / 500 = $0.04


    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(
        document.getElementById("modalCantidad")
    );

    modal.hide();


    mostrarProductos();
}


// ==========================================
// ELIMINAR PRODUCTO
// ==========================================

function eliminarProducto(id) {

    const confirmar = confirm(
        "¿Quieres eliminar este producto?"
    );


    if (!confirmar) {
        return;
    }


    productos = productos.filter(
        producto => producto.id !== id
    );


    mostrarProductos();
}


// ==========================================
// CALCULAR TOTAL
// ==========================================

function actualizarTotal() {

    let total = 0;


    productos.forEach(producto => {

        total += producto.costo;

    });


    document.getElementById("total").textContent =
        "$" + total.toFixed(2);

}


// ==========================================
// INICIAR PÁGINA
// ==========================================

mostrarProductos();

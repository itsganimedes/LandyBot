const SPREADSHEET_ID = "1gTnrmHYfCgpZkKUWD5vBgPsTQmmi1Ikrd8419IUVDsI";

// Parámetro &gid para apuntar exactamente a tus pestañas reales
const URL_CONFIG = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=1801309830`;
const URL_PRODUCTOS = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=1739007170`;
const URL_CUPONES = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=1141912272`;

let datosApp = { configuracion: {}, productos: [], cupones: {} };
let carrito = {};

// PARSEADOR AVANZADO: Soporta comas internas dentro de textos entrecomillados
function csvAObjetos(textoCSV) {
    const lineas = textoCSV.split("\n");
    
    const limpiar = (texto) => texto ? texto.replace(/^"|"$/g, '').replace('\r', '').trim() : "";
    
    // RegEx mágica: Separa por comas pero ignora las que están dentro de comillas ""
    const separarColumnas = (linea) => {
        const resultado = [];
        let dentroDeComillas = false;
        let columnaActual = "";
        
        for (let i = 0; i < linea.length; i++) {
            let char = linea[i];
            if (char === '"') {
                dentroDeComillas = !dentroDeComillas;
            } else if (char === ',' && !dentroDeComillas) {
                resultado.push(columnaActual);
                columnaActual = "";
            } else {
                columnaActual += char;
            }
        }
        resultado.push(columnaActual);
        return resultado.map(limpiar);
    };

    if (lineas.length === 0) return [];
    
    const cabeceras = separarColumnas(lineas[0]);
    const resultado = [];

    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue;
        const columnas = separarColumnas(lineas[i]);
        const obj = {};
        cabeceras.forEach((cabecera, indice) => {
            obj[cabecera] = columnas[indice] || "";
        });
        resultado.push(obj);
    }
    return resultado;
}

// Cargar los datos reales desde las URLs de Google Sheets al iniciar
async function cargarDatos() {
    try {
        // MODIFICADO: Ahora hacemos 3 peticiones en paralelo en lugar de 2
        const [resConfig, resProductos, resCupones] = await Promise.all([
            fetch(URL_CONFIG).then(r => r.text()),
            fetch(URL_PRODUCTOS).then(r => r.text()),
            fetch(URL_CUPONES).then(r => r.text())
        ]);

        // ... (Tu código para procesar pestaña Configuración se mantiene exactamente igual) ...
        const arrayConfig = csvAObjetos(resConfig);
        arrayConfig.forEach(fila => {
            const claveOriginal = fila.Propiedad || fila.propiedad || Object.values(fila)[0];
            const valorOriginal = fila.Valor || fila.valor || Object.values(fila)[1];
            if (claveOriginal) {
                const claveLimpia = claveOriginal.toLowerCase().trim();
                datosApp.configuracion[claveLimpia] = valorOriginal;
            }
        });

        // ... (Tu código para procesar pestaña Productos se mantiene exactamente igual) ...
        datosApp.productos = csvAObjetos(resProductos).map(p => {
            const id = p.ID || p.id; const precio = p.Precio || p.precio; const disponible = p.Disponible || p.disponible;
            const categoria = p.Categoria || p.categoria; const nombre = p.Nombre || p.nombre; const descripcion = p.Descripcion || p.descripcion;
            const urlImagen = p.URL_Imagen || p.url_imagen || p.Url_Imagen;
            return {
                id: parseInt(id), Categoria: categoria, Nombre: nombre, Descripcion: descripcion,
                precio: parseFloat(precio) || 0, Disponible: disponible ? disponible.toUpperCase() : "NO", URL_Imagen: urlImagen
            };
        });

        // NUEVO: Procesar la pestaña de Cupones personalizados dinámicamente
        const arrayCupones = csvAObjetos(resCupones);
        arrayCupones.forEach(c => {
            const codigo = c.Codigo || c.codigo;
            const porcentaje = c.Porcentaje || c.porcentaje;
            if (codigo) {
                // Guardamos en el objeto global pasándolo a mayúsculas para evitar fallos de tipeo
                datosApp.cupones[codigo.toUpperCase().trim()] = parseFloat(porcentaje) || 0;
            }
        });

        // Inicializar la interfaz visual
        inicializarInterfaz();

    } catch (error) {
        console.error("Error cargando los datos de LandyBot:", error);
        alert("Hubo un error al conectar con los datos del negocio.");
    }
}

function inicializarInterfaz() {
    const config = datosApp.configuracion;

    // Aplicar estilos CSS reactivos habituales
    if (config.color_primario) document.documentElement.style.setProperty('--color-primario', config.color_primario);
    if (config.color_secundario) document.documentElement.style.setProperty('--color-secundario', config.color_secundario);
    if (config.color_fondo) document.documentElement.style.setProperty('--color-fondo', config.color_fondo);
    if (config.color_encabezado) document.documentElement.style.setProperty('--color-header', config.color_encabezado);
    if (config.color_texto) document.documentElement.style.setProperty('--color-texto', config.color_texto);

    // NUEVA INYECCIÓN: Cambiar el patrón de fondo según Sheets (Puntos o Cuadros)
    if (config.tipo_fondo) {
        const tipo = config.tipo_fondo.trim().toLowerCase();
        
        if (tipo === "puntos") {
            document.body.style.backgroundImage = "radial-gradient(rgba(176, 125, 255, 0.15) 1.5px, transparent 1.5px)";
            document.body.style.backgroundSize = "24px 24px";
        } else if (tipo === "cuadros") {
            document.body.style.backgroundImage = `
                linear-gradient(to right, rgba(176, 125, 255, 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(176, 125, 255, 0.1) 1px, transparent 1px)
            `;
            document.body.style.backgroundSize = "40px 40px";
        }
    }

    // Inyectar textos de forma segura
    document.title = config.nombre_negocio || "Landy Bot";
    
    const elemNombre = document.getElementById('nombre-negocio');
    if (elemNombre) elemNombre.innerText = config.nombre_negocio || "Mi Negocio";
    
    const elemEslogan = document.getElementById('eslogan-negocio');
    if (elemEslogan) elemEslogan.innerText = config.eslogan || "";
    
    const elemHorario = document.getElementById('horario-negocio');
    if (elemHorario) elemHorario.innerText = "🕒 " + (config.horario || "Consultar");
    
    const elemDireccion = document.getElementById('direccion-negocio');
    if (elemDireccion) elemDireccion.innerText = "📍 " + (config.direccion || "");
    
    const elemLogo = document.getElementById('logo-negocio');
    if (elemLogo) {
        if (config.url_logo) {
            elemLogo.src = config.url_logo;
        } else {
            elemLogo.style.display = 'none';
        }
    }

    renderizarCatalogo();

    // Actualizar el nombre en el Footer dinámicamente
    const elemFooterNombre = document.getElementById('footer-nombre-negocio');
    if (elemFooterNombre) elemFooterNombre.innerText = config.nombre_negocio || "Mi Negocio";

    // Configurar el enlace del botón flotante de WhatsApp
    const btnFloatWA = document.getElementById('btn-whatsapp-flotante');
    if (btnFloatWA && config.whatsapp) {
        let mensajeConsulta = encodeURIComponent(`¡Hola ${config.nombre_negocio || 'Negocio'}! Vi su catálogo web y quería hacerles una consulta.`);
        btnFloatWA.href = `https://wa.me/${config.whatsapp}?text=${mensajeConsulta}`;
    }

    // Apagar pantalla de carga y mostrar la web
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
    
    const header = document.getElementById('header-negocio');
    if (header) header.style.display = 'block';
}

// MODIFICADO: Ahora acepta un array opcional para poder filtrar
function renderizarCatalogo(productosAFiltrar = null) {
    const catalogoContainer = document.getElementById('catalogo');
    if (!catalogoContainer) return;
    
    // Si no pasamos un filtro, usamos todos los productos de datosApp
    const listaProductos = productosAFiltrar || datosApp.productos;
    const categorias = {};

    listaProductos.forEach(p => {
        if(p.Disponible === "SI") {
            if (!categorias[p.Categoria]) categorias[p.Categoria] = [];
            categorias[p.Categoria].push(p);
        }
    });

    // Si el objeto de categorías queda vacío, significa que ningún producto coincide
    if (Object.keys(categorias).length === 0) {
        catalogoContainer.innerHTML = `<div class="sin-resultados">😔 No encontramos productos que coincidan con tu búsqueda.</div>`;
        return;
    }

    let htmlHTML = '';
    for (const cat in categorias) {
        htmlHTML += `<h2 class="categoria-titulo">${cat}</h2>`;
        categorias[cat].forEach(p => {
            // Reutilizamos el valor del carrito para mantener el número si el usuario ya sumó algo
            const cantidadActual = carrito[p.id] || 0;

            htmlHTML += `
                <div class="producto-card">
                    <div class="producto-info">
                        <h3 class="producto-nombre">${p.Nombre}</h3>
                        <p class="producto-desc">${p.Descripcion}</p>
                        <span class="producto-precio">$${p.precio.toLocaleString()}</span>
                        <div class="contador-container">
                            <button class="btn-cant" onclick="modificarCantidad(${p.id}, -1)">-</button>
                            <span class="cantidad-num" id="cant-${p.id}">${cantidadActual}</span>
                            <button class="btn-cant" onclick="modificarCantidad(${p.id}, 1)">+</button>
                        </div>
                    </div>
                    <img class="producto-img" src="${p.URL_Imagen}" alt="${p.Nombre}">
                </div>
            `;
        });
    }
    catalogoContainer.innerHTML = htmlHTML;
}

// NUEVA FUNCIÓN: Se ejecuta en cada letra que escribe el usuario (oninput)
function filtrarCatalogo() {
    const input = document.getElementById('input-busqueda');
    if (!input) return;

    // Pasamos a minúsculas y quitamos espacios en los extremos para comparar limpio
    const terminoBusqueda = input.value.toLowerCase().trim();

    // Si no hay nada escrito, renderiza todo el catálogo normal
    if (terminoBusqueda === "") {
        renderizarCatalogo(datosApp.productos);
        return;
    }

    // Filtramos buscando coincidencias en Nombre, Descripción o Categoría
    const productosFiltrados = datosApp.productos.filter(p => {
        const nombre = (p.Nombre || "").toLowerCase();
        const descripcion = (p.Descripcion || "").toLowerCase();
        const categoria = (p.Categoria || "").toLowerCase();

        return nombre.includes(terminoBusqueda) || 
                descripcion.includes(terminoBusqueda) || 
                categoria.includes(terminoBusqueda);
    });

    // Volvemos a pintar el catálogo pero solo con los que pasaron el filtro
    renderizarCatalogo(productosFiltrados);
}

function modificarCantidad(id, cambio) {
    if (!carrito[id]) carrito[id] = 0;
    carrito[id] += cambio;
    
    if (carrito[id] <= 0) {
        delete carrito[id];
        const elemCant = document.getElementById(`cant-${id}`);
        if (elemCant) elemCant.innerText = 0;
    } else {
        const elemCant = document.getElementById(`cant-${id}`);
        if (elemCant) elemCant.innerText = carrito[id];
    }
    actualizarBarraPedido();
}

function actualizarBarraPedido() {
    let total = 0;
    let totalItems = 0;

    for (const id in carrito) {
        const producto = datosApp.productos.find(p => p.id == id);
        if (producto) {
            total += producto.precio * carrito[id];
            totalItems += carrito[id];
        }
    }

    const footer = document.getElementById('footer-pedido');
    const totalTxt = document.getElementById('total-pedido');

    if (footer && totalTxt) {
        if (totalItems > 0) {
            footer.style.display = 'flex';
            totalTxt.innerText = `$${total.toLocaleString()}`;
        } else {
            footer.style.display = 'none';
        }
    }
}

function enviarPedidoWhatsApp() {
    const config = datosApp.configuracion;
    let textoMensaje = `*¡Hola ${config.nombre_negocio || 'Negocio'}! Quiero hacer un pedido:* \n\n`;
    let total = 0;

    for (const id in carrito) {
        const producto = datosApp.productos.find(p => p.id == id);
        if (producto) {
            total += producto.precio * carrito[id];
            textoMensaje += `• ${carrito[id]}x _${producto.Nombre}_ ($${producto.precio.toLocaleString()} c/u)\n`;
        }
    }

    textoMensaje += `\n*Total a Pagar:* $${total.toLocaleString()}\n\n`;
    textoMensaje += `¿Me confirman el pedido? 😊`;

    const numeroWA = config.whatsapp || "";
    window.open(`https://wa.me/${numeroWA}?text=${encodeURIComponent(textoMensaje)}`, '_blank');
}


// Ejecutar carga al abrir la app
cargarDatos();



// MODAL

// VARIABLES GLOBALES PARA EL CHECKOUT
let descuentoAplicado = 0;
let cuponValidoActivo = "";
let envioActual = 0;
let subtotalGlobal = 0;
let totalGlobal = 0;

function abrirCheckout() {
    const config = datosApp.configuracion;
    
    // 1. Validar si el negocio hace envíos a domicilio
    // Si no está definido en Sheets, asumimos por defecto que "SI" hace envíos
    const haceEnvios = config.hace_envios ? config.hace_envios.toUpperCase().trim() : "SI";
    
    const radioDelivery = document.querySelector('input[value="delivery"]');
    const radioRetiro = document.querySelector('input[value="retiro"]');
    const avisoNoEnvios = document.getElementById('aviso-no-envios');

    if (haceEnvios === "NO") {
        // Forzamos a que esté seleccionado Retiro en Local
        radioRetiro.checked = true;
        // Deshabilitamos la opción de delivery
        if (radioDelivery) radioDelivery.disabled = true;
        // Mostramos el mensaje de advertencia
        if (avisoNoEnvios) {
            avisoNoEnvios.innerText = "⚠️ Este negocio no hace envíos a domicilio.";
            avisoNoEnvios.style.display = "block";
        }
        // Ocultamos el campo de dirección de inmediato
        cambiarTipoEntrega('retiro');
        return; // Detenemos la ejecución aquí ya que cambiarTipoEntrega volverá a llamar a abrirCheckout de forma segura
    } else {
        // Si hace envíos, nos aseguramos de habilitar el botón de delivery por si estaba bloqueado
        if (radioDelivery) radioDelivery.disabled = false;
        if (avisoNoEnvios) avisoNoEnvios.style.display = "none";
    }

    // 2. Calcular el Subtotal de los productos en el carrito
    let subtotal = 0;
    for (const id in carrito) {
        const producto = datosApp.productos.find(p => p.id == id);
        if (producto) subtotal += producto.precio * carrito[id];
    }
    subtotalGlobal = subtotal;

    // 3. Evaluar costo de envío y envío gratis
    const costoEnvioBase = parseFloat(config.costo_envio) || 0;
    const envioGratisDesde = parseFloat(config.envio_gratis_desde) || 999999;
    const tipoEntregaActivo = document.querySelector('input[name="tipo_entrega"]:checked').value;
    const avisoGratisElem = document.getElementById('aviso-envio-gratis');

    if (tipoEntregaActivo === "delivery") {
        if (subtotal >= envioGratisDesde) {
            envioActual = 0;
            if(avisoGratisElem) avisoGratisElem.style.display = "block";
        } else {
            envioActual = costoEnvioBase;
            if(avisoGratisElem) avisoGratisElem.style.display = "none";
        }
    } else {
        envioActual = 0;
        if(avisoGratisElem) avisoGratisElem.style.display = "none";
    }

    // 4. Calcular Totales aplicando el cupón dinámico
    let montoDescuento = subtotalGlobal * descuentoAplicado;
    totalGlobal = subtotalGlobal + envioActual - montoDescuento;

    // 5. Inyectar valores en la interfaz
    document.getElementById('chk-subtotal').innerText = `$${subtotalGlobal.toLocaleString()}`;
    document.getElementById('chk-envio').innerText = `$${envioActual.toLocaleString()}`;
    document.getElementById('chk-total').innerText = `$${totalGlobal.toLocaleString()}`;
    
    const filaDesc = document.getElementById('fila-descuento');
    if (descuentoAplicado > 0) {
        document.getElementById('chk-descuento').innerText = `$${montoDescuento.toLocaleString()}`;
        filaDesc.style.display = "flex";
    } else {
        filaDesc.style.display = "none";
    }

    // 6. Mostrar el Modal
    document.getElementById('modal-checkout').style.display = "flex";
}

function cerrarCheckout() {
    document.getElementById('modal-checkout').style.display = "none";
}

// Controlar visualmente si se pide dirección o no (Feature 4)
function cambiarTipoEntrega(tipo) {
    const campoDireccion = document.getElementById('campo-direccion');
    const inputDireccion = document.getElementById('txt-direccion');
    const filaEnvio = document.getElementById('fila-envio');

    if (tipo === 'delivery') {
        campoDireccion.style.display = "block";
        inputDireccion.required = true;
        filaEnvio.style.style = "flex";
    } else {
        campoDireccion.style.display = "none";
        inputDireccion.required = false;
        filaEnvio.style.display = "none";
    }
    // Recalcular el envío y totales basándonos en la nueva opción seleccionada
    abrirCheckout();
}

// Validación de cupones (Feature 6)
function validarCupon() {
    const inputCupon = document.getElementById('txt-cupon');
    const msgCupon = document.getElementById('msg-cupon');
    const codigo = inputCupon.value.trim().toUpperCase();

    if (codigo === "") {
        descuentoAplicado = 0;
        cuponValidoActivo = "";
        msgCupon.innerText = "";
        abrirCheckout();
        return;
    }

    // NUEVO: Buscamos en los cupones descargados de Google Sheets
    if (datosApp.cupones[codigo] !== undefined) {
        descuentoAplicado = datosApp.cupones[codigo];
        cuponValidoActivo = codigo;
        msgCupon.style.color = "#27ae60";
        msgCupon.innerText = `¡Cupón válido! Obtienes un ${(descuentoAplicado * 100)}% de desc.`;
    } else {
        descuentoAplicado = 0;
        cuponValidoActivo = "";
        msgCupon.style.color = "#e74c3c";
        msgCupon.innerText = "El cupón ingresado no existe o expiró.";
    }

    // Re-calculamos los números globales del modal
    abrirCheckout();
}

// PROCESAR TODO Y ENVIAR EL MENSAJE FINAL (Feature 4, 5 y 6 combinadas)
function procesarYEnviar(event) {
    event.preventDefault(); // Evitar que recargue la página

    const config = datosApp.configuracion;
    const nombre = document.getElementById('txt-nombre').value.trim();
    const tipoEntrega = document.querySelector('input[name="tipo_entrega"]:checked').value;
    const direccion = document.getElementById('txt-direccion').value.trim();
    const pago = document.getElementById('select-pago').value;

    // Construcción del Mensaje para WhatsApp
    let textoMensaje = `*¡Hola ${config.nombre_negocio || 'Negocio'}! Quiero hacer un pedido:* \n\n`;
    
    textoMensaje += `👤 *Cliente:* ${nombre}\n`;
    textoMensaje += `📦 *Entrega:* ${tipoEntrega === 'delivery' ? '🛵 Delivery' : '🏪 Retiro en local'}\n`;
    if (tipoEntrega === 'delivery') {
        textoMensaje += `📍 *Dirección:* ${direccion}\n`;
    }
    textoMensaje += `💳 *Método de Pago:* ${pago}\n`;
    textoMensaje += `───────────────────\n\n`;
    textoMensaje += `🛒 *Detalle del Pedido:*\n`;

    // Listar los productos
    for (const id in carrito) {
        const producto = datosApp.productos.find(p => p.id == id);
        if (producto) {
            textoMensaje += `• ${carrito[id]}x _${producto.Nombre}_ ($${producto.precio.toLocaleString()} c/u)\n`;
        }
    }

    textoMensaje += `\n───────────────────\n`;
    textoMensaje += `💵 *Subtotal:* $${subtotalGlobal.toLocaleString()}\n`;
    
    if (tipoEntrega === 'delivery') {
        textoMensaje += `🛵 *Costo de Envío:* ${envioActual === 0 ? '¡GRATIS!' : '$' + envioActual.toLocaleString()}\n`;
    }
    
    if (descuentoAplicado > 0) {
        let montoDescuento = subtotalGlobal * descuentoAplicado;
        textoMensaje += `🎟️ *Cupón (${cuponValidoActivo}):* -$${montoDescuento.toLocaleString()}\n`;
    }

    textoMensaje += `💰 *TOTAL A PAGAR:* $${totalGlobal.toLocaleString()}\n\n`;
    textoMensaje += `¿Me confirman el pedido? 😊`;

    // Lanzar WhatsApp de forma limpia
    const numeroWA = config.whatsapp || "";
    window.open(`https://wa.me/${numeroWA}?text=${encodeURIComponent(textoMensaje)}`, '_blank');
    
    // Opcional: Cerrar el modal tras enviar
    cerrarCheckout();
}
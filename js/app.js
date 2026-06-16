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


        const arrayConfig = csvAObjetos(resConfig);
        arrayConfig.forEach(fila => {
            const claveOriginal = fila.Propiedad || fila.propiedad || Object.values(fila)[0];
            const valorOriginal = fila.Valor || fila.valor || Object.values(fila)[1];
            if (claveOriginal) {
                const claveLimpia = claveOriginal.toLowerCase().trim();
                datosApp.configuracion[claveLimpia] = valorOriginal;
            }
        });


        datosApp.productos = csvAObjetos(resProductos).map(p => {
            const id = p.ID || p.id; 
            const precio = p.Precio || p.precio; 
            const precioOferta = p.Precio_Oferta || p.precio_oferta || p.Precio_oferta || p.precioOferta; // <- Captura la columna de Sheets
            const disponible = p.Disponible || p.disponible;
            const categoria = p.Categoria || p.categoria; 
            const nombre = p.Nombre || p.nombre; 
            const descripcion = p.Descripcion || p.descripcion;
            const urlImagen = p.URL_Imagen || p.url_imagen || p.Url_Imagen;
            
            return {
                id: parseInt(id), 
                Categoria: categoria, 
                Nombre: nombre, 
                Descripcion: descripcion,
                precio: parseFloat(precio) || 0, 
                precio_oferta: parseFloat(precioOferta) || 0, // <- Se guarda correctamente en el objeto de la app
                Disponible: disponible ? disponible.toUpperCase() : "NO", 
                URL_Imagen: urlImagen
            };
        });

        
        // Procesar la pestaña de Cupones personalizados dinámicamente
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

    const demoraValor = config.demora ? config.demora.trim() : "";
    const elemDemora = document.getElementById('demora-negocio');

    if (elemDemora) {
        if (demoraValor !== "") {
            elemDemora.innerText = '⚠️ ATENCIÓN: Demora de ' + demoraValor;
            elemDemora.style.display = "block";
        } else {
            elemDemora.style.display = "none";
        }
    }
    
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



function renderizarCatalogo(productosAFiltrar = null) {
    const catalogoContainer = document.getElementById('catalogo');
    if (!catalogoContainer) return;
    
    // Si no pasamos un filtro, usamos todos los productos de datosApp
    const listaProductos = productosAFiltrar || datosApp.productos;
    const categories = {};

    listaProductos.forEach(p => {
        // MODIFICADO: Ahora permitimos que entren tanto los disponibles (SI) como los agotados (NO)
        if(p.Disponible === "SI" || p.Disponible === "NO") {
            if (!categories[p.Categoria]) categories[p.Categoria] = [];
            categories[p.Categoria].push(p);
        }
    });

    const catKeys = Object.keys(categories);

    // Si el objeto de categorías queda vacío, significa que ningún producto coincide
    if (catKeys.length === 0) {
        catalogoContainer.innerHTML = `<div class="sin-resultados">😔 No encontramos productos que coincidan con tu búsqueda.</div>`;
        return;
    }

    let htmlHTML = '';

    // Navegación rápida (pills) para saltar entre categorías, solo si hay más de una
    if (catKeys.length > 1) {
        htmlHTML += `<nav class="nav-categorias" aria-label="Categorías">`;
        catKeys.forEach(cat => {
            htmlHTML += `<button type="button" class="pill-categoria" onclick="irACategoria('${slugify(cat)}')">${cat}</button>`;
        });
        htmlHTML += `</nav>`;
    }

    catKeys.forEach(cat => {
        const catId = slugify(cat);
        let cardsHTML = '';

        categories[cat].forEach(p => {
            const cantidadActual = carrito[p.id] || 0;

            // --- NUEVA LÓGICA DE DISPONIBILIDAD ---
            const noDisponible = p.Disponible === "NO";
            const claseCardExtra = noDisponible ? 'producto-no-disponible' : '';
            const etiquetaNoDisponible = noDisponible ? `<span class="badge-no-disponible">No disponible</span>` : '';
            const atributoDisabled = noDisponible ? 'disabled' : ''; // Bloquea el botón de forma nativa en HTML

            // --- LÓGICA DE PRECIOS CON OFERTA ---
            const precioNormalNum = parseFloat(p.precio) || 0;
            const precioOfertaNum = parseFloat(p.precio_oferta) || 0;
            
            let preciosHTML = '';
            let badgeOferta = '';

            if (precioOfertaNum > 0) {
                badgeOferta = !noDisponible ? `<span class="badge-oferta">Oferta</span>` : '';
                preciosHTML = `
                    <div class="precios-wrapper">
                        <span class="precio-original-tachado">$${precioNormalNum.toLocaleString()}</span>
                        <span class="producto-precio destacado">$${precioOfertaNum.toLocaleString()}</span>
                    </div>
                `;
            } else {
                preciosHTML = `
                    <div class="precios-wrapper">
                        <span class="producto-precio">$${precioNormalNum.toLocaleString()}</span>
                    </div>
                `;
            }

            cardsHTML += `
                <div class="producto-card ${claseCardExtra}">
                    <div class="producto-img-wrapper">
                        <img class="producto-img" src="${p.URL_Imagen}" alt="${p.Nombre}" loading="lazy">
                        ${badgeOferta}
                        ${etiquetaNoDisponible}
                    </div>
                    <div class="producto-info">
                        <h3 class="producto-nombre">${p.Nombre}</h3>
                        <p class="producto-desc">${p.Descripcion}</p>

                        ${preciosHTML}

                        <div class="contador-container">
                            <button class="btn-cant" onclick="modificarCantidad(${p.id}, -1)" ${atributoDisabled}>-</button>
                            <span class="cantidad-num" id="cant-${p.id}">${cantidadActual}</span>
                            <button class="btn-cant" onclick="modificarCantidad(${p.id}, 1)" ${atributoDisabled}>+</button>
                        </div>
                    </div>
                </div>
            `;
        });

        htmlHTML += `
            <section class="categoria-seccion" id="seccion-${catId}">
                <div class="categoria-header">
                    <h2 class="categoria-titulo">${cat}</h2>
                    <div class="categoria-controles">
                        <button type="button" class="btn-flecha" onclick="moverCarrusel('${catId}', -1)" aria-label="Ver productos anteriores">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <button type="button" class="btn-flecha" onclick="moverCarrusel('${catId}', 1)" aria-label="Ver más productos">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div class="carrusel-wrapper">
                    <div class="carrusel-pista" id="carrusel-${catId}">
                        ${cardsHTML}
                    </div>
                </div>
            </section>
        `;
    });

    catalogoContainer.innerHTML = htmlHTML;
}

// Convierte el nombre de una categoría en un id seguro para usar en el DOM
function slugify(texto) {
    return (texto || 'cat')
        .toString()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'cat';
}

// Desplaza el carrusel de una categoría hacia adelante o atrás
function moverCarrusel(catId, direccion) {
    const pista = document.getElementById(`carrusel-${catId}`);
    if (!pista) return;
    const primeraCard = pista.querySelector('.producto-card');
    const ancho = primeraCard ? primeraCard.getBoundingClientRect().width + 14 : 180;
    pista.scrollBy({ left: direccion * ancho * 2, behavior: 'smooth' });
}

// Salta suavemente a la sección de una categoría (usado por las pills de navegación)
function irACategoria(catId) {
    const seccion = document.getElementById(`seccion-${catId}`);
    if (!seccion) return;
    seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// Se ejecuta en cada letra que escribe el usuario (oninput)
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
            // DETECTAR PRECIO ACTIVO (Normal u Oferta)
            const precioActivo = producto.precio_oferta > 0 ? producto.precio_oferta : producto.precio;
            
            total += precioActivo * carrito[id];
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
            // DETECTAR PRECIO ACTIVO
            const precioActivo = producto.precio_oferta > 0 ? producto.precio_oferta : producto.precio;
            
            total += precioActivo * carrito[id];
            textoMensaje += `• ${carrito[id]}x _${producto.Nombre}_ ($${precioActivo.toLocaleString()} c/u)\n`;
        }
    }

    // CAPTURAR Y AGREGAR NOTAS SI EXISTEN
    const notasInput = document.getElementById('txt-notas');
    const notas = notasInput ? notasInput.value.trim() : "";
    if (notas) {
        textoMensaje += `\n💬 *Notas:* _${notas}_\n`;
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
    const haceEnvios = config.hace_envios ? config.hace_envios.toUpperCase().trim() : "SI";
    
    const radioDelivery = document.querySelector('input[value="delivery"]');
    const radioRetiro = document.querySelector('input[value="retiro"]');
    const avisoNoEnvios = document.getElementById('aviso-no-envios');

    if (haceEnvios === "NO") {
        if (radioRetiro) radioRetiro.checked = true;
        if (radioDelivery) radioDelivery.disabled = true;
        if (avisoNoEnvios) {
            avisoNoEnvios.innerText = "⚠️ Este negocio no hace envíos a domicilio.";
            avisoNoEnvios.style.display = "block";
        }
        cambiarTipoEntrega('retiro', false);
    } else {
        if (radioDelivery) radioDelivery.disabled = false;
        if (avisoNoEnvios) avisoNoEnvios.style.display = "none";
    }

    // 2. Calcular el Subtotal de los productos en el carrito
    let subtotal = 0;
    for (const id in carrito) {
        const producto = datosApp.productos.find(p => p.id == id);
        if (producto) {
            const precioActivo = producto.precio_oferta > 0 ? producto.precio_oferta : producto.precio;
            subtotal += precioActivo * carrito[id];
        }
    }
    subtotalGlobal = subtotal;

    // 3. Evaluar costo de envío y envío gratis
    const costoEnvioBase = parseFloat(config.costo_envio) || 0;
    const envioGratisDesde = parseFloat(config.envio_gratis_desde) || 999999;
    
    const radioChecked = document.querySelector('input[name="tipo_entrega"]:checked');
    const tipoEntregaActivo = radioChecked ? radioChecked.value : "retiro";
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
        if (filaDesc) filaDesc.style.display = "flex";
    } else {
        if (filaDesc) filaDesc.style.display = "none";
    }

    // --- NUEVO: CONTROL VISUAL DEL ALIAS DESDE GOOGLE SHEETS ---
    const contenedorAlias = document.getElementById('contenedor-alias');
    const inputAlias = document.getElementById('lbl-alias');
    // Busca "alias" en minúsculas debido al formateador .toLowerCase().trim() que tienes en cargarDatos()
    const aliasValor = config.alias ? config.alias.trim() : "";

    if (contenedorAlias && inputAlias) {
        if (aliasValor !== "") {
            inputAlias.value = aliasValor;
            contenedorAlias.style.display = "block";
        } else {
            contenedorAlias.style.display = "none";
        }
    }

    // 6. Mostrar el Modal
    document.getElementById('modal-checkout').style.display = "flex";
    document.body.style.overflowY = "hidden";
}

function cerrarCheckout() {
    document.getElementById('modal-checkout').style.display = "none";
    document.body.style.overflowY = "auto";
}

function cambiarTipoEntrega(tipo, volverAAbrir = true) {
    const campoDireccion = document.getElementById('campo-direccion');
    const inputDireccion = document.getElementById('txt-direccion');
    const filaEnvio = document.getElementById('fila-envio');

    if (tipo === 'delivery') {
        if (campoDireccion) campoDireccion.style.display = "block";
        if (inputDireccion) inputDireccion.required = true;
        if (filaEnvio) filaEnvio.style.display = "flex"; // Corregido: .style.style por .style.display
    } else {
        if (campoDireccion) campoDireccion.style.display = "none";
        if (inputDireccion) inputDireccion.required = false;
        if (filaEnvio) filaEnvio.style.display = "none";
    }
    
    // Si viene de una acción manual del usuario, recalculamos llamando a abrirCheckout()
    // Si viene forzado desde abrirCheckout (porque hace_envios es NO), volverAAbrir es false y frena el bucle.
    if (volverAAbrir) {
        abrirCheckout();
    }
}

// Validación de cupones (Feature 6)
function validarCupon() {
    const inputCupon = document.getElementById('txt-cupon');
    const msgCupon = document.getElementById('msg-cupon');
    const codigo = inputCupon.value.trim().toUpperCase();

    if (codigo === "") {
        descuentoAplicado = 0;
        cuponValidoActivo = "";
        if (msgCupon) msgCupon.innerText = "";
        abrirCheckout();
        return;
    }

    // NUEVO: Buscamos en los cupones descargados de Google Sheets
    if (datosApp.cupones[codigo] !== undefined) {
        descuentoAplicado = datosApp.cupones[codigo];
        cuponValidoActivo = codigo;
        if (msgCupon) {
            msgCupon.style.color = "#27ae60";
            msgCupon.innerText = `¡Cupón válido! Obtienes un ${(descuentoAplicado * 100)}% de desc.`;
        }
    } else {
        descuentoAplicado = 0;
        cuponValidoActivo = "";
        if (msgCupon) {
            msgCupon.style.color = "#e74c3c";
            msgCupon.innerText = "El cupón ingresado no existe o expiró.";
        }
    }

    // Re-calculamos los números globales del modal
    abrirCheckout();
}

// PROCESAR TODO Y ENVIAR EL MENSAJE FINAL
// PROCESAR TODO Y ENVIAR EL MENSAJE FINAL
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

    // --- NUEVO: PREPARAR EL ARRAY DE PRODUCTOS REALES PARA GOOGLE SHEETS ---
    let productosParaGuardar = [];

    // Listar los productos con el precio correcto (Normal u Oferta)
    for (const id in carrito) {
        const producto = datosApp.productos.find(p => p.id == id);
        if (producto) {
            const precioActivo = producto.precio_oferta > 0 ? producto.precio_oferta : producto.precio;
            textoMensaje += `• ${carrito[id]}x _${producto.Nombre}_ ($${precioActivo.toLocaleString()} c/u)\n`;
            
            // Agregamos el producto real a nuestra lista de Base de Datos
            productosParaGuardar.push({
                id: parseInt(id),
                cantidad: parseInt(carrito[id])
            });
        }
    }

    // --- CAPTURAR Y AGREGAR NOTAS AL DETALLE ---
    const notasInput = document.getElementById('txt-notas');
    const notas = notasInput ? notasInput.value.trim() : "";
    if (notas) {
        textoMensaje += `\n💬 *Notas:* _${notas}_\n`;
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
    
    // Cerrar el modal tras enviar
    cerrarCheckout();
}

// Función para copiar el Alias al portapapeles de manera sencilla
function copiarAlias() {
    const inputAlias = document.getElementById('lbl-alias');
    const btnCopiar = document.getElementById('btn-copiar-alias');
    const msgCopiado = document.getElementById('msg-copiado');
    
    if (inputAlias && inputAlias.value) {
        navigator.clipboard.writeText(inputAlias.value).then(() => {
            // Cambios de estado en éxito
            if (btnCopiar) {
                btnCopiar.innerText = "✅ ¡Listo!";
                btnCopiar.style.background = "#16a34a";
            }
            if (msgCopiado) msgCopiado.style.display = "block";
            
            // Revertir a la normalidad en 2 segundos
            setTimeout(() => {
                if (btnCopiar) {
                    btnCopiar.innerText = "📋 Copiar";
                    btnCopiar.style.background = "#2563eb";
                }
                if (msgCopiado) msgCopiado.style.display = "none";
            }, 2000);
        }).catch(err => {
            console.error("No se pudo copiar el texto de forma automática: ", err);
        });
    }
}
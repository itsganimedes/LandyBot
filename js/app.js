const SPREADSHEET_ID = "1gTnrmHYfCgpZkKUWD5vBgPsTQmmi1Ikrd8419IUVDsI";

// Usamos el parámetro &gid para apuntar exactamente a tus pestañas reales
const URL_CONFIG = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=1801309830`;
const URL_PRODUCTOS = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=1739007170`;

let datosApp = { configuracion: {}, productos: [] };
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
        const [resConfig, resProductos] = await Promise.all([
            fetch(URL_CONFIG).then(r => r.text()),
            fetch(URL_PRODUCTOS).then(r => r.text())
        ]);

        // Procesar pestaña Configuración de forma segura
        const arrayConfig = csvAObjetos(resConfig);

        console.log(arrayConfig);
        
        arrayConfig.forEach(fila => {
            const claveOriginal = fila.Propiedad || fila.propiedad || Object.values(fila)[0];
            const valorOriginal = fila.Valor || fila.valor || Object.values(fila)[1];
            
            if (claveOriginal) {
                const claveLimpia = claveOriginal.toLowerCase().trim();
                datosApp.configuracion[claveLimpia] = valorOriginal;
            }
        });

        // Procesar pestaña Productos
        datosApp.productos = csvAObjetos(resProductos).map(p => {
            const id = p.ID || p.id;
            const precio = p.Precio || p.precio;
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
                Disponible: disponible ? disponible.toUpperCase() : "NO",
                URL_Imagen: urlImagen
            };
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

    // Aplicar estilos CSS reactivos
    if (config.color_primario) document.documentElement.style.setProperty('--color-primario', config.color_primario);
    if (config.color_secundario) document.documentElement.style.setProperty('--color-secundario', config.color_secundario);
    if (config.color_fondo) document.documentElement.style.setProperty('--color-fondo', config.color_fondo);
    if (config.color_texto) document.documentElement.style.setProperty('--color-texto', config.color_texto);

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

    // INYECCIÓN NUEVA: Actualizar el nombre en el Footer dinámicamente
    const elemFooterNombre = document.getElementById('footer-nombre-negocio');
    if (elemFooterNombre) elemFooterNombre.innerText = config.nombre_negocio || "Mi Negocio";

    // INYECCIÓN NUEVA: Configurar el enlace del botón flotante de WhatsApp
    const btnFloatWA = document.getElementById('btn-whatsapp-flotante');
    if (btnFloatWA && config.whatsapp) {
        // Un mensaje predeterminado por si te quieren hacer una consulta general fuera del carrito
        let mensajeConsulta = encodeURIComponent(`¡Hola ${config.nombre_negocio || 'Negocio'}! Vi su catálogo web y quería hacerles una consulta.`);
        btnFloatWA.href = `https://wa.me/${config.whatsapp}?text=${mensajeConsulta}`;
    }

    // Apagar pantalla de carga y mostrar la web
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
    
    const header = document.getElementById('header-negocio');
    if (header) header.style.display = 'block';
}

function renderizarCatalogo() {
    const catalogoContainer = document.getElementById('catalogo');
    if (!catalogoContainer) return;
    
    const categorias = {};

    datosApp.productos.forEach(p => {
        if(p.Disponible === "SI") {
            if (!categorias[p.Categoria]) categorias[p.Categoria] = [];
            categorias[p.Categoria].push(p);
        }
    });

    let htmlHTML = '';
    for (const cat in categorias) {
        htmlHTML += `<h2 class="categoria-titulo">${cat}</h2>`;
        categorias[cat].forEach(p => {
            htmlHTML += `
                <div class="producto-card">
                    <div class="producto-info">
                        <h3 class="producto-nombre">${p.Nombre}</h3>
                        <p class="producto-desc">${p.Descripcion}</p>
                        <span class="producto-precio">$${p.precio.toLocaleString()}</span>
                        <div class="contador-container">
                            <button class="btn-cant" onclick="modificarCantidad(${p.id}, -1)">-</button>
                            <span class="cantidad-num" id="cant-${p.id}">0</span>
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

